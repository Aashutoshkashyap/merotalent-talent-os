/** Forward-only draft ledger migration on the verified isolated Neon branch. */
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
  await client.query(await fs.readFile(new URL("./sql/neon-staging-job-document-drafts.sql", import.meta.url), "utf8"));
  await client.query("COMMIT");
  console.log("Isolated Neon staging job-document draft ledger applied.");
} catch (error) {
  await client.query("ROLLBACK").catch(() => undefined);
  console.error(`Draft-ledger migration failed (${typeof error?.code === "string" ? error.code : "UNKNOWN"}).`);
  process.exitCode = 1;
} finally {
  await client.end().catch(() => undefined);
}
