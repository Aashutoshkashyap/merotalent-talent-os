import { beforeEach, describe, expect, it, vi } from "vitest";

const queryRowsMock = vi.hoisted(() => vi.fn());
const actorMock = vi.hoisted(() => vi.fn());
vi.mock("@/lib/server/backend-mode", () => ({ getBackendMode: () => "neon-staging" }));
vi.mock("@/lib/server/db", () => ({ queryRows: queryRowsMock }));
vi.mock("@/lib/server/neon-session", async (original) => ({
  ...await original<typeof import("@/lib/server/neon-session")>(),
  getAuthenticatedApplicationUser: actorMock,
}));

import { POST } from "../../app/api/v1/neon-staging/contact-queries/route";
import { DELETE, GET, PATCH } from "../../app/api/v1/neon-staging/admin/contact-queries/route";

const url = "http://localhost/api/v1/neon-staging/contact-queries";
const adminUrl = "http://localhost/api/v1/neon-staging/admin/contact-queries";
const id = "ed772638-328e-4866-85e5-926718d80f1c";
const actor = { userId: id, neonAuthUserId: id, roles: ["super_admin"], permissions: [], platformAdmin: true };
const input = { name: "Student", email: "student@example.com", subject: "Help", message: "Please contact me." };
const write = (endpoint: string, method: string, body: unknown, origin = "http://localhost") =>
  new Request(endpoint, { method, headers: { origin, "Content-Type": "application/json" }, body: JSON.stringify(body) });

describe("Neon contact inquiry and Super Admin inbox", () => {
  beforeEach(() => {
    queryRowsMock.mockReset();
    actorMock.mockReset();
    actorMock.mockResolvedValue(actor);
  });

  it("stores a validated anonymous inquiry before returning success", async () => {
    queryRowsMock.mockResolvedValueOnce([{ id }]);
    const result = await POST(write(url, "POST", input));
    expect(result.status).toBe(201);
    expect(await result.json()).toEqual({ data: { id } });
    const [sql, params] = queryRowsMock.mock.calls[0];
    expect(sql).toContain("INSERT INTO public.contact_queries");
    expect(sql).toContain("RETURNING id");
    expect(params).toEqual(["Student", "student@example.com", "Help", "Please contact me."]);
  });

  it("rejects malformed/cross-origin writes and never claims failed persistence", async () => {
    expect((await POST(write(url, "POST", input, "https://other.example"))).status).toBe(403);
    expect((await POST(write(url, "POST", { ...input, email: "bad" }))).status).toBe(400);
    expect(queryRowsMock).not.toHaveBeenCalled();
    queryRowsMock.mockResolvedValueOnce([]).mockRejectedValueOnce(new Error("offline"));
    expect((await POST(write(url, "POST", input))).status).toBe(429);
    expect((await POST(write(url, "POST", input))).status).toBe(503);
  });

  it("lists private inquiries only to an authenticated platform administrator", async () => {
    actorMock.mockResolvedValueOnce({ ...actor, roles: [], platformAdmin: false });
    expect((await GET(new Request(adminUrl))).status).toBe(403);
    expect(queryRowsMock).not.toHaveBeenCalled();
    queryRowsMock.mockResolvedValueOnce([{ id, name: "Student" }]);
    const result = await GET(new Request(adminUrl));
    expect(result.status).toBe(200);
    expect((await result.json()).data[0].id).toBe(id);
    expect(result.headers.get("Cache-Control")).toBe("private, no-store");
  });

  it("updates and deletes only through same-origin admin operations with atomic role guards", async () => {
    queryRowsMock.mockResolvedValueOnce([{ id, status: "resolved" }]).mockResolvedValueOnce([{ id }]);
    const patched = await PATCH(write(adminUrl, "PATCH", { id, response: "Done", status: "resolved" }));
    expect(patched.status).toBe(200);
    const [patchSql, patchParams] = queryRowsMock.mock.calls[0];
    expect(patchSql).toContain("UPDATE public.contact_queries");
    expect(patchSql).toContain("ur.role IN ('admin','super_admin')");
    expect(patchParams).toEqual([id, id, "Done", "resolved"]);
    const deleted = await DELETE(write(adminUrl, "DELETE", { id }));
    expect(deleted.status).toBe(200);
    expect(queryRowsMock.mock.calls[1][0]).toContain("DELETE FROM public.contact_queries");
    expect((await PATCH(write(adminUrl, "PATCH", { id, response: "", status: "resolved" }))).status).toBe(400);
  });
});
