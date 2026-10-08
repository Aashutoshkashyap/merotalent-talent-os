/** Read-only identity and emptiness check before correcting migration targets. */
import dotenv from "dotenv";
import pg from "pg";
import { S3Client, ListBucketsCommand } from "@aws-sdk/client-s3";

dotenv.config({ path: ".migration.env", quiet: true });

const PROJECT = "summer-sky-63693897";
const PRODUCTION_BRANCH = "br-falling-breeze-azr6q64l";
const STAGING_BRANCH = "br-frosty-haze-azsnybmr";
const PRODUCTION_HOST = "ep-polished-flower-azsezy8a-pooler.c-3.ap-southeast-1.aws.neon.tech";
const STAGING_HOST = "ep-wispy-credit-azt6tgwj-pooler.c-3.ap-southeast-1.aws.neon.tech";
const REGION = "c-3.ap-southeast-1.aws.neon.tech";

const sourceUrl = process.env.SUPABASE_DATABASE_URL;
const savedNeonUrl = process.env.NEON_PRODUCTION_DATABASE_URL || process.env.NEON_STAGING_DATABASE_URL;
if (!sourceUrl || !savedNeonUrl) throw new Error("Source and existing Neon credentials are required.");
const source = new URL(sourceUrl);
const neonProduction = new URL(savedNeonUrl);
if (source.hostname !== "db.dtirpilgzlsfryucanlg.supabase.co" || neonProduction.hostname !== PRODUCTION_HOST) {
  throw new Error("Configured source or Neon production host does not match the independently verified project.");
}
const neonStaging = new URL(savedNeonUrl);
neonStaging.hostname = STAGING_HOST; // Same cloned branch role; verify with an actual read-only login.
if (neonStaging.hostname === neonProduction.hostname) throw new Error("Neon branch URLs are identical.");

async function databaseInventory(label, url, branch) {
  const client = new pg.Client({
    connectionString: url.toString(),
    options: "-c default_transaction_read_only=on",
    connectionTimeoutMillis: 10_000,
  });
  try {
    await client.connect();
    const meta = await client.query(`
      SELECT current_database() AS database, current_setting('server_version') AS version,
        (SELECT count(*)::int FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
         WHERE c.relkind='r' AND n.nspname='public') AS application_tables,
        to_regclass('neon_auth."user"')::text AS auth_table`);
    const authUsers = meta.rows[0].auth_table
      ? (await client.query('SELECT count(*)::int AS count FROM neon_auth."user"')).rows[0].count
      : null;
    const tables = await client.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema='public' AND table_type='BASE TABLE' ORDER BY table_name`);
    let applicationRows = 0;
    for (const { table_name: table } of tables.rows) {
      const quoted = `"${table.replaceAll('"', '""')}"`;
      const [result] = (await client.query(`SELECT count(*)::int AS count FROM public.${quoted}`)).rows;
      applicationRows += result.count;
    }
    const { auth_table: _authTable, ...metadata } = meta.rows[0];
    return { label, project: PROJECT, branch, host: url.hostname, ...metadata, auth_users: authUsers, application_rows: applicationRows };
  } finally { await client.end().catch(() => {}); }
}

async function storageInventory(label, branch) {
  const endpoint = `https://${branch}.storage.${REGION}`;
  const client = new S3Client({
    endpoint,
    region: process.env.AWS_REGION || "ap-southeast-1",
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
    },
    forcePathStyle: true,
  });
  const response = await client.send(new ListBucketsCommand({}));
  return { label, project: PROJECT, branch, endpoint, buckets: response.Buckets?.length ?? 0 };
}

const databases = [];
for (const [label, url, branch] of [
  ["Supabase production source", source, "dtirpilgzlsfryucanlg"],
  ["Neon production (existing destination)", neonProduction, PRODUCTION_BRANCH],
  ["Neon migration-staging (required destination)", neonStaging, STAGING_BRANCH],
]) databases.push(await databaseInventory(label, url, branch));
console.log(JSON.stringify({ databases }, null, 2));
const storage = [];
for (const [label, branch] of [["Neon production", PRODUCTION_BRANCH], ["Neon migration-staging", STAGING_BRANCH]]) {
  try { storage.push(await storageInventory(label, branch)); }
  catch (error) { storage.push({ label, branch, error: error instanceof Error ? error.name : "Unavailable" }); }
}
console.log(JSON.stringify({ storage }, null, 2));

if (neonProduction.hostname === neonStaging.hostname || databases[2].application_tables !== 0 || databases[2].application_rows !== 0) {
  throw new Error("Pre-migration safety gate failed: staging is not an empty, distinct target.");
}
if (storage[1].buckets !== 0) throw new Error("Pre-migration safety gate failed: staging storage is not confirmed empty.");
