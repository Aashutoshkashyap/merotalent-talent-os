import { beforeEach, describe, expect, it, vi } from "vitest";

const queryRowsMock = vi.hoisted(() => vi.fn());
vi.mock("@/lib/server/backend-mode", () => ({ getBackendMode: () => "neon-staging" }));
vi.mock("@/lib/server/db", () => ({ queryRows: queryRowsMock }));

import { GET } from "../../app/api/v1/institutes/[id]/updates/route";

const instituteId = "ed772638-328e-4866-85e5-926718d80f1c";
const request = new Request(`http://localhost/api/v1/institutes/${instituteId}/updates`);
const context = (id = instituteId) => ({ params: Promise.resolve({ id }) });

describe("public college updates through Neon", () => {
  beforeEach(() => queryRowsMock.mockReset());

  it("rejects invalid IDs before querying", async () => {
    const response = await GET(request, context("invalid"));
    expect(response.status).toBe(400);
    expect(queryRowsMock).not.toHaveBeenCalled();
  });

  it("returns only published updates for an approved public college", async () => {
    queryRowsMock.mockResolvedValueOnce([{ blogs: [{ id: "blog", title: "Update" }],
      notices: [{ id: "notice", title: "Admission" }] }]);
    const response = await GET(request, context());
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ data: {
      blogs: [{ id: "blog", title: "Update" }],
      notices: [{ id: "notice", title: "Admission" }],
    } });
    expect(queryRowsMock).toHaveBeenCalledTimes(1);
    for (const [sql, params] of queryRowsMock.mock.calls) {
      expect(sql).toContain("i.status='approved'");
      expect(sql).toContain("i.deleted_at IS NULL");
      expect(sql).toContain("published_at <= now()");
      expect(params).toEqual([instituteId]);
    }
    expect(queryRowsMock.mock.calls[0][0]).toContain("status='published' AND deleted_at IS NULL");
  });

  it("fails closed when Neon is unavailable", async () => {
    queryRowsMock.mockRejectedValueOnce(new Error("Neon unavailable"));
    const response = await GET(request, context());
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: "College updates are unavailable." });
  });
});
