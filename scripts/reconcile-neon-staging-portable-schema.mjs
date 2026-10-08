/** Apply a reviewed, allowlisted subset of source DDL to isolated Neon staging only. */
import fs from "node:fs";
import dotenv from "dotenv";
import pg from "pg";

dotenv.config({ path: ".migration.env", quiet: true });
const stageUrl = new URL(process.env.NEON_STAGING_DATABASE_URL || "postgresql://invalid@invalid");
if (stageUrl.hostname !== "ep-wispy-credit-azt6tgwj-pooler.c-3.ap-southeast-1.aws.neon.tech" ||
    process.env.NEON_STAGING_BRANCH_ID !== "br-frosty-haze-azsnybmr" ||
    process.env.MEROTALENT_BACKEND_MODE !== "neon-staging") {
  throw new Error("Portable schema reconciliation is restricted to the isolated migration-staging branch.");
}
const inventory = JSON.parse(fs.readFileSync("/private/tmp/merotalent-neon-schema-inventory-2026-10-08.json", "utf8"));
if (inventory.sourceHost !== "db.dtirpilgzlsfryucanlg.supabase.co" || inventory.stageHost !== stageUrl.hostname) {
  throw new Error("Schema inventory is not for the approved source and staging target.");
}

// These functions have no auth.uid()/auth.role() dependency and retain correctness behavior.
const functionNames = new Set([
  "update_updated_at_column", "update_page_sections_timestamp", "sync_advertisement_active_state",
  "is_valid_partner_course_url", "is_college_effectively_verified", "normalize_module_capability_key",
  "protect_default_free_package_scope", "enforce_mentor_published_availability",
  "validate_subscription_entity", "validate_entity_admin_assignment", "sync_legacy_college_admin_assignment",
  "protect_last_admin_role", "create_lead_from_submission", "release_expired_checkout_reservation",
  "release_failed_paid_reservations", "sync_payment_result",
]);
const triggerFunctions = new Set([...functionNames].filter(name => ![
  "is_valid_partner_course_url", "is_college_effectively_verified", "normalize_module_capability_key",
].includes(name)));
const functions = inventory.source.functions.filter(row => functionNames.has(row.name));
if (functions.length !== functionNames.size || functions.some(row => !row.definition || /\bauth\s*\./i.test(row.definition))) {
  throw new Error("Reviewed function set is incomplete or contains a Supabase Auth dependency.");
}
const triggers = inventory.source.triggers.filter(row => triggerFunctions.has(row.function_name));
if (triggers.some(row => row.function_schema !== "public")) throw new Error("Unexpected trigger function schema.");
const views = inventory.source.views.filter(row => ["public_profile_directory", "institute_directory"].includes(row.name));
if (views.length !== 2) throw new Error("Expected public directory views are missing from source inventory.");
const missingIndexes = inventory.source.indexes.filter(row => [
  "institutes_affiliation_trgm_idx", "institutes_location_trgm_idx", "institutes_name_trgm_idx",
].includes(row.name));
const partnerCheck = inventory.source.constraints.find(row => row.name === "courses_partner_redirect_check");
const profileForeignKeys = inventory.source.constraints.filter(row =>
  row.type === "f" && /^FOREIGN KEY \([a-z_]+\) REFERENCES profiles\(user_id\)/i.test(row.definition));
if (missingIndexes.length !== 3 || !partnerCheck || !/is_valid_partner_course_url/.test(partnerCheck.definition)) {
  throw new Error("Expected portable constraints or indexes are missing from source inventory.");
}
if (profileForeignKeys.length !== 11) throw new Error("Expected eleven source direct profile foreign keys for reconciliation.");

const client = new pg.Client({ connectionString: stageUrl.toString() });
try {
  await client.connect();
  const identity = await client.query("SELECT current_database() AS db, inet_server_addr()::text AS addr");
  if (identity.rows[0]?.db !== "neondb") throw new Error("Unexpected staging database name.");
  await client.query("BEGIN");
  await client.query("SET LOCAL search_path = public, pg_temp");
  await client.query("CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA public");
  for (const row of functions) await client.query(row.definition);
  for (const row of triggers) {
    const existing = await client.query(`SELECT 1 FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid
      JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname=$1 AND t.tgname=$2`,
      [row.table_name, row.name]);
    if (existing.rowCount) continue;
    await client.query(row.definition);
  }
  for (const row of views) {
    const existing = await client.query("SELECT 1 FROM pg_views WHERE schemaname='public' AND viewname=$1", [row.name]);
    if (existing.rowCount) continue;
    await client.query(`CREATE VIEW public."${row.name}" WITH (security_barrier = true) AS ${row.definition}`);
  }
  const existingCheck = await client.query(`SELECT 1 FROM pg_constraint c
    JOIN pg_class t ON t.oid=c.conrelid JOIN pg_namespace n ON n.oid=t.relnamespace
    WHERE n.nspname='public' AND t.relname='courses' AND c.conname='courses_partner_redirect_check'`);
  if (!existingCheck.rowCount) {
    await client.query(`ALTER TABLE public.courses ADD CONSTRAINT courses_partner_redirect_check ${partnerCheck.definition}`);
  }
  for (const row of missingIndexes) {
    const existing = await client.query("SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname=$1", [row.name]);
    if (!existing.rowCount) await client.query(row.definition);
  }
  for (const row of profileForeignKeys) {
    const existing = await client.query(`SELECT 1 FROM pg_constraint c JOIN pg_class t ON t.oid=c.conrelid
      JOIN pg_namespace n ON n.oid=t.relnamespace WHERE n.nspname='public' AND t.relname=$1 AND c.conname=$2`,
      [row.table_name, row.name]);
    if (existing.rowCount) continue;
    const column = /^FOREIGN KEY \(([a-z_]+)\)/i.exec(row.definition)?.[1];
    if (!column || !/^[a-z_]+$/.test(row.table_name)) throw new Error("Unexpected profile FK identifier.");
    const orphanCount = await client.query(`SELECT count(*)::int AS n FROM public."${row.table_name}" item
      LEFT JOIN public.profiles p ON p.user_id=item."${column}"
      WHERE item."${column}" IS NOT NULL AND p.user_id IS NULL`);
    if (orphanCount.rows[0]?.n !== 0) throw new Error(`Existing staging rows violate ${row.name}; no constraint was added.`);
    await client.query(`ALTER TABLE public."${row.table_name}" ADD CONSTRAINT "${row.name}" ${row.definition}`);
  }
  await client.query("COMMIT");
  console.log(JSON.stringify({ stageHost: stageUrl.hostname, functionsReviewed: functions.length,
    triggersReviewed: triggers.length, viewsReviewed: views.length,
    indexesReviewed: missingIndexes.length, constraintsReviewed: 1 + profileForeignKeys.length, committed: true }, null, 2));
} catch (error) {
  await client.query("ROLLBACK").catch(() => {});
  throw error;
} finally {
  await client.end().catch(() => {});
}
