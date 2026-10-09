#!/usr/bin/env node
/**
 * seed-esewa-test-credentials.mjs
 *
 * Seeds eSewa UAT test credentials into the provider_configurations table.
 * Run this ONCE in your local/staging environment to activate payments.
 *
 * Prerequisites:
 *   1. PROVIDER_CONFIG_ENCRYPTION_KEY set in .env (32-byte base64 key)
 *   2. SUPABASE_SECRET_KEY set in .env (service-role key from Supabase dashboard)
 *   3. A super_admin user must exist — pass their user ID as the first argument
 *
 * Usage:
 *   node scripts/seed-esewa-test-credentials.mjs <super-admin-user-id>
 *
 * eSewa UAT test credentials (from developer.esewa.com.np/pages/Test-credentials):
 *   - Product code (merchant code): EPAYTEST
 *   - Secret key:                   8gBm/:&EnhH.1/q
 *   - Test eSewa phone:             9806800001
 *   - Test eSewa password:          Nepal@123
 *   - OTP (testing):                123456
 */

import { createCipheriv, randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

// -- Load .env manually (no dotenv dependency required) ---------------------
const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, "../.env");
let envContent = "";
try {
  envContent = readFileSync(envPath, "utf8");
} catch {
  console.error("Could not read .env file at", envPath);
  process.exit(1);
}
const env = {};
for (const line of envContent.split("\n")) {
  const match = line.match(/^([A-Z_][A-Z0-9_]*)="?([^"]*)"?$/);
  if (match) env[match[1]] = match[2];
}

const ENCRYPTION_KEY_B64 = env.PROVIDER_CONFIG_ENCRYPTION_KEY?.trim();
const SUPABASE_URL = env.SUPABASE_URL?.trim() || env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const SUPABASE_SECRET = env.SUPABASE_SECRET_KEY?.trim();
const ACTOR_USER_ID = process.argv[2]?.trim();

// -- Validate inputs --------------------------------------------------------
if (!ENCRYPTION_KEY_B64) {
  console.error("PROVIDER_CONFIG_ENCRYPTION_KEY is not set in .env");
  console.error("Generate one with:");
  console.error('python3 -c "import secrets,base64; print(base64.b64encode(secrets.token_bytes(32)).decode())"');
  process.exit(1);
}
if (!SUPABASE_URL) {
  console.error("SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL is not set in .env");
  process.exit(1);
}
if (!SUPABASE_SECRET) {
  console.error("SUPABASE_SECRET_KEY is not set in .env");
  console.error("Get it from: Supabase Dashboard > Settings > API > service_role");
  process.exit(1);
}
if (!ACTOR_USER_ID || !/^[0-9a-f-]{36}$/i.test(ACTOR_USER_ID)) {
  console.error("Pass your super-admin user ID as the first argument:");
  console.error("  node scripts/seed-esewa-test-credentials.mjs <uuid>");
  process.exit(1);
}

const encKey = Buffer.from(ENCRYPTION_KEY_B64, "base64");
if (encKey.byteLength !== 32 || encKey.toString("base64") !== ENCRYPTION_KEY_B64) {
  console.error("PROVIDER_CONFIG_ENCRYPTION_KEY must be exactly 32 bytes in canonical base64 (44 chars ending with =)");
  process.exit(1);
}

// -- eSewa UAT test credentials ---------------------------------------------
const ESEWA_MERCHANT_CODE = "EPAYTEST";
const ESEWA_SECRET_KEY = "8gBm/:&EnhH.1/q";
const ESEWA_ENVIRONMENT = "uat";

// -- Encrypt secret (AES-256-GCM, same scheme as src/lib/server/secret-store.ts)
function encryptSecret(secret) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encKey, iv);
  const ciphertext = Buffer.concat([cipher.update(secret, "utf8"), cipher.final()]);
  return {
    ciphertext: ciphertext.toString("base64"),
    iv: iv.toString("base64"),
    tag: cipher.getAuthTag().toString("base64"),
  };
}

// -- Call the Supabase admin_save_provider_configuration RPC ----------------
async function seed() {
  const encrypted = encryptSecret(ESEWA_SECRET_KEY);

  const rpcPayload = {
    p_actor_user_id: ACTOR_USER_ID,
    p_provider_kind: "payment",
    p_provider_name: "esewa",
    p_is_enabled: true,
    p_public_config: {
      merchant_code: ESEWA_MERCHANT_CODE,
      environment: ESEWA_ENVIRONMENT,
    },
    p_secret_ciphertext: encrypted.ciphertext,
    p_secret_iv: encrypted.iv,
    p_secret_tag: encrypted.tag,
  };

  console.log("\nSeeding eSewa UAT credentials into Supabase...");
  console.log(`  URL:         ${SUPABASE_URL}`);
  console.log(`  Merchant:    ${ESEWA_MERCHANT_CODE}`);
  console.log(`  Environment: ${ESEWA_ENVIRONMENT}`);
  console.log(`  Actor:       ${ACTOR_USER_ID}\n`);

  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/admin_save_provider_configuration`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": SUPABASE_SECRET,
      "Authorization": `Bearer ${SUPABASE_SECRET}`,
    },
    body: JSON.stringify(rpcPayload),
  });

  const text = await response.text();
  if (!response.ok) {
    console.error("RPC call failed:", response.status, text);
    process.exit(1);
  }

  console.log("eSewa UAT credentials seeded successfully!\n");
  console.log("Test credentials for payment testing:");
  console.log("  eSewa phone:  9806800001");
  console.log("  eSewa pass:   Nepal@123");
  console.log("  OTP:          123456\n");
  console.log("To switch to production later:");
  console.log("  Admin > Settings > Payment Provider");
  console.log("  Set environment=production + your live merchant code + secret\n");
}

seed().catch((err) => {
  console.error("Unexpected error:", err.message);
  process.exit(1);
});
