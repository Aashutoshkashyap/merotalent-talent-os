import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
const mocks = vi.hoisted(() => ({ toast: vi.fn(), invalidate: vi.fn(), legacySubmit: vi.fn(),
  user: { id: "student", email: "student@example.test" },
  profile: { full_name: "Test Student", phone: "9800000000", location: "Test City", education: "Secondary school" },
}));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: mocks.user, session: null, profile: mocks.profile, refreshProfile: vi.fn() }) }));
vi.mock("@/lib/backend-selection", () => ({ isNeonClientRuntime: () => true }));
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: mocks.toast }) }));
vi.mock("@/lib/student/activity-cache", () => ({ invalidateStudentActivityCache: mocks.invalidate }));
vi.mock("@/lib/activityLogger", () => ({ logUserActivity: vi.fn() }));
vi.mock("@/lib/forms/module-form-client", () => ({ submitAuthenticatedModuleForm: mocks.legacySubmit }));
vi.mock("@/lib/institutes/public-institutes", () => ({
  fetchPublicInstitutes: async () => ({ institutes: [{ id: "10000000-0000-4000-8000-000000000002", name: "Test College", status: "approved", programs: [], category: "college" }], count: 1 }),
  resolveCollegeMediaUrl: () => null, getInstitutePrograms: () => [], institutePath: () => "/institutes/test-college",
}));
import Colleges from "@/screens/dashboard/Colleges";
let status: number;
beforeEach(() => { vi.clearAllMocks(); status = 201; mocks.profile.location = "Test City";
  vi.stubGlobal("fetch", vi.fn(async (_url: string, init?: RequestInit) => new Response(JSON.stringify(init?.method === "POST"
    ? status === 201 ? { data: { id: "saved", status: "submitted" } } : { error: "FORBIDDEN" } : { data: [] }), { status: init?.method === "POST" ? status : 200 })));
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
async function openForm() {
  render(<MemoryRouter><Colleges /></MemoryRouter>);
  fireEvent.click(await screen.findByRole("button", { name: "Apply Now" }));
  fireEvent.change(screen.getByPlaceholderText("B.E. Computer / CSIT"), { target: { value: "Engineering" } });
  fireEvent.change(screen.getByPlaceholderText("e.g. Prasadi Academy"), { target: { value: "Test School" } });
  fireEvent.change(screen.getByPlaceholderText("e.g. Science - 3.65 GPA"), { target: { value: "3.5 GPA" } });
  fireEvent.change(screen.getByPlaceholderText("e.g. Pokhara, Kaski"), { target: { value: "Test City" } });
}
describe("College dashboard Neon submission", () => {
  it("submits to the existing server-authorized endpoint without a legacy session or client identity", async () => {
    await openForm();
    fireEvent.submit(screen.getByRole("button", { name: "Submit Application" }).closest("form")!);
    expect(await screen.findByText("Inquiry Sent Successfully!")).toBeInTheDocument();
    const call = vi.mocked(fetch).mock.calls.find(([, init]) => init?.method === "POST")!;
    expect(call[0]).toBe("/api/v1/neon-staging/institutes/10000000-0000-4000-8000-000000000002/applications");
    expect(call[1]?.credentials).toBe("same-origin");
    expect(JSON.parse(call[1]?.body as string)).toEqual({ programInterest: "Engineering", intake: "Bachelors", message: expect.stringContaining("Test School") });
    expect(mocks.legacySubmit).not.toHaveBeenCalled(); expect(mocks.invalidate).toHaveBeenCalledWith("student");
  });
  it("keeps server denial as a failure and does not show an application success", async () => {
    status = 403; await openForm();
    fireEvent.submit(screen.getByRole("button", { name: "Submit Application" }).closest("form")!);
    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith(expect.objectContaining({ title: "Application Failed" })));
    expect(screen.queryByText("Inquiry Sent Successfully!")).not.toBeInTheDocument(); expect(mocks.invalidate).not.toHaveBeenCalled();
  });
  it("retains the saved-profile gate", async () => {
    mocks.profile.location = ""; await openForm();
    expect(screen.getByRole("button", { name: "Submit Application" })).toBeDisabled();
    fireEvent.submit(screen.getByRole("button", { name: "Submit Application" }).closest("form")!);
    expect(vi.mocked(fetch).mock.calls.some(([, init]) => init?.method === "POST")).toBe(false);
  });
});
