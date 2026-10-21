/** Reviewed portable DDL only. Does not copy rows, Auth RPCs, grants or policies. */
import { productionCandidateUrl } from "./production-candidate-boundary.mjs";
const names = new Set([
  "update_updated_at_column", "update_page_sections_timestamp", "sync_advertisement_active_state",
  "is_valid_partner_course_url", "is_college_effectively_verified", "normalize_module_capability_key",
  "protect_default_free_package_scope", "enforce_mentor_published_availability",
  "validate_subscription_entity", "validate_entity_admin_assignment", "sync_legacy_college_admin_assignment",
  "protect_last_admin_role", "create_lead_from_submission", "release_expired_checkout_reservation",
  "release_failed_paid_reservations", "sync_payment_result",
]);
const parse = rows => rows.map(row => typeof row === "string" ? JSON.parse(row) : row);
export function portableSourceSchema(snapshot) {
  const schema = snapshot.schema;
  const functions = parse(schema.functions).filter(row => names.has(row.name));
  if (functions.length !== names.size || new Set(functions.map(row => row.name)).size !== names.size ||
      functions.some(row => !row.definition || /\bauth\s*\./i.test(row.definition))) {
    throw new Error("REVIEWED_PORTABLE_FUNCTION_SET_REQUIRED");
  }
  const triggers = parse(schema.triggers).filter(row => {
    const match = /EXECUTE (?:FUNCTION|PROCEDURE) (?:public\.)?([a-z_]+)\(/i.exec(row.definition);
    return match && names.has(match[1]);
  });
  const views = parse(schema.views).filter(row => ["public_profile_directory", "institute_directory"].includes(row.name));
  const indexes = parse(schema.indexes).filter(row => ["institutes_affiliation_trgm_idx", "institutes_location_trgm_idx", "institutes_name_trgm_idx"].includes(row.name));
  const checks = parse(schema.constraints).filter(row => row.name === "courses_partner_redirect_check" ||
    (row.type === "f" && /^FOREIGN KEY \([a-z_]+\) REFERENCES profiles\(user_id\)/i.test(row.definition)));
  if (views.length !== 2 || indexes.length !== 3 || checks.length !== 12 || triggers.length !== 47) throw new Error("REVIEWED_PORTABLE_OBJECT_SET_REQUIRED");
  return { functions, triggers, views, indexes, checks };
}
const q = value => {
  if (!/^[a-z_][a-z_0-9]*$/.test(value)) throw new Error("INVALID_SCHEMA_IDENTIFIER");
  return `"${value}"`;
};
/** Only a private local restore is accepted. Remote production execution is deliberately absent. */
export async function rehearsePortableSchema(client, plan) {
  if (!/^\/private\/tmp\/mt-restore-[a-zA-Z0-9]+$/.test(client.connectionParameters.host) ||
      client.connectionParameters.database !== "postgres") throw new Error("PRIVATE_LOCAL_RESTORE_REQUIRED");
  return executePortableSchema(client, plan);
}

/** Explicit offline-candidate operation; never switches application traffic. */
export async function applyPortableCandidateSchema(client, plan, { targetUrl, before, verify }) {
  const target = productionCandidateUrl(targetUrl);
  if (client.connectionParameters.host !== target.hostname || client.connectionParameters.database !== "neondb" ||
      typeof before !== "function" || typeof verify !== "function") throw new Error("VERIFIED_CANDIDATE_REQUIRED");
  return executePortableSchema(client, plan, before, verify);
}

async function executePortableSchema(client, plan, before = async () => {}, verify = async () => {}) {
  const counts = { functions: 0, triggers: 0, views: 0, indexes: 0, checks: 0 };
  await client.query("BEGIN");
  try {
    await client.query("SET LOCAL search_path=public,pg_temp");
    await client.query("SET LOCAL statement_timeout='30s'");
    await before();
    await client.query("CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA public");
    for (const row of plan.functions) {
      const existing = await client.query(`SELECT pg_get_functiondef(p.oid) AS definition
        FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
        WHERE n.nspname='public' AND p.proname=$1 AND p.prokind IN ('f','p')`, [row.name]);
      if (existing.rowCount) {
        if (existing.rows.length !== 1 || existing.rows[0].definition.trim() !== row.definition.trim()) throw new Error("EXISTING_FUNCTION_CONFLICT");
        continue;
      }
      await client.query(row.definition); counts.functions++;
    }
    for (const row of plan.triggers) {
      const exists = await client.query(`SELECT 1 FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid
        JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname=$1 AND t.tgname=$2`, [row.table_name, row.name]);
      if (!exists.rowCount) { await client.query(row.definition); counts.triggers++; }
    }
    for (const row of plan.views) {
      const exists = await client.query("SELECT 1 FROM pg_views WHERE schemaname='public' AND viewname=$1", [row.name]);
      if (!exists.rowCount) { await client.query(`CREATE VIEW public.${q(row.name)} WITH (security_barrier=true) AS ${row.definition}`); counts.views++; }
    }
    for (const row of plan.indexes) {
      const exists = await client.query("SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname=$1", [row.name]);
      if (!exists.rowCount) { await client.query(row.definition); counts.indexes++; }
    }
    for (const row of plan.checks) {
      const exists = await client.query(`SELECT 1 FROM pg_constraint k JOIN pg_class c ON c.oid=k.conrelid
        JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname=$1 AND k.conname=$2`, [row.table_name, row.name]);
      if (!exists.rowCount) { await client.query(`ALTER TABLE public.${q(row.table_name)} ADD CONSTRAINT ${q(row.name)} ${row.definition}`); counts.checks++; }
    }
    await verify(counts);
    await client.query("COMMIT");
    return counts;
  } catch (error) { await client.query("ROLLBACK"); throw error; }
}
