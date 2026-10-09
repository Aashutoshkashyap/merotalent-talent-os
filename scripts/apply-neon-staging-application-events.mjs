/** Apply the durable event ledger only to the approved isolated Neon branch. */
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
  await client.query(await fs.readFile(new URL("./neon-staging-application-events.sql", import.meta.url), "utf8"));
  await client.query("COMMIT");
  console.log("Isolated Neon staging application-event ledger applied.");
} catch (error) {
  await client.query("ROLLBACK").catch(() => undefined);
  const code = typeof error?.code === "string" ? error.code : "UNKNOWN";
  console.error(`Staging application-event ledger could not be applied (SQLSTATE ${code}).`);
  process.exitCode = 1;
} finally {
  await client.end().catch(() => undefined);
}
