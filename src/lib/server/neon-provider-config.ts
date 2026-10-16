/** Secret-free Super Admin provider configuration for the isolated Neon runtime. */
import type { PoolClient, QueryResultRow } from "pg";
import { queryRows, withTransaction } from "./db";
import { type NeonActor, NeonAuthorizationError, requireSuperAdmin } from "./neon-authorization";
import { encryptProviderSecret, isSecretStorageConfigured } from "./secret-store";
type ProviderKind = "payment" | "ai" | "email";

type ProviderRow = QueryResultRow & {
  provider_kind: ProviderKind; provider_name: string; is_enabled: boolean;
  public_config: Record<string, unknown> | null;
  secret_ciphertext: string | null; secret_iv: string | null; secret_tag: string | null;
  configured_at: string | null; updated_at: string;
};

const select = `SELECT provider_kind,provider_name,is_enabled,public_config,
  secret_ciphertext,secret_iv,secret_tag,configured_at,updated_at
  FROM public.provider_configurations WHERE provider_kind=$1 LIMIT 1`;

const permittedSettings: Record<ProviderKind, readonly string[]> = {
  payment: ["merchant_code", "environment"], ai: ["model"], email: ["from_address"],
};

const safeSettings = (kind: ProviderKind, value: Record<string, unknown> | null | undefined) =>
  Object.fromEntries(Object.entries(value ?? {}).filter(([key, item]) =>
    permittedSettings[kind].includes(key) && typeof item === "string" && item.length <= 1024));

const toStatus = (row: ProviderRow | null) => ({
  providerName: row?.provider_name ?? null,
  enabled: row?.is_enabled === true,
  configured: Boolean(row?.secret_ciphertext && row.secret_iv && row.secret_tag),
  secretStorageReady: isSecretStorageConfigured(),
  publicConfig: row ? safeSettings(row.provider_kind, row.public_config) : {},
  configuredAt: row?.configured_at ?? null,
  updatedAt: row?.updated_at ?? null,
});

export function parseProviderKind(value: string): ProviderKind {
  if (!["payment", "ai", "email"].includes(value)) throw new NeonAuthorizationError(404, "PROVIDER_NOT_FOUND", "Provider not found.");
  return value as ProviderKind;
}

export async function getNeonProviderStatus(actor: NeonActor, kind: ProviderKind,
  query: typeof queryRows = queryRows) {
  requireSuperAdmin(actor);
  const [row] = await query<ProviderRow>(select, [kind]);
  return toStatus(row ?? null);
}

function parseSettings(kind: ProviderKind, value: unknown): Record<string, string> {
  if (value == null) return {};
  if (typeof value !== "object" || Array.isArray(value)) {
    throw new NeonAuthorizationError(400, "INVALID_PROVIDER_CONFIGURATION", "Invalid provider configuration.");
  }
  const result: Record<string, string> = {};
  for (const [key, item] of Object.entries(value)) {
    if (!permittedSettings[kind].includes(key) || typeof item !== "string" || item.length > 1024) {
      throw new NeonAuthorizationError(400, "INVALID_PROVIDER_CONFIGURATION", "Invalid provider configuration.");
    }
    result[key] = item.trim();
  }
  return result;
}

export function parseProviderInput(kind: ProviderKind, body: unknown) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new NeonAuthorizationError(400, "INVALID_PROVIDER_CONFIGURATION", "Invalid provider configuration.");
  }
  const value = body as Record<string, unknown>;
  const providerName = value.providerName;
  if (typeof providerName !== "string" ||
      !({ payment: ["esewa"], ai: ["openai-compatible"], email: ["resend"] }[kind]).includes(providerName) ||
      typeof value.enabled !== "boolean" ||
      (value.secret !== undefined && typeof value.secret !== "string")) {
    throw new NeonAuthorizationError(400, "INVALID_PROVIDER_CONFIGURATION", "Invalid provider configuration.");
  }
  const config = parseSettings(kind, value.publicConfig);
  if (kind === "payment" && (!/^[A-Za-z0-9-]{2,128}$/.test(config.merchant_code ?? "") ||
    !["uat", "production"].includes(config.environment))) {
    throw new NeonAuthorizationError(400, "INVALID_ESEWA_CONFIGURATION", "Invalid eSewa configuration.");
  }
  if (kind === "email" && config.from_address &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(config.from_address)) {
    throw new NeonAuthorizationError(400, "INVALID_PROVIDER_CONFIGURATION", "Invalid provider configuration.");
  }
  const secret = typeof value.secret === "string" ? value.secret.trim() : "";
  if (value.secret !== undefined && !secret) throw new NeonAuthorizationError(400, "INVALID_PROVIDER_SECRET", "Provider secret is required.");
  return { providerName, enabled: value.enabled, config, secret };
}

export async function saveNeonProviderConfiguration(actor: NeonActor, kind: ProviderKind, body: unknown,
  run: typeof withTransaction = withTransaction) {
  requireSuperAdmin(actor);
  const input = parseProviderInput(kind, body);
  const encrypted = input.secret ? encryptProviderSecret(input.secret) : null;
  return run(async (client: PoolClient) => {
    // Recheck persisted account state inside the same transaction as the write.
    const admin = await client.query(`SELECT p.user_id FROM public.profiles p
      JOIN public.user_roles ur ON ur.user_id=p.user_id
      WHERE p.user_id=$1::uuid AND p.account_status='active' AND p.deleted_at IS NULL
        AND ur.role IN ('admin','super_admin') LIMIT 1 FOR SHARE OF p`, [actor.userId]);
    if (!admin.rowCount) throw new NeonAuthorizationError(403, "ADMIN_REQUIRED", "Super Admin access required.");
    const existing = (await client.query<ProviderRow>(`${select} FOR UPDATE`, [kind])).rows[0];
    if (input.enabled && !encrypted && !(existing?.secret_ciphertext && existing.secret_iv && existing.secret_tag)) {
      throw new NeonAuthorizationError(400, "PROVIDER_SECRET_REQUIRED", "Configure a provider secret before enabling.");
    }
    const rows = await client.query<ProviderRow>(`INSERT INTO public.provider_configurations
      (provider_kind,provider_name,is_enabled,public_config,secret_ciphertext,secret_iv,
       secret_tag,configured_by,configured_at)
      VALUES ($1,$2,$3,$4::jsonb,$5,$6,$7,$8::uuid,now())
      ON CONFLICT (provider_kind) DO UPDATE SET
        provider_name=EXCLUDED.provider_name,is_enabled=EXCLUDED.is_enabled,
        public_config=EXCLUDED.public_config,
        secret_ciphertext=COALESCE(EXCLUDED.secret_ciphertext,public.provider_configurations.secret_ciphertext),
        secret_iv=COALESCE(EXCLUDED.secret_iv,public.provider_configurations.secret_iv),
        secret_tag=COALESCE(EXCLUDED.secret_tag,public.provider_configurations.secret_tag),
        configured_by=EXCLUDED.configured_by,configured_at=now(),updated_at=now()
      RETURNING provider_kind,provider_name,is_enabled,public_config,secret_ciphertext,
        secret_iv,secret_tag,configured_at,updated_at`,
    [kind, input.providerName, input.enabled, JSON.stringify(input.config),
      encrypted?.ciphertext ?? null, encrypted?.iv ?? null, encrypted?.tag ?? null, actor.userId]);
    await client.query(`INSERT INTO public.audit_logs
      (actor_user_id,action,entity_type,entity_id,metadata)
      VALUES ($1::uuid,'admin_save_provider_configuration','provider_configuration',$2,
        jsonb_build_object('provider_name',$3::text,'enabled',$4::boolean,'secret_replaced',$5::boolean))`,
    [actor.userId, kind, input.providerName, input.enabled, Boolean(encrypted)]);
    return toStatus(rows.rows[0]);
  });
}

export function providerHealth(status: Awaited<ReturnType<typeof getNeonProviderStatus>>,
  expectedProviderName: string) {
  const credentialConfigured = status.configured;
  const integrationEnabled = status.enabled;
  const secretStorageReady = status.secretStorageReady;
  const state = !secretStorageReady ? "storage_unavailable"
    : !credentialConfigured ? "not_configured"
    : !integrationEnabled ? "configured_disabled" : "configured_active";
  return { status: state, credentialConfigured, integrationEnabled, secretStorageReady,
    deliveryAvailable: state === "configured_active" && status.providerName === expectedProviderName };
}
