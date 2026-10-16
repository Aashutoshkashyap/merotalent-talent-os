/** Rehearse a remote Neon dump and isolated local restore with synthetic data only. */
import { randomBytes } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import dotenv from "dotenv";
import pg from "pg";
import { requireNeonMigrationStaging } from "./require-neon-migration-staging.mjs";

dotenv.config({ path: ".migration.env", quiet: true });
const databaseUrl = process.env.NEON_STAGING_DATABASE_URL;
requireNeonMigrationStaging(databaseUrl);
const source = new URL(databaseUrl);
const bin = process.env.PG_BIN_DIR || "/opt/homebrew/opt/postgresql@18/bin";
const run = (name, args, options = {}) => execFileSync(join(bin, name), args, {
  encoding: "utf8", timeout: 90_000, stdio: ["ignore", "pipe", "pipe"], ...options,
});
const scratch = mkdtempSync(join(tmpdir(), "merotalent-neon-restore-"));
const socketDirectory = join(scratch, "socket");
const localData = join(scratch, "local-postgres");
const archive = join(scratch, "synthetic.backup");
const localLog = join(scratch, "postgres.log");
const schema = `migration_restore_probe_${randomBytes(8).toString("hex")}`;
const sourceClient = new pg.Client({ connectionString: databaseUrl, connectionTimeoutMillis: 10_000 });
let connected = false;
let schemaCreated = false;
let localRunning = false;
let localStopped = true;

try {
  mkdirSync(socketDirectory, { mode: 0o700 });
  await sourceClient.connect();
  connected = true;
  const identity = (await sourceClient.query("SELECT current_database() AS db")).rows[0];
  if (identity?.db !== "neondb") throw new Error("Unexpected staging database identity.");
  await sourceClient.query(`CREATE SCHEMA "${schema}"`);
  schemaCreated = true;
  await sourceClient.query(`CREATE TABLE "${schema}".restore_probe (
    id integer PRIMARY KEY, marker text NOT NULL UNIQUE, created_at timestamptz NOT NULL DEFAULT now()
  )`);
  await sourceClient.query(`INSERT INTO "${schema}".restore_probe (id, marker) VALUES
    (1, 'synthetic-dump-restore'), (2, 'synthetic-authorization-marker')`);

  const remoteEnv = {
    ...process.env,
    PGHOST: source.hostname,
    PGPORT: source.port || "5432",
    PGDATABASE: source.pathname.slice(1),
    PGUSER: decodeURIComponent(source.username),
    PGPASSWORD: decodeURIComponent(source.password),
    PGSSLMODE: "verify-full",
    PGSSLROOTCERT: "system",
  };
  run("pg_dump", ["--format=custom", "--no-owner", "--no-privileges",
    `--schema=${schema}`, `--file=${archive}`], { env: remoteEnv });
  run("pg_restore", ["--list", archive]);

  run("initdb", ["--no-instructions", "--auth=trust", "-D", localData]);
  run("pg_ctl", ["-D", localData, "-l", localLog,
    "-o", `-k ${socketDirectory} -p 55439`, "-w", "start"]);
  localRunning = true;
  localStopped = false;
  const localEnv = { ...process.env, PGHOST: socketDirectory, PGPORT: "55439", PGDATABASE: "postgres",
    PGUSER: process.env.USER || "postgres", PGPASSWORD: "", PGSSLMODE: "disable" };
  run("pg_restore", ["--exit-on-error", "--no-owner", "--no-privileges", "-d", "postgres", archive],
    { env: localEnv });
  const local = new pg.Client({ host: socketDirectory, port: 55439, database: "postgres",
    user: localEnv.PGUSER, connectionTimeoutMillis: 5_000 });
  try {
    await local.connect();
    const result = await local.query(`SELECT count(*)::int AS n,
      count(DISTINCT marker)::int AS unique_markers FROM "${schema}".restore_probe`);
    if (result.rows[0]?.n !== 2 || result.rows[0]?.unique_markers !== 2) {
      throw new Error("Restored synthetic row or uniqueness check failed.");
    }
  } finally {
    await local.end().catch(() => undefined);
  }
  console.log(JSON.stringify({ result: "PASS", source: "verified Neon migration-staging compute",
    archive: "custom-format synthetic schema", restore: "isolated local PostgreSQL 18",
    syntheticRowsRestored: 2, productionDataCopied: false }));
} catch (error) {
  console.error(`Staging backup/restore rehearsal failed (${typeof error?.code === "string" ? error.code : "CHECK_FAILED"}).`);
  process.exitCode = 1;
} finally {
  try {
    if (localRunning || run("pg_ctl", ["-D", localData, "status"])) {
      run("pg_ctl", ["-D", localData, "-m", "immediate", "-w", "stop"]);
      localStopped = true;
    }
  } catch {
    if (localRunning) {
      console.error("Local rehearsal server did not stop cleanly; inspect its temporary directory before cleanup.");
      process.exitCode = 1;
    }
  }
  if (schemaCreated && connected) {
    try { await sourceClient.query(`DROP SCHEMA "${schema}" CASCADE`); }
    catch { console.error(`Synthetic staging schema ${schema} needs manual cleanup.`); process.exitCode = 1; }
  }
  if (connected) await sourceClient.end().catch(() => undefined);
  if (localStopped) rmSync(scratch, { recursive: true, force: true });
}
