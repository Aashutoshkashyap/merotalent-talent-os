/** Explicit, server-only configuration for the isolated Neon staging runtime. */
import { requireNeonStaging } from "@/lib/server/backend-mode";

export interface NeonEnvironmentConfig {
  databaseUrl: string;
  authBaseUrl: string;
  storageEndpoint: string;
  branchId: string;
}

export interface NeonDatabaseConfig {
  databaseUrl: string;
  branchId: string;
}

// This runtime is intentionally limited to the one isolated migration branch.
// A valid Neon hostname plus an arbitrary branch-id environment variable is
// insufficient: a mislabelled URL previously pointed at the production branch.
export const NEON_MIGRATION_STAGING_BRANCH_ID = "br-frosty-haze-azsnybmr";
const NEON_MIGRATION_STAGING_COMPUTE = "ep-wispy-credit-azt6tgwj";
const NEON_MIGRATION_STAGING_REGION = "c-3.ap-southeast-1.aws.neon.tech";
const NEON_MIGRATION_STAGING_AUTH_URL =
  `https://${NEON_MIGRATION_STAGING_COMPUTE}.neonauth.${NEON_MIGRATION_STAGING_REGION}/neondb/auth`;
const NEON_MIGRATION_STAGING_STORAGE_URL =
  `https://${NEON_MIGRATION_STAGING_BRANCH_ID}.storage.${NEON_MIGRATION_STAGING_REGION}`;

function required(name: string, value: string | undefined): string {
  if (!value?.trim()) throw new Error(`${name} is required for Neon staging.`);
  return value.trim();
}

function httpsUrl(name: string, value: string): string {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error(`${name} must be a valid HTTPS URL.`);
  }
  if (url.protocol !== "https:") throw new Error(`${name} must use HTTPS.`);
  return url.toString().replace(/\/$/, "");
}

/** No mock URL, implicit test mode, or production-branch fallback is permitted. */
export function getNeonDatabaseConfig(env: Record<string, string | undefined> = process.env): NeonDatabaseConfig {
  requireNeonStaging(env);
  const databaseUrl = required("NEON_STAGING_DATABASE_URL", env.NEON_STAGING_DATABASE_URL);
  let parsedDatabase: URL;
  try {
    parsedDatabase = new URL(databaseUrl);
  } catch {
    throw new Error("NEON_STAGING_DATABASE_URL must be a valid PostgreSQL URL.");
  }
  if (!["postgres:", "postgresql:"].includes(parsedDatabase.protocol)) {
    throw new Error("NEON_STAGING_DATABASE_URL must be a PostgreSQL URL.");
  }
  if (!parsedDatabase.hostname.endsWith(".neon.tech")) {
    throw new Error("NEON_STAGING_DATABASE_URL must point to Neon.");
  }

  const branchId = required("NEON_STAGING_BRANCH_ID", env.NEON_STAGING_BRANCH_ID);
  if (branchId !== NEON_MIGRATION_STAGING_BRANCH_ID ||
      ![
        `${NEON_MIGRATION_STAGING_COMPUTE}.${NEON_MIGRATION_STAGING_REGION}`,
        `${NEON_MIGRATION_STAGING_COMPUTE}-pooler.${NEON_MIGRATION_STAGING_REGION}`,
      ].includes(parsedDatabase.hostname)) {
    throw new Error("Neon staging branch and database endpoint do not match the approved isolated branch.");
  }

  return {
    databaseUrl,
    branchId,
  };
}

export function getNeonAuthBaseUrl(env: Record<string, string | undefined> = process.env): string {
  getNeonDatabaseConfig(env);
  const authBaseUrl = httpsUrl("NEON_AUTH_BASE_URL", required("NEON_AUTH_BASE_URL", env.NEON_AUTH_BASE_URL));
  if (authBaseUrl !== NEON_MIGRATION_STAGING_AUTH_URL) {
    throw new Error("NEON_AUTH_BASE_URL does not match the approved isolated branch.");
  }
  return authBaseUrl;
}

export function getNeonConfig(env: Record<string, string | undefined> = process.env): NeonEnvironmentConfig {
  const database = getNeonDatabaseConfig(env);
  const storageEndpoint = httpsUrl("AWS_ENDPOINT_URL_S3", required("AWS_ENDPOINT_URL_S3", env.AWS_ENDPOINT_URL_S3));
  if (storageEndpoint !== NEON_MIGRATION_STAGING_STORAGE_URL) {
    throw new Error("AWS_ENDPOINT_URL_S3 does not match the approved isolated branch.");
  }

  return {
    databaseUrl: database.databaseUrl,
    authBaseUrl: getNeonAuthBaseUrl(env),
    storageEndpoint,
    branchId: database.branchId,
  };
}
