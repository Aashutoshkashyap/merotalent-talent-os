import { ApiAuthError, authenticateRequest, getBearerToken } from "@/lib/server/auth";
import { jsonApiResponse } from "@/lib/server/api-response";
import { isModuleFormType } from "@/lib/forms/module-form-definitions";
import { getAdminClient, ServerConfigurationError } from "@/lib/server/supabase";
import { missingStudentProfileFields, valuesFromStudentProfile } from "@/lib/student/profile-readiness";
import { GuestVerificationError, normalizeGuestIdentity } from "@/lib/server/guest-college-verification";
import { getBackendMode } from "@/lib/server/backend-mode";
import {
  ModuleFormValidationError,
  submitModuleForm,
  type FormSubmissionCommand,
  type FormSubmissionGateway,
  type FormSubmissionResult,
} from "@/lib/forms/submission-service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAX_BODY_BYTES = 32 * 1024;

const rpcModuleNames = {
  college_application: "college",
  job_application: "job",
  mentor_booking: "mentor",
  event_registration: "event",
} as const;

interface RouteContext {
  params: Promise<{ module: string }>;
}

const response = (
  requestId: string,
  status: number,
  data: unknown,
  error: { code: string; message: string; fields?: Record<string, string[]> } | null,
) =>
  jsonApiResponse({ data, error, meta: { requestId } }, status);

const normalizeRpcResult = (value: unknown): FormSubmissionResult => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("The submission service returned an invalid response.");
  }

  const result = value as Record<string, unknown>;
  if (typeof result.id !== "string" || typeof result.status !== "string") {
    throw new Error("The submission service returned an invalid response.");
  }

  return {
    id: result.id,
    status: result.status,
    leadId:
      typeof result.leadId === "string"
        ? result.leadId
        : typeof result.lead_id === "string"
          ? result.lead_id
          : undefined,
    paymentId:
      typeof result.paymentId === "string"
        ? result.paymentId
        : typeof result.payment_id === "string"
          ? result.payment_id
          : undefined,
    createdAt:
      typeof result.createdAt === "string"
        ? result.createdAt
        : typeof result.created_at === "string"
          ? result.created_at
          : undefined,
  };
};

export async function POST(request: Request, context: RouteContext) {
  const requestId = crypto.randomUUID();
  const { module } = await context.params;

  if (!isModuleFormType(module)) {
    // Preserve the API's auth-first contract for unknown module probes. The
    // sole anonymous exception below applies only to the known college form.
    try {
      await authenticateRequest(request);
    } catch (error) {
      if (error instanceof ApiAuthError) {
        return response(requestId, error.status, null, { code: error.code, message: error.message });
      }
      return response(requestId, 503, null, {
        code: "AUTHORIZATION_UNAVAILABLE",
        message: "Form submissions are temporarily unavailable.",
      });
    }
    return response(requestId, 404, null, {
      code: "FORM_MODULE_NOT_FOUND",
      message: "The requested form module does not exist.",
    });
  }

  // Only a college enquiry can start before account creation. A malformed
  // bearer token is deliberately not downgraded into anonymous access.
  const isGuestCollegeApplication = module === "college_application" && !getBearerToken(request);
  if (isGuestCollegeApplication && getBackendMode() !== "legacy" &&
      request.headers.get("origin") !== new URL(request.url).origin) {
    return response(requestId, 403, null, { code: "CROSS_ORIGIN_WRITE_DENIED", message: "Submit applications from this website." });
  }
  let authenticated: Awaited<ReturnType<typeof authenticateRequest>> | null = null;
  if (!isGuestCollegeApplication) {
    try {
      authenticated = await authenticateRequest(request);
    } catch (error) {
      if (error instanceof ApiAuthError) {
        return response(requestId, error.status, null, { code: error.code, message: error.message });
      }
      console.error("Module submission authentication failed", { requestId });
      return response(requestId, 503, null, {
        code: "AUTHORIZATION_UNAVAILABLE",
        message: "Form submissions are temporarily unavailable.",
      });
    }
  }

  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > MAX_BODY_BYTES) {
    return response(requestId, 413, null, {
      code: "PAYLOAD_TOO_LARGE",
      message: "The form payload is too large.",
    });
  }

  const contentType = request.headers.get("content-type")?.toLowerCase() ?? "";
  if (!contentType.startsWith("application/json")) {
    return response(requestId, 415, null, {
      code: "UNSUPPORTED_MEDIA_TYPE",
      message: "Form submissions must use application/json.",
    });
  }

  let rawBody: string;
  try {
    rawBody = await request.text();
  } catch {
    return response(requestId, 400, null, {
      code: "INVALID_JSON",
      message: "The request body must be valid JSON.",
    });
  }

  if (new TextEncoder().encode(rawBody).byteLength > MAX_BODY_BYTES) {
    return response(requestId, 413, null, {
      code: "PAYLOAD_TOO_LARGE",
      message: "The form payload is too large.",
    });
  }

  let values: unknown;
  try {
    values = JSON.parse(rawBody);
  } catch {
    return response(requestId, 400, null, {
      code: "INVALID_JSON",
      message: "The request body must be valid JSON.",
    });
  }

  let guestVerificationId: string | null = null;
  let authenticatedProfileSnapshot: Record<string, unknown> | null = null;
  if (isGuestCollegeApplication) {
    guestVerificationId = request.headers.get("x-guest-verification-id");
    if (!guestVerificationId || !/^[0-9a-f-]{36}$/i.test(guestVerificationId)) {
      return response(requestId, 403, null, {
        code: "GUEST_VERIFICATION_REQUIRED",
        message: "Verify your email and WhatsApp number before applying.",
      });
    }
    try {
      const submitted = values && typeof values === "object" && !Array.isArray(values)
        ? values as Record<string, unknown> : {};
      const identity = normalizeGuestIdentity({
        guestToken: request.headers.get("x-guest-application-token"),
        collegeId: submitted.collegeId,
        email: submitted.email,
        whatsappNumber: submitted.phone,
      });
      values = { ...submitted, email: identity.email, phone: identity.whatsappNumber };
    } catch (error) {
      if (error instanceof GuestVerificationError) {
        return response(requestId, error.status, null, { code: error.code, message: error.message });
      }
      return response(requestId, 400, null, { code: "INVALID_GUEST_DETAILS", message: "Enter valid application details." });
    }
  }

  if (authenticated) {
    const { data: studentProfile } = await authenticated.userClient
      .from("profiles")
      .select("full_name,email,phone,location,education,linkedin_url,resume_url,education_history,experience_history,certifications")
      .eq("user_id", authenticated.user.id)
      .maybeSingle();

    const { data: studentSkills } = await authenticated.userClient
      .from("user_skills")
      .select("skills(name)")
      .eq("user_id", authenticated.user.id);

    const fallbackProfile = studentProfile || {
      full_name: (values as any)?.fullName || null,
      email: authenticated.user.email || null,
      phone: (values as any)?.phone || null,
      location: null,
      education: (values as any)?.education || (values as any)?.currentQualification || null,
      education_history: [],
    };

    const missing = missingStudentProfileFields(module, fallbackProfile, authenticated.user.email);
    if (missing.length) {
      return response(requestId, 422, null, {
        code: "PROFILE_INCOMPLETE",
        message: `Complete your student profile before submitting: ${missing.join(", ")}.`,
      });
    }

    values = valuesFromStudentProfile(module, values, fallbackProfile, authenticated.user.email);
    authenticatedProfileSnapshot = studentProfile ? {
      fullName: studentProfile.full_name,
      email: authenticated.user.email || studentProfile.email,
      phone: studentProfile.phone,
      location: studentProfile.location,
      education: studentProfile.education,
      linkedInUrl: studentProfile.linkedin_url,
      resumeUrl: studentProfile.resume_url,
      educationHistory: studentProfile.education_history,
      experienceHistory: studentProfile.experience_history,
      certifications: studentProfile.certifications,
      skills: (studentSkills ?? []).map((entry: any) => entry.skills?.name).filter((name: unknown): name is string => typeof name === "string"),
      capturedAt: new Date().toISOString(),
    } : null;
  }

  const gateway: FormSubmissionGateway = {
    async submit(command: FormSubmissionCommand) {
      const payload: any = {
        ...command.values,
        ...(command.module === "job_application" && authenticatedProfileSnapshot
          ? { profileSnapshot: authenticatedProfileSnapshot }
          : {}),
        _formVersion: command.formVersion,
        _idempotencyKey: command.idempotencyKey ?? null,
      };
      let data: unknown;
      let error: { code?: string; message?: string } | null = null;
      if (isGuestCollegeApplication) {
        const guestToken = request.headers.get("x-guest-application-token") ?? "";
        if (!/^[a-f0-9-]{36}$/i.test(guestToken)) {
          const invalid = new Error("The guest application token is invalid.") as Error & { code?: string };
          invalid.code = "22023";
          throw invalid;
        }
        if (getBackendMode() !== "legacy") {
          const { submitNeonGuestCollegeApplication } = await import("@/lib/server/neon-guest-college-verification");
          return submitNeonGuestCollegeApplication(payload, guestToken, guestVerificationId!, command.idempotencyKey);
        }
        try {
          const admin = getAdminClient() as unknown as {
            rpc: (name: string, args: Record<string, unknown>) => Promise<{
              data: unknown;
              error: { code?: string; message?: string } | null;
            }>;
          };
          ({ data, error } = await admin.rpc("submit_guest_college_application", {
            p_payload: payload,
            p_guest_token: guestToken,
            p_idempotency_key: command.idempotencyKey ?? null,
            p_verification_id: guestVerificationId,
          }));
        } catch (serverError) {
          if (serverError instanceof ServerConfigurationError) {
            const unavailable = new Error("Guest applications are temporarily unavailable.") as Error & { code?: string };
            unavailable.code = "PGRST202";
            throw unavailable;
          }
          throw serverError;
        }
      } else {
        const rpcClient = authenticated!.userClient as unknown as {
          rpc: (name: string, args: Record<string, unknown>) => Promise<{
            data: unknown;
            error: { code?: string; message?: string } | null;
          }>;
        };

        try {
          ({ data, error } = command.module === "college_application"
            ? await rpcClient.rpc("submit_college_application", { p_payload: payload })
            : await rpcClient.rpc("submit_module_form", {
                p_module: rpcModuleNames[command.module],
                p_payload: payload,
              }));
        } catch (rpcErr) {
          error = { message: String(rpcErr) };
        }

        // Do not bypass the domain RPC with a service-role insert. These RPCs
        // enforce publication state, ownership, duplicate protection, pricing,
        // capacity, availability and audit/notification side effects.
      }

      if (error && !data) {
        const wrapped = new Error("The database rejected the submission.") as Error & {
          code?: string;
        };
        wrapped.code = (error as any).code;
        throw wrapped;
      }

      return normalizeRpcResult(data);
    },
  };

  try {
    const result = await submitModuleForm(
      module,
      values,
      { id: authenticated?.user.id ?? "guest", email: authenticated?.user.email },
      gateway,
      request.headers.get("idempotency-key") ?? undefined,
    );
    return response(requestId, 201, result, null);
  } catch (error) {
    if (error instanceof GuestVerificationError) {
      return response(requestId, error.status, null, { code: error.code, message: error.message });
    }
    if (error instanceof ModuleFormValidationError) {
      return response(requestId, 422, null, {
        code: "VALIDATION_FAILED",
        message: error.message,
        fields: error.fieldErrors,
      });
    }

    const databaseCode =
      error && typeof error === "object" && "code" in error
        ? String(error.code)
        : undefined;
    if (databaseCode === "23505") {
      return response(requestId, 409, null, {
        code: "DUPLICATE_SUBMISSION",
        message: "This form has already been submitted.",
      });
    }
    if (databaseCode === "22023") {
      return response(requestId, 400, null, {
        code: "INVALID_SUBMISSION_REQUEST",
        message: "The application request is invalid. Please refresh and try again.",
      });
    }
    if (databaseCode === "42501" || databaseCode === "PGRST301") {
      return response(requestId, 403, null, {
        code: isGuestCollegeApplication ? "GUEST_VERIFICATION_REQUIRED" : "SUBMISSION_NOT_ALLOWED",
        message: isGuestCollegeApplication
          ? "Verify your email and WhatsApp number again before applying."
          : "You do not have permission to submit this form.",
      });
    }
    if (databaseCode === "23503" || databaseCode === "P0002") {
      return response(requestId, 404, null, {
        code: "TARGET_NOT_FOUND",
        message: "The college, job, mentor, or event is no longer available.",
      });
    }
    if (databaseCode === "P0001") {
      return response(requestId, 403, null, {
        code: "SUBMISSION_NOT_ALLOWED",
        message: "This submission is not currently available for your account.",
      });
    }
    if (databaseCode === "PGRST202") {
      return response(requestId, 503, null, {
        code: "SERVICE_UNAVAILABLE",
        message: "Form submissions are temporarily unavailable.",
      });
    }

    console.error("Module form submission failed", { requestId, databaseCode });
    return response(requestId, 500, null, {
      code: "SUBMISSION_FAILED",
      message: "The form could not be submitted. Please try again.",
    });
  }
}
