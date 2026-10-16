/** Full public + Managed Auth staging archive into disposable local PostgreSQL. Never targets production. */
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import dotenv from "dotenv";
import pg from "pg";
import { requireNeonMigrationStaging } from "./require-neon-migration-staging.mjs";

dotenv.config({ path: ".migration.env", quiet: true });
const url = process.env.NEON_STAGING_DATABASE_URL;
requireNeonMigrationStaging(url);
if (process.env.NEON_STAGING_BRANCH_ID !== "br-frosty-haze-azsnybmr") throw new Error("Unexpected staging branch.");
const source = new URL(url);
const bin = process.env.PG_BIN_DIR || "/opt/homebrew/opt/postgresql@18/bin";
const scratch = mkdtempSync(join(tmpdir(), "merotalent-full-restore-"));
const socket = join(scratch, "socket");
const localData = join(scratch, "data");
const archive = join(scratch, "staging.backup");
const log = join(scratch, "postgres.log");
const port = 55000 + Math.floor(Math.random() * 5000);
const remoteEnv = { ...process.env, PGHOST: source.hostname, PGPORT: source.port || "5432",
  PGDATABASE: source.pathname.slice(1), PGUSER: decodeURIComponent(source.username),
  PGPASSWORD: decodeURIComponent(source.password), PGSSLMODE: "verify-full", PGSSLROOTCERT: "system" };
const localEnv = { ...process.env, PGHOST: socket, PGPORT: String(port), PGDATABASE: "postgres",
  PGUSER: process.env.USER || "postgres", PGPASSWORD: "", PGSSLMODE: "disable" };
const run = (name, args, env = process.env) => execFileSync(join(bin, name), args,
  { env, stdio: ["ignore", "pipe", "pipe"], encoding: "utf8", timeout: 180_000 });
let localRunning = false;
let localStopped = true;

try {
  mkdirSync(socket, { mode: 0o700 });
  run("pg_dump", ["--format=custom", "--no-owner", "--no-privileges",
    "--schema=public", "--schema=neon_auth", `--file=${archive}`], remoteEnv);
  run("pg_restore", ["--list", archive]);
  run("initdb", ["--no-instructions", "--auth=trust", "-D", localData]);
  run("pg_ctl", ["-D", localData, "-l", log, "-o", `-k ${socket} -p ${port}`, "-w", "start"]);
  localRunning = true;
  localStopped = false;
  const restoreBase = ["--exit-on-error", "--no-owner", "--no-privileges", "-d", "postgres"];
  run("pg_restore", [...restoreBase, "--section=pre-data", "--clean", "--if-exists", archive], localEnv);
  for (const extension of ["pg_trgm", "pgcrypto", "uuid-ossp"]) {
    run("psql", ["-d", "postgres", "-v", "ON_ERROR_STOP=1", "-c",
      `CREATE EXTENSION IF NOT EXISTS \"${extension}\" WITH SCHEMA public`], localEnv);
  }
  run("pg_restore", [...restoreBase, "--section=data", archive], localEnv);
  run("pg_restore", [...restoreBase, "--section=post-data", archive], localEnv);
  const restored = new pg.Client({ host: socket, port, database: "postgres", user: localEnv.PGUSER });
  try {
    await restored.connect();
    const counts = (await restored.query(`SELECT
      (SELECT count(*)::int FROM public.profiles) AS profiles,
      (SELECT count(*)::int FROM public.neon_application_accounts) AS application_accounts,
      (SELECT count(*)::int FROM public.neon_identity_links) AS identity_links,
      (SELECT count(*)::int FROM public.payments) AS payments,
      (SELECT count(*)::int FROM neon_auth."user") AS managed_auth_users`)).rows[0];
    const orphanedAccounts = (await restored.query(`SELECT count(*)::int AS n
      FROM public.neon_application_accounts a LEFT JOIN public.profiles p ON p.user_id=a.legacy_user_id
      WHERE p.user_id IS NULL`)).rows[0].n;
    if (orphanedAccounts !== 0) throw new Error("Restored application-account ownership is broken.");
    console.log(JSON.stringify({ result: "PASS", sourceBranch: process.env.NEON_STAGING_BRANCH_ID,
      target: "disposable local PostgreSQL 18", restoredCounts: counts, orphanedAccounts,
      scope: "public and neon_auth schemas; object storage and production source excluded" }));
  } finally { await restored.end().catch(() => undefined); }
} catch (error) {
  console.error("Full isolated staging restore failed:", error instanceof Error ? error.message : "UNKNOWN_ERROR");
  process.exitCode = 1;
} finally {
  if (localRunning) {
    try { run("pg_ctl", ["-D", localData, "-m", "immediate", "-w", "stop"]); localStopped = true; }
    catch { console.error("Disposable local PostgreSQL did not stop; temporary files retained for inspection."); process.exitCode = 1; }
  }
  if (localStopped) rmSync(scratch, { recursive: true, force: true });
}
