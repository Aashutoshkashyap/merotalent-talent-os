import { beforeEach, describe, expect, it, vi } from "vitest";

const queryRowsMock = vi.hoisted(() => vi.fn());
vi.mock("@/lib/server/backend-mode", () => ({ getBackendMode: () => "neon-staging" }));
vi.mock("@/lib/server/db", () => ({ queryRows: queryRowsMock }));

import { GET } from "../../app/api/v1/institutes/[id]/blogs/route";

const id = "ed772638-328e-4866-85e5-926718d80f1c";
const context = (value = id) => ({ params: Promise.resolve({ id: value }) });

describe("public college blogs through Neon", () => {
  beforeEach(() => queryRowsMock.mockReset());

  it("rejects malformed college IDs and blog slugs without querying", async () => {
    expect((await GET(new Request("http://localhost/blogs"), context("invalid"))).status).toBe(400);
    expect((await GET(new Request("http://localhost/blogs?slug=../draft"), context())).status).toBe(400);
    expect(queryRowsMock).not.toHaveBeenCalled();
  });

  it("returns public list with approved-college and published-date guards", async () => {
    queryRowsMock.mockResolvedValueOnce([{ id: "blog", slug: "welcome" }]);
    const response = await GET(new Request("http://localhost/blogs"), context());
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ data: [{ id: "blog", slug: "welcome" }] });
    const [sql, params] = queryRowsMock.mock.calls[0];
    expect(sql).toContain("i.status='approved'");
    expect(sql).toContain("b.status='published'");
    expect(sql).toContain("b.deleted_at IS NULL");
    expect(sql).toContain("b.published_at <= now()");
    expect(params).toEqual([id]);
  });

  it("returns only the requested published blog, not a private or future draft", async () => {
    queryRowsMock.mockResolvedValueOnce([]);
    const response = await GET(new Request("http://localhost/blogs?slug=welcome"), context());
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ data: null });
    const [sql, params] = queryRowsMock.mock.calls[0];
    expect(sql).toContain("b.slug=$2");
    expect(sql).toContain("i.status='approved'");
    expect(sql).toContain("b.status='published'");
    expect(sql).toContain("b.published_at <= now()");
    expect(params).toEqual([id, "welcome"]);
  });

  it("fails closed when the staging database is unavailable", async () => {
    queryRowsMock.mockRejectedValueOnce(new Error("offline"));
    const response = await GET(new Request("http://localhost/blogs"), context());
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: "College updates are unavailable." });
  });
});
