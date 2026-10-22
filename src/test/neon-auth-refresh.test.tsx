import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
vi.mock("@/lib/backend-selection", () => ({ isNeonClientRuntime: () => true }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: new Proxy({}, { get: () => { throw Error("Legacy access forbidden"); } }) }));
vi.mock("@/lib/forms/guest-college-application", () => ({ getStoredGuestCollegeApplicationToken: () => null }));
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
function Probe() {
  const auth = useAuth();
  return <><span>{auth.isLoading ? "Loading" : auth.user?.id ?? "Signed out"}</span><button onClick={() => void auth.refreshProfile()}>Refresh</button></>;
}
const ok = () => new Response(JSON.stringify({ data: { user_id: "verified-user", email: "test@example.com", full_name: "Test" },
  access: { roles: ["talent"], permissions: [], capabilities: [] } }), { status: 200 });
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });
describe("Neon refresh failure semantics", () => {
  it("preserves an existing session view on a transient outage without replaying writes", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const fetcher = vi.fn().mockResolvedValueOnce(ok()).mockResolvedValueOnce(new Response('{"error":"AUTH_UNAVAILABLE"}', { status: 503 }));
    vi.stubGlobal("fetch", fetcher);
    render(<AuthProvider><Probe /></AuthProvider>);
    await screen.findByText("verified-user");
    fireEvent.click(screen.getByRole("button", { name: "Refresh" }));
    await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(2));
    expect(screen.getByText("verified-user")).toBeInTheDocument();
    expect(fetcher.mock.calls.every(([path]) => path === "/api/v1/neon-staging/profile")).toBe(true);
  });
  it("still clears the view on an authoritative suspended-account denial", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(ok()).mockResolvedValueOnce(
      new Response('{"error":"ACCOUNT_INACTIVE"}', { status: 403 })));
    render(<AuthProvider><Probe /></AuthProvider>);
    await screen.findByText("verified-user");
    fireEvent.click(screen.getByRole("button", { name: "Refresh" }));
    await screen.findByText("Signed out");
  });
});
