import { decryptProviderSecret, encryptProviderSecret, isSecretStorageConfigured } from "./secret-store";
import { getAdminClient } from "./supabase";

export const PROVIDER_KINDS = ["payment", "ai", "email"] as const;
export type ProviderKind = (typeof PROVIDER_KINDS)[number];

type ProviderRow = {
  provider_kind: ProviderKind;
  provider_name: string;
  is_enabled: boolean;
  public_config: Record<string, unknown> | null;
  secret_ciphertext: string | null;
  secret_iv: string | null;
  secret_tag: string | null;
  configured_at: string | null;
  updated_at: string;
};

export const isProviderKind = (value: string): value is ProviderKind =>
  (PROVIDER_KINDS as readonly string[]).includes(value);

const publicConfig = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value)
    ? Object.fromEntries(Object.entries(value).filter(([key, item]) =>
      /^[a-z][a-z0-9_]{0,63}$/i.test(key) && typeof item !== "object" && String(item).length <= 1024,
    ))
    : {};

const safeStatus = (row: ProviderRow | null) => ({
  providerName: row?.provider_name ?? null,
  enabled: Boolean(row?.is_enabled),
  configured: Boolean(row?.secret_ciphertext && row?.secret_iv && row?.secret_tag),
  secretStorageReady: isSecretStorageConfigured(),
  publicConfig: publicConfig(row?.public_config),
  configuredAt: row?.configured_at ?? null,
  updatedAt: row?.updated_at ?? null,
});

export async function getProviderStatus(kind: ProviderKind) {
  const { data, error } = await (getAdminClient() as any)
    .from("provider_configurations")
    .select("provider_kind,provider_name,is_enabled,public_config,secret_ciphertext,secret_iv,secret_tag,configured_at,updated_at")
    .eq("provider_kind", kind)
    .maybeSingle();
  if (error) throw error;
  return safeStatus((data as ProviderRow | null) ?? null);
}

export async function saveProviderConfiguration(input: {
  kind: ProviderKind;
  providerName: string;
  enabled: boolean;
  publicConfig?: unknown;
  secret?: string | null;
  actorUserId: string;
}) {
  if (!/^[a-z][a-z0-9-]{1,63}$/i.test(input.providerName)) {
    throw new Error("Choose a supported provider identifier.");
  }
  const existing = await getProviderStatus(input.kind);
  if (input.enabled && !input.secret && !existing.configured) {
    throw new Error("A provider secret is required before this provider can be enabled.");
  }

  const now = new Date().toISOString();
  const secret = input.secret?.trim();
  const encrypted = secret ? encryptProviderSecret(secret) : null;
  const payload: Record<string, unknown> = {
    provider_kind: input.kind,
    provider_name: input.providerName,
    is_enabled: input.enabled,
    public_config: publicConfig(input.publicConfig),
    configured_by: input.actorUserId,
    configured_at: now,
    updated_at: now,
  };
  if (encrypted) {
    payload.secret_ciphertext = encrypted.ciphertext;
    payload.secret_iv = encrypted.iv;
    payload.secret_tag = encrypted.tag;
  }
  const { error } = await (getAdminClient() as any)
    .from("provider_configurations")
    .upsert(payload, { onConflict: "provider_kind" });
  if (error) throw error;
  const { error: auditError } = await (getAdminClient() as any)
    .from("audit_logs")
    .insert({
      actor_user_id: input.actorUserId,
      action: "configure_provider",
      entity_type: "provider",
      entity_id: input.kind,
      metadata: { provider_name: input.providerName, enabled: input.enabled, secret_replaced: Boolean(secret) },
    });
  if (auditError) throw auditError;
  return getProviderStatus(input.kind);
}

export async function loadProviderSecret(kind: ProviderKind) {
  const { data, error } = await (getAdminClient() as any)
    .from("provider_configurations")
    .select("provider_name,is_enabled,public_config,secret_ciphertext,secret_iv,secret_tag")
    .eq("provider_kind", kind)
    .maybeSingle();
  if (error) throw error;
  const row = data as ProviderRow | null;
  if (!row?.is_enabled || !row.secret_ciphertext || !row.secret_iv || !row.secret_tag) return null;
  return {
    providerName: row.provider_name,
    publicConfig: publicConfig(row.public_config),
    secret: decryptProviderSecret({ ciphertext: row.secret_ciphertext, iv: row.secret_iv, tag: row.secret_tag }),
  };
}

export async function loadModuleAISecret(input: {
  userId: string;
  moduleKey: string;
  entityType: string;
  entityId: string;
}) {
  const { data, error } = await (getAdminClient() as any)
    .from("module_ai_credentials")
    .select("provider_name,is_enabled,secret_ciphertext,secret_iv,secret_tag")
    .eq("user_id", input.userId)
    .eq("module_key", input.moduleKey)
    .eq("entity_type", input.entityType)
    .eq("entity_id", input.entityId)
    .maybeSingle();
  if (error) throw error;
  const row = data as ProviderRow | null;
  if (!row?.is_enabled || !row.secret_ciphertext || !row.secret_iv || !row.secret_tag) return null;
  return {
    providerName: row.provider_name,
    publicConfig: {},
    secret: decryptProviderSecret({ ciphertext: row.secret_ciphertext, iv: row.secret_iv, tag: row.secret_tag }),
  };
}
