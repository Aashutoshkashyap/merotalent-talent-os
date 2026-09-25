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

export type ProviderConfigurationStatus = {
  providerName: string | null;
  enabled: boolean;
  configured: boolean;
  secretStorageReady: boolean;
  publicConfig: Record<string, unknown>;
  configuredAt: string | null;
  updatedAt: string | null;
};

export class ProviderConfigurationPersistenceError extends Error {
  constructor(
    readonly code: "PROVIDER_AUDIT_UNAVAILABLE" | "PROVIDER_CONFIGURATION_PERSIST_FAILED",
    message: string,
  ) {
    super(message);
    this.name = "ProviderConfigurationPersistenceError";
  }
}

export const isProviderKind = (value: string): value is ProviderKind =>
  (PROVIDER_KINDS as readonly string[]).includes(value);

const publicConfig = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value)
    ? Object.fromEntries(Object.entries(value).filter(([key, item]) =>
      /^[a-z][a-z0-9_]{0,63}$/i.test(key) && typeof item !== "object" && String(item).length <= 1024,
    ))
    : {};

export const hasEncryptedProviderSecret = (
  row: Pick<ProviderRow, "secret_ciphertext" | "secret_iv" | "secret_tag"> | null,
) => Boolean(row?.secret_ciphertext?.trim() && row.secret_iv?.trim() && row.secret_tag?.trim());

export const toProviderConfigurationStatus = (
  row: ProviderRow | null,
  secretStorageReady = isSecretStorageConfigured(),
): ProviderConfigurationStatus => ({
  providerName: row?.provider_name ?? null,
  enabled: Boolean(row?.is_enabled),
  // Stored configuration and this deployment's encryption readiness are
  // intentionally separate states. No ciphertext is ever returned here.
  configured: hasEncryptedProviderSecret(row),
  secretStorageReady,
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
  return toProviderConfigurationStatus((data as ProviderRow | null) ?? null);
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
  const secret = input.secret?.trim();
  if (input.enabled && !secret && !existing.configured) {
    throw new Error("A provider secret is required before this provider can be enabled.");
  }

  const encrypted = secret ? encryptProviderSecret(secret) : null;
  const publicSettings = publicConfig(input.publicConfig);
  const { data, error } = await (getAdminClient() as any).rpc(
    "admin_save_provider_configuration",
    {
      p_actor_user_id: input.actorUserId,
      p_provider_kind: input.kind,
      p_provider_name: input.providerName,
      p_is_enabled: input.enabled,
      p_public_config: publicSettings,
      p_secret_ciphertext: encrypted?.ciphertext ?? null,
      p_secret_iv: encrypted?.iv ?? null,
      p_secret_tag: encrypted?.tag ?? null,
    },
  );
  if (error) {
    if (error.code === "P0001" && /audit/i.test(error.message ?? "")) {
      throw new ProviderConfigurationPersistenceError(
        "PROVIDER_AUDIT_UNAVAILABLE",
        "Provider configuration could not be saved because its audit record could not be persisted. No configuration was changed.",
      );
    }
    throw new ProviderConfigurationPersistenceError(
      "PROVIDER_CONFIGURATION_PERSIST_FAILED",
      "Provider configuration could not be persisted.",
    );
  }
  // The RPC has committed both the provider row and its audit row. Build the
  // secret-free response from that confirmed write rather than issuing another
  // query that could turn a successful configuration save into a false failure.
  const persisted = data && typeof data === "object" && !Array.isArray(data)
    ? data as Record<string, unknown>
    : {};
  return {
    providerName: typeof persisted.provider_name === "string" ? persisted.provider_name : input.providerName,
    enabled: typeof persisted.is_enabled === "boolean" ? persisted.is_enabled : input.enabled,
    configured: Boolean(secret) || existing.configured,
    secretStorageReady: isSecretStorageConfigured(),
    publicConfig: publicSettings,
    configuredAt: typeof persisted.configured_at === "string" ? persisted.configured_at : existing.configuredAt,
    updatedAt: typeof persisted.updated_at === "string" ? persisted.updated_at : null,
  } satisfies ProviderConfigurationStatus;
}

export async function loadProviderSecret(kind: ProviderKind) {
  const { data, error } = await (getAdminClient() as any)
    .from("provider_configurations")
    .select("provider_name,is_enabled,public_config,secret_ciphertext,secret_iv,secret_tag")
    .eq("provider_kind", kind)
    .maybeSingle();
  if (error) throw error;
  const row = data as ProviderRow | null;
  if (!row?.is_enabled || !hasEncryptedProviderSecret(row)) return null;
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
