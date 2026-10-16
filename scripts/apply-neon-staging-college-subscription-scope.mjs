import { readFile } from "node:fs/promises";
import pg from "pg";
import dotenv from "dotenv";
import { requireNeonMigrationStaging } from "./require-neon-migration-staging.mjs";

dotenv.config({ path: ".migration.env", quiet: true });
requireNeonMigrationStaging(process.env.NEON_STAGING_DATABASE_URL);
const client = new pg.Client({ connectionString: process.env.NEON_STAGING_DATABASE_URL, connectionTimeoutMillis: 10000 });
try {
  const sql = await readFile(new URL("./sql/neon-staging-college-subscription-scope-validation.sql", import.meta.url), "utf8");
  await client.connect();
  await client.query("BEGIN");
  await client.query(sql);
  await client.query("COMMIT");
  console.log("Isolated Neon staging College subscription scope validation updated.");
} catch (cause) {
  await client.query("ROLLBACK").catch(() => undefined);
  console.error(cause instanceof Error ? cause.message : "Staging adjustment failed.");
  process.exitCode = 1;
} finally { await client.end().catch(() => undefined); }
