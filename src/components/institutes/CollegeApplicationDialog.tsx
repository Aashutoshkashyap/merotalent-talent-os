"use client";

import { useEffect, useRef, useState } from "react";
import { AlertCircle, CheckCircle2, Loader2, Send } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { getGuestCollegeApplicationToken } from "@/lib/forms/guest-college-application";
import { invalidateStudentActivityCache } from "@/lib/student/activity-cache";
import { submitAuthenticatedModuleForm, submitGuestCollegeApplication } from "@/lib/forms/module-form-client";
import type { ModuleFormDefinition, ModuleFormField } from "@/lib/forms/module-form-types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { StudentProfileRequirement } from "@/components/forms/StudentProfileRequirement";
import { missingStudentProfileFields } from "@/lib/student/profile-readiness";

interface CollegeApplicationDialogProps {
  instituteId: string;
  instituteName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ApiEnvelope<T> {
  data: T | null;
  error: {
    message: string;
    fields?: Record<string, string[]>;
  } | null;
}

type FormValues = Record<string, string | number | boolean>;
type VerificationChannel = "email" | "whatsapp";
type VerificationState = { code: string; requested: boolean; verified: boolean; busy: boolean; error: string | null };
const emptyVerification = (): VerificationState => ({ code: "", requested: false, verified: false, busy: false, error: null });

const inputType = (field: ModuleFormField) => {
  if (["email", "tel", "url", "number", "date", "time"].includes(field.type)) return field.type;
  return "text";
};

export default function CollegeApplicationDialog({
  instituteId,
  instituteName,
  open,
  onOpenChange,
}: CollegeApplicationDialogProps) {
  const { session, user, profile, refreshProfile } = useAuth();
  const [definition, setDefinition] = useState<ModuleFormDefinition | null>(null);
  const [values, setValues] = useState<FormValues>({ collegeId: instituteId });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [verificationId, setVerificationId] = useState<string | null>(null);
  const [emailVerification, setEmailVerification] = useState<VerificationState>(emptyVerification);
  const [whatsappVerification, setWhatsappVerification] = useState<VerificationState>(emptyVerification);
  const identityRevision = useRef(0);

  useEffect(() => {
    if (!open) return;

    const controller = new AbortController();
    setIsLoading(true);
    setFormError(null);

    fetch("/api/v1/forms/college_application", { signal: controller.signal })
      .then(async (response) => {
        const payload = (await response.json()) as ApiEnvelope<ModuleFormDefinition>;
        if (!response.ok || !payload.data) throw new Error(payload.error?.message || "The application form is unavailable.");
        return payload.data;
      })
      .then((formDefinition) => {
        setDefinition(formDefinition);
        const defaults: FormValues = {};
        for (const field of formDefinition.fields) {
          if (field.key === formDefinition.targetField) defaults[field.key] = instituteId;
          else if (field.key === "fullName") defaults[field.key] = profile?.full_name || "";
          else if (field.key === "email") defaults[field.key] = user?.email || profile?.email || "";
          else if (field.key === "phone") defaults[field.key] = profile?.phone || "";
          else if (field.key === "currentQualification") defaults[field.key] = profile?.education || "";
          else defaults[field.key] = field.type === "checkbox" ? false : "";
        }
        setValues((current) => {
          if (current[formDefinition.targetField] !== instituteId) return defaults;
          return {
            ...defaults,
            ...current,
            ...(session ? { fullName: defaults.fullName, email: defaults.email, phone: defaults.phone } : {}),
            ...(!current.currentQualification ? { currentQualification: defaults.currentQualification } : {}),
          };
        });
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setFormError(error instanceof Error ? error.message : "The application form is unavailable.");
      })
      .finally(() => setIsLoading(false));

    return () => controller.abort();
  }, [instituteId, open, profile?.email, profile?.full_name, profile?.phone, profile?.education, session, user?.email]);

  useEffect(() => {
    if (!open) {
      setSubmitted(false);
      setFieldErrors({});
      setFormError(null);
      setDefinition(null);
      setValues({ collegeId: instituteId });
      identityRevision.current += 1;
      setVerificationId(null);
      setEmailVerification(emptyVerification());
      setWhatsappVerification(emptyVerification());
    }
  }, [instituteId, open]);

  const handleOpenChange = (nextOpen: boolean) => {
    onOpenChange(nextOpen);
  };

  const updateValue = (field: ModuleFormField, rawValue: string | boolean) => {
    const value = field.type === "number" && typeof rawValue === "string" && rawValue !== ""
      ? Number(rawValue)
      : rawValue;
    setValues((current) => ({ ...current, [field.key]: value }));
    if (!session && (field.key === "email" || field.key === "phone")) {
      identityRevision.current += 1;
      setVerificationId(null);
      setEmailVerification(emptyVerification());
      setWhatsappVerification(emptyVerification());
    }
    setFieldErrors((current) => {
      if (!current[field.key]) return current;
      const next = { ...current };
      delete next[field.key];
      return next;
    });
  };

  const verifyContact = async (channel: VerificationChannel, action: "start" | "check") => {
    const revision = identityRevision.current;
    const setChannel = channel === "email" ? setEmailVerification : setWhatsappVerification;
    setChannel((current) => ({ ...current, busy: true, error: null }));
    try {
      const response = await fetch("/api/v1/guest-college-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          channel,
          guestToken: getGuestCollegeApplicationToken(),
          collegeId: instituteId,
          email: values.email,
          whatsappNumber: values.phone,
          ...(action === "check" ? {
            verificationId,
            code: channel === "email" ? emailVerification.code : whatsappVerification.code,
          } : {}),
        }),
      });
      const result = (await response.json()) as ApiEnvelope<{ verificationId: string; verified?: boolean }>;
      if (revision !== identityRevision.current) return;
      if (!response.ok || !result.data) throw new Error(result.error?.message || "Verification is unavailable. Please try again.");
      setVerificationId(result.data.verificationId);
      setChannel((current) => ({
        ...current,
        busy: false,
        requested: true,
        verified: action === "check" ? Boolean(result.data?.verified) : false,
        code: action === "check" ? "" : current.code,
      }));
    } catch (error) {
      if (revision !== identityRevision.current) return;
      setChannel((current) => ({ ...current, busy: false, error: error instanceof Error ? error.message : "Verification failed." }));
    }
  };

  const setChannelCode = (channel: VerificationChannel, raw: string) => {
    const setChannel = channel === "email" ? setEmailVerification : setWhatsappVerification;
    setChannel((current) => ({ ...current, code: raw.replace(/\D/g, "").slice(0, 6), error: null }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!definition) {
      return;
    }
    if (session && missingStudentProfileFields("college_application", profile, user?.email).length) {
      setFormError("Complete your student profile before submitting this application.");
      return;
    }
    if (!session && (!verificationId || !emailVerification.verified || !whatsappVerification.verified)) {
      setFormError("Verify both your email and WhatsApp number before submitting.");
      return;
    }

    setIsSubmitting(true);
    setFormError(null);
    setFieldErrors({});

    try {
      if (session) {
        await submitAuthenticatedModuleForm({
          accessToken: session.access_token,
          module: "college_application",
          values,
        });
        if (user) invalidateStudentActivityCache(user.id);
      } else {
        await submitGuestCollegeApplication({
          guestToken: getGuestCollegeApplicationToken(),
          verificationId: verificationId!,
          values,
        });
      }

      setSubmitted(true);
    } catch (error) {
      if (error instanceof Error && "code" in error && error.code === "PROFILE_INCOMPLETE") void refreshProfile();
      setFormError(error instanceof Error ? error.message : "Your application could not be submitted.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-xl overflow-y-auto border-slate-200">
        {submitted ? (
          <div className="flex flex-col items-center px-2 py-8 text-center">
            <div className="grid h-16 w-16 place-items-center rounded-full bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <DialogTitle className="mt-5 text-2xl">Application submitted</DialogTitle>
            <DialogDescription className="mt-2 max-w-sm leading-relaxed">
              Your application to {instituteName} is safely stored in MeroTalent.
              {user
                ? " You can track its status from your dashboard."
                : " Create an account with this email on this browser to track it from your student dashboard."}
            </DialogDescription>
            <Button onClick={() => onOpenChange(false)} className="mt-6 rounded-xl bg-[#0073e6] px-6 hover:bg-[#0062c4]">
              Done
            </Button>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>{definition?.title || "Apply to this college"}</DialogTitle>
              <DialogDescription>
                {definition?.description || `Send your details directly to ${instituteName}.`}
              </DialogDescription>
            </DialogHeader>

            {isLoading ? (
              <div className="flex min-h-56 items-center justify-center text-slate-500">
                <Loader2 className="mr-2 h-5 w-5 animate-spin text-[#0073e6]" />
                Loading application form…
              </div>
            ) : definition ? (
              <form onSubmit={handleSubmit} className="space-y-4">
                {session && <StudentProfileRequirement module="college_application" profile={profile} email={user?.email} onRefresh={refreshProfile} />}
                <div className="grid gap-4 sm:grid-cols-2">
                  {definition.fields.map((field) => {
                    if (field.type === "hidden") {
                      return <input key={field.key} type="hidden" name={field.key} value={String(values[field.key] ?? "")} />;
                    }

                    const error = fieldErrors[field.key]?.[0];
                    const fullWidth = field.type === "textarea" || ["message", "currentQualification"].includes(field.key);
                    return (
                      <div key={field.key} className={`space-y-1.5 ${fullWidth ? "sm:col-span-2" : ""}`}>
                        <Label htmlFor={`college-application-${field.key}`} className="text-xs font-extrabold text-slate-700">
                          {!session && field.key === "phone" ? "WhatsApp number" : field.label}{field.required || (!session && field.key === "phone") ? " *" : ""}
                        </Label>
                        {field.type === "textarea" ? (
                          <Textarea
                            id={`college-application-${field.key}`}
                            value={String(values[field.key] ?? "")}
                            onChange={(event) => updateValue(field, event.target.value)}
                            placeholder={!session && field.key === "phone" ? "e.g., 9800000000" : field.placeholder}
                            required={field.required}
                            minLength={field.minLength}
                            maxLength={field.maxLength}
                            rows={4}
                            aria-invalid={Boolean(error)}
                            className="rounded-xl border-slate-200 focus-visible:border-[#0073e6] focus-visible:ring-[#0073e6]/10"
                          />
                        ) : (
                          <Input
                            id={`college-application-${field.key}`}
                            type={inputType(field)}
                            value={String(values[field.key] ?? "")}
                            onChange={(event) => updateValue(field, event.target.value)}
                            placeholder={field.placeholder}
                            required={field.required}
                            minLength={field.minLength}
                            maxLength={field.maxLength}
                            min={field.min}
                            max={field.max}
                            step={field.step}
                            autoComplete={field.autocomplete}
                            readOnly={Boolean(session) && ["fullName", "email", "phone"].includes(field.key)}
                            aria-invalid={Boolean(error)}
                            className="h-11 rounded-xl border-slate-200 focus-visible:border-[#0073e6] focus-visible:ring-[#0073e6]/10"
                          />
                        )}
                        {field.helpText && field.key !== "phone" && <p className="text-[11px] text-slate-500">{field.helpText}</p>}
                        {!session && field.key === "phone" && <p className="text-xs text-slate-500">A WhatsApp-enabled number is required. A separate contact number is not needed.</p>}
                        {error && <p className="text-xs font-semibold text-red-600">{error}</p>}
                      </div>
                    );
                  })}
                </div>

                {!session && (
                  <section aria-label="Verify your contact details" className="space-y-4 rounded-2xl border border-blue-100 bg-blue-50/50 p-4">
                    <div>
                      <h3 className="font-bold text-slate-900">Verify your contact details</h3>
                      <p className="text-sm text-slate-600">We will send one code to your email and another to WhatsApp. Both are required to apply.</p>
                    </div>
                    {(["email", "whatsapp"] as const).map((channel) => {
                      const state = channel === "email" ? emailVerification : whatsappVerification;
                      const label = channel === "email" ? "Email" : "WhatsApp";
                      return (
                        <div key={channel} className="space-y-2 rounded-xl border border-slate-200 bg-white p-3">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="font-semibold text-slate-800">{label}</span>
                            {state.verified && <span className="inline-flex items-center gap-1 text-sm font-semibold text-emerald-700"><CheckCircle2 className="h-4 w-4" /> Verified</span>}
                          </div>
                          {!state.verified && (
                            <div className="flex flex-wrap gap-2">
                              <Button type="button" variant="outline" disabled={state.busy || !String(values.email || "").trim() || !String(values.phone || "").trim()} onClick={() => void verifyContact(channel, "start")}>
                                {state.busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                {state.requested ? "Request another code" : `Request ${label} code`}
                              </Button>
                              {state.requested && (
                                <>
                                  <Input aria-label={`${label} verification code`} inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} placeholder="6-digit code" value={state.code} onChange={(event) => setChannelCode(channel, event.target.value)} className="h-10 w-36 bg-white" />
                                  <Button type="button" disabled={state.busy || !/^[0-9]{6}$/.test(state.code)} onClick={() => void verifyContact(channel, "check")}>Verify</Button>
                                </>
                              )}
                            </div>
                          )}
                          {state.error && <p role="alert" className="text-sm font-medium text-red-700">{state.error}</p>}
                        </div>
                      );
                    })}
                  </section>
                )}

                {formError && (
                  <div role="alert" className="flex items-start gap-2 rounded-xl border border-red-100 bg-red-50 p-3 text-sm font-semibold text-red-700">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    {formError}
                  </div>
                )}

                <DialogFooter className="gap-2 pt-2 sm:space-x-0">
                  <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="rounded-xl border-slate-200">
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSubmitting || Boolean(session && missingStudentProfileFields("college_application", profile, user?.email).length) || Boolean(!session && (!verificationId || !emailVerification.verified || !whatsappVerification.verified))} className="rounded-xl bg-[#0073e6] hover:bg-[#0062c4]">
                    {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                    {definition.submitLabel}
                  </Button>
                </DialogFooter>
              </form>
            ) : (
              <div role="alert" className="flex min-h-40 items-center justify-center rounded-2xl border border-red-100 bg-red-50 p-6 text-center text-sm font-semibold text-red-700">
                {formError || "The application form is temporarily unavailable."}
              </div>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
