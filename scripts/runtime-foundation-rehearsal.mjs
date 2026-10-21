/** Restore-only runtime DDL rehearsal, with original-column row preservation. */
import { readFile } from "node:fs/promises";
import { tableFingerprintsBatched, assertFingerprints, quoteIdentifier as q, sha256 } from "./recovery-integrity.mjs";
import { productionCandidateUrl } from "./production-candidate-boundary.mjs";

export async function rehearseRuntimeFoundation(client) {
  if (!/^\/private\/tmp\/mt-restore-[a-zA-Z0-9]+$/.test(client.connectionParameters.host) ||
      client.connectionParameters.database !== "postgres") throw new Error("PRIVATE_LOCAL_RESTORE_REQUIRED");
  return executeRuntimeFoundation(client);
}

export async function applyRuntimeCandidateFoundation(client, targetUrl, backup) {
  const target = productionCandidateUrl(targetUrl);
  if (client.connectionParameters.host !== target.hostname || client.connectionParameters.database !== "neondb" ||
      backup?.result !== "PASS" || !backup.restoredFromEncryptedArchive ||
      backup.runtimeFoundationRehearsal?.addedEmptyTables !== 10 || backup.runtimeFoundationRehearsal?.addedColumns !== 15) throw new Error("REHEARSED_CANDIDATE_REQUIRED");
  return executeRuntimeFoundation(client, backup);
}

async function executeRuntimeFoundation(client, backup) {
  const sql = await readFile(new URL("./sql/neon-production-runtime-foundation.sql", import.meta.url), "utf8");
  if (backup && backup.runtimeFoundationRehearsal.sqlSha256 !== sha256(sql)) throw new Error("REHEARSED_SQL_HASH_MISMATCH");
  const expectedNew = new Set(["event_categories", "event_programs", "event_ticket_types", "event_registration_fields",
    "event_participants", "event_tickets", "neon_application_accounts", "neon_identity_links", "neon_application_events", "neon_job_document_drafts"]);
  await client.query("BEGIN");
  try {
    await client.query("SET LOCAL statement_timeout='30s'");
    if (backup) {
      await client.query("SELECT pg_advisory_xact_lock(hashtextextended('merotalent:runtime-candidate-schema',0))");
      const tables = (await client.query("SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename")).rows;
      for (const { tablename } of tables) await client.query(`LOCK TABLE public.${q(tablename)} IN SHARE MODE`);
    }
    const before = await tableFingerprintsBatched(client);
    if (backup && (![backup.tables, backup.tables+10].includes(before.length) ||
      before.reduce((n,t)=>n+t.count,0) !== backup.rows)) throw new Error("CANDIDATE_CHANGED_SINCE_REHEARSAL");
    const cols = (await client.query(`SELECT table_schema,table_name,column_name FROM information_schema.columns
      WHERE table_schema IN ('public','neon_auth')`)).rows;
    const baselineColumns = Object.fromEntries(before.map(t => [`${t.schema}.${t.name}`,
      cols.filter(c => c.table_schema === t.schema && c.table_name === t.name).map(c => c.column_name)]));
    await client.query(sql);
    assertFingerprints(before, await tableFingerprintsBatched(client, { baselineColumns }));
    const after = await tableFingerprintsBatched(client);
    const newTables = after.filter(t => !Object.hasOwn(baselineColumns, `${t.schema}.${t.name}`));
    if (newTables.some(t => t.schema !== "public" || !expectedNew.has(t.name) || t.count !== 0)) throw new Error("UNEXPECTED_NEW_RUNTIME_DATA");
    const afterCols = (await client.query(`SELECT table_schema,table_name,column_name FROM information_schema.columns
      WHERE table_schema IN ('public','neon_auth')`)).rows;
    const addedColumns = afterCols.filter(c => Object.hasOwn(baselineColumns, `${c.table_schema}.${c.table_name}`) &&
      !baselineColumns[`${c.table_schema}.${c.table_name}`].includes(c.column_name)).length;
    for (const table of newTables) await client.query(`SELECT count(*) FROM public.${q(table.name)}`);
    await client.query("COMMIT");
    return { sqlSha256: sha256(sql), addedEmptyTables: newTables.length, addedColumns,
      originalColumnValuesPreserved: true, fixtureRowsCopied: 0 };
  } catch (error) { await client.query("ROLLBACK"); throw error; }
}
