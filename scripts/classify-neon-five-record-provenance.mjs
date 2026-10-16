/** Read-only, redacted provenance evidence for the five known source/staging key deltas. */
import dotenv from "dotenv";
import pg from "pg";
import { requireNeonMigrationStaging } from "./require-neon-migration-staging.mjs";
import { sourceReadOnlyQuery } from "./supabase-readonly-management-api.mjs";

dotenv.config({ path: ".migration.env", quiet: true });
const url = process.env.NEON_STAGING_DATABASE_URL;
requireNeonMigrationStaging(url);
const target = new pg.Client({ connectionString: url, connectionTimeoutMillis: 15000 });
const tables = {
  audit_logs: { fields: "actor_user_id,action,entity_type,created_at", owner: "actor_user_id" },
  leads: { fields: "owner_user_id,applicant_user_id,source_type,organization_type,created_at", owner: "owner_user_id" },
  media_upload_intents: { fields: "user_id,module,created_at", owner: "user_id" },
  notifications: { fields: "sender_id,recipient_id,category,status,created_at", owner: "recipient_id" },
  profiles: { fields: "user_id,created_at", owner: "user_id" },
};
const span = values => values.length ? { earliest: values[0], latest: values.at(-1) } : null;
const countBy = (rows, field) => Object.fromEntries([...new Set(rows.map(row => String(row[field] ?? "null")))].sort()
  .map(value => [value, rows.filter(row => String(row[field] ?? "null") === value).length]));

try {
  await target.connect();
  await target.query("BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY");
  const sourceAuthIds = new Set((await sourceReadOnlyQuery("SELECT id::text AS id FROM auth.users ORDER BY id"))
    .map(row => row.id));
  const results = [];
  for (const [table, config] of Object.entries(tables)) {
    const sourceIds = new Set((await sourceReadOnlyQuery(`SELECT id::text AS id FROM public.${table} ORDER BY id`))
      .map(row => row.id));
    const stageRows = (await target.query(`SELECT id::text AS id,${config.fields} FROM public.${table} ORDER BY id`)).rows;
    const stageOnly = stageRows.filter(row => !sourceIds.has(row.id));
    const dates = stageOnly.map(row => new Date(row.created_at).toISOString()).sort();
    const ownerCounts = { sourceAuthUser: 0, stagingOnlyOrNull: 0 };
    for (const row of stageOnly) {
      if (row[config.owner] && sourceAuthIds.has(row[config.owner])) ownerCounts.sourceAuthUser++;
      else ownerCounts.stagingOnlyOrNull++;
    }
    const categories = table === "leads" ? { sourceType: countBy(stageOnly, "source_type"),
      organizationType: countBy(stageOnly, "organization_type") }
      : table === "audit_logs" ? { action: countBy(stageOnly, "action"), entityType: countBy(stageOnly, "entity_type") }
      : table === "notifications" ? { category: countBy(stageOnly, "category"), status: countBy(stageOnly, "status") }
      : table === "media_upload_intents" ? { module: countBy(stageOnly, "module") } : {};
    results.push({ table, stageOnlyCount: stageOnly.length, createdAt: span(dates),
      ownerPresenceInSourceAuth: ownerCounts, categories });
  }
  await target.query("ROLLBACK");
  console.log(JSON.stringify({ mode: "READ_ONLY_REDACTED_PROVENANCE", sourceAuthCount: sourceAuthIds.size,
    snapshots: "Source statements are independent; target is a separate repeatable-read snapshot",
    results }));
} finally {
  await target.end();
}
