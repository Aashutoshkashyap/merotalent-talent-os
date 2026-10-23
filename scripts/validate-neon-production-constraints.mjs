/** Validate only the exact CHECK definitions already rehearsed in isolated staging.
 * No data repair, constraint replacement, identity mutation or source access.
 */
import dotenv from "dotenv";
import pg from "pg";
import { readFileSync, lstatSync, writeFileSync, existsSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { productionCandidateUrl } from "./production-candidate-boundary.mjs";
import { requireReviewedConstraints, requireFreshRestoredBackup } from "./production-constraint-validation.mjs";
import { sha256, quoteIdentifier as q } from "./recovery-integrity.mjs";

let client, transaction = false, phase = "preflight";
try {
  const args = {};
  for (const arg of process.argv.slice(2)) {
    const match = /^--(mode|review|backup-report|report)=(.+)$/.exec(arg);
    if (!match || args[match[1]]) throw Error("INVALID_ARGUMENT");
    args[match[1]] = match[2];
  }
  if (!["dry-run", "apply"].includes(args.mode)) throw Error("EXPLICIT_MODE_REQUIRED");
  const directory = join(homedir(), "Library", "Application Support", "MeroTalent", "migration-artifacts");
  const privateFile = path => {
    if (!path || dirname(resolve(path)) !== directory) throw Error("PRIVATE_ARTIFACT_REQUIRED");
    const stat = lstatSync(path);
    if (!stat.isFile() || stat.isSymbolicLink() || stat.uid !== process.getuid() || stat.mode & 0o077) throw Error("PRIVATE_ARTIFACT_REQUIRED");
    return { value: JSON.parse(readFileSync(path, "utf8")), stat };
  };
  const review = privateFile(args.review).value;
  const backup = privateFile(args["backup-report"]);
  const envelope = privateFile(backup.value.artifact).value;
  requireFreshRestoredBackup(backup.value, envelope, backup.stat.mtimeMs);
  if (!args.report || dirname(resolve(args.report)) !== directory) throw Error("PRIVATE_REPORT_REQUIRED");
  if (existsSync(args.report)) throw Error("REPORT_ALREADY_EXISTS");
  dotenv.config({ path: ".migration.env", quiet: true });
  client = new pg.Client({ connectionString: productionCandidateUrl(process.env.NEON_PRODUCTION_DATABASE_URL).href,
    connectionTimeoutMillis: 15000, query_timeout: 45000 });
  client.on("error", () => {});
  await client.connect();
  await client.query(`BEGIN ISOLATION LEVEL REPEATABLE READ${args.mode === "dry-run" ? " READ ONLY" : ""}`);
  transaction = true;
  await client.query("SET LOCAL statement_timeout='30s'; SET LOCAL lock_timeout='2s'");
  const constraints = (await client.query(`SELECT c.relname AS table,p.conname AS name,p.contype AS type,
    pg_get_expr(p.conbin,p.conrelid) AS expression,pg_get_constraintdef(p.oid) AS definition
    FROM pg_constraint p JOIN pg_class c ON c.oid=p.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='public' AND NOT p.convalidated ORDER BY c.relname,p.conname`)).rows
    .map(c => ({ ...c, definitionHash: sha256(c.definition) }));
  requireReviewedConstraints(constraints, review);
  phase = "check_rows";
  const checks = [];
  for (const c of constraints) {
    const result = await client.query(`SELECT count(*)::int AS violations FROM public.${q(c.table)} WHERE NOT (${c.expression})`);
    checks.push({ table: c.table, name: c.name, definitionHash: c.definitionHash, violations: result.rows[0].violations });
  }
  if (checks.some(c => c.violations !== 0)) throw Error("PRODUCTION_CONSTRAINT_VIOLATIONS_NO_REPAIR");
  phase = "validate";
  if (args.mode === "apply") {
    // PostgreSQL's VALIDATE lock permits ordinary application reads/writes.
    // Existing NOT VALID CHECKs already constrain new rows; this scans history.
    for (const c of constraints) await client.query(`ALTER TABLE public.${q(c.table)} VALIDATE CONSTRAINT ${q(c.name)}`);
    const remaining = (await client.query(`SELECT count(*)::int AS n FROM pg_constraint p
      JOIN pg_namespace n ON n.oid=p.connamespace WHERE n.nspname='public' AND NOT p.convalidated`)).rows[0].n;
    if (remaining !== 0) throw Error("UNVALIDATED_CONSTRAINTS_REMAIN");
  }
  await client.query(args.mode === "apply" ? "COMMIT" : "ROLLBACK");
  transaction = false;
  const report = { result: "PASS", at: new Date().toISOString(), target: "pinned-neon-production", mode: args.mode,
    checked: checks.length, validated: args.mode === "apply" ? checks.length : 0, checks,
    backupArchiveSha256: backup.value.archiveSha256, businessRowWrites: 0, sourceWrites: 0 };
  writeFileSync(args.report, JSON.stringify(report, null, 2), { mode: 0o600, flag: "wx" });
  console.log(JSON.stringify({ ...report, checks: undefined }));
} catch (error) {
  console.error(JSON.stringify({ result: "FAIL", phase, code: /^[A-Z_]+$/.test(error.message ?? "") ? error.message : "PRODUCTION_CONSTRAINT_VALIDATION_FAILED",
    sqlState: /^[A-Z0-9]{5}$/.test(error.code ?? "") ? error.code : null }));
  process.exitCode = 1;
} finally {
  if (transaction) await client?.query("ROLLBACK").catch(() => {});
  await client?.end().catch(() => {});
}
