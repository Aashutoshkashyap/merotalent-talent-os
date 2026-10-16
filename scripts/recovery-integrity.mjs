import { createHash } from "node:crypto";

export const sha256 = value => createHash("sha256").update(value).digest("hex");
export const quoteIdentifier = value => `"${value.replaceAll('"', '""')}"`;

/** The PostgreSQL-produced JSON preserves numeric and timestamp precision. */
export async function tableFingerprints(client) {
  const tables = (await client.query(`SELECT n.nspname AS schema,c.relname AS name
    FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname IN ('public','neon_auth') AND c.relkind IN ('r','p')
    ORDER BY n.nspname,c.relname`)).rows;
  const fingerprints = [];
  for (const table of tables) {
    const qualified = `${quoteIdentifier(table.schema)}.${quoteIdentifier(table.name)}`;
    const rows = (await client.query(`SELECT to_jsonb(t)::text AS row FROM ${qualified} t
      ORDER BY to_jsonb(t)::text COLLATE "C"`)).rows;
    fingerprints.push({ ...table, count: rows.length, hash: sha256(rows.map(row => row.row).join("\n")) });
  }
  return fingerprints;
}

export function assertFingerprints(expected, actual) {
  if (JSON.stringify(expected) !== JSON.stringify(actual)) throw new Error("RESTORED_ROW_CONTENT_MISMATCH");
}

/** Resolve only stored canonical paths or storage URLs, never external image URLs. */
export function storageReference(value, bucket) {
  if (typeof value !== "string" || !value.trim()) return null;
  let path = value;
  if (/^https?:\/\//i.test(value)) {
    const url = new URL(value);
    const prefix = `/storage/v1/object/`;
    if (url.pathname.startsWith(prefix)) {
      const pieces = url.pathname.slice(prefix.length).split("/");
      if (["public", "sign", "authenticated"].includes(pieces[0])) pieces.shift();
      if (pieces.shift() !== bucket) return null;
      path = pieces.map(decodeURIComponent).join("/");
    } else if (url.hostname.endsWith(".neon.tech") && url.pathname.startsWith(`/${bucket}/`)) {
      path = url.pathname.slice(bucket.length + 2).split("/").map(decodeURIComponent).join("/");
    } else return null;
  }
  if (path.includes("\\") || path.includes("\0") || path.split("/").some(part => !part || part === "." || part === "..")) {
    throw new Error("UNSAFE_STORAGE_REFERENCE");
  }
  return { bucket, key: path };
}
