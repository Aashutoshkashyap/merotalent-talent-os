import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { NeonActor } from "@/lib/server/neon-authorization";

const mocks = vi.hoisted(() => ({
  query: vi.fn(), transaction: vi.fn(), access: vi.fn(), generate: vi.fn(),
  actor: null as NeonActor | null,
}));
vi.mock("@/lib/server/db", async original => ({
  ...await original<typeof import("@/lib/server/db")>(),
  queryRows: mocks.query, withTransaction: mocks.transaction,
}));
vi.mock("@/lib/server/neon-authorization", async original => ({
  ...await original<typeof import("@/lib/server/neon-authorization")>(),
  requireEntityAccess: mocks.access,
}));
vi.mock("@/lib/server/neon-session", async original => ({
  ...await original<typeof import("@/lib/server/neon-session")>(),
  getAuthenticatedApplicationUser: vi.fn(async () => {
    if (!mocks.actor) throw new (await import("@/lib/server/neon-authorization")).NeonAuthorizationError(401, "AUTH_REQUIRED", "Sign in.");
    return mocks.actor;
  }),
}));
vi.mock("@/lib/server/ai-provider", async original => ({
  ...await original<typeof import("@/lib/server/ai-provider")>(),
  getAIProvider: vi.fn(() => ({ name: "openai-compatible", generate: mocks.generate })),
}));

import { AIProviderUnavailableError, getAIProvider } from "@/lib/server/ai-provider";
import { encryptProviderSecret } from "@/lib/server/secret-store";
import { generateNeonAIDraft, generateNeonAdminAIDraft, getNeonAIStatus, parseAIScope, saveNeonAISecret } from "@/lib/server/neon-ai";
import { GET as getByok, PUT as putByok } from "../../app/api/v1/neon-staging/ai/byok/route";
import { POST as generateRoute } from "../../app/api/v1/neon-staging/ai/generate/route";
import { GET as scopesRoute } from "../../app/api/v1/neon-staging/ai/scopes/route";

const origin = "https://staging.test";
const userId = "10000000-0000-4000-8000-000000000001";
const entityId = "20000000-0000-4000-8000-000000000002";
const actor: NeonActor = { userId, neonAuthUserId: "30000000-0000-4000-8000-000000000003",
  roles: ["institution"], permissions: [], platformAdmin: false };
const scope = { module: "college" as const, entityType: "college" as const, entityId };
const oldMode = process.env.MEROTALENT_BACKEND_MODE;
const oldKey = process.env.PROVIDER_CONFIG_ENCRYPTION_KEY;
const request = (path: string, method = "GET", body?: object, requestOrigin = origin) => new Request(`${origin}${path}`, {
  method, headers: { origin: requestOrigin, "Content-Type": "application/json" },
  ...(body ? { body: JSON.stringify(body) } : {}),
});

beforeEach(() => {
  process.env.MEROTALENT_BACKEND_MODE = "neon-staging";
  process.env.PROVIDER_CONFIG_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString("base64");
  mocks.actor = actor;
  mocks.access.mockResolvedValue(undefined);
  mocks.query.mockResolvedValue([]);
  mocks.generate.mockResolvedValue("An editable public description.");
  mocks.transaction.mockImplementation(async callback => callback({ query: vi.fn(async sql => ({ rows: sql.includes("RETURNING") ? [{ is_enabled: true }] : [] })) }));
});
afterEach(() => {
  if (oldMode === undefined) delete process.env.MEROTALENT_BACKEND_MODE; else process.env.MEROTALENT_BACKEND_MODE = oldMode;
  if (oldKey === undefined) delete process.env.PROVIDER_CONFIG_ENCRYPTION_KEY; else process.env.PROVIDER_CONFIG_ENCRYPTION_KEY = oldKey;
  vi.clearAllMocks();
});

describe("Neon entity AI boundary", () => {
  it("prevents module users and forged admin flags from invoking unscoped platform drafts",async()=>{
    await expect(generateNeonAdminAIDraft(actor,{module:"jobs",title:"New posting"})).rejects.toMatchObject({code:"ADMIN_REQUIRED"});
    expect(mocks.query).not.toHaveBeenCalled();
    mocks.query.mockResolvedValueOnce([{allowed:false}]);
    await expect(generateNeonAdminAIDraft({...actor,platformAdmin:true},{module:"jobs",title:"New posting"})).rejects.toMatchObject({code:"ADMIN_REQUIRED"});
    expect(mocks.generate).not.toHaveBeenCalled();
  });
  it("uses only platform configuration for verified Super Admin pre-creation drafts and logs null entity scope",async()=>{
    const encrypted=encryptProviderSecret("sample-platform-secret");
    mocks.query.mockResolvedValueOnce([{allowed:true}]).mockResolvedValueOnce([{provider_name:"openai-compatible",is_enabled:true,
      secret_ciphertext:encrypted.ciphertext,secret_iv:encrypted.iv,secret_tag:encrypted.tag}]);
    const result=await generateNeonAdminAIDraft({...actor,platformAdmin:true},{module:"jobs",title:"New posting",context:"Public duties"});
    expect(result.draft).toBe("An editable public description.");
    expect(mocks.access).not.toHaveBeenCalled();
    expect(mocks.query.mock.calls[1][0]).toContain("provider_configurations");
    expect(mocks.query.mock.calls[2][1]).toEqual([userId,"jobs",null,null,"openai-compatible","succeeded",expect.any(Number),expect.any(Number)]);
    expect(JSON.stringify(result)).not.toContain("sample-platform-secret");
  });
  it("rejects altered module, entity type, and ID before a database read", async () => {
    expect(() => parseAIScope({ module: "jobs", entityType: "college", entityId })).toThrow();
    expect(() => parseAIScope({ module: "college", entityType: "college", entityId: userId.slice(0, 4) })).toThrow();
    expect(mocks.query).not.toHaveBeenCalled();
  });

  it("denies anonymous, foreign-origin and unentitled actions", async () => {
    mocks.actor = null;
    expect((await getByok(request(`/api/v1/neon-staging/ai/byok?module=college&entity_type=college&entity_id=${entityId}`))).status).toBe(401);
    mocks.actor = actor;
    expect((await putByok(request("/api/v1/neon-staging/ai/byok", "PUT", { ...scope, providerName: "openai-compatible", secret: "fake" }, "https://other.test"))).status).toBe(403);
    mocks.access.mockRejectedValueOnce(new (await import("@/lib/server/neon-authorization")).NeonAuthorizationError(403, "ENTITY_ACCESS_REQUIRED", "Denied"));
    expect((await generateRoute(request("/api/v1/neon-staging/ai/generate", "POST", { ...scope, title: "Title" }))).status).toBe(403);
    expect(mocks.generate).not.toHaveBeenCalled();
  });

  it("reads only own scoped key status and stores encrypted BYOK plus audit atomically", async () => {
    mocks.query.mockResolvedValueOnce([{ provider_name: "openai-compatible", is_enabled: false }]);
    expect(await getNeonAIStatus(actor, scope)).toMatchObject({ configured: true, enabled: false });
    expect(mocks.query).toHaveBeenCalledWith(expect.stringContaining("user_id=$1::uuid"),
      [userId, "college", "college", entityId]);
    const result = await saveNeonAISecret(actor, scope, { providerName: "openai-compatible", secret: "sample-secret", enabled: true });
    expect(result).toMatchObject({ configured: true, enabled: true });
    expect(JSON.stringify(result)).not.toContain("sample-secret");
    expect(mocks.transaction).toHaveBeenCalledOnce();
    expect(mocks.access).toHaveBeenCalledWith(actor, "college", "college", entityId,
      "ai.description.generate", expect.objectContaining({ query: expect.any(Function) }));
  });

  it("fails closed without a provider and never calls an AI provider", async () => {
    await expect(generateNeonAIDraft(actor, scope, { title: "College" })).rejects.toBeInstanceOf(AIProviderUnavailableError);
    expect(mocks.generate).not.toHaveBeenCalled();
  });

  it("uses encrypted own key before platform fallback and logs only usage metadata", async () => {
    const encrypted = encryptProviderSecret("sample-provider-secret");
    mocks.query.mockResolvedValueOnce([{ provider_name: "openai-compatible", is_enabled: true,
      secret_ciphertext: encrypted.ciphertext, secret_iv: encrypted.iv, secret_tag: encrypted.tag }]);
    const output = await generateNeonAIDraft(actor, scope, { title: "College", context: "Public courses" });
    expect(output.draft).toBe("An editable public description.");
    expect(getAIProvider).toHaveBeenCalledWith(expect.objectContaining({ apiKey: "sample-provider-secret" }));
    expect(mocks.query).toHaveBeenCalledTimes(2);
    expect(mocks.query.mock.calls[1][0]).toContain("ai_usage_logs");
    expect(JSON.stringify(mocks.query.mock.calls[1])).not.toContain("sample-provider-secret");
  });

  it("keeps the staging routes private and lists only server-filtered assignments", async () => {
    mocks.query.mockResolvedValueOnce([{ id: entityId, module: "jobs", entityType: "company", entityId }]);
    expect((await scopesRoute(request("/api/v1/neon-staging/ai/scopes"))).status).toBe(200);
    expect(mocks.query).toHaveBeenCalledWith(expect.stringContaining("ea.user_id=$1::uuid"), [userId]);
    const missing = await getByok(request("/api/v1/neon-staging/ai/byok?module=jobs&entity_type=college&entity_id=" + entityId));
    expect(missing.status).toBe(400);
  });
});
