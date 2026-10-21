/** Explicit, server-only configuration for the isolated Neon staging runtime. */
import { getBackendMode, requireNeonBackend } from "@/lib/server/backend-mode";

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
// Independently identified existing production candidate. Staging guards never accept this tuple.
export const NEON_PRODUCTION_BRANCH_ID = "br-falling-breeze-azr6q64l";
const NEON_PRODUCTION_COMPUTE = "ep-polished-flower-azsezy8a";
const NEON_PRODUCTION_AUTH_URL = `https://${NEON_PRODUCTION_COMPUTE}.neonauth.${NEON_MIGRATION_STAGING_REGION}/neondb/auth`;
const NEON_PRODUCTION_STORAGE_URL = `https://${NEON_PRODUCTION_BRANCH_ID}.storage.${NEON_MIGRATION_STAGING_REGION}`;

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
  requireNeonBackend(env);
  const production = getBackendMode(env) === "neon-production";
  const databaseName = production ? "NEON_PRODUCTION_DATABASE_URL" : "NEON_STAGING_DATABASE_URL";
  const databaseUrl = required(databaseName, env[databaseName]);
  let parsedDatabase: URL;
  try {
    parsedDatabase = new URL(databaseUrl);
  } catch {
    throw new Error(`${databaseName} must be a valid PostgreSQL URL.`);
  }
  if (!["postgres:", "postgresql:"].includes(parsedDatabase.protocol)) {
    throw new Error(`${databaseName} must be a PostgreSQL URL.`);
  }
  if (!parsedDatabase.hostname.endsWith(".neon.tech")) {
    throw new Error(`${databaseName} must point to Neon.`);
  }

  const branchName = production ? "NEON_PRODUCTION_BRANCH_ID" : "NEON_STAGING_BRANCH_ID";
  const branchId = required(branchName, env[branchName]);
  const expectedBranch = production ? NEON_PRODUCTION_BRANCH_ID : NEON_MIGRATION_STAGING_BRANCH_ID;
  const expectedCompute = production ? NEON_PRODUCTION_COMPUTE : NEON_MIGRATION_STAGING_COMPUTE;
  if (parsedDatabase.pathname !== "/neondb" || ["host", "hostaddr", "options", "uselibpqcompat"].some(key => parsedDatabase.searchParams.has(key))) {
    throw new Error("Neon database name or connection overrides are invalid.");
  }
  if (branchId !== expectedBranch ||
      ![
        `${expectedCompute}.${NEON_MIGRATION_STAGING_REGION}`,
        `${expectedCompute}-pooler.${NEON_MIGRATION_STAGING_REGION}`,
      ].includes(parsedDatabase.hostname)) {
    throw new Error(production ? "Neon production branch and database endpoint do not match the approved production target." : "Neon staging branch and database endpoint do not match the approved isolated branch.");
  }

  if (production) parsedDatabase.searchParams.set("sslmode", "verify-full");
  return {
    databaseUrl: production ? parsedDatabase.toString() : databaseUrl,
    branchId,
  };
}

export function getNeonAuthBaseUrl(env: Record<string, string | undefined> = process.env): string {
  getNeonDatabaseConfig(env);
  const authBaseUrl = httpsUrl("NEON_AUTH_BASE_URL", required("NEON_AUTH_BASE_URL", env.NEON_AUTH_BASE_URL));
  if (authBaseUrl !== (getBackendMode(env) === "neon-production" ? NEON_PRODUCTION_AUTH_URL : NEON_MIGRATION_STAGING_AUTH_URL)) {
    throw new Error("NEON_AUTH_BASE_URL does not match the approved isolated branch.");
  }
  return authBaseUrl;
}

export function getNeonConfig(env: Record<string, string | undefined> = process.env): NeonEnvironmentConfig {
  const database = getNeonDatabaseConfig(env);
  const storageEndpoint = httpsUrl("AWS_ENDPOINT_URL_S3", required("AWS_ENDPOINT_URL_S3", env.AWS_ENDPOINT_URL_S3));
  if (storageEndpoint !== (getBackendMode(env) === "neon-production" ? NEON_PRODUCTION_STORAGE_URL : NEON_MIGRATION_STAGING_STORAGE_URL)) {
    throw new Error("AWS_ENDPOINT_URL_S3 does not match the approved isolated branch.");
  }

  return {
    databaseUrl: database.databaseUrl,
    authBaseUrl: getNeonAuthBaseUrl(env),
    storageEndpoint,
    branchId: database.branchId,
  };
}
