import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({ getAdminClient: vi.fn(), runNeonMaintenance: vi.fn(), dispatchQueuedEmails: vi.fn() }));
vi.mock("@/lib/server/supabase", () => ({ getAdminClient: mocks.getAdminClient,
  ServerConfigurationError: class extends Error {} }));
vi.mock("@/lib/server/neon-maintenance", () => ({ runNeonMaintenance: mocks.runNeonMaintenance }));
vi.mock("@/lib/server/email-queue", () => ({ dispatchQueuedEmails: mocks.dispatchQueuedEmails }));
import { GET } from "../../app/api/cron/maintenance/route";

const request = (authorization?: string) => new NextRequest("http://localhost:3210/api/cron/maintenance",
  { headers: authorization ? { authorization } : {} });
beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("MEROTALENT_BACKEND_MODE", "neon-staging"); vi.stubEnv("VERCEL_ENV", "preview");
  vi.stubEnv("CRON_SECRET", "route-cron-test");
  mocks.runNeonMaintenance.mockResolvedValue({ expired_subscriptions: 2, guestVerification: { guest_challenges_removed: 1 } });
  mocks.dispatchQueuedEmails.mockResolvedValue({ configured: false, claimed: 0, reason: "staging_delivery_disabled" });
});

describe("Neon cron route", () => {
  it("rejects unauthenticated maintenance requests before a backend is contacted", async () => {
    expect((await GET(request())).status).toBe(401);
    expect(mocks.runNeonMaintenance).not.toHaveBeenCalled();
    expect(mocks.getAdminClient).not.toHaveBeenCalled(); expect(mocks.dispatchQueuedEmails).not.toHaveBeenCalled();
  });
  it("uses the guarded Neon service and reports disabled delivery truthfully", async () => {
    const response = await GET(request("Bearer route-cron-test"));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ data: { expired_subscriptions: 2,
      emailDelivery: { configured: false, claimed: 0, reason: "staging_delivery_disabled" } }, error: null });
    expect(mocks.runNeonMaintenance).toHaveBeenCalledWith("Bearer route-cron-test");
    expect(mocks.dispatchQueuedEmails).toHaveBeenCalledWith(25, "Bearer route-cron-test");
    expect(mocks.getAdminClient).not.toHaveBeenCalled();
  });
});
