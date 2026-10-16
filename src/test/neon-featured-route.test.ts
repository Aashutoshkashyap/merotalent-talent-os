import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ rows: vi.fn(), adminClient: vi.fn() }));
vi.mock("@/lib/server/db", async original => ({
  ...await original<typeof import("@/lib/server/db")>(), queryRows: mocks.rows,
}));
vi.mock("@/lib/server/supabase", () => ({ getAdminClient: mocks.adminClient }));
import { GET } from "../../app/api/v1/featured/route";

const oldMode = process.env.MEROTALENT_BACKEND_MODE;
beforeEach(() => {
  process.env.MEROTALENT_BACKEND_MODE = "neon-staging";
  mocks.rows.mockResolvedValue([]);
});
afterEach(() => {
  if (oldMode === undefined) delete process.env.MEROTALENT_BACKEND_MODE;
  else process.env.MEROTALENT_BACKEND_MODE = oldMode;
  vi.clearAllMocks();
});

describe("Neon featured discovery", () => {
  it("does not initialize Supabase for an empty Neon feature set", async () => {
    const response = await GET();
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ data: [] });
    expect(mocks.adminClient).not.toHaveBeenCalled();
  });

  it("hydrates only approved public College records from Neon", async () => {
    const collegeId = "10000000-0000-4000-8000-000000000001";
    mocks.rows.mockImplementation(async (sql: string) => {
      if (sql.includes("FROM public.featured_items")) return [{ id: "f1", entity_type: "college",
        entity_id: collegeId, title: null, placement: "home", priority: 1 }];
      if (sql.includes("FROM public.institutes WHERE id = ANY")) return [{ id: collegeId,
        name: "Approved College", slug: "approved-college", type: "college", description: "Description",
        logo_url: null, cover_image_url: null, location: "Kathmandu" }];
      return [];
    });
    const response = await GET();
    const payload = await response.json();
    expect(payload.data).toHaveLength(1);
    expect(payload.data[0]).toMatchObject({ title: "Approved College", path: "/institutes/approved-college" });
    expect(mocks.adminClient).not.toHaveBeenCalled();
    expect(mocks.rows.mock.calls.some(([sql]) => String(sql).includes("status = 'approved'"))).toBe(true);
  });

  it("does not claim an empty result when Neon fails", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.rows.mockRejectedValue(new Error("database unavailable"));
    const response = await GET();
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: "FEATURED_UNAVAILABLE" });
    expect(mocks.adminClient).not.toHaveBeenCalled();
    errorSpy.mockRestore();
  });
});
