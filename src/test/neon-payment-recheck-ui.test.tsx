import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
const mocks = vi.hoisted(() => ({ toast: vi.fn(), user: { id: "10000000-0000-4000-8000-000000000001" } }));
vi.mock("@/lib/backend-selection", () => ({ isNeonClientRuntime: () => true }));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: mocks.user }) }));
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: mocks.toast }) }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: new Proxy({}, { get() { throw Error("Legacy access forbidden"); } }) }));
import Payments from "@/screens/dashboard/Payments";
const reference = "10000000-0000-4000-8000-000000000003";
const json = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status, headers: { "content-type": "application/json" } });
let state: string, verificationStatus: number;
beforeEach(() => {
  vi.clearAllMocks(); state = "pending"; verificationStatus = 200;
  vi.stubGlobal("fetch", vi.fn(async (input: string) => {
    if (input.endsWith("/verify")) { if (verificationStatus === 200) state = "success"; return json({ data: { status: "successful" } }, verificationStatus); }
    if (input.endsWith("/proofs")) return json({ data: [] });
    return json({ data: { plans: [], scopes: [], entitlements: [], checkouts: [], paymentsAvailable: false,
      payments: [{ id: reference, gateway: "esewa", status: state, payment_type: "mentor_booking", amount: 10, currency: "NPR", created_at: "2026-10-23T00:00:00Z" }] } });
  }));
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
describe("payment history status recovery", () => {
  it("checks an existing pending order without starting checkout, then reloads trusted history", async () => {
    render(<MemoryRouter><Payments /></MemoryRouter>);
    fireEvent.click(await screen.findByRole("button", { name: "Check eSewa status" }));
    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith(expect.objectContaining({ title: "Payment verified" })));
    expect(fetch).toHaveBeenCalledWith(`/api/v1/neon-staging/payments/${reference}/verify`, { method: "POST", credentials: "same-origin", cache: "no-store" });
    await waitFor(() => expect(screen.queryByRole("button", { name: "Check eSewa status" })).not.toBeInTheDocument());
    expect(screen.getByText("Success")).toBeInTheDocument();
  });
  it("does not show success or change the pending order after a provider error", async () => {
    verificationStatus = 503;
    render(<MemoryRouter><Payments /></MemoryRouter>);
    fireEvent.click(await screen.findByRole("button", { name: "Check eSewa status" }));
    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith(expect.objectContaining({ title: "Payment check unavailable" })));
    expect(screen.queryByText("Success")).not.toBeInTheDocument();
    expect(screen.getByText("Pending")).toBeInTheDocument();
  });
});
