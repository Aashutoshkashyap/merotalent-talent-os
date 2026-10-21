/** One-time isolated-staging eSewa UAT bootstrap. Never targets production. */
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import pg from "pg";
import dotenv from "dotenv";
import { requireNeonMigrationStaging } from "./require-neon-migration-staging.mjs";
import { readEsewaEnvironment } from "./esewa-environment.mjs";

dotenv.config({ path: ".migration.env", quiet: true });
dotenv.config({ path: ".env", quiet: true });
const targetUrl = process.env.NEON_STAGING_DATABASE_URL;
requireNeonMigrationStaging(targetUrl);
if (process.env.NEON_STAGING_BRANCH_ID !== "br-frosty-haze-azsnybmr") {
  throw new Error("Unexpected Neon staging branch.");
}
const apply = process.argv.includes("--apply-staging");
const encodedKey = process.env.PROVIDER_CONFIG_ENCRYPTION_KEY?.trim();
const key = Buffer.from(encodedKey ?? "", "base64");
if (key.length !== 32 || key.toString("base64") !== encodedKey) {
  throw new Error("A valid server-side provider encryption key is required.");
}
// Official public ePay UAT merchant credentials, not a production merchant secret.
// https://developer.esewa.com.np/pages/Test-credentials
// Explicit configured credentials take precedence. Partial/mixed configurations
// fail closed instead of silently selecting a test merchant or secret.
const hasConfiguredEnvironment = Object.keys(process.env).some(name => name.startsWith('ESEWA_'));
const configuredEnvironment = hasConfiguredEnvironment ? readEsewaEnvironment(process.env, 'uat') : null;
const merchantCode = configuredEnvironment?.merchantCode ?? "EPAYTEST";
const testSecret = configuredEnvironment?.secret ?? "8gBm/:&EnhH.1/q";
const secureTarget = new URL(targetUrl);
secureTarget.searchParams.set('sslmode', 'verify-full');
const client = new pg.Client({ connectionString: secureTarget.href, connectionTimeoutMillis: 15000 });
const existingSecretMatches = row => {
  if (!row?.secret_ciphertext || !row.secret_iv || !row.secret_tag) return false;
  try {
    const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(row.secret_iv, "base64"));
    decipher.setAuthTag(Buffer.from(row.secret_tag, "base64"));
    const secret = Buffer.concat([decipher.update(Buffer.from(row.secret_ciphertext, "base64")),
      decipher.final()]).toString("utf8");
    return secret === testSecret;
  } catch { return false; }
};

try {
  await client.connect();
  await client.query("BEGIN");
  await client.query("SET LOCAL statement_timeout='15s'");
  const row = (await client.query(`SELECT provider_name,is_enabled,public_config,
    secret_ciphertext,secret_iv,secret_tag FROM public.provider_configurations
    WHERE provider_kind='payment' FOR UPDATE`)).rows[0];
  const alreadyConfigured = row?.provider_name === "esewa" && row.is_enabled === true
    && row.public_config?.merchant_code === merchantCode && row.public_config?.environment === "uat"
    && existingSecretMatches(row);
  if (!apply || alreadyConfigured) {
    await client.query("ROLLBACK");
    console.log(JSON.stringify({ mode: apply ? "NO_CHANGE" : "DRY_RUN",
      targetBranch: process.env.NEON_STAGING_BRANCH_ID,
      currentEnabled: row?.is_enabled === true,
      currentEnvironment: row?.public_config?.environment ?? null,
      currentMerchantIsTest: row?.public_config?.merchant_code === merchantCode,
      uatReady: alreadyConfigured }));
  } else {
    const iv = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", key, iv);
    const ciphertext = Buffer.concat([cipher.update(testSecret, "utf8"), cipher.final()]);
    await client.query(`INSERT INTO public.provider_configurations
      (provider_kind,provider_name,is_enabled,public_config,secret_ciphertext,secret_iv,
       secret_tag,configured_by,configured_at,updated_at)
      VALUES ('payment','esewa',true,$1::jsonb,$2,$3,$4,NULL,now(),now())
      ON CONFLICT (provider_kind) DO UPDATE SET provider_name=EXCLUDED.provider_name,
        is_enabled=EXCLUDED.is_enabled,public_config=EXCLUDED.public_config,
        secret_ciphertext=EXCLUDED.secret_ciphertext,secret_iv=EXCLUDED.secret_iv,
        secret_tag=EXCLUDED.secret_tag,configured_by=NULL,configured_at=now(),updated_at=now()`,
    [JSON.stringify({ merchant_code: merchantCode, environment: "uat" }),
      ciphertext.toString("base64"), iv.toString("base64"), cipher.getAuthTag().toString("base64")]);
    await client.query(`INSERT INTO public.audit_logs
      (actor_user_id,action,entity_type,entity_id,metadata)
      VALUES (NULL,'staging_configure_esewa_uat','provider_configuration','payment',
        jsonb_build_object('operator_bootstrap',true,'environment','uat','merchant_code',$1::text))`,
    [merchantCode]);
    await client.query("COMMIT");
    console.log(JSON.stringify({ mode: "APPLIED_STAGING_ONLY",
      targetBranch: process.env.NEON_STAGING_BRANCH_ID, provider: "esewa",
      environment: "uat", enabled: true }));
  }
} catch (error) {
  await client.query("ROLLBACK").catch(() => undefined);
  console.error(JSON.stringify({ configuration: "ESEWA_STAGING_BOOTSTRAP_FAILED" }));
  process.exitCode = 1;
} finally { await client.end().catch(() => undefined); }
