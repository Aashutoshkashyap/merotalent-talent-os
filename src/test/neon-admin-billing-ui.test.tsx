import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const io = vi.hoisted(() => ({ toast: vi.fn(), from: vi.fn(), rpc: vi.fn(), storage: vi.fn(), session: vi.fn() }));
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: io.toast }) }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { from: io.from, rpc: io.rpc,
  storage: { from: io.storage }, auth: { getSession: io.session } } }));
import AdminPayments from "@/screens/admin/AdminPayments";
import AdminSubscriptions from "@/screens/admin/AdminSubscriptions";
beforeEach(() => vi.stubEnv("NEXT_PUBLIC_MEROTALENT_BACKEND_MODE", "neon-staging"));
afterEach(() => { cleanup(); vi.unstubAllEnvs(); vi.unstubAllGlobals(); vi.clearAllMocks(); });
describe("Neon administrative billing screen data", () => {
  it("renders server payer, evidence and aggregate data without source reads", async () => {
    const id = "10000000-0000-4000-8000-000000000001";
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ data: {
      payments: [{ id, user_id: id, payment_type: "mentor_booking", amount: 500, currency: "NPR", status: "pending",
        created_at: "2026-10-14T00:00:00Z", profiles: { full_name: "Staging payer", email: "payer@example.test" } }],
      proofs: [{ id, payment_id: id, status: "pending" }], summary: { collected: 2000, pending_payouts: 0, pending_proofs: 1 }, total: 1, hasMore: false,
    } }), { status: 200 }));
    vi.stubGlobal("fetch", fetcher);
    render(<AdminPayments />);
    await screen.findByText("Staging payer");
    expect(screen.getByText("Evidence Submitted")).toBeInTheDocument();
    expect(screen.getByText("NPR 2,000")).toBeInTheDocument();
    expect(fetcher.mock.calls[0][1]).toMatchObject({ credentials: "same-origin", cache: "no-store" });
    expect(io.from).not.toHaveBeenCalled(); expect(io.storage).not.toHaveBeenCalled(); expect(io.session).not.toHaveBeenCalled();
  });
  it("keeps subscription access failures in Neon and never falls back to source queries", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: "ADMIN_REQUIRED", message: "Active linked administrator required." }), { status: 403 })));
    render(<AdminSubscriptions />);
    await waitFor(() => expect(io.toast).toHaveBeenCalledWith(expect.objectContaining({ title: "Unable to load subscriptions", description: "Active linked administrator required." })));
    expect(io.from).not.toHaveBeenCalled(); expect(io.rpc).not.toHaveBeenCalled(); expect(io.session).not.toHaveBeenCalled();
    expect(screen.getByText("No subscriptions found.")).toBeInTheDocument();
  });
});
