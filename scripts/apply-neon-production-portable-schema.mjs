/** Forward-only, backup-gated portable schema reconciliation on the offline candidate. */
import dotenv from "dotenv";
import pg from "pg";
import { readFile, lstat, writeFile } from "node:fs/promises";
import { isAbsolute } from "node:path";
import { readEncryptedSourceSnapshot } from "./source-snapshot-artifact.mjs";
import { summarizeSourceSnapshot } from "./source-auth-snapshot.mjs";
import { productionCandidateUrl } from "./production-candidate-boundary.mjs";
import { portableSourceSchema, applyPortableCandidateSchema } from "./portable-source-schema.mjs";
import { tableFingerprintsBatched as tableFingerprints, assertFingerprints, sha256, quoteIdentifier as q } from "./recovery-integrity.mjs";

if (!process.argv.includes("--apply-candidate")) throw new Error("EXPLICIT_CANDIDATE_APPLY_REQUIRED");
const args = Object.fromEntries(process.argv.slice(2).filter(arg => arg !== "--apply-candidate").map(arg => {
  const match = /^--(snapshot|snapshot-sha256|backup-report|report)=(.+)$/.exec(arg);
  if (!match) throw new Error("INVALID_ARGUMENT");
  return [match[1], match[2]];
}));
let client, phase = "proof_checks";
try {
  for (const name of ["snapshot", "backup-report", "report"]) if (!isAbsolute(args[name] ?? "")) throw new Error("PRIVATE_ABSOLUTE_PATH_REQUIRED");
  const info = await lstat(args["backup-report"]);
  if (!info.isFile() || info.isSymbolicLink() || info.uid !== process.getuid() || (info.mode & 0o077)) throw new Error("PRIVATE_BACKUP_REPORT_REQUIRED");
  const backup = JSON.parse(await readFile(args["backup-report"], "utf8"));
  if (backup.result !== "PASS" || backup.target !== "existing-production-candidate" ||
      !backup.restoredFromEncryptedArchive || !backup.applicationRowAndSchemaFingerprintsVerified ||
      backup.portableSchemaRehearsal?.triggers !== 47 || backup.remoteWrites !== 0) throw new Error("COMPLETE_RESTORE_REHEARSAL_REQUIRED");
  const archive = JSON.parse(await readFile(backup.artifact, "utf8"));
  if (archive.sha256 !== backup.archiveSha256) throw new Error("BACKUP_ARCHIVE_MISMATCH");
  const source = await readEncryptedSourceSnapshot(args.snapshot);
  if (summarizeSourceSnapshot(source).snapshotSha256 !== args["snapshot-sha256"]) throw new Error("SOURCE_HASH_MISMATCH");
  const plan = portableSourceSchema(source);
  dotenv.config({ path: ".migration.env", quiet: true });
  const target = productionCandidateUrl(process.env.NEON_PRODUCTION_DATABASE_URL);
  client = new pg.Client({ connectionString: target.href, connectionTimeoutMillis: 15000, query_timeout: 30000 });
  client.on("error", () => {});
  phase = "connect";
  await client.connect();
  let before;
  const applied = await applyPortableCandidateSchema(client, plan, { targetUrl: target.href,
    before: async () => {
      phase = "lock_and_fingerprint";
      await client.query("SELECT pg_advisory_xact_lock(hashtextextended('merotalent:portable-candidate-schema',0))");
      const tables = (await client.query(`SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename`)).rows;
      for (const { tablename } of tables) await client.query(`LOCK TABLE public.${q(tablename)} IN SHARE MODE`);
      before = await tableFingerprints(client);
      if (before.length !== backup.tables || before.reduce((n,r) => n+r.count,0) !== backup.rows) throw new Error("CANDIDATE_CHANGED_SINCE_REHEARSAL");
      phase = "portable_ddl";
    },
    verify: async () => {
      phase = "verify_rows_and_views";
      assertFingerprints(before, await tableFingerprints(client));
      for (const view of ["institute_directory", "public_profile_directory"]) await client.query(`SELECT count(*) FROM public.${q(view)}`);
    } });
  const report = { result: "PASS", at: new Date().toISOString(), target: "offline-neon-production-candidate",
    sourceSnapshotSha256: args["snapshot-sha256"], backupArchiveSha256: backup.archiveSha256,
    portablePlanSha256: sha256(JSON.stringify(plan)), applied, originalRowsUnchanged: true,
    productionCandidateSchemaChanged: true, sourceWrites: 0, applicationDataWrites: 0,
    authIdentityChanges: 0, productionTrafficSwitched: false };
  await writeFile(args.report, JSON.stringify(report,null,2), { mode: 0o600, flag: "wx" });
  console.log(JSON.stringify(report));
} catch (error) {
  console.error(JSON.stringify({ result: "FAIL", phase, code: /^[A-Z_]+$/.test(error?.message ?? "") ? error.message : error.code ??
    (error.message === "Query read timeout" ? "CANDIDATE_QUERY_TIMEOUT" : "CANDIDATE_SCHEMA_FAILED") }));
  process.exitCode = 1;
} finally { await client?.end().catch(() => {}); }
