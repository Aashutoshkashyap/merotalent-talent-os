import { readFile } from "node:fs/promises";
import { assertFingerprints, schemaFingerprints, tableFingerprintsBatched, sha256 } from "./recovery-integrity.mjs";
const affected = ["events", "event_registrations", "event_ticket_types", "quizzes", "quiz_questions", "quiz_attempts", "certificates"];
export const eventActivitySql = async () => (await Promise.all([
  "20261101190000_event_activity_assessment_runtime.sql", "20261101200000_event_activity_policy_snapshots.sql",
  "20261101210000_event_public_presentation.sql",
  "20261101220000_event_quiz_retakes.sql",
  "20261101230000_event_certificate_presentation.sql",
].map(name => readFile(new URL(`../supabase/migrations/${name}`, import.meta.url), "utf8")))).join("\n");
/** No source, Auth, role-grant or payment data is written. Original-column values must be identical. */
export async function applyEventActivitiesChecked(client) {
  const sql = await eventActivitySql();
  await client.query(`LOCK TABLE ${affected.map(name => `public.${name}`).join(",")} IN ACCESS EXCLUSIVE MODE`);
  const columns = (await client.query(`SELECT table_name,column_name FROM information_schema.columns
    WHERE table_schema='public' AND table_name=ANY($1::text[]) ORDER BY table_name,ordinal_position`, [affected])).rows;
  const baselineColumns = {};
  for (const row of columns) (baselineColumns[`public.${row.table_name}`] ??= []).push(row.column_name);
  if (Object.keys(baselineColumns).length !== affected.length) throw new Error("EVENT_BASELINE_TABLE_MISSING");
  const before = await tableFingerprintsBatched(client, { baselineColumns });
  await client.query(sql);
  assertFingerprints(before, await tableFingerprintsBatched(client, { baselineColumns }));
  const first = await schemaFingerprints(client);
  await client.query(sql);
  assertFingerprints(before, await tableFingerprintsBatched(client, { baselineColumns }));
  if (JSON.stringify(first) !== JSON.stringify(await schemaFingerprints(client))) throw new Error("EVENT_MIGRATION_NOT_IDEMPOTENT");
  return { sqlSha256: sha256(sql), idempotent: true, originalRowsUnchanged: true, affectedTables: affected.length };
}
