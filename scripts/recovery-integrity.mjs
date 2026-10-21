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

/** Same lossless fingerprints, one row-fetch round trip instead of one per table. */
export async function tableFingerprintsBatched(client, { baselineColumns } = {}) {
  let tables = (await client.query(`SELECT n.nspname AS schema,c.relname AS name
    FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname IN ('public','neon_auth') AND c.relkind IN ('r','p')
    ORDER BY n.nspname,c.relname`)).rows;
  if (!tables.length) return [];
  const omitted = new Map();
  if (baselineColumns) {
    tables = tables.filter(t => Object.hasOwn(baselineColumns, `${t.schema}.${t.name}`));
    if (tables.length !== Object.keys(baselineColumns).length) throw new Error("RECOVERY_TABLE_REMOVED");
    const current = (await client.query(`SELECT table_schema,table_name,column_name FROM information_schema.columns
      WHERE table_schema IN ('public','neon_auth')`)).rows;
    for (const table of tables) {
      const key = `${table.schema}.${table.name}`, old = baselineColumns[key];
      const columns = current.filter(c => c.table_schema === table.schema && c.table_name === table.name).map(c => c.column_name);
      if (old.some(c => !columns.includes(c))) throw new Error("RECOVERY_COLUMN_REMOVED");
      omitted.set(key, columns.filter(c => !old.includes(c)));
    }
  }
  for (const table of tables) if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(table.name)) throw new Error("UNEXPECTED_RECOVERY_TABLE_NAME");
  for (const columns of omitted.values()) for (const name of columns) if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(name)) throw new Error("UNEXPECTED_RECOVERY_COLUMN_NAME");
  const rows = (await client.query(`SELECT * FROM (${tables.map(table =>
    `SELECT '${table.schema}'::text AS schema,'${table.name}'::text AS name,
      (to_jsonb(t) - ARRAY[${(omitted.get(`${table.schema}.${table.name}`) ?? []).map(c => `'${c}'`).join(",")}]::text[])::text AS row
      FROM ${quoteIdentifier(table.schema)}.${quoteIdentifier(table.name)} t`).join(" UNION ALL ")}) items
    ORDER BY schema,name,row COLLATE "C"`)).rows;
  const grouped = new Map(tables.map(t => [`${t.schema}.${t.name}`, []]));
  for (const row of rows) {
    const group = grouped.get(`${row.schema}.${row.name}`);
    if (!group) throw new Error("UNEXPECTED_RECOVERY_TABLE_RESULT");
    group.push(row.row);
  }
  return tables.map(table => { const values = grouped.get(`${table.schema}.${table.name}`);
    return { ...table, count: values.length, hash: sha256(values.join("\n")) }; });
}

export function assertFingerprints(expected, actual) {
  if (JSON.stringify(expected) !== JSON.stringify(actual)) throw new Error("RESTORED_ROW_CONTENT_MISMATCH");
}

/** Portable schema definitions; role ownership and ACL grants are intentionally a separate deployment check. */
export async function schemaFingerprints(client) {
  const queries = {
    columns: `SELECT n.nspname AS schema,c.relname AS parent,a.attname AS name,a.attnum AS position,
      format_type(a.atttypid,a.atttypmod) AS type,a.attnotnull AS not_null,a.attidentity AS identity,a.attgenerated AS generated,
      pg_get_expr(d.adbin,d.adrelid) AS default_expression
      FROM pg_attribute a JOIN pg_class c ON c.oid=a.attrelid JOIN pg_namespace n ON n.oid=c.relnamespace
      LEFT JOIN pg_attrdef d ON d.adrelid=c.oid AND d.adnum=a.attnum
      WHERE n.nspname IN ('public','neon_auth') AND c.relkind IN ('r','p','v') AND a.attnum>0 AND NOT a.attisdropped`,
    constraints: `SELECT n.nspname AS schema,c.relname AS parent,p.conname AS name,pg_get_constraintdef(p.oid) AS definition,p.convalidated AS validated
      FROM pg_constraint p JOIN pg_class c ON c.oid=p.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname IN ('public','neon_auth')`,
    indexes: `SELECT schemaname AS schema,tablename AS parent,indexname AS name,indexdef AS definition FROM pg_indexes WHERE schemaname IN ('public','neon_auth')`,
    functions: `SELECT n.nspname AS schema,p.proname AS name,pg_get_function_identity_arguments(p.oid) AS args,pg_get_functiondef(p.oid) AS definition
      FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname IN ('public','neon_auth') AND p.prokind IN ('f','p')
      AND NOT EXISTS(SELECT 1 FROM pg_depend d WHERE d.classid='pg_proc'::regclass AND d.objid=p.oid AND d.deptype='e')`,
    triggers: `SELECT n.nspname AS schema,c.relname AS parent,t.tgname AS name,pg_get_triggerdef(t.oid) AS definition,t.tgenabled AS enabled
      FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE NOT t.tgisinternal AND n.nspname IN ('public','neon_auth')`,
    policies: `SELECT schemaname AS schema,tablename AS parent,policyname AS name,permissive,roles,cmd,qual,with_check FROM pg_policies WHERE schemaname IN ('public','neon_auth')`,
    views: `SELECT schemaname AS schema,viewname AS name,definition FROM pg_views WHERE schemaname IN ('public','neon_auth')`,
    enums: `SELECT n.nspname AS schema,t.typname AS name,e.enumlabel AS label,e.enumsortorder AS position FROM pg_enum e JOIN pg_type t ON t.oid=e.enumtypid JOIN pg_namespace n ON n.oid=t.typnamespace WHERE n.nspname IN ('public','neon_auth')`,
    sequences: `SELECT schemaname AS schema,sequencename AS name,data_type::text,start_value::text,min_value::text,max_value::text,increment_by::text,cycle,cache_size::text,last_value::text FROM pg_sequences WHERE schemaname IN ('public','neon_auth')`,
    tableSecurity: `SELECT n.nspname AS schema,c.relname AS name,c.relrowsecurity,c.relforcerowsecurity FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname IN ('public','neon_auth') AND c.relkind IN ('r','p')`,
  };
  const report=[];
  for (const [category,query] of Object.entries(queries)) {
    const rows=(await client.query(`SELECT to_jsonb(catalog)::text AS row FROM (${query}) catalog ORDER BY to_jsonb(catalog)::text COLLATE "C"`)).rows;
    report.push({category,count:rows.length,hash:sha256(rows.map(r=>r.row).join("\n"))});
  }
  return report;
}

export function compareRecoveryEvidence(expected,actual) {
  return expected.flatMap(item=>{
    const match=actual.find(r=>r.category===item.category);
    return match?.count===item.count && match?.hash===item.hash ? [] : [{category:item.category,expectedCount:item.count,actualCount:match?.count??null,reason:"SCHEMA_FINGERPRINT_MISMATCH"}];
  }).concat(actual.filter(r=>!expected.some(e=>e.category===r.category)).map(r=>({category:r.category,reason:"UNEXPECTED_SCHEMA_CATEGORY"})));
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
