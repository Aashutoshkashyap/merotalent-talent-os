import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const io = vi.hoisted(() => ({ refresh: vi.fn(), sourceSignIn: vi.fn(), proof: vi.fn() }));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ refreshProfile: io.refresh }) }));
vi.mock("@/components/auth/AuthShell", () => ({ default: ({ children }: { children: React.ReactNode }) => <main>{children}</main> }));
vi.mock("@/lib/auth/legacy-recovery", () => ({
  createLegacyRecoveryClient: () => ({ auth: { signInWithPassword: io.sourceSignIn } }),
  submitLegacyRecoveryProof: io.proof,
  supportsSourceRecoveryPopup: () => false,
}));
import LegacyAccountRecovery from "./LegacyAccountRecovery";

const managed = { id: "10000000-0000-4000-8000-000000000001", email: "new@example.test", emailVerified: true };
const response = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

function view() {
  render(<MemoryRouter initialEntries={["/account-recovery"]}><Routes>
    <Route path="/account-recovery" element={<LegacyAccountRecovery />} />
    <Route path="/dashboard" element={<p>Restored dashboard</p>} />
  </Routes></MemoryRouter>);
}

function fillSource() {
  fireEvent.change(screen.getByLabelText("Existing MeroTalent email"), { target: { value: "old@example.test" } });
  fireEvent.change(screen.getByLabelText("Existing MeroTalent password"), { target: { value: "oldaccountpass123" } });
  fireEvent.click(screen.getByRole("button", { name: "Verify ownership and restore profile" }));
}

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_MEROTALENT_BACKEND_MODE", "neon-staging");
  io.refresh.mockResolvedValue(undefined);
  io.proof.mockResolvedValue(undefined);
  io.sourceSignIn.mockResolvedValue({ data: { session: { access_token: "current-source-token" } }, error: null });
});
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); vi.clearAllMocks(); });

describe("existing-account restoration UI", () => {
  it("requires Managed Auth verification, then returns to sign-in when verification creates no session", async () => {
    const fetcher = vi.fn().mockResolvedValueOnce(response(null))
      .mockResolvedValueOnce(response({ user: { emailVerified: false } }))
      .mockResolvedValueOnce(response(null)).mockResolvedValueOnce(response({ status: true }))
      .mockResolvedValueOnce(response(null));
    vi.stubGlobal("fetch", fetcher);
    view();
    await screen.findByRole("button", { name: "Create a new sign-in" });
    fireEvent.click(screen.getByRole("button", { name: "Create a new sign-in" }));
    fireEvent.change(screen.getByLabelText("Full name"), { target: { value: "Test Student" } });
    fireEvent.change(screen.getByLabelText("New account email"), { target: { value: "new@example.test" } });
    fireEvent.change(screen.getByLabelText("New account password"), { target: { value: "newaccountpass123" } });
    fireEvent.click(screen.getByRole("button", { name: "Create new sign-in" }));
    await screen.findByLabelText("Email verification code");
    expect(io.sourceSignIn).not.toHaveBeenCalled();
    expect(io.proof).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText("Email verification code"), { target: { value: "123456" } });
    fireEvent.click(screen.getByRole("button", { name: "Verify email" }));
    await screen.findByRole("button", { name: "Sign into new account" });
    expect(screen.queryByLabelText("Full name")).toBeNull();
    expect(JSON.parse(fetcher.mock.calls[1][1].body)).toEqual({ email: "new@example.test", name: "Test Student", password: "newaccountpass123" });
  });

  it("offers verification recovery for an existing Managed account whose email is unverified", async () => {
    const fetcher = vi.fn().mockResolvedValueOnce(response(null))
      .mockResolvedValueOnce(response({ code: "EMAIL_NOT_VERIFIED" }, 403));
    vi.stubGlobal("fetch", fetcher);
    view();
    await screen.findByLabelText("New account email");
    fireEvent.change(screen.getByLabelText("New account email"), { target: { value: "new@example.test" } });
    fireEvent.change(screen.getByLabelText("New account password"), { target: { value: "newaccountpass123" } });
    fireEvent.click(screen.getByRole("button", { name: "Sign into new account" }));
    await screen.findByRole("button", { name: "Request a new code" });
    expect(io.sourceSignIn).not.toHaveBeenCalled();
    expect(io.proof).not.toHaveBeenCalled();
  });

  it("sends only a valid source session proof and redirects after the server confirms the link", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response({ user: managed })));
    view();
    await screen.findByLabelText("Existing MeroTalent password");
    fillSource();
    await screen.findByText("Restored dashboard");
    expect(io.proof).toHaveBeenCalledWith("current-source-token");
    expect(io.refresh).toHaveBeenCalledOnce();
  });

  it("never reports restoration or navigates when source proof or server authorization fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response({ user: managed })));
    io.sourceSignIn.mockResolvedValueOnce({ data: { session: null }, error: { message: "Invalid credentials" } });
    view();
    await screen.findByLabelText("Existing MeroTalent password");
    fillSource();
    await screen.findByRole("alert");
    expect(io.proof).not.toHaveBeenCalled();
    expect(io.refresh).not.toHaveBeenCalled();
    expect(screen.getByLabelText("Existing MeroTalent email")).toHaveValue("old@example.test");
    expect(screen.getByLabelText("Existing MeroTalent password")).toHaveValue("");
    io.proof.mockRejectedValueOnce(new Error("This profile is already connected to another account."));
    fillSource();
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("already connected"));
    expect(io.refresh).not.toHaveBeenCalled();
    expect(screen.queryByText("Restored dashboard")).toBeNull();
  });
});
