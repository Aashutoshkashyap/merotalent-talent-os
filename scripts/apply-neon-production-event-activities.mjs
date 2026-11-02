/** Explicit, backup/rehearsal-gated forward Event schema expansion. No payment or identity mutations. */
import dotenv from "dotenv";
import pg from "pg";
import { lstat, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { productionCandidateUrl } from "./production-candidate-boundary.mjs";
import { applyEventActivitiesChecked, eventActivitySql } from "./event-activities-migration.mjs";
import { sha256 } from "./recovery-integrity.mjs";
if (!process.argv.includes("--apply-production-events")) throw new Error("EXPLICIT_PRODUCTION_EVENTS_APPLY_REQUIRED");
const args = Object.fromEntries(process.argv.slice(2).filter(value => value !== "--apply-production-events").map(value => {
  const match = /^--(backup-report|report)=(\/.*)$/.exec(value);
  if (!match) throw new Error("INVALID_ARGUMENT"); return [match[1], match[2]];
}));
let client;
try {
  if (!args.report || !args["backup-report"]) throw new Error("PRIVATE_REPORT_PATHS_REQUIRED");
  const directory = await lstat(dirname(args.report));
  if (!directory.isDirectory() || directory.isSymbolicLink() || directory.uid !== process.getuid() || directory.mode & 0o077)
    throw new Error("PRIVATE_REPORT_DIRECTORY_REQUIRED");
  try { await lstat(args.report); throw new Error("REFUSING_REPORT_OVERWRITE"); }
  catch (error) { if (error.code !== "ENOENT") throw error; }
  const stat = await lstat(args["backup-report"]);
  if (!stat.isFile() || stat.isSymbolicLink() || stat.uid !== process.getuid() || stat.mode & 0o077 || Date.now() - stat.mtimeMs > 86400000)
    throw new Error("FRESH_PRIVATE_BACKUP_REPORT_REQUIRED");
  const backup = JSON.parse(await readFile(args["backup-report"], "utf8"));
  if (backup.result !== "PASS" || !backup.restoredFromEncryptedArchive || !backup.encryptedReadbackVerified ||
    !backup.applicationRowAndSchemaFingerprintsVerified || backup.remoteWrites !== 0 ||
    backup.eventActivitiesRehearsal?.sqlSha256 !== sha256(await eventActivitySql()) ||
    !backup.eventActivitiesRehearsal.idempotent || !backup.eventActivitiesRehearsal.originalRowsUnchanged)
    throw new Error("VERIFIED_EVENT_RESTORE_REHEARSAL_REQUIRED");
  const archive = await lstat(backup.artifact);
  if (!archive.isFile() || archive.isSymbolicLink() || archive.uid !== process.getuid() || archive.mode & 0o077) throw new Error("ENCRYPTED_BACKUP_REQUIRED");
  dotenv.config({ path: ".migration.env", quiet: true });
  client = new pg.Client({ connectionString: productionCandidateUrl(process.env.NEON_PRODUCTION_DATABASE_URL).href, connectionTimeoutMillis: 15000, query_timeout: 30000 });
  client.on("error", () => {}); await client.connect(); await client.query("BEGIN");
  await client.query("SET LOCAL lock_timeout='5s'"); await client.query("SET LOCAL statement_timeout='30s'");
  const applied = await applyEventActivitiesChecked(client); await client.query("SET CONSTRAINTS ALL IMMEDIATE");
  await client.query("COMMIT");
  const report = { result: "PASS", at: new Date().toISOString(), ...applied, sourceWrites: 0, authIdentityChanges: 0, paymentChanges: 0,
    productionSchemaApplied: true, applicationDeployed: false };
  await writeFile(args.report, JSON.stringify(report, null, 2), { mode: 0o600, flag: "wx" }); console.log(JSON.stringify(report));
} catch (error) {
  await client?.query("ROLLBACK").catch(() => {});
  console.error(JSON.stringify({ result: "FAIL", code: /^[A-Z_]+$/.test(error?.message ?? "") ? error.message : error.code ?? "EVENT_MIGRATION_FAILED" })); process.exitCode = 1;
} finally { await client?.end().catch(() => {}); }
