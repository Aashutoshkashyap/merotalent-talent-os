/** One-time, fail-closed correction of the mislabelled local migration targets. */
import fs from "node:fs";
import dotenv from "dotenv";

dotenv.config({ path: ".migration.env", quiet: true });

const path = ".migration.env";
const productionHost = "ep-polished-flower-azsezy8a-pooler.c-3.ap-southeast-1.aws.neon.tech";
const stagingHost = "ep-wispy-credit-azt6tgwj-pooler.c-3.ap-southeast-1.aws.neon.tech";
const productionStorage = "https://br-falling-breeze-azr6q64l.storage.c-3.ap-southeast-1.aws.neon.tech";
const stagingStorage = "https://br-frosty-haze-azsnybmr.storage.c-3.ap-southeast-1.aws.neon.tech";

const existing = process.env.NEON_STAGING_DATABASE_URL;
const originalStorage = process.env.AWS_ENDPOINT_URL_S3;
if (!existing || originalStorage !== productionStorage) throw new Error("Existing migration targets changed; refusing automatic correction.");
const productionUrl = new URL(existing);
if (productionUrl.hostname !== productionHost) throw new Error("The mislabelled URL no longer points to the known production host.");
const stagingUrl = new URL(existing);
stagingUrl.hostname = stagingHost;
if (stagingUrl.hostname === productionUrl.hostname) throw new Error("Branch connection targets are not distinct.");

const before = fs.readFileSync(path, "utf8");
const oldDatabaseLine = `NEON_STAGING_DATABASE_URL="${existing}"`;
const oldStorageLine = `AWS_ENDPOINT_URL_S3="${originalStorage}"`;
if (before.split(oldDatabaseLine).length !== 2 || before.split(oldStorageLine).length !== 2) {
  throw new Error("Expected exactly one copy of each mislabelled target in .migration.env.");
}
let after = before.replace(oldDatabaseLine,
  `NEON_PRODUCTION_DATABASE_URL="${existing}"\nNEON_STAGING_DATABASE_URL="${stagingUrl.toString()}"`);
after = after.replace(oldStorageLine,
  `NEON_PRODUCTION_STORAGE_ENDPOINT="${productionStorage}"\nAWS_ENDPOINT_URL_S3="${stagingStorage}"`);
after = after.replace(
  /# SAFETY HOLD \(2026-10-08\):[^\n]*\n# Neon production branch[^\n]*\n# write scripts[^\n]*\n/,
  "# Staging targets below are branch-specific. Keep production URLs for read-only comparisons.\n",
);
fs.writeFileSync(path, after, { mode: 0o600 });
console.log("Corrected local migration targets: production and staging database/storage endpoints are distinct; no credentials printed.");
