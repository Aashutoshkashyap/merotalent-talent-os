/**
 * MeroTalent — Safe Migration Credential & Connectivity Preflight
 * 
 * Rules:
 * - Read-only non-mutating checks only.
 * - Never print secret values or connection strings.
 * - Mask/redact all sensitive information.
 */

import fs from "fs";
import path from "path";
import pg from "pg";
import { S3Client, ListBucketsCommand } from "@aws-sdk/client-s3";

const { Client } = pg;

function loadEnvFile(filePath) {
  const env = {};
  if (fs.existsSync(filePath)) {
    const lines = fs.readFileSync(filePath, "utf8").split("\n");
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const match = trimmed.match(/^([A-Za-z0-9_]+)=(.*)$/);
      if (match) {
        let val = match[2].trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        env[match[1]] = val;
      }
    }
  }
  return env;
}

// Load .migration.env, then fallback to process.env
const migrationEnv = loadEnvFile(path.join(process.cwd(), ".migration.env"));
const env = { ...process.env, ...migrationEnv };

const supabaseDbUrl = (env.SUPABASE_DATABASE_URL || "").trim();
const neonDbUrl = (env.NEON_STAGING_DATABASE_URL || "").trim();
const s3Endpoint = (env.AWS_ENDPOINT_URL_S3 || "").trim();
const s3AccessKeyId = (env.AWS_ACCESS_KEY_ID || "").trim();
const s3SecretAccessKey = (env.AWS_SECRET_ACCESS_KEY || "").trim();
const s3Region = (env.AWS_REGION || "ap-southeast-1").trim();

console.log("============================================================");
console.log("MeroTalent — Migration Preflight Credential Status");
console.log("============================================================");
console.log(`SUPABASE_DATABASE_URL: ${supabaseDbUrl ? "SET" : "MISSING"}`);
console.log(`NEON_STAGING_DATABASE_URL: ${neonDbUrl ? "SET" : "MISSING"}`);
console.log(`AWS_ENDPOINT_URL_S3: ${s3Endpoint ? "SET" : "MISSING"}`);
console.log(`AWS_ACCESS_KEY_ID: ${s3AccessKeyId ? "SET" : "MISSING"}`);
console.log(`AWS_SECRET_ACCESS_KEY: ${s3SecretAccessKey ? "SET" : "MISSING"}`);
console.log("------------------------------------------------------------");

let supabaseStatus = "BLOCKED";
let neonStatus = "BLOCKED";
let storageStatus = "BLOCKED";

async function testSupabase() {
  if (!supabaseDbUrl) {
    console.log("Supabase Check: SKIPPED (SUPABASE_DATABASE_URL is missing)");
    return;
  }
  let client;
  try {
    const parsedUrl = new URL(supabaseDbUrl);
    const host = parsedUrl.hostname;
    if (!host.includes("dtirpilgzlsfryucanlg")) {
      console.log(`Supabase Check Warning: Host (${host}) does not match expected project dtirpilgzlsfryucanlg`);
    }

    client = new Client({
      connectionString: supabaseDbUrl,
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 10000,
    });
    await client.connect();
    const res = await client.query("SELECT current_database(), current_user, version();");
    const row = res.rows[0];
    console.log(`Supabase Database: CONNECTED (db: ${row.current_database}, user: ${row.current_user})`);
    supabaseStatus = "CONNECTED";
  } catch (err) {
    console.log(`Supabase Check FAILED: ${err.message}`);
  } finally {
    if (client) {
      try { await client.end(); } catch (_) {}
    }
  }
}

async function testNeon() {
  if (!neonDbUrl) {
    console.log("Neon Check: SKIPPED (NEON_STAGING_DATABASE_URL is missing)");
    return;
  }
  let client;
  try {
    client = new Client({
      connectionString: neonDbUrl,
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 10000,
    });
    await client.connect();
    const res = await client.query("SELECT current_database(), current_user, version();");
    const row = res.rows[0];
    console.log(`Neon Staging Database: CONNECTED (db: ${row.current_database}, user: ${row.current_user})`);
    neonStatus = "CONNECTED";
  } catch (err) {
    console.log(`Neon Check FAILED: ${err.message}`);
  } finally {
    if (client) {
      try { await client.end(); } catch (_) {}
    }
  }
}

async function testStorage() {
  if (!s3Endpoint || !s3AccessKeyId || !s3SecretAccessKey) {
    console.log("Neon Storage Check: SKIPPED (Missing S3 endpoint or credentials)");
    return;
  }
  try {
    const s3 = new S3Client({
      endpoint: s3Endpoint,
      region: s3Region,
      credentials: {
        accessKeyId: s3AccessKeyId,
        secretAccessKey: s3SecretAccessKey,
      },
      forcePathStyle: true,
    });
    const result = await s3.send(new ListBucketsCommand({}));
    const bucketCount = (result.Buckets || []).length;
    console.log(`Neon Storage: CONNECTED (${bucketCount} buckets found)`);
    storageStatus = "CONNECTED";
  } catch (err) {
    console.log(`Neon Storage Check FAILED: ${err.message}`);
  }
}

async function run() {
  await testSupabase();
  await testNeon();
  await testStorage();

  console.log("============================================================");
  console.log("FINAL CONNECTIVITY STATUS");
  console.log("============================================================");
  console.log(`SUPABASE DATABASE: ${supabaseStatus}`);
  console.log(`NEON STAGING DATABASE: ${neonStatus}`);
  console.log(`NEON STORAGE: ${storageStatus}`);
  console.log("============================================================");

  if (supabaseStatus === "BLOCKED" && !supabaseDbUrl) {
    console.log("Action Required: Please populate SUPABASE_DATABASE_URL in .migration.env");
  }
}

run();
