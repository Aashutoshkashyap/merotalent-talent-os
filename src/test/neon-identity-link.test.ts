import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ session: null as any, queries: [] as string[], queryArgs: [] as unknown[][], profile: true,
  profileStatus: "active", account: null as any, subject: null as any, fetch: vi.fn(), withTransaction: vi.fn() }));
vi.mock("@/lib/server/neon-session", async (load) => ({
  ...await load<typeof import("@/lib/server/neon-session")>(),
  managedSessionVerifier: { verify: async () => mocks.session },
}));
vi.mock("@/lib/server/db", async (load) => ({
  ...await load<typeof import("@/lib/server/db")>(), withTransaction: mocks.withTransaction,
}));
import { linkVerifiedLegacyIdentity } from "@/lib/server/neon-identity-link";

const legacy = "10000000-0000-4000-8000-000000000001";
const managed = "20000000-0000-4000-8000-000000000002";
const other = "30000000-0000-4000-8000-000000000003";
const request = new Request("https://app.test/api/v1/neon-staging/auth/link-legacy", { method: "POST" });
const previousUrl = process.env.SUPABASE_URL;
const previousKey = process.env.SUPABASE_PUBLISHABLE_KEY;
const previousAllowed = process.env.NEON_STAGING_IDENTITY_ALLOWED_SOURCE_ID;
const previousMode = process.env.NEON_STAGING_IDENTITY_LINK_MODE;

beforeEach(() => {
  process.env.SUPABASE_URL = "https://dtirpilgzlsfryucanlg.supabase.co";
  process.env.SUPABASE_PUBLISHABLE_KEY = "test-public-key";
  process.env.NEON_STAGING_IDENTITY_ALLOWED_SOURCE_ID = legacy;
  process.env.NEON_STAGING_IDENTITY_LINK_MODE = "synthetic-only";
  mocks.session = { user: { id: managed, emailVerified: true }, session: { userId: managed, expiresAt: "2099-01-01" } };
  mocks.queries = []; mocks.queryArgs = []; mocks.profile = true; mocks.profileStatus = "active"; mocks.account = null; mocks.subject = null;
  mocks.fetch.mockResolvedValue({ ok: true, status: 200, json: async () => ({ id: legacy, email_confirmed_at: "2026-01-01" }) });
  vi.stubGlobal("fetch", mocks.fetch);
  mocks.withTransaction.mockImplementation(async (callback) => callback({ query: async (sql: string, params: unknown[] = []) => {
    mocks.queries.push(sql);
    mocks.queryArgs.push(params);
    if (sql.includes("FROM public.profiles")) return { rows: mocks.profile ? [{ user_id: legacy, account_status: mocks.profileStatus }] : [] };
    if (sql.includes("FROM public.neon_application_accounts")) return { rows: mocks.account ? [mocks.account] : [] };
    if (sql.includes("FROM public.neon_identity_links")) return { rows: mocks.subject ? [mocks.subject] : [] };
    if (sql.includes("INSERT INTO public.neon_application_accounts")) return { rows: [{ id: other }] };
    return { rows: [] };
  } }));
});
afterEach(() => {
  if (previousUrl === undefined) delete process.env.SUPABASE_URL; else process.env.SUPABASE_URL = previousUrl;
  if (previousKey === undefined) delete process.env.SUPABASE_PUBLISHABLE_KEY; else process.env.SUPABASE_PUBLISHABLE_KEY = previousKey;
  if (previousAllowed === undefined) delete process.env.NEON_STAGING_IDENTITY_ALLOWED_SOURCE_ID; else process.env.NEON_STAGING_IDENTITY_ALLOWED_SOURCE_ID = previousAllowed;
  if (previousMode === undefined) delete process.env.NEON_STAGING_IDENTITY_LINK_MODE; else process.env.NEON_STAGING_IDENTITY_LINK_MODE = previousMode;
  vi.unstubAllGlobals(); vi.clearAllMocks();
});

describe("staging dual-auth identity link", () => {
  it("requires a current verified Managed Auth session before contacting source Auth", async () => {
    mocks.session = null;
    await expect(linkVerifiedLegacyIdentity(request, "source-token")).rejects.toMatchObject({ code: "AUTH_REQUIRED" });
    expect(mocks.fetch).not.toHaveBeenCalled();
    mocks.session = { user: { id: managed, emailVerified: false }, session: { userId: managed, expiresAt: "2099-01-01" } };
    await expect(linkVerifiedLegacyIdentity(request, "source-token")).rejects.toMatchObject({ code: "MANAGED_ACCOUNT_UNVERIFIED" });
  });

  it("requires a valid verified legacy session, never email equality", async () => {
    mocks.fetch.mockResolvedValueOnce({ status: 401, ok: false });
    await expect(linkVerifiedLegacyIdentity(request, "source-token")).rejects.toMatchObject({ code: "LEGACY_PROOF_INVALID" });
    mocks.fetch.mockResolvedValueOnce({ status: 200, ok: true, json: async () => ({ id: legacy, email_confirmed_at: null }) });
    await expect(linkVerifiedLegacyIdentity(request, "source-token")).rejects.toMatchObject({ code: "LEGACY_ACCOUNT_UNVERIFIED" });
    expect(mocks.queries).toHaveLength(0);
  });

  it("dry-runs without writes, links once with audit, and retries idempotently", async () => {
    expect(await linkVerifiedLegacyIdentity(request, "source-token", true)).toEqual({ status: "would_link" });
    expect(mocks.queries.every((sql) => sql.trim().startsWith("SELECT"))).toBe(true);
    mocks.queries = [];
    expect(await linkVerifiedLegacyIdentity(request, "source-token")).toEqual({ status: "linked" });
    expect(mocks.queries.some((sql) => sql.includes("INSERT INTO public.neon_identity_links"))).toBe(true);
    expect(mocks.queries.some((sql) => sql.includes("INSERT INTO public.audit_logs"))).toBe(true);
    mocks.queries = []; mocks.account = { id: other, status: "active", neon_auth_user_id: managed, link_status: "verified" };
    expect(await linkVerifiedLegacyIdentity(request, "source-token")).toEqual({ status: "already_linked" });
    expect(mocks.queries.every((sql) => sql.trim().startsWith("SELECT"))).toBe(true);
  });

  it("denies missing profiles and conflicting or inactive mappings", async () => {
    mocks.profile = false;
    await expect(linkVerifiedLegacyIdentity(request, "source-token")).rejects.toMatchObject({ code: "LEGACY_PROFILE_MISSING" });
    mocks.profile = true;
    mocks.account = { id: other, status: "active", neon_auth_user_id: other, link_status: "verified" };
    await expect(linkVerifiedLegacyIdentity(request, "source-token")).rejects.toMatchObject({ code: "LEGACY_IDENTITY_CONFLICT" });
    mocks.account = { id: other, status: "disabled", neon_auth_user_id: null };
    await expect(linkVerifiedLegacyIdentity(request, "source-token")).rejects.toMatchObject({ code: "LEGACY_ACCOUNT_INACTIVE" });
    mocks.account = null; mocks.subject = { application_account_id: other };
    await expect(linkVerifiedLegacyIdentity(request, "source-token")).rejects.toMatchObject({ code: "MANAGED_IDENTITY_CONFLICT" });
  });

  it("never treats a duplicate email as a mapping and fails closed on a concurrent insert", async () => {
    mocks.fetch.mockResolvedValueOnce({ status: 200, ok: true,
      json: async () => ({ id: other, email: "same@example.test", email_confirmed_at: "2026-01-01" }) });
    mocks.profile = false;
    await expect(linkVerifiedLegacyIdentity(request, "source-token")).rejects.toMatchObject({ code: "SOURCE_ACCOUNT_NOT_ALLOWED" });
    expect(mocks.queries.some((sql) => sql.includes("email"))).toBe(false);
    mocks.profile = true;
    mocks.withTransaction.mockRejectedValueOnce(Object.assign(new Error("unique violation"), { code: "23505" }));
    await expect(linkVerifiedLegacyIdentity(request, "source-token")).rejects.toMatchObject({ code: "IDENTITY_LINK_RACE" });
  });

  it("preserves the application ID and existing scopes rather than copying them to another user", async () => {
    mocks.session.user.email = "different-managed@example.test";
    mocks.fetch.mockResolvedValueOnce({ status: 200, ok: true,
      json: async () => ({ id: legacy, email: "legacy@example.test", email_confirmed_at: "2026-01-01" }) });
    expect(await linkVerifiedLegacyIdentity(request, "source-token")).toEqual({ status: "linked" });
    const profileIndex = mocks.queries.findIndex(sql => sql.includes("FROM public.profiles"));
    const accountIndex = mocks.queries.findIndex(sql => sql.includes("INSERT INTO public.neon_application_accounts"));
    const linkIndex = mocks.queries.findIndex(sql => sql.includes("INSERT INTO public.neon_identity_links"));
    expect(mocks.queryArgs[profileIndex]).toEqual([legacy]);
    expect(mocks.queryArgs[accountIndex]).toEqual([legacy]);
    expect(mocks.queryArgs[linkIndex][0]).toBe(managed);
    expect(mocks.queries.some(sql => /UPDATE public\.(user_roles|user_module_capabilities|entity_admin_assignments|module_entitlements)/i.test(sql))).toBe(false);
  });

  it("supports migrated source identities only after current ownership proof in verified-source mode", async () => {
    process.env.NEON_STAGING_IDENTITY_LINK_MODE = "verified-source";
    delete process.env.NEON_STAGING_IDENTITY_ALLOWED_SOURCE_ID;
    mocks.fetch.mockResolvedValueOnce({ status: 200, ok: true, json: async () => ({
      id: other, email: "different-source@example.test", email_confirmed_at: "2026-01-01" }) });
    expect(await linkVerifiedLegacyIdentity(request, "source-token")).toEqual({ status: "linked" });
    expect(mocks.queryArgs.find((_, index) => mocks.queries[index].includes("FROM public.profiles"))).toEqual([other]);
    expect(mocks.queries.some(sql => /WHERE.*email|UPDATE public\.(user_roles|entity_admin_assignments|user_module_capabilities)/i.test(sql))).toBe(false);
  });

  it("rejects source bans/deletion, suspended migrated profiles and fake verification before any link write", async () => {
    process.env.NEON_STAGING_IDENTITY_LINK_MODE = "verified-source";
    mocks.fetch.mockResolvedValueOnce({ status: 200, ok: true, json: async () => ({
      id: legacy, email_confirmed_at: "2026-01-01", banned_until: "2099-01-01" }) });
    await expect(linkVerifiedLegacyIdentity(request, "source-token")).rejects.toMatchObject({ code: "LEGACY_ACCOUNT_INACTIVE" });
    expect(mocks.queries).toHaveLength(0);
    mocks.fetch.mockResolvedValueOnce({ status: 200, ok: true, json: async () => ({
      id: legacy, email_confirmed_at: "2026-01-01", deleted_at: "2026-01-01" }) });
    await expect(linkVerifiedLegacyIdentity(request, "source-token")).rejects.toMatchObject({ code: "LEGACY_ACCOUNT_INACTIVE" });
    mocks.profileStatus = "suspended";
    await expect(linkVerifiedLegacyIdentity(request, "source-token")).rejects.toMatchObject({ code: "LEGACY_ACCOUNT_INACTIVE" });
    expect(mocks.queries.some(sql => sql.includes("INSERT"))).toBe(false);
    mocks.session.user.emailVerified = "true";
    await expect(linkVerifiedLegacyIdentity(request, "source-token")).rejects.toMatchObject({ code: "MANAGED_ACCOUNT_UNVERIFIED" });
  });

  it("fails closed for an unknown proof mode or unavailable configuration", async () => {
    process.env.NEON_STAGING_IDENTITY_LINK_MODE = "anything";
    await expect(linkVerifiedLegacyIdentity(request, "source-token")).rejects.toThrow("not configured");
    expect(mocks.fetch).not.toHaveBeenCalled();
  });

  it("requires finite session expiry and an exactly matching Managed Auth session subject", async () => {
    mocks.session.session.expiresAt = "not-a-date";
    await expect(linkVerifiedLegacyIdentity(request, "source-token")).rejects.toMatchObject({ code: "AUTH_REQUIRED" });
    mocks.session.session.expiresAt = "2099-01-01";
    mocks.session.session.userId = other;
    await expect(linkVerifiedLegacyIdentity(request, "source-token")).rejects.toMatchObject({ code: "AUTH_REQUIRED" });
    expect(mocks.fetch).not.toHaveBeenCalled();
  });
});
