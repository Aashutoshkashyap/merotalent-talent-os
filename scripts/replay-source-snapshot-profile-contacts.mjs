/** Replay only source-newer profile contact deltas into the pinned staging branch. */
import dotenv from "dotenv";
import pg from "pg";
import { createHash } from "node:crypto";
import { readEncryptedSourceSnapshot } from "./source-snapshot-artifact.mjs";
import { canonicalSnapshotValue, sourceNewerProfileContactDelta,
  snapshotFingerprint as fingerprint } from "./source-snapshot-reconciliation.mjs";
import { requireNeonMigrationStaging } from "./require-neon-migration-staging.mjs";
import { summarizeSourceSnapshot } from "./source-auth-snapshot.mjs";

dotenv.config({ path: ".migration.env", quiet: true });
requireNeonMigrationStaging(process.env.NEON_STAGING_DATABASE_URL);
if (process.env.NEON_STAGING_BRANCH_ID !== "br-frosty-haze-azsnybmr") throw new Error("Unexpected isolated staging branch.");
const apply = process.argv.includes("--apply-staging");
if (process.argv.slice(3).some(value => value !== "--apply-staging")) throw new Error("Only --apply-staging is accepted.");
const source = await readEncryptedSourceSnapshot(process.argv[2]);
const sourceDigest = summarizeSourceSnapshot(source).snapshotSha256;
const target = new pg.Client({ connectionString: process.env.NEON_STAGING_DATABASE_URL, connectionTimeoutMillis: 15000 });
let transaction = false;

try {
  await target.connect();
  await target.query("BEGIN");
  transaction = true;
  await target.query("SET LOCAL statement_timeout='30s'");
  const decisions = [];
  let changes = 0;
  const stageRows = (await target.query("SELECT id,to_jsonb(p)::text AS row_data FROM public.profiles p"))
    .rows;
  const stageById = new Map(stageRows.map(row => [row.id, JSON.parse(row.row_data)]));
  for (const text of source.public.profiles) {
    const original = JSON.parse(text);
    let staging = stageById.get(original.id);
    if (!staging) throw new Error("Source profile is missing from staging.");
    let decision = sourceNewerProfileContactDelta(original, staging);
    if (decision.decision === "NO_CONTACT_DELTA") continue;
    if (decision.decision !== "REPLAY_SOURCE_NEWER_CONTACT_FIELDS") {
      decisions.push({ row: fingerprint(original.id), ...decision });
      continue;
    }
    const row = (await target.query("SELECT to_jsonb(p)::text AS row_data FROM public.profiles p WHERE id=$1::uuid FOR UPDATE", [original.id])).rows[0];
    if (!row) throw new Error("Source profile changed concurrently.");
    staging = JSON.parse(row.row_data);
    decision = sourceNewerProfileContactDelta(original, staging);
    if (decision.decision !== "REPLAY_SOURCE_NEWER_CONTACT_FIELDS") {
      throw new Error("A source-newer contact decision changed concurrently; nothing was committed.");
    }
    const before = Object.fromEntries(decision.fields.map(field => [field, staging[field]]));
    const after = Object.fromEntries(decision.fields.map(field => [field, original[field]]));
    const sourceUpdatedAt = original.updated_at;
    const result = await target.query(`UPDATE public.profiles SET ${decision.fields.map((field, index) => `"${field}"=$${index + 3}`).join(",")},updated_at=now()
      WHERE id=$1::uuid AND user_id=$2::uuid RETURNING to_jsonb(profiles)::text AS row_data`,
      [original.id, original.user_id, ...decision.fields.map(field => original[field])]);
    if (result.rowCount !== 1) throw new Error("Profile update ownership check failed.");
    const updated = JSON.parse(result.rows[0].row_data);
    if (decision.fields.some(field => canonicalSnapshotValue(updated[field]) !== canonicalSnapshotValue(original[field]))) {
      throw new Error("Profile contact readback differs from the source snapshot.");
    }
    const digest = value => createHash("sha256").update(canonicalSnapshotValue(value)).digest("hex");
    await target.query(`INSERT INTO public.audit_logs(action,entity_type,entity_id,metadata)
      VALUES ('migration_source_profile_contact_delta','profile',$1,$2::jsonb)`, [original.id, JSON.stringify({
      source_snapshot_sha256: sourceDigest, source_snapshot_timestamp: source.statementTimestamp,
      source_updated_at: sourceUpdatedAt, fields: decision.fields,
      original_target_sha256: digest(before), applied_source_sha256: digest(after),
      rule: "Same stable owner and source-newer contact fields; unrelated target columns preserved" })]);
    decisions.push({ row: fingerprint(original.id), ...decision, sourceUpdatedAt, targetPreviousUpdatedAt: staging.updated_at,
      contactReadbackVerified: true, unrelatedFieldsPreserved: true });
    changes += 1;
  }
  await target.query(apply ? "COMMIT" : "ROLLBACK");
  transaction = false;
  console.log(JSON.stringify({ mode: apply ? "APPLY_ISOLATED_STAGING" : "ROLLBACK_PROBE", sourceSnapshot: source.statementTimestamp,
    branch: "br-frosty-haze-azsnybmr", changedProfiles: changes, decisions }));
} catch (error) {
  console.error("Snapshot contact replay stopped:", typeof error?.code === "string" ? error.code : "REPLAY_UNAVAILABLE");
  process.exitCode = 1;
} finally {
  if (transaction) await target.query("ROLLBACK").catch(() => undefined);
  await target.end().catch(() => undefined);
}
