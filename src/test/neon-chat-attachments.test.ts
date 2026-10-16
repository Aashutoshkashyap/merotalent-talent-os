import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NeonAuthorizationError, type NeonActor } from "@/lib/server/neon-authorization";

const mocks = vi.hoisted(() => ({
  actor: null as NeonActor | null,
  membership: vi.fn(), upload: vi.fn(), download: vi.fn(), remove: vi.fn(),
  send: vi.fn(), attached: vi.fn(),
}));
vi.mock("@/lib/server/neon-session", async (importOriginal) => ({
  ...await importOriginal<typeof import("@/lib/server/neon-session")>(),
  getAuthenticatedApplicationUser: vi.fn(async () => {
    if (!mocks.actor) throw new NeonAuthorizationError(401, "AUTH_REQUIRED", "No session");
    return mocks.actor;
  }),
}));
vi.mock("@/lib/server/neon-application-events", () => ({ requireConversationMembership: mocks.membership }));
vi.mock("@/lib/server/application-storage", async (importOriginal) => ({
  ...await importOriginal<typeof import("@/lib/server/application-storage")>(),
  uploadBytes: mocks.upload, privateDownloadUrl: mocks.download,
}));
vi.mock("@/lib/server/storage", () => ({ deleteObject: mocks.remove }));
vi.mock("@/lib/server/neon-messaging", () => ({
  NeonMessagingRepository: class {
    sendMessage = mocks.send;
    attachmentForMessage = mocks.attached;
  },
}));

import { DELETE, GET, POST } from "../../app/api/v1/neon-staging/messaging/attachments/route";

const userId = "10000000-0000-4000-8000-000000000001";
const conversationId = "30000000-0000-4000-8000-000000000003";
const messageId = "40000000-0000-4000-8000-000000000004";
const endpoint = "https://app.test/api/v1/neon-staging/messaging/attachments";
const previousMode = process.env.MEROTALENT_BACKEND_MODE;

function upload(file: File, fields: Record<string, string> = { conversationId }, origin = "https://app.test") {
  const form = new FormData();
  for (const [key, value] of Object.entries(fields)) form.set(key, value);
  form.set("file", file);
  const request = new Request(endpoint, { method: "POST", headers: { origin, "content-length": String(file.size + 512) } });
  Object.defineProperty(request, "formData", { value: async () => form });
  return POST(request);
}
function pdf() { return new File(["%PDF-test"], "proof.pdf", { type: "application/pdf" }); }

beforeEach(() => {
  process.env.MEROTALENT_BACKEND_MODE = "neon-staging";
  mocks.actor = { userId, neonAuthUserId: "20000000-0000-4000-8000-000000000002",
    roles: ["talent"], permissions: [], platformAdmin: false };
  mocks.membership.mockResolvedValue(undefined);
  mocks.upload.mockResolvedValue({ bucket: "chat-attachments", path: `${userId}/chat_attachment/${conversationId}/50000000-0000-4000-8000-000000000005.pdf` });
  mocks.send.mockResolvedValue({ id: messageId, conversation_id: conversationId, attachment_path: "stored" });
  mocks.attached.mockResolvedValue({ id: messageId, conversation_id: conversationId,
    attachment_path: `${userId}/chat_attachment/${conversationId}/50000000-0000-4000-8000-000000000005.pdf`,
    attachment_mime_type: "application/pdf" });
  mocks.download.mockResolvedValue("https://isolated.test/short-lived");
  mocks.remove.mockResolvedValue(undefined);
});
afterEach(() => {
  if (previousMode === undefined) delete process.env.MEROTALENT_BACKEND_MODE;
  else process.env.MEROTALENT_BACKEND_MODE = previousMode;
  vi.clearAllMocks();
});

describe("private staging chat attachments", () => {
  it("is unavailable in legacy production mode", async () => {
    process.env.MEROTALENT_BACKEND_MODE = "legacy";
    expect((await upload(pdf())).status).toBe(404);
    expect((await GET(new Request(endpoint))).status).toBe(404);
  });
  it("rejects logged-out and cross-site uploads", async () => {
    mocks.actor = null;
    expect((await upload(pdf())).status).toBe(401);
    mocks.actor = { userId, neonAuthUserId: userId, roles: [], permissions: [], platformAdmin: false };
    expect((await upload(pdf(), { conversationId }, "https://evil.test")).status).toBe(403);
    expect(mocks.upload).not.toHaveBeenCalled();
  });
  it("validates type, signature, size and browser metadata before upload", async () => {
    expect((await upload(new File(["bad"], "fake.pdf", { type: "application/pdf" }))).status).toBe(415);
    expect((await upload(new File(["bad"], "fake.txt", { type: "text/plain" }))).status).toBe(415);
    expect((await upload(pdf(), { conversationId, path: "guessed" })).status).toBe(422);
    expect((await upload(pdf(), { conversationId: "bad" })).status).toBe(422);
    const oversized = new Request(endpoint, { method: "POST", headers: {
      origin: "https://app.test", "content-length": String(6 * 1024 * 1024),
    } });
    expect((await POST(oversized)).status).toBe(413);
    expect(mocks.upload).not.toHaveBeenCalled();
  });
  it("checks participant scope before storage and cleans only its new object on DB failure", async () => {
    mocks.membership.mockRejectedValueOnce(new NeonAuthorizationError(403, "CONVERSATION_FORBIDDEN", "No access"));
    expect((await upload(pdf())).status).toBe(403);
    expect(mocks.upload).not.toHaveBeenCalled();
    mocks.send.mockRejectedValueOnce(new Error("Database unavailable"));
    expect((await upload(pdf())).status).toBe(503);
    expect(mocks.remove).toHaveBeenCalledWith("chat-attachments", expect.stringContaining(userId));
  });
  it("uploads and persists an attachment message without client-supplied identity or key", async () => {
    const response = await upload(pdf());
    expect(response.status).toBe(201);
    expect(mocks.membership).toHaveBeenCalledWith(mocks.actor, conversationId);
    expect(mocks.upload).toHaveBeenCalledWith(mocks.actor, expect.objectContaining({ module: "chat_attachment", resourceId: conversationId }));
    expect(mocks.send).toHaveBeenCalledWith(mocks.actor, conversationId, "[ATTACHMENT] proof.pdf", expect.objectContaining({ mimeType: "application/pdf" }));
  });
  it("requires exact message and conversation for a short-lived download, never a raw key", async () => {
    const url = `${endpoint}?conversationId=${conversationId}&messageId=${messageId}`;
    expect((await GET(new Request(`${url}&path=guessed`))).status).toBe(422);
    mocks.attached.mockRejectedValueOnce(new NeonAuthorizationError(404, "ATTACHMENT_NOT_FOUND", "Wrong conversation"));
    expect((await GET(new Request(url))).status).toBe(404);
    const response = await GET(new Request(url));
    expect(response.status).toBe(200);
    expect(mocks.download).toHaveBeenCalledWith(mocks.actor, expect.objectContaining({ module: "chat_attachment", resourceId: conversationId, expiresIn: 60 }));
    expect((await response.json()).data.expiresIn).toBe(60);
  });
  it("does not offer browser deletion", async () => {
    expect((await DELETE()).status).toBe(405);
    expect(mocks.remove).not.toHaveBeenCalled();
  });
});
