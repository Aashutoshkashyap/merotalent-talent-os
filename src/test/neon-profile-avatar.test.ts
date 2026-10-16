import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NeonAuthorizationError, type NeonActor } from "@/lib/server/neon-authorization";

const mocks = vi.hoisted(() => ({
  actor: null as NeonActor | null,
  upload: vi.fn(), publicUrl: vi.fn(), remove: vi.fn(), transaction: vi.fn(),
}));
vi.mock("@/lib/server/neon-session", async (importOriginal) => ({
  ...await importOriginal<typeof import("@/lib/server/neon-session")>(),
  getAuthenticatedApplicationUser: vi.fn(async () => {
    if (!mocks.actor) throw new NeonAuthorizationError(401, "AUTH_REQUIRED", "No session");
    return mocks.actor;
  }),
}));
vi.mock("@/lib/server/application-storage", async (importOriginal) => ({
  ...await importOriginal<typeof import("@/lib/server/application-storage")>(),
  uploadBytes: mocks.upload, publicObjectUrl: mocks.publicUrl,
}));
vi.mock("@/lib/server/storage", () => ({ deleteObject: mocks.remove }));
vi.mock("@/lib/server/db", async (importOriginal) => ({
  ...await importOriginal<typeof import("@/lib/server/db")>(),
  withTransaction: mocks.transaction,
}));

import { POST } from "../../app/api/v1/neon-staging/profile/avatar/route";
const endpoint = "https://app.test/api/v1/neon-staging/profile/avatar";
const userId = "10000000-0000-4000-8000-000000000001";
const previousMode = process.env.MEROTALENT_BACKEND_MODE;
const png = new File([Uint8Array.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a,0])], "photo.png", { type: "image/png" });

function request(file = png, origin = "https://app.test") {
  const form = new FormData(); form.set("file", file);
  const req = new Request(endpoint, { method: "POST", headers: { origin, "content-length": String(file.size + 512) } });
  Object.defineProperty(req, "formData", { value: async () => form });
  return POST(req);
}
beforeEach(() => {
  process.env.MEROTALENT_BACKEND_MODE = "neon-staging";
  mocks.actor = { userId, neonAuthUserId: "20000000-0000-4000-8000-000000000002",
    roles: ["talent"], permissions: [], platformAdmin: false };
  mocks.upload.mockResolvedValue({ bucket: "profile-media", path: `${userId}/profile_avatar/self/30000000-0000-4000-8000-000000000003.png` });
  mocks.publicUrl.mockResolvedValue("https://staging.test/signed-photo");
  mocks.remove.mockResolvedValue(undefined);
  mocks.transaction.mockImplementation(async (callback) => callback({ query: vi.fn(async (sql: string) =>
    sql.includes("SELECT p.avatar_url") ? { rows: [{ avatar_url: null }] } : { rows: [] }) }));
});
afterEach(() => {
  if (previousMode === undefined) delete process.env.MEROTALENT_BACKEND_MODE;
  else process.env.MEROTALENT_BACKEND_MODE = previousMode;
  vi.clearAllMocks();
});

describe("linked own-profile staging avatar", () => {
  it("preserves legacy production mode and denies anonymous or cross-site uploads", async () => {
    process.env.MEROTALENT_BACKEND_MODE = "legacy";
    expect((await request()).status).toBe(404);
    process.env.MEROTALENT_BACKEND_MODE = "neon-staging";
    mocks.actor = null;
    expect((await request()).status).toBe(401);
    mocks.actor = { userId, neonAuthUserId: userId, roles: [], permissions: [], platformAdmin: false };
    expect((await request(png, "https://evil.test")).status).toBe(403);
    expect(mocks.upload).not.toHaveBeenCalled();
  });
  it("rejects non-images, forged bytes and oversize bodies", async () => {
    expect((await request(new File(["%PDF-test"], "photo.pdf", { type: "application/pdf" }))).status).toBe(415);
    expect((await request(new File(["not-png"], "photo.png", { type: "image/png" }))).status).toBe(415);
    const req = new Request(endpoint, { method: "POST", headers: { origin: "https://app.test", "content-length": String(6*1024*1024) } });
    expect((await POST(req)).status).toBe(413);
    expect(mocks.upload).not.toHaveBeenCalled();
  });
  it("persists only the linked account's generated avatar path and returns a browser URL", async () => {
    const response = await request();
    expect(response.status).toBe(201);
    expect((await response.json()).data.avatarUrl).toBe("https://staging.test/signed-photo");
    expect(mocks.upload).toHaveBeenCalledWith(mocks.actor, expect.objectContaining({ module: "profile_avatar", resourceId: null }));
    expect(mocks.transaction).toHaveBeenCalledOnce();
  });
  it("removes only its newly uploaded object when the linked profile update fails", async () => {
    mocks.transaction.mockRejectedValueOnce(new NeonAuthorizationError(403, "IDENTITY_NOT_LINKED", "No profile"));
    expect((await request()).status).toBe(403);
    expect(mocks.remove).toHaveBeenCalledWith("profile-media", expect.stringContaining(userId));
  });
  it("replaces only an earlier canonical avatar owned by the same profile", async () => {
    const oldPath = `${userId}/profile_avatar/self/40000000-0000-4000-8000-000000000004.png`;
    mocks.transaction.mockImplementationOnce(async (callback) => callback({ query: vi.fn(async (sql: string) =>
      sql.includes("SELECT p.avatar_url") ? { rows: [{ avatar_url: oldPath }] } : { rows: [] }) }));
    expect((await request()).status).toBe(201);
    expect(mocks.remove).toHaveBeenCalledWith("profile-media", oldPath);
  });
  it("never deletes an unrelated historical avatar reference", async () => {
    mocks.transaction.mockImplementationOnce(async (callback) => callback({ query: vi.fn(async (sql: string) =>
      sql.includes("SELECT p.avatar_url") ? { rows: [{ avatar_url: "https://other.example/photo.png" }] } : { rows: [] }) }));
    expect((await request()).status).toBe(201);
    expect(mocks.remove).not.toHaveBeenCalled();
  });
});
