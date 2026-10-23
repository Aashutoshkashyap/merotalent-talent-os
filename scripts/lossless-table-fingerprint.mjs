import { createHash } from 'node:crypto';
const identifier = value => `"${value.replaceAll('"', '""')}"`;

/** PostgreSQL serializes decimals and microsecond timestamps, not JS Number/Date.
 * Sort full JSON text, retaining duplicates and making heap/PK order irrelevant.
 * Different schemas remain different; this is evidence, never an overwrite plan.
 */
export async function losslessTableFingerprint(client, schema, table) {
  const rows = (await client.query(`SELECT to_jsonb(t)::text AS row_text
    FROM ${identifier(schema)}.${identifier(table)} t
    ORDER BY to_jsonb(t)::text COLLATE "C"`)).rows;
  const hash = createHash('sha256');
  for (const row of rows) hash.update(row.row_text).update('\n');
  return { count: rows.length, sha256: hash.digest('hex') };
}
