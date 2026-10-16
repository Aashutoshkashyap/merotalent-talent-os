import { beforeEach, describe, expect, it, vi } from "vitest";

const queryRowsMock = vi.hoisted(() => vi.fn());
const publicObjectUrlMock = vi.hoisted(() => vi.fn());
vi.mock("@/lib/server/backend-mode", () => ({ getBackendMode: () => "neon-staging" }));
vi.mock("@/lib/server/db", () => ({ queryRows: queryRowsMock }));
vi.mock("@/lib/server/application-storage", () => ({ publicObjectUrl: publicObjectUrlMock }));

import { GET as directoryGet } from "../../app/api/v1/institutes/directory/route";
import { GET as mediaGet } from "../../app/api/v1/institutes/media/route";
import { fetchPublicInstitute, fetchPublicInstitutes, invalidatePublicInstituteCache, resolveCollegeMediaUrl } from "@/lib/institutes/public-institutes";

const collegeId = "ed772638-328e-4866-85e5-926718d80f1c";

describe("public institute directory Neon boundary", () => {
  beforeEach(() => {
    queryRowsMock.mockReset();
    publicObjectUrlMock.mockReset();
    invalidatePublicInstituteCache();
    vi.unstubAllGlobals();
  });

  it("rejects invalid filters without querying", async () => {
    expect((await directoryGet(new Request("http://localhost/api/v1/institutes/directory?sort=random"))).status).toBe(400);
    expect((await directoryGet(new Request("http://localhost/api/v1/institutes/directory?limit=9999"))).status).toBe(400);
    expect((await directoryGet(new Request("http://localhost/api/v1/institutes/directory?identifier=../../private"))).status).toBe(400);
    expect(queryRowsMock).not.toHaveBeenCalled();
  });

  it("uses only the approved public directory view with parameterized filters and stable placement input", async () => {
    queryRowsMock.mockResolvedValueOnce([{ data: [{ id: collegeId, name: "College A" }], positions: [], count: 1 }]);
    const result = await directoryGet(new Request("http://localhost/api/v1/institutes/directory?search=College+A&category=college&sort=recommended&limit=6"));
    expect(result.status).toBe(200);
    expect(await result.json()).toEqual({ data: [{ id: collegeId, name: "College A" }], positions: [], count: 1 });
    const [sql, values] = queryRowsMock.mock.calls[0];
    expect(sql).toContain("FROM public.institute_directory d");
    expect(sql).not.toContain("source_url");
    expect(sql).toContain("lower(d.search_document) LIKE ALL($1::text[])");
    expect(sql).toContain("WHERE admission_status = 'open' AND ranking IS NOT NULL");
    expect(values[0]).toEqual(["%college%", "%a%"]);
    expect(values[1]).toEqual(["college", "colleges", "university", "universities", "campus"]);
    expect(sql).toContain("LIMIT ($7::int + (SELECT count(*)::int FROM positions))");
    expect(values[6]).toBe(6);
  });

  it("looks up an exact public UUID or slug and never reads the base table", async () => {
    queryRowsMock.mockResolvedValueOnce([{ id: collegeId }]).mockResolvedValueOnce([]);
    expect((await (await directoryGet(new Request(`http://localhost/api/v1/institutes/directory?identifier=${collegeId}`))).json()).data.id).toBe(collegeId);
    expect((await (await directoryGet(new Request("http://localhost/api/v1/institutes/directory?identifier=sample-college"))).json()).data).toBeNull();
    expect(queryRowsMock.mock.calls[0][0]).toContain("d.id = $1::uuid");
    expect(queryRowsMock.mock.calls[1][0]).toContain("d.slug = $1");
  });

  it("supports a name-only filter for the college claim typeahead", async () => {
    queryRowsMock.mockResolvedValueOnce([{ data: [{ id: collegeId, name: "College A" }], positions: [], count: 1 }]);
    const result = await directoryGet(new Request("http://localhost/api/v1/institutes/directory?name=College+A&sort=name&limit=8"));
    expect(result.status).toBe(200);
    const [sql, values] = queryRowsMock.mock.calls[0];
    expect(sql).toContain("d.name ILIKE $6");
    expect(values[5]).toBe("%College A%");
    expect(values[6]).toBe(8);
  });

  it("fails closed on Neon outage instead of falling back to Supabase", async () => {
    queryRowsMock.mockRejectedValueOnce(new Error("offline"));
    const result = await directoryGet(new Request("http://localhost/api/v1/institutes/directory"));
    expect(result.status).toBe(503);
  });

  it("routes browser listing/detail calls through same-origin API and preserves placement", async () => {
    const target = { id: collegeId, name: "College A", ranking: 3, admission_status: "open" };
    const fetchMock = vi.fn().mockResolvedValueOnce(new Response(JSON.stringify({ data: [target], positions: [target], count: 1 }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: target }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const list = await fetchPublicInstitutes({ search: "", category: "all", location: "", affiliation: "", admissionStatus: "", sort: "recommended", limit: 6 });
    const detail = await fetchPublicInstitute(collegeId);
    expect(list.count).toBe(1);
    expect(list.institutes[0].id).toBe(collegeId);
    expect(detail?.id).toBe(collegeId);
    expect(fetchMock.mock.calls[0][0]).toContain("/api/v1/institutes/directory?");
    expect(fetchMock.mock.calls[1][0]).toContain(`identifier=${collegeId}`);
  });

  it("resolves canonical public college paths through only the public media bucket", async () => {
    expect(resolveCollegeMediaUrl("logos/sample.png")).toBe("/api/v1/institutes/media?path=logos%2Fsample.png");
    expect(resolveCollegeMediaUrl("../private.pdf")).toBe("/placeholder.svg");
    publicObjectUrlMock.mockResolvedValueOnce("https://isolated.example/signed-image");
    const response = await mediaGet(new Request("http://localhost/api/v1/institutes/media?path=logos%2Fsample.png"));
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("https://isolated.example/signed-image");
    expect(publicObjectUrlMock).toHaveBeenCalledWith("college_logo", "logos/sample.png");
  });
});
