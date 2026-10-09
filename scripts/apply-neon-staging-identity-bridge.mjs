/** Apply only the reviewed identity-ledger DDL to the isolated staging branch. */
import fs from "node:fs/promises";
import pg from "pg";
import dotenv from "dotenv";
import { requireNeonMigrationStaging } from "./require-neon-migration-staging.mjs";

dotenv.config({ path: ".migration.env", quiet: true });
const url = process.env.NEON_STAGING_DATABASE_URL;
requireNeonMigrationStaging(url);
const client = new pg.Client({ connectionString: url, connectionTimeoutMillis: 10000 });
try {
  await client.connect();
  await client.query("BEGIN");
  const sql = await fs.readFile(new URL("./neon-staging-identity-bridge.sql", import.meta.url), "utf8");
  await client.query(sql);
  await client.query("COMMIT");
  console.log("Isolated Neon staging identity bridge applied.");
} catch (error) {
  await client.query("ROLLBACK").catch(() => undefined);
  console.error("Staging identity bridge failed:", error instanceof Error ? error.message : "unknown error");
  process.exitCode = 1;
} finally {
  await client.end().catch(() => undefined);
}
