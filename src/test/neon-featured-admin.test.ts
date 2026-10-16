import { describe, expect, it, vi } from "vitest";
import type { NeonActor } from "@/lib/server/neon-authorization";
import { listFeaturedAdmin, listFeaturedOptions, removeFeaturedAdmin,
  saveFeaturedAdmin } from "@/lib/server/neon-featured-admin";

const admin: NeonActor = { userId: "10000000-0000-4000-8000-000000000001",
  neonAuthUserId: "20000000-0000-4000-8000-000000000002",
  roles: ["admin"], permissions: [], platformAdmin: true };
const collegeId = "30000000-0000-4000-8000-000000000003";
const itemId = "40000000-0000-4000-8000-000000000004";
const input = { entity_type: "college", entity_id: collegeId, title: "Featured College",
  placement: "homepage", priority: 3, is_active: true };

describe("Neon featured authoring", () => {
  it("denies non-admin reads and writes before querying", async () => {
    const ordinary = { ...admin, roles: ["talent"], platformAdmin: false };
    const db = { query: vi.fn() };
    const run = vi.fn();
    await expect(listFeaturedAdmin(ordinary, db)).rejects.toMatchObject({ code: "ADMIN_REQUIRED" });
    await expect(listFeaturedOptions(ordinary, "college", db)).rejects.toMatchObject({ code: "ADMIN_REQUIRED" });
    await expect(saveFeaturedAdmin(ordinary, input, run)).rejects.toMatchObject({ code: "ADMIN_REQUIRED" });
    expect(db.query).not.toHaveBeenCalled();
    expect(run).not.toHaveBeenCalled();
  });

  it("bounds public target options and rejects arbitrary entity types", async () => {
    const db = { query: vi.fn().mockResolvedValue([{ id: collegeId, label: "College" }]) };
    expect(await listFeaturedOptions(admin, "college", db)).toHaveLength(1);
    expect(db.query.mock.calls[0][0]).toContain("i.status='approved'");
    expect(db.query.mock.calls[0][0]).toContain("l.neon_auth_user_id=$2::uuid");
    await expect(listFeaturedOptions(admin, "secret", db)).rejects.toMatchObject({ code: "INVALID_FEATURED_TYPE" });
  });

  it("validates input, target publication, and audits an idempotent upsert", async () => {
    const queries = vi.fn()
      .mockResolvedValueOnce({ rows: [{ allowed: true }] })
      .mockResolvedValueOnce({ rows: [{ "?column?": 1 }] })
      .mockResolvedValueOnce({ rows: [{ id: itemId, ...input }] })
      .mockResolvedValueOnce({ rows: [] });
    const run = vi.fn(async callback => callback({ query: queries }));
    await expect(saveFeaturedAdmin(admin, { ...input, entity_type: "private" }, run))
      .rejects.toMatchObject({ code: "INVALID_FEATURED_ITEM" });
    expect(await saveFeaturedAdmin(admin, input, run)).toMatchObject({ id: itemId });
    expect(queries.mock.calls[1][0]).toContain("status='approved'");
    expect(queries.mock.calls[2][0]).toContain("ON CONFLICT (entity_type,entity_id,placement)");
    expect(queries.mock.calls[3][0]).toContain("INSERT INTO public.audit_logs");
  });

  it("refuses unpublished targets and unknown removals without audit", async () => {
    const createQuery = vi.fn().mockResolvedValueOnce({ rows: [{ allowed: true }] })
      .mockResolvedValueOnce({ rows: [] });
    await expect(saveFeaturedAdmin(admin, input, async callback => callback({ query: createQuery } as never)))
      .rejects.toMatchObject({ code: "FEATURE_TARGET_UNAVAILABLE" });
    expect(createQuery).toHaveBeenCalledTimes(2);
    const removeQuery = vi.fn().mockResolvedValue({ rows: [] });
    await expect(removeFeaturedAdmin(admin, itemId, async callback => callback({ query: removeQuery } as never)))
      .rejects.toMatchObject({ code: "FEATURED_ITEM_NOT_FOUND" });
    expect(removeQuery).toHaveBeenCalledOnce();
  });
});
