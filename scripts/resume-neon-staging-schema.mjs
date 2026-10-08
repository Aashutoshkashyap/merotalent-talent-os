/** Resume only portable constraints/indexes on the isolated, already-copied staging schema. */
import dotenv from "dotenv";
import pg from "pg";

dotenv.config({ path: ".migration.env", quiet: true });
const sourceUrl = new URL(process.env.SUPABASE_DATABASE_URL || "postgresql://invalid@invalid");
const stageUrl = new URL(process.env.NEON_STAGING_DATABASE_URL || "postgresql://invalid@invalid");
if (sourceUrl.hostname !== "db.dtirpilgzlsfryucanlg.supabase.co" ||
    stageUrl.hostname !== "ep-wispy-credit-azt6tgwj-pooler.c-3.ap-southeast-1.aws.neon.tech" ||
    stageUrl.hostname === new URL(process.env.NEON_PRODUCTION_DATABASE_URL || "postgresql://invalid@invalid").hostname) {
  throw new Error("Schema resume targets are not the approved source and isolated staging branch.");
}
const source = new pg.Client({ connectionString: sourceUrl.toString(), options: "-c default_transaction_read_only=on" });
const stage = new pg.Client({ connectionString: stageUrl.toString() });
const quote = value => `"${value.replaceAll('"', '""')}"`;
try {
  await Promise.all([source.connect(), stage.connect()]);
  const [inventory] = (await stage.query(`SELECT count(*)::int AS tables FROM information_schema.tables
    WHERE table_schema='public' AND table_type='BASE TABLE'`)).rows;
  if (inventory.tables !== 80) throw new Error("Staging table count changed; refusing to resume.");
  const constraints = (await source.query(`SELECT cl.relname AS table_name, co.conname AS name,
    pg_get_constraintdef(co.oid) AS definition FROM pg_constraint co
    JOIN pg_class cl ON cl.oid=co.conrelid JOIN pg_namespace ns ON ns.oid=cl.relnamespace
    WHERE ns.nspname='public' AND co.contype IN ('f','c','u')
    ORDER BY cl.relname,co.conname`)).rows;
  const existingConstraints = new Set((await stage.query(`SELECT cl.relname||':'||co.conname AS key
    FROM pg_constraint co JOIN pg_class cl ON cl.oid=co.conrelid
    JOIN pg_namespace ns ON ns.oid=cl.relnamespace WHERE ns.nspname='public'`)).rows.map(r=>r.key));
  let appliedConstraints = 0;
  const skipped = {};
  for (const constraint of constraints) {
    if (existingConstraints.has(`${constraint.table_name}:${constraint.name}`)) continue;
    try {
      await stage.query(`ALTER TABLE public.${quote(constraint.table_name)} ADD CONSTRAINT ${quote(constraint.name)} ${constraint.definition}`);
      appliedConstraints++;
    } catch (error) {
      const code = error.code || "unknown";
      skipped[code] = (skipped[code] || 0) + 1;
    }
  }
  const indexes = (await source.query(`SELECT indexname,indexdef FROM pg_indexes
    WHERE schemaname='public' AND indexname NOT LIKE '%_pkey' ORDER BY indexname`)).rows;
  const existingIndexes = new Set((await stage.query(`SELECT indexname FROM pg_indexes WHERE schemaname='public'`)).rows.map(r=>r.indexname));
  let appliedIndexes = 0;
  const skippedIndexes = {};
  for (const index of indexes) {
    if (existingIndexes.has(index.indexname)) continue;
    try {
      await stage.query(index.indexdef);
      appliedIndexes++;
    } catch (error) {
      const code = error.code || "unknown";
      skippedIndexes[code] = (skippedIndexes[code] || 0) + 1;
    }
  }
  console.log(JSON.stringify({stageHost:stageUrl.hostname,sourceConstraints:constraints.length,
    appliedConstraints,skippedConstraintsBySqlstate:skipped,
    sourceIndexes:indexes.length,appliedIndexes,skippedIndexesBySqlstate:skippedIndexes},null,2));
} finally { await Promise.all([source.end().catch(()=>{}),stage.end().catch(()=>{})]); }
