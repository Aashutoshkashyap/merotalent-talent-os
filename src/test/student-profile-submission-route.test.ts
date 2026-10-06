import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  authenticateRequest: vi.fn(),
  submitModuleForm: vi.fn(),
  profileLookup: vi.fn(),
}));

vi.mock("@/lib/server/auth", () => ({
  ApiAuthError: class ApiAuthError extends Error {},
  authenticateRequest: mocks.authenticateRequest,
  getBearerToken: (request: Request) => request.headers.get("authorization")?.replace(/^Bearer /, "") || null,
}));

vi.mock("@/lib/server/supabase", () => ({
  ServerConfigurationError: class ServerConfigurationError extends Error {},
  getAdminClient: vi.fn(),
}));

vi.mock("@/lib/forms/submission-service", () => ({
  ModuleFormValidationError: class ModuleFormValidationError extends Error {},
  submitModuleForm: mocks.submitModuleForm,
}));

import { POST } from "../../app/api/v1/submissions/[module]/route";

const collegeId = "11111111-1111-4111-8111-111111111111";
const profile = {
  full_name: "Maya Rai",
  email: "stale@example.com",
  phone: "9800000000",
  location: "Kathmandu",
  education: "BSc CSIT",
};

const requestFor = (values: Record<string, unknown>, authenticated = true, verified = false) =>
  new Request("https://merotalent.com/api/v1/submissions/college_application", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(authenticated ? { Authorization: "Bearer student-token" } : {}),
      ...(!authenticated && verified ? {
        "x-guest-application-token": "44444444-4444-4444-8444-444444444444",
        "x-guest-verification-id": "55555555-5555-4555-8555-555555555555",
      } : {}),
    },
    body: JSON.stringify(values),
  });

const context = { params: Promise.resolve({ module: "college_application" }) };

describe("signed-in student profile submission gate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.authenticateRequest.mockResolvedValue({
      user: { id: "22222222-2222-4222-8222-222222222222", email: "maya@example.com" },
      userClient: {
        from: () => ({
          select: () => ({
            eq: () => ({ maybeSingle: mocks.profileLookup }),
          }),
        }),
      },
    });
    mocks.profileLookup.mockResolvedValue({ data: profile, error: null });
    mocks.submitModuleForm.mockResolvedValue({ id: "33333333-3333-4333-8333-333333333333", status: "submitted" });
  });

  it("rejects an incomplete saved profile before creating a submission", async () => {
    mocks.profileLookup.mockResolvedValue({ data: { ...profile, phone: "" }, error: null });

    const response = await POST(requestFor({ collegeId, fullName: "Spoofed", phone: "9801111111" }), context);

    expect(response.status).toBe(422);
    expect((await response.json()).error.code).toBe("PROFILE_INCOMPLETE");
    expect(mocks.submitModuleForm).not.toHaveBeenCalled();
  });

  it("passes saved contact details and the account email to the validated service", async () => {
    const response = await POST(requestFor({
      collegeId,
      fullName: "Spoofed",
      email: "wrong@example.com",
      phone: "9801111111",
      intendedCourse: "Engineering",
    }), context);

    expect(response.status).toBe(201);
    expect(mocks.submitModuleForm).toHaveBeenCalledWith(
      "college_application",
      expect.objectContaining({
        collegeId,
        fullName: "Maya Rai",
        email: "maya@example.com",
        phone: "9800000000",
        currentQualification: "BSc CSIT",
        intendedCourse: "Engineering",
      }),
      expect.objectContaining({ id: "22222222-2222-4222-8222-222222222222" }),
      expect.any(Object),
      undefined,
    );
  });

  it("rejects guest college enquiries without both-channel verification proof", async () => {
    const response = await POST(requestFor({
      collegeId,
      fullName: "Guest Student",
      email: "guest@example.com",
      phone: "9801111111",
    }, false), context);

    expect(response.status).toBe(403);
    expect((await response.json()).error.code).toBe("GUEST_VERIFICATION_REQUIRED");
    expect(mocks.submitModuleForm).not.toHaveBeenCalled();
  });

  it("preserves guest college enquiries with a verification challenge", async () => {
    const response = await POST(requestFor({
      collegeId,
      fullName: "Guest Student",
      email: "guest@example.com",
      phone: "9801111111",
    }, false, true), context);

    expect(response.status).toBe(201);
    expect(mocks.authenticateRequest).not.toHaveBeenCalled();
    expect(mocks.profileLookup).not.toHaveBeenCalled();
    expect(mocks.submitModuleForm).toHaveBeenCalledWith(
      "college_application",
      expect.objectContaining({ fullName: "Guest Student", email: "guest@example.com", phone: "+9779801111111" }),
      expect.objectContaining({ id: "guest" }),
      expect.any(Object),
      undefined,
    );
  });
});
