/** Secret-free Super Admin provider configuration for the isolated Neon runtime. */
import { getBackendMode, type BackendMode } from "./backend-mode";
import type { PoolClient, QueryResultRow } from "pg";
import { queryRows, withTransaction } from "./db";
import { type NeonActor, NeonAuthorizationError, requireSuperAdmin } from "./neon-authorization";
import { decryptProviderSecret, encryptProviderSecret, isSecretStorageConfigured } from "./secret-store";
import { EsewaV2PaymentProvider } from "./payment-provider";
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

export const canDecryptSecret = (
  row: Pick<ProviderRow, "secret_ciphertext" | "secret_iv" | "secret_tag"> | null | undefined,
): boolean => {
  if (!row?.secret_ciphertext || !row.secret_iv || !row.secret_tag) return false;
  try {
    decryptProviderSecret({
      ciphertext: row.secret_ciphertext,
      iv: row.secret_iv,
      tag: row.secret_tag,
    });
    return true;
  } catch {
    return false;
  }
};

const toStatus = (row: ProviderRow | null) => {
  const hasSecret = Boolean(row?.secret_ciphertext && row.secret_iv && row.secret_tag);
  const decryptable = hasSecret ? canDecryptSecret(row) : false;
  return {
    providerName: row?.provider_name ?? null,
    enabled: Boolean(row?.is_enabled && decryptable),
    configured: hasSecret,
    secretDecryptable: hasSecret ? decryptable : undefined,
    secretStorageReady: isSecretStorageConfigured(),
    publicConfig: row ? safeSettings(row.provider_kind, row.public_config) : {},
    configuredAt: row?.configured_at ?? null,
    updatedAt: row?.updated_at ?? null,
  };
};

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

export function parseProviderInput(kind: ProviderKind, body: unknown, mode: BackendMode = getBackendMode()) {
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
  if (kind === "payment") {
    if (!/^[A-Za-z0-9-]{2,128}$/.test(config.merchant_code ?? "") ||
      !["uat", "production"].includes(config.environment)) {
      throw new NeonAuthorizationError(400, "INVALID_ESEWA_CONFIGURATION", "Invalid eSewa configuration.");
    }
    if (value.enabled && config.environment === "production" && config.merchant_code === "EPAYTEST") {
      throw new NeonAuthorizationError(400, "TEST_CREDENTIALS_PROHIBITED", "Test merchant code EPAYTEST cannot be enabled in production.");
    }
    if (value.enabled && mode === "neon-production" && config.environment === "uat") {
      throw new NeonAuthorizationError(400, "INVALID_ENVIRONMENT", "Cannot enable UAT environment in neon-production mode.");
    }
  }
  if (kind === "email" && config.from_address &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(config.from_address)) {
    throw new NeonAuthorizationError(400, "INVALID_PROVIDER_CONFIGURATION", "Invalid provider configuration.");
  }
  const secret = typeof value.secret === "string" ? value.secret.trim() : "";
  if (value.secret !== undefined && !secret) throw new NeonAuthorizationError(400, "INVALID_PROVIDER_SECRET", "Provider secret is required.");
  if (value.enabled && kind === "payment" && config.environment === "production" && secret === "8gBm/:&EnhH.1/q") {
    throw new NeonAuthorizationError(400, "TEST_CREDENTIALS_PROHIBITED", "Test secret cannot be enabled in production.");
  }
  return { providerName, enabled: value.enabled, config, secret };
}

export async function saveNeonProviderConfiguration(actor: NeonActor, kind: ProviderKind, body: unknown,
  run: typeof withTransaction = withTransaction) {
  requireSuperAdmin(actor);
  const input = parseProviderInput(kind, body);
  const encrypted = input.secret ? encryptProviderSecret(input.secret) : null;
  if (encrypted) {
    try {
      decryptProviderSecret(encrypted);
    } catch {
      throw new NeonAuthorizationError(503, "ENCRYPTION_VERIFICATION_FAILED", "Failed to verify encrypted secret.");
    }
  }
  return run(async (client: PoolClient) => {
    // Recheck persisted account state inside the same transaction as the write.
    const admin = await client.query(`SELECT p.user_id FROM public.profiles p
      JOIN public.user_roles ur ON ur.user_id=p.user_id
      WHERE p.user_id=$1::uuid AND p.account_status='active' AND p.deleted_at IS NULL
        AND ur.role IN ('admin','super_admin') LIMIT 1 FOR SHARE OF p`, [actor.userId]);
    if (!admin.rowCount) throw new NeonAuthorizationError(403, "ADMIN_REQUIRED", "Super Admin access required.");
    const existing = (await client.query<ProviderRow>(`${select} FOR UPDATE`, [kind])).rows[0];
    const existingDecryptable = canDecryptSecret(existing);
    if (input.enabled && !encrypted && !existingDecryptable) {
      throw new NeonAuthorizationError(400, "PROVIDER_SECRET_REQUIRED", "Configure a valid provider secret before enabling.");
    }
    if (input.enabled && kind === "payment") {
      // Validate the effective credential, including a previously stored secret.
      // Public metadata changes must not turn a sandbox credential into a live one.
      const effectiveSecret = input.secret || decryptProviderSecret({
        ciphertext: existing.secret_ciphertext!, iv: existing.secret_iv!, tag: existing.secret_tag!,
      });
      try {
        new EsewaV2PaymentProvider(effectiveSecret, {
          merchantCode: input.config.merchant_code,
          environment: input.config.environment as "uat" | "production",
        });
      } catch {
        throw new NeonAuthorizationError(400, "INVALID_ESEWA_CONFIGURATION",
          "The stored credential is not valid for this eSewa environment. Configure the correct merchant secret before enabling.");
      }
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
    if ((encrypted || input.enabled) && !canDecryptSecret(rows.rows[0])) {
      throw new NeonAuthorizationError(503, "ENCRYPTION_VERIFICATION_FAILED",
        "The saved provider credential could not be verified. No configuration change was committed.");
    }
    await client.query(`INSERT INTO public.audit_logs
      (actor_user_id,action,entity_type,entity_id,metadata)
      VALUES ($1::uuid,'admin_save_provider_configuration','provider_configuration',$2,
        jsonb_build_object('provider_name',$3::text,'enabled',$4::boolean,'secret_replaced',$5::boolean))`,
    [actor.userId, kind, input.providerName, input.enabled, Boolean(encrypted)]);
    return toStatus(rows.rows[0]);
  });
}

export type NeonProviderStatus = {
  providerName: string | null;
  enabled: boolean;
  configured: boolean;
  secretDecryptable?: boolean;
  secretStorageReady: boolean;
  publicConfig?: Record<string, unknown>;
  configuredAt?: string | null;
  updatedAt?: string | null;
};

export function providerHealth(status: NeonProviderStatus,
  expectedProviderName: string) {
  const credentialConfigured = status.configured && (status.secretDecryptable ?? true);
  const integrationEnabled = status.enabled;
  const secretStorageReady = status.secretStorageReady;
  const state = !secretStorageReady ? "storage_unavailable"
    : !credentialConfigured ? "not_configured"
    : !integrationEnabled ? "configured_disabled" : "configured_active";
  return { status: state, credentialConfigured, integrationEnabled, secretStorageReady,
    deliveryAvailable: state === "configured_active" && status.providerName === expectedProviderName };
}
