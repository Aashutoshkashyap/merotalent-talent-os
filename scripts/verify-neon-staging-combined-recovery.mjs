/** Consistent staging DB + all object bytes restored into disposable local recovery storage.
 * Source DB/Object Storage is READ ONLY. Fault injection is restricted to local scratch resources.
 */
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import dotenv from "dotenv";
import pg from "pg";
import { S3Client, ListBucketsCommand, GetObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import { requireNeonMigrationStaging } from "./require-neon-migration-staging.mjs";
import { listAllBucketObjects } from "./storage-reconciliation-utils.mjs";
import { sha256, tableFingerprints, assertFingerprints, quoteIdentifier, storageReference } from "./recovery-integrity.mjs";

dotenv.config({ path: ".migration.env", quiet: true });
const url = process.env.NEON_STAGING_DATABASE_URL;
requireNeonMigrationStaging(url);
const branch = "br-frosty-haze-azsnybmr";
const endpoint = `https://${branch}.storage.c-3.ap-southeast-1.aws.neon.tech`;
if (process.env.NEON_STAGING_BRANCH_ID !== branch || process.env.AWS_ENDPOINT_URL_S3 !== endpoint) {
  throw new Error("UNEXPECTED_STAGING_TARGET");
}
const bin = process.env.PG_BIN_DIR || "/opt/homebrew/opt/postgresql@18/bin";
const source = new URL(url);
const scratch = mkdtempSync(join(tmpdir(), "merotalent-combined-recovery-"));
// macOS TMPDIR paths are long enough to exceed PostgreSQL's Unix socket limit.
const socket = mkdtempSync(join(process.platform === "darwin" ? "/private/tmp" : tmpdir(), "mt-pg-"));
const data = join(scratch, "postgres"), archive = join(scratch, "snapshot.backup");
const objects = join(scratch, "objects"), restoredObjects = join(scratch, "restored-objects");
const port = 55000 + Math.floor(Math.random() * 5000);
const remote = new pg.Client({ connectionString: url, connectionTimeoutMillis: 30000 });
const s3 = new S3Client({ endpoint, region: process.env.AWS_REGION || "ap-southeast-1", forcePathStyle: true,
  credentials: { accessKeyId: process.env.AWS_ACCESS_KEY_ID, secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY } });
const remoteEnv = { ...process.env, PGHOST: source.hostname, PGPORT: source.port || "5432",
  PGDATABASE: source.pathname.slice(1), PGUSER: decodeURIComponent(source.username),
  PGPASSWORD: decodeURIComponent(source.password), PGSSLMODE: "verify-full", PGSSLROOTCERT: "system" };
const localEnv = { ...process.env, PGHOST: socket, PGPORT: String(port), PGDATABASE: "postgres",
  PGUSER: process.env.USER || "postgres", PGPASSWORD: "", PGSSLMODE: "disable" };
for (const key of ["PGHOSTADDR","PGSERVICE","PGSERVICEFILE","PGPASSFILE"]) {
  delete remoteEnv[key]; delete localEnv[key];
}
const run = (name, args, env) => execFileSync(join(bin, name), args,
  { env, stdio: ["ignore", "pipe", "pipe"], encoding: "utf8", timeout: 600000 });
let running = false, stopped = true, connected = false, snapshotOpen = false;
let local;
let phase = "source_snapshot";
const check = (condition, code) => { if (!condition) throw new Error(code); };

const referenceColumns = [
  ["profiles", "resume_url", "resumes"], ["profiles", "avatar_url", "profile-media"],
  ["institutes", "logo_url", "college-media"], ["institutes", "cover_image_url", "college-media"],
  ["institutes", "gallery_urls", "college-media"], ["institutes", "chairperson_image_url", "college-media"],
  ["institutes", "principal_image_url", "college-media"], ["mentors", "profile_image_url", "mentor-media"],
  ["mentors", "cover_image_url", "mentor-media"], ["events", "cover_image_url", "event-media"],
  ["events", "attachment_path", "event-attachments"], ["payment_proofs", "storage_path", "payment-proofs"],
  ["messages", "attachment_path", "chat-attachments"], ["job_applications", "resume_url", "resumes"],
  ["job_applications", "cover_letter_file_url", "job-files"], ["advertisements", "image_url", "ad-media"],
  ["neon_job_document_drafts", "path", "job-files"],
];

async function getReferences(client) {
  const refs = [], seen = new Set();
  for (const [table, column, bucket] of referenceColumns) {
    const rows = (await client.query(`SELECT ${quoteIdentifier(column)} AS value
      FROM public.${quoteIdentifier(table)} WHERE ${quoteIdentifier(column)} IS NOT NULL
      ${table === "neon_job_document_drafts" ? "AND state<>'deleted'" : ""}`)).rows;
    for (const row of rows) for (const value of Array.isArray(row.value) ? row.value : [row.value]) {
      const reference = storageReference(value, bucket);
      if (reference && !seen.has(`${bucket}/${reference.key}`)) {
        seen.add(`${bucket}/${reference.key}`); refs.push(reference);
      }
    }
  }
  const applications = (await client.query(`SELECT form_data FROM public.job_applications WHERE form_data IS NOT NULL`)).rows;
  for (const row of applications) for (const field of ["experienceLetterUrl", "trainingDocumentUrl"]) {
    const reference = storageReference(row.form_data?.[field], "job-files");
    if (reference && !seen.has(`${reference.bucket}/${reference.key}`)) {
      seen.add(`${reference.bucket}/${reference.key}`); refs.push(reference);
    }
  }
  return refs.sort((a,b) => `${a.bucket}/${a.key}`.localeCompare(`${b.bucket}/${b.key}`));
}

try {
  for (const directory of [objects, restoredObjects]) mkdirSync(directory, { mode: 0o700 });
  await remote.connect(); connected = true;
  await remote.query("BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY"); snapshotOpen = true;
  await remote.query("SET LOCAL statement_timeout='60s'");
  await remote.query("SET LOCAL TIME ZONE 'UTC'");
  const snapshot = (await remote.query("SELECT pg_export_snapshot() AS id")).rows[0].id;
  const baseline = await tableFingerprints(remote);
  const references = await getReferences(remote);
  phase = "database_archive";
  run("pg_dump", ["--format=custom", "--no-owner", "--no-privileges", "--schema=public", "--schema=neon_auth",
    `--snapshot=${snapshot}`, `--file=${archive}`], remoteEnv);
  phase = "storage_archive";
  const manifest = [];
  const buckets = (await s3.send(new ListBucketsCommand({}))).Buckets?.map(row => row.Name) ?? [];
  for (const bucket of buckets) for (const object of await listAllBucketObjects(s3, bucket)) {
    const response = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: object.key }));
    const bytes = Buffer.from(await response.Body.transformToByteArray());
    const file = String(manifest.length);
    writeFileSync(join(objects, file), bytes, { mode: 0o600 });
    manifest.push({ bucket, key: object.key, file, bytes: bytes.length, sha256: sha256(bytes),
      contentType: response.ContentType || "application/octet-stream", etag: response.ETag,
      lastModified: response.LastModified?.toISOString() });
  }
  // A moving object source cannot be described as one verified DB+storage recovery point.
  for (const object of manifest) {
    const head = await s3.send(new HeadObjectCommand({ Bucket: object.bucket, Key: object.key }));
    check(head.ETag === object.etag && head.LastModified?.toISOString() === object.lastModified &&
      head.ContentLength === object.bytes, "SOURCE_OBJECT_CHANGED_DURING_SNAPSHOT");
  }
  const finalObjectNames = [];
  for (const bucket of buckets) for (const object of await listAllBucketObjects(s3, bucket)) finalObjectNames.push(`${bucket}/${object.key}`);
  check(JSON.stringify(finalObjectNames.sort()) === JSON.stringify(manifest.map(row => `${row.bucket}/${row.key}`).sort()),
    "SOURCE_OBJECT_SET_CHANGED_DURING_SNAPSHOT");
  await remote.query("ROLLBACK"); snapshotOpen = false;
  console.log(JSON.stringify({ sourceSnapshot: "CAPTURED", tables: baseline.length, objects: manifest.length }));
  writeFileSync(join(objects, "manifest.json"), JSON.stringify(manifest), { mode: 0o600 });

  phase = "local_initdb";
  run("initdb", ["--no-instructions", "--auth=trust", "-D", data], process.env);
  // Listen only on a private Unix socket; no TCP connection can reach this disposable database.
  phase = "local_start";
  run("pg_ctl", ["-D", data, "-l", join(scratch,"postgres.log"), "-o", `-k ${socket} -p ${port} -c listen_addresses=''`, "-w", "start"], process.env);
  running = true; stopped = false;
  const restoreArgs = ["--exit-on-error", "--no-owner", "--no-privileges", "-d", "postgres"];
  const restore = () => {
    // localEnv is pinned to the freshly created private scratch socket above.
    phase = "restore_schema_reset";
    run("psql", ["-v", "ON_ERROR_STOP=1", "-c", "DROP SCHEMA IF EXISTS public CASCADE; DROP SCHEMA IF EXISTS neon_auth CASCADE; CREATE SCHEMA public"], localEnv);
    phase = "restore_pre_data";
    run("pg_restore", [...restoreArgs, "--section=pre-data", "--clean", "--if-exists", archive], localEnv);
    phase = "restore_extensions";
    for (const extension of ["pg_trgm", "pgcrypto", "uuid-ossp"]) run("psql", ["-v", "ON_ERROR_STOP=1", "-c",
      `CREATE EXTENSION IF NOT EXISTS "${extension}" WITH SCHEMA public`], localEnv);
    phase = "restore_data";
    run("pg_restore", [...restoreArgs, "--section=data", archive], localEnv);
    phase = "restore_post_data";
    run("pg_restore", [...restoreArgs, "--section=post-data", archive], localEnv);
    for (const object of manifest) copyFileSync(join(objects,object.file), join(restoredObjects,object.file));
    copyFileSync(join(objects,"manifest.json"), join(restoredObjects,"manifest.json"));
  };
  restore();
  local = new pg.Client({ host: socket, port, database: "postgres", user: localEnv.PGUSER });
  await local.connect();
  await local.query("SET TIME ZONE 'UTC'");
  phase = "restore_integrity";
  assertFingerprints(baseline, await tableFingerprints(local));
  check(JSON.stringify(references) === JSON.stringify(await getReferences(local)), "RESTORED_MEDIA_REFERENCE_MISMATCH");
  const verifyFiles = () => {
    for (const object of manifest) {
      const bytes = readFileSync(join(restoredObjects,object.file));
      check(bytes.length === object.bytes && sha256(bytes) === object.sha256, "RESTORED_OBJECT_HASH_MISMATCH");
    }
    check(readFileSync(join(restoredObjects,"manifest.json")).equals(readFileSync(join(objects,"manifest.json"))),
      "RESTORED_OBJECT_METADATA_MISMATCH");
  };
  verifyFiles();
  const objectMap = new Map(manifest.map(row => [`${row.bucket}/${row.key}`,row]));
  const resolved = references.filter(ref => objectMap.has(`${ref.bucket}/${ref.key}`));
  const missingByBucket = {};
  for (const reference of references.filter(ref => !objectMap.has(`${ref.bucket}/${ref.key}`))) {
    missingByBucket[reference.bucket] = (missingByBucket[reference.bucket] || 0) + 1;
  }
  for (const reference of resolved) {
    const object = objectMap.get(`${reference.bucket}/${reference.key}`);
    check(sha256(readFileSync(join(restoredObjects,object.file))) === object.sha256, "RESTORED_REFERENCE_BYTES_MISMATCH");
  }

  phase = "fault_injection";
  const [profile] = (await local.query("SELECT user_id FROM public.profiles ORDER BY user_id LIMIT 1")).rows;
  check(!!profile && manifest.length > 0, "RECOVERY_FIXTURE_MISSING");
  // Crash before commit: copied objects can diverge while the database rolls back the incomplete write.
  await local.query("BEGIN");
  await local.query("UPDATE public.profiles SET bio=$2 WHERE user_id=$1::uuid", [profile.user_id,`interrupted-${randomUUID()}`]);
  writeFileSync(join(restoredObjects,manifest[0].file), "interrupted object write", { mode: 0o600 });
  await local.end(); local = undefined;
  local = new pg.Client({ host: socket, port, database: "postgres", user: localEnv.PGUSER }); await local.connect();
  await local.query("SET TIME ZONE 'UTC'");
  assertFingerprints(baseline, await tableFingerprints(local));
  let interruptedDetected = false;
  try { verifyFiles(); } catch { interruptedDetected = true; }
  check(interruptedDetected, "INTERRUPTED_OBJECT_WRITE_NOT_DETECTED");
  copyFileSync(join(objects,manifest[0].file), join(restoredObjects,manifest[0].file)); verifyFiles();

  // Committed divergent write: restore the original database and file recovery point together.
  await local.query("UPDATE public.profiles SET bio=$2 WHERE user_id=$1::uuid", [profile.user_id,`divergent-${randomUUID()}`]);
  writeFileSync(join(restoredObjects,manifest[0].file), "committed divergent object", { mode: 0o600 });
  let divergenceDetected = false;
  try { assertFingerprints(baseline, await tableFingerprints(local)); } catch { divergenceDetected = true; }
  check(divergenceDetected, "COMMITTED_DB_DIVERGENCE_NOT_DETECTED");
  await local.end(); local = undefined;
  restore();
  local = new pg.Client({ host: socket, port, database: "postgres", user: localEnv.PGUSER }); await local.connect();
  await local.query("SET TIME ZONE 'UTC'");
  assertFingerprints(baseline, await tableFingerprints(local)); verifyFiles();
  check(JSON.stringify(references) === JSON.stringify(await getReferences(local)), "ROLLBACK_REFERENCE_MISMATCH");
  console.log(JSON.stringify({ result: "PASS", sourceBranch: branch, sourceWrites: 0,
    target: "disposable local PostgreSQL 18 and local object archive", tablesVerified: baseline.length,
    rowsVerified: baseline.reduce((sum,row)=>sum+row.count,0), objectsVerified: manifest.length,
    objectBytesVerified: manifest.reduce((sum,row)=>sum+row.bytes,0), mediaReferences: references.length,
    resolvedReferences: resolved.length, preexistingMissingReferences: references.length-resolved.length, missingByBucket,
    referenceCoverage: references.length===resolved.length ? "PASS" : "FAIL_PREEXISTING_MISSING_OBJECTS",
    interruptedUncommittedDatabaseWrite: "rolled back on disconnect", interruptedObjectWrite: "detected and recovered",
    committedDivergentDatabaseAndObjectWrites: "detected and restored to identical hashes",
    limitation: "Restores bytes and metadata into a local archive, not a second live S3 service; application ACL and production-source reconciliation are separate." }));
} catch (error) {
  const code = error instanceof Error && /^[A-Z_]+$/.test(error.message) ? error.message : "COMBINED_RECOVERY_FAILED";
  const stderr = typeof error?.stderr === "string" ? error.stderr : "";
  const category = error?.code === "ETIMEDOUT" ? "PROCESS_TIMEOUT" :
    /invalid snapshot/i.test(stderr) ? "SNAPSHOT_UNAVAILABLE" : /permission denied/i.test(stderr) ? "PERMISSION_DENIED" :
      /schema .* already exists/i.test(stderr) ? "SCHEMA_EXISTS" : /schema .* does not exist/i.test(stderr) ? "SCHEMA_MISSING" :
      /could not connect|connection/i.test(stderr) ? "CONNECTION_FAILED" : /lock/i.test(stderr) ? "LOCK_FAILED" : "UNCLASSIFIED";
  console.error(JSON.stringify({ result: "FAIL", code, phase, category })); process.exitCode = 1;
} finally {
  await local?.end().catch(()=>undefined);
  if (snapshotOpen) await remote.query("ROLLBACK").catch(()=>undefined);
  if (connected) await remote.end().catch(()=>undefined);
  s3.destroy();
  if (running) {
    try { run("pg_ctl",["-D",data,"-m","immediate","-w","stop"],process.env); stopped=true; }
    catch { console.error(JSON.stringify({ cleanup: "FAIL", code: "LOCAL_DATABASE_STOP_FAILED" })); process.exitCode=1; }
  }
  if (stopped) {
    rmSync(scratch,{recursive:true,force:true}); rmSync(socket,{recursive:true,force:true});
    console.log(JSON.stringify({cleanup:"PASS",temporaryResourcesRemoved:true}));
  }
}
