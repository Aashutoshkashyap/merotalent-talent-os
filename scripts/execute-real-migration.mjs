/**
 * MeroTalent — Comprehensive Real Supabase Production -> Neon Staging Migration Runner
 *
 * SAFETY RULES:
 * - Source is strictly READ-ONLY.
 * - NEVER modify Supabase production database or auth.
 * - NEVER log credentials or passwords.
 * - Mask all sensitive data.
 * - Target is ONLY the isolated Neon migration-staging branch.
 */

import fs from "fs";
import path from "path";
import os from "os";
import crypto from "crypto";
import pg from "pg";
import dotenv from "dotenv";
import { requireNeonMigrationStaging } from "./require-neon-migration-staging.mjs";

const { Pool } = pg;

// 1. Setup workspace
const WORKSPACE = fs.mkdtempSync(path.join(os.tmpdir(), "merotalent-isolated-staging-"));
const DIRS = {
  root: WORKSPACE,
  source: path.join(WORKSPACE, "source"),
  neon: path.join(WORKSPACE, "neon"),
  checksums: path.join(WORKSPACE, "checksums"),
  storage: path.join(WORKSPACE, "storage"),
  reports: path.join(WORKSPACE, "reports"),
};

for (const d of Object.values(DIRS)) {
  fs.mkdirSync(d, { recursive: true });
}

// 2. Load .migration.env with the supported parser (never echo credential values).
dotenv.config({ path: ".migration.env", quiet: true });
const env = process.env;

const SUPABASE_DB_URL = env.SUPABASE_DATABASE_URL;
const NEON_DB_URL = env.NEON_STAGING_DATABASE_URL;

if (!SUPABASE_DB_URL || !NEON_DB_URL) {
  console.error("ERROR: Missing SUPABASE_DATABASE_URL or NEON_STAGING_DATABASE_URL in .migration.env");
  process.exit(1);
}
requireNeonMigrationStaging(NEON_DB_URL);
if (new URL(SUPABASE_DB_URL).hostname !== "db.dtirpilgzlsfryucanlg.supabase.co") {
  throw new Error("Source is not the approved Supabase production database.");
}
if (new URL(env.NEON_PRODUCTION_DATABASE_URL || "postgresql://invalid@invalid").hostname !== "ep-polished-flower-azsezy8a-pooler.c-3.ap-southeast-1.aws.neon.tech") {
  throw new Error("A separate Neon production comparator URL is required.");
}
if (new URL(NEON_DB_URL).hostname === new URL(env.NEON_PRODUCTION_DATABASE_URL).hostname) {
  throw new Error("Staging and production hosts must differ.");
}

function log(msg) {
  console.log(`[${new Date().toISOString()}] ${msg}`);
}

async function queryWithRetry(pool, text, params = [], retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await pool.query(text, params);
    } catch (err) {
      if (attempt === retries) throw err;
      log(`Query warning (attempt ${attempt}/${retries}): ${err.message}. Retrying in 1s...`);
      await new Promise(r => setTimeout(r, 1000));
    }
  }
}

async function main() {
  log("================================================================================");
  log("STARTING MERO TALENT REAL SUPABASE PRODUCTION -> NEON STAGING MIGRATION");
  log("================================================================================");
  log(`Workspace: ${WORKSPACE}`);

  const supa = new Pool({
    connectionString: SUPABASE_DB_URL,
    ssl: { rejectUnauthorized: false },
    max: 1,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 15000,
  });
  supa.on("error", (err) => {
    log(`Supabase pool idle client error (handled): ${err.message}`);
  });

  const neon = new Pool({
    connectionString: NEON_DB_URL,
    ssl: { rejectUnauthorized: false },
    max: 1,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 15000,
  });
  neon.on("error", (err) => {
    log(`Neon pool idle client error (handled): ${err.message}`);
  });

  try {
    const testSupa = await queryWithRetry(supa, "SELECT current_database(), current_user;");
    log(`Connected to LIVE Supabase Production Database (${testSupa.rows[0].current_database}).`);
  } catch (err) {
    console.error("Failed to connect to Supabase Production:", err.message);
    process.exit(1);
  }

  try {
    const testNeon = await queryWithRetry(neon, "SELECT current_database(), current_user;");
    log(`Connected to LIVE Neon Staging Database (${testNeon.rows[0].current_database}).`);
  } catch (err) {
    console.error("Failed to connect to Neon Staging:", err.message);
    await supa.end();
    process.exit(1);
  }

  const targetState = await neon.query(`
    SELECT count(*)::int AS tables FROM information_schema.tables
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'`);
  if (targetState.rows[0].tables !== 0) {
    await supa.end();
    await neon.end();
    throw new Error("Staging public schema is not empty; refusing to overwrite unknown data.");
  }

  const migrationData = {
    startedAt: new Date().toISOString(),
    source: {},
    inventory: {},
    auth: {},
    storage: {},
    tables: [],
    reconciliation: [],
    runtimes: {},
    verdict: {},
  };

  // ── PHASE 1: LIVE SOURCE INVENTORY ──────────────────────────────────────────
  log("\n--- PHASE 1: LIVE SOURCE INVENTORY ---");

  // 1.1 Schemas
  const schemasRes = await queryWithRetry(supa, `
    SELECT schema_name
    FROM information_schema.schemata
    ORDER BY schema_name;
  `);
  const allSchemas = schemasRes.rows.map(r => r.schema_name);
  log(`Found ${allSchemas.length} total schemas in Supabase Postgres.`);
  migrationData.inventory.allSchemas = allSchemas;

  // 1.2 Application Tables in public schema
  const tablesRes = await queryWithRetry(supa, `
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    ORDER BY table_name;
  `);
  const appTables = tablesRes.rows.map(r => r.table_name);
  log(`Found ${appTables.length} application tables in 'public' schema.`);
  migrationData.inventory.appTables = appTables;

  // 1.3 Views in public schema
  const viewsRes = await queryWithRetry(supa, `
    SELECT table_name
    FROM information_schema.views
    WHERE table_schema = 'public'
    ORDER BY table_name;
  `);
  const appViews = viewsRes.rows.map(r => r.table_name);
  log(`Found ${appViews.length} views in 'public' schema.`);
  migrationData.inventory.appViews = appViews;

  // 1.4 Custom Types / Enums in public schema
  const enumsRes = await queryWithRetry(supa, `
    SELECT t.typname, e.enumlabel
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    JOIN pg_enum e ON e.enumtypid = t.oid
    WHERE n.nspname = 'public'
    ORDER BY t.typname, e.enumsortorder;
  `);
  const enumsMap = {};
  for (const r of enumsRes.rows) {
    if (!enumsMap[r.typname]) enumsMap[r.typname] = [];
    enumsMap[r.typname].push(r.enumlabel);
  }
  const customEnums = Object.entries(enumsMap).map(([typname, enum_values]) => ({ typname, enum_values }));
  log(`Found ${customEnums.length} custom enums in 'public' schema.`);
  migrationData.inventory.types = customEnums;

  // 1.5 Functions in public schema
  const funcsRes = await queryWithRetry(supa, `
    SELECT p.proname, pg_get_functiondef(p.oid) as definition
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
    ORDER BY p.proname;
  `);
  log(`Found ${funcsRes.rows.length} functions in 'public' schema.`);
  migrationData.inventory.functions = funcsRes.rows.map(r => r.proname);

  // 1.6 Extensions
  const extRes = await queryWithRetry(supa, `SELECT extname, extversion FROM pg_extension ORDER BY extname;`);
  migrationData.inventory.extensions = extRes.rows;
  log(`Found ${extRes.rows.length} extensions.`);

  // Auth belongs to a separate task. No Supabase Auth identities are read or imported.

  // ── PHASE 3: STORAGE INVENTORY ─────────────────────────────────────────────
  log("\n--- PHASE 3: LIVE SUPABASE STORAGE INVENTORY ---");
  try {
    const bucketsRes = await queryWithRetry(supa, `SELECT id, name, public, created_at, updated_at FROM storage.buckets ORDER BY id;`);
    const objectsRes = await queryWithRetry(supa, `
      SELECT id, bucket_id, name, owner, created_at, updated_at, last_accessed_at,
             (metadata->>'size')::bigint as size, metadata->>'mimetype' as mimetype
      FROM storage.objects
      ORDER BY bucket_id, name;
    `);

    migrationData.storage = {
      status: "INVENTORIED",
      bucketCount: bucketsRes.rows.length,
      objectCount: objectsRes.rows.length,
      buckets: bucketsRes.rows,
      objects: objectsRes.rows,
    };
    log(`Storage Buckets: ${bucketsRes.rows.length}`);
    log(`Storage Objects: ${objectsRes.rows.length}`);

  } catch (err) {
    log(`Storage inventory error: ${err.message}`);
    migrationData.storage = { status: "BLOCKED", error: err.message };
  }

  // ── PHASE 4: LIVE DATA EXTRACTION & CHECKSUMS ──────────────────────────────
  log("\n--- PHASE 4: LIVE DATA EXTRACTION & BASELINE CALCULATION ---");

  // Get table column structures & primary keys
  const tableMetadata = {};
  for (const t of appTables) {
    const colsRes = await queryWithRetry(supa, `
      SELECT column_name, data_type, udt_name, is_nullable, column_default, is_generated, generation_expression
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = $1
      ORDER BY ordinal_position;
    `, [t]);

    const pkRes = await queryWithRetry(supa, `
      SELECT kcu.column_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      WHERE tc.constraint_type = 'PRIMARY KEY'
        AND tc.table_schema = 'public'
        AND tc.table_name = $1
      ORDER BY kcu.ordinal_position;
    `, [t]);

    const countRes = await queryWithRetry(supa, `SELECT count(*)::bigint as count FROM public."${t}";`);
    const count = parseInt(countRes.rows[0].count, 10);

    const pkCols = pkRes.rows.map(r => r.column_name);

    // Fetch all rows
    const orderClause = pkCols.length > 0 ? `ORDER BY ${pkCols.map(c => `"${c}"`).join(", ")}` : "";
    const dataRes = await queryWithRetry(supa, `SELECT * FROM public."${t}" ${orderClause};`);
    const rows = dataRes.rows;

    // Calculate deterministic canonical MD5 checksum
    const serializedRows = rows.map(r => {
      // Sort object keys deterministically
      const sorted = {};
      Object.keys(r).sort().forEach(k => {
        let val = r[k];
        if (val instanceof Date) val = val.toISOString();
        sorted[k] = val;
      });
      return JSON.stringify(sorted);
    }).join("\n");
    const checksum = crypto.createHash("sha256").update(serializedRows).digest("hex");

    tableMetadata[t] = {
      tableName: t,
      columns: colsRes.rows,
      primaryKey: pkCols,
      sourceRowCount: count,
      sourceChecksum: checksum,
      rows: rows,
    };

    log(`Table ${t.padEnd(35)}: ${String(count).padStart(6)} rows | PK: [${pkCols.join(", ")}] | SHA-256: ${checksum.slice(0, 12)}...`);
  }

  const totalSourceRows = Object.values(tableMetadata).reduce((sum, tm) => sum + tm.sourceRowCount, 0);
  log(`\nTotal Application Rows Extracted across ${appTables.length} tables: ${totalSourceRows}`);

  // ── PHASE 5: SCHEMA GENERATION & APPLICATION ON NEON STAGING ────────────────
  log("\n--- PHASE 5: IMPORTING SCHEMA & DATA INTO ISOLATED NEON STAGING ---");

  // Step 5.1: The staging public schema was proven empty. Never drop a schema.
  log("Importing into the existing empty public schema on isolated staging...");

  // Step 5.2: Enable required extensions on Neon
  const extensions = ["uuid-ossp", "pgcrypto"];
  for (const ext of extensions) {
    try {
      await queryWithRetry(neon, `CREATE EXTENSION IF NOT EXISTS "${ext}" WITH SCHEMA public;`);
    } catch (e) {
      log(`Extension ${ext} notice: ${e.message}`);
    }
  }

  // Step 5.3: Create Enums / Types on Neon
  for (const type of customEnums) {
    if (type.enum_values && type.enum_values.length > 0) {
      const vals = type.enum_values.map(v => `'${v.replace(/'/g, "''")}'`).join(", ");
      await queryWithRetry(neon, `CREATE TYPE public."${type.typname}" AS ENUM (${vals});`);
    }
  }
  // Step 5.3b: Create Sequences on Neon
  const seqsRes = await queryWithRetry(supa, `
    SELECT sequence_name
    FROM information_schema.sequences
    WHERE sequence_schema = 'public';
  `);
  for (const seq of seqsRes.rows) {
    try {
      await queryWithRetry(neon, `CREATE SEQUENCE IF NOT EXISTS public."${seq.sequence_name}";`);
    } catch (e) {
      log(`Sequence notice (${seq.sequence_name}): ${e.message}`);
    }
  }
  log(`Created ${seqsRes.rows.length} sequences on Neon.`);

  // Step 5.4: Create Tables on Neon (without foreign keys first to allow out-of-order creation)
  for (const t of appTables) {
    const tm = tableMetadata[t];
    const colDefs = tm.columns.map(c => {
      let typeDef = c.udt_name;
      if (c.data_type === "ARRAY") {
        typeDef = `${c.udt_name.replace(/^_/, "")}[]`;
      } else if (c.data_type === "USER-DEFINED") {
        typeDef = `public."${c.udt_name}"`;
      } else if (c.data_type === "character varying") {
        typeDef = "text";
      }

      let def = `"${c.column_name}" ${typeDef}`;
      if (c.is_generated === "ALWAYS" && c.generation_expression) {
        def += ` GENERATED ALWAYS AS (${c.generation_expression}) STORED`;
      } else {
        if (c.is_nullable === "NO") def += " NOT NULL";
        if (c.column_default) {
          // Strip out Supabase-specific defaults like auth.uid()
          let d = c.column_default;
          if (d.includes("auth.uid()")) {
            d = d.replace(/auth\.uid\(\)/g, "null");
          }
          def += ` DEFAULT ${d}`;
        }
      }
      return def;
    });

    if (tm.primaryKey.length > 0) {
      colDefs.push(`CONSTRAINT "${t}_pkey" PRIMARY KEY (${tm.primaryKey.map(k => `"${k}"`).join(", ")})`);
    }

    const createSql = `CREATE TABLE public."${t}" (\n  ${colDefs.join(",\n  ")}\n);`;
    await queryWithRetry(neon, createSql);
  }
  log(`Created ${appTables.length} tables on Neon staging.`);

  // Step 5.5: Insert Data into Neon Staging in batched mode
  // (Foreign keys are deferred to Step 5.6 so out-of-order insertion works without replication role override)
  for (const t of appTables) {
    const tm = tableMetadata[t];
    const rows = tm.rows;
    if (rows.length === 0) continue;

    const colTypeMap = {};
    tm.columns.forEach(c => { colTypeMap[c.column_name] = c.data_type.toLowerCase(); });

    const cols = tm.columns.filter(c => c.is_generated !== "ALWAYS").map(c => c.column_name);
    const colList = cols.map(c => `"${c}"`).join(", ");

    // Chunk rows in batches of 200
    const BATCH_SIZE = 200;
    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      const batch = rows.slice(i, i + BATCH_SIZE);
      const valPlaceholders = [];
      const valParams = [];
      let pIdx = 1;

      for (const row of batch) {
        const rowPlaceholders = [];
        for (const col of cols) {
          rowPlaceholders.push(`$${pIdx++}`);
          let val = row[col];
          const dt = colTypeMap[col] || "";
          if (val !== null && typeof val === "object" && !(val instanceof Date)) {
            if (dt === "array") {
              // keep as JS array for pg array driver
            } else {
              val = JSON.stringify(val);
            }
          }
          valParams.push(val);
        }
        valPlaceholders.push(`(${rowPlaceholders.join(", ")})`);
      }

      const insertSql = `INSERT INTO public."${t}" (${colList}) VALUES \n${valPlaceholders.join(",\n")};`;
      await queryWithRetry(neon, insertSql, valParams);
    }
    log(`Imported ${rows.length} rows into Neon table: ${t}`);
  }
  log("Completed data import on Neon staging.");

  // Step 5.6: Apply Foreign Keys and Constraints from Source
  log("Applying constraints and indexes to Neon staging...");
  const fksRes = await queryWithRetry(supa, `
    SELECT
      tc.table_name,
      tc.constraint_name,
      pg_get_constraintdef(c.oid) as constraint_def
    FROM information_schema.table_constraints tc
    JOIN pg_constraint c ON c.conname = tc.constraint_name
    JOIN pg_namespace n ON n.oid = c.connamespace
    WHERE tc.table_schema = 'public'
      AND tc.constraint_type IN ('FOREIGN KEY', 'CHECK', 'UNIQUE')
      AND n.nspname = 'public'
    ORDER BY tc.table_name, tc.constraint_type;
  `);

  let appliedConstraints = 0;
  for (const fk of fksRes.rows) {
    try {
      await queryWithRetry(neon, `ALTER TABLE public."${fk.table_name}" ADD CONSTRAINT "${fk.constraint_name}" ${fk.constraint_def};`);
      appliedConstraints++;
    } catch (err) {
      // Cross-schema Supabase Auth references cannot be installed in isolated Neon.
      log(`Constraint notice (${fk.table_name}.${fk.constraint_name}): ${err.message}`);
    }
  }
  log(`Applied ${appliedConstraints} / ${fksRes.rows.length} constraints to Neon.`);

  // Step 5.7: Apply Indexes
  const indexesRes = await queryWithRetry(supa, `
    SELECT tablename, indexname, indexdef
    FROM pg_indexes
    WHERE schemaname = 'public' AND indexname NOT LIKE '%_pkey'
    ORDER BY tablename, indexname;
  `);

  let appliedIndexes = 0;
  for (const idx of indexesRes.rows) {
    try {
      await queryWithRetry(neon, idx.indexdef);
      appliedIndexes++;
    } catch (err) {
      log(`Index notice (${idx.indexname}): ${err.message}`);
    }
  }
  log(`Applied ${appliedIndexes} / ${indexesRes.rows.length} indexes to Neon.`);

  // ── PHASE 6: DATABASE RECONCILIATION ────────────────────────────────────────
  log("\n--- PHASE 6: DATABASE RECONCILIATION (LIVE SOURCE VS NEON STAGING) ---");

  const reconciliationReport = [];
  let totalNeonRows = 0;
  let allChecksumsMatch = true;
  let allCountsMatch = true;

  for (const t of appTables) {
    const tm = tableMetadata[t];
    const neonCountRes = await queryWithRetry(neon, `SELECT count(*)::bigint as count FROM public."${t}";`);
    const neonCount = parseInt(neonCountRes.rows[0].count, 10);
    totalNeonRows += neonCount;

    const pkCols = tm.primaryKey;
    const orderClause = pkCols.length > 0 ? `ORDER BY ${pkCols.map(c => `"${c}"`).join(", ")}` : "";
    const neonDataRes = await queryWithRetry(neon, `SELECT * FROM public."${t}" ${orderClause};`);
    const neonRows = neonDataRes.rows;

    const serializedNeonRows = neonRows.map(r => {
      const sorted = {};
      Object.keys(r).sort().forEach(k => {
        let val = r[k];
        if (val instanceof Date) val = val.toISOString();
        sorted[k] = val;
      });
      return JSON.stringify(sorted);
    }).join("\n");
    const neonChecksum = crypto.createHash("sha256").update(serializedNeonRows).digest("hex");

    const countMatch = tm.sourceRowCount === neonCount;
    const checksumMatch = tm.sourceChecksum === neonChecksum;

    if (!countMatch) allCountsMatch = false;
    if (!checksumMatch) allChecksumsMatch = false;

    const recItem = {
      tableName: t,
      sourceCount: tm.sourceRowCount,
      neonCount: neonCount,
      variance: neonCount - tm.sourceRowCount,
      sourceChecksum: tm.sourceChecksum.slice(0, 16),
      neonChecksum: neonChecksum.slice(0, 16),
      checksumMatch: checksumMatch,
      status: countMatch && checksumMatch ? "PASS" : "FAIL",
    };
    reconciliationReport.push(recItem);

    const statusStr = recItem.status === "PASS" ? "✓ PASS" : "✗ MISMATCH";
    log(`${statusStr} ${t.padEnd(35)}: Source=${tm.sourceRowCount} | Neon=${neonCount} | MD5=${checksumMatch ? "MATCH" : "DIFF"}`);
  }

  migrationData.reconciliation = reconciliationReport;
  migrationData.summary = {
    totalTables: appTables.length,
    totalSourceRows,
    totalNeonRows,
    allCountsMatch,
    allChecksumsMatch,
    variance: totalNeonRows - totalSourceRows,
  };

  log(`\nReconciliation Summary: Source Rows=${totalSourceRows} | Neon Rows=${totalNeonRows} | Variance=${totalNeonRows - totalSourceRows}`);
  log(`All Counts Match: ${allCountsMatch}`);
  log(`All Checksums Match: ${allChecksumsMatch}`);

  // The historical report below labels the Neon production host as staging and
  // claims schema/security parity this script never established. Stop before it.
  const sourceObjects = await supa.query(`
    SELECT
      (SELECT count(*)::int FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public') AS functions,
      (SELECT count(*)::int FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND NOT t.tgisinternal) AS triggers,
      (SELECT count(*)::int FROM pg_policies WHERE schemaname='public') AS policies`);
  const targetObjects = await neon.query(`
    SELECT
      (SELECT count(*)::int FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public') AS functions,
      (SELECT count(*)::int FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND NOT t.tgisinternal) AS triggers,
      (SELECT count(*)::int FROM pg_policies WHERE schemaname='public') AS policies`);
  const evidence = {
    generatedAt: new Date().toISOString(),
    sourceHost: new URL(SUPABASE_DB_URL).hostname,
    targetHost: new URL(NEON_DB_URL).hostname,
    targetBranch: 'br-frosty-haze-azsnybmr',
    tables: appTables.length,
    sourceRows: totalSourceRows,
    targetRows: totalNeonRows,
    rowCountParity: allCountsMatch,
    sha256Parity: allChecksumsMatch,
    appliedConstraints,
    sourceConstraints: fksRes.rows.length,
    appliedIndexes,
    sourceIndexes: indexesRes.rows.length,
    sourceSchemaObjects: sourceObjects.rows[0],
    targetSchemaObjects: targetObjects.rows[0],
    tableReconciliation: reconciliationReport,
    schemaParity: false,
    note: 'The legacy script does not migrate public functions, triggers, RLS policies, or all original column types. Row parity does not prove runtime or security readiness.',
  };
  fs.writeFileSync(path.join(DIRS.reports, 'isolated-staging-database-reconciliation.json'), JSON.stringify(evidence, null, 2), { mode: 0o600 });
  if (!allCountsMatch || !allChecksumsMatch || appTables.length !== 80) {
    await supa.end();
    await neon.end();
    throw new Error('Staging row parity failed; stop before storage or runtime tests.');
  }
  log(`Row parity verified on actual staging; full schema parity remains incomplete. Evidence: ${path.join(DIRS.reports, 'isolated-staging-database-reconciliation.json')}`);
  await supa.end();
  await neon.end();
  return;

  // ── PHASE 7: STAGING APPLICATION & RLS VALIDATION ──────────────────────────
  log("\n--- PHASE 7: STAGING APPLICATION & RLS VALIDATION ---");

  // Query key entities from Neon to prove data integrity
  const neonProfiles = await queryWithRetry(neon, `SELECT count(*) as count, count(distinct role) as distinct_roles FROM public.profiles;`);
  const neonInstitutes = await queryWithRetry(neon, `SELECT count(*) as count, count(distinct location) as distinct_locations FROM public.institutes;`);
  const neonJobs = await queryWithRetry(neon, `SELECT count(*) as count FROM public.jobs;`);
  const neonMentors = await queryWithRetry(neon, `SELECT count(*) as count FROM public.mentors;`);
  const neonEvents = await queryWithRetry(neon, `SELECT count(*) as count FROM public.events;`);
  const neonCourses = await queryWithRetry(neon, `SELECT count(*) as count FROM public.courses;`);

  log(`Neon Profiles Sample: ${neonProfiles.rows[0].count} profiles across ${neonProfiles.rows[0].distinct_roles} roles`);
  log(`Neon Institutes Sample: ${neonInstitutes.rows[0].count} institutes across ${neonInstitutes.rows[0].distinct_locations} locations`);
  log(`Neon Jobs: ${neonJobs.rows[0].count} | Mentors: ${neonMentors.rows[0].count} | Events: ${neonEvents.rows[0].count} | Courses: ${neonCourses.rows[0].count}`);

  // Test RLS Tenant Isolation Compatibility via PostgreSQL transaction-local setting
  log("Testing RLS Transaction Isolation on Neon...");
  await queryWithRetry(neon, "BEGIN;");
  await queryWithRetry(neon, "SELECT set_config('app.current_user_id', '00000000-0000-0000-0000-000000000001', true);");
  const isolationCheck = await queryWithRetry(neon, "SELECT current_setting('app.current_user_id', true) as user_id;");
  await queryWithRetry(neon, "COMMIT;");
  const postCommitCheck = await queryWithRetry(neon, "SELECT current_setting('app.current_user_id', true) as user_id;");

  const rlsIsolationVerified = isolationCheck.rows[0].user_id === "00000000-0000-0000-0000-000000000001" && !postCommitCheck.rows[0].user_id;
  log(`RLS Transaction Isolation verification: ${rlsIsolationVerified ? "VERIFIED (Clean rollback on commit)" : "FAILED"}`);

  // ── PHASE 8: WRITE FINAL MIGRATION REPORT ──────────────────────────────────
  log("\n--- PHASE 8: GENERATING FINAL EVIDENCE REPORT ---");

  const reportMd = `# MeroTalent — Supabase Production → Isolated Neon Staging Migration Report

**Date:** ${new Date().toISOString().split("T")[0]}
**Auditor:** Antigravity AI Engine & MeroTalent Database Architecture Team
**Scope:** Full Production Data Migration, Schema Adaptation & Live Reconciliation
**Target Project:** \`summer-sky-63693897\`
**Target Branch:** \`migration-staging\`

---

## 1. Executive Status Matrix

\`\`\`text
============================================================
MIGRATION VERDICT: REAL STAGING RUN VERIFIED
============================================================

SOURCE:                 CURRENT PRODUCTION VERIFIED (dtirpilgzlsfryucanlg.supabase.co)
DATABASE:               REAL IMPORT VERIFIED (PostgreSQL 18.6)
AUTH:                   REAL SOURCE MANIFEST VERIFIED (${migrationData.auth.totalUsers || 0} users mapped)
STORAGE:                ${env.AWS_ACCESS_KEY_ID ? "REAL BINARY MIGRATION VERIFIED" : "REAL BINARY MIGRATION BLOCKED (S3 credentials pending)"}
RECONCILIATION:         ${allCountsMatch && allChecksumsMatch ? "PASSED (100% Deterministic Parity)" : "FAIL"}
STAGING APPLICATION:    VERIFIED

PRODUCTION CUTOVER:     NO-GO
============================================================
\`\`\`

---

## 2. Provenance & Target Details

| Target | Host / Identifier | Database | Role | Status |
|---|---|---|---|:---:|
| **Source** | \`db.dtirpilgzlsfryucanlg.supabase.co:5432\` | \`postgres\` | \`postgres\` | **LIVE PRODUCTION (Read-Only)** |
| **Destination** | \`ep-polished-flower-azsezy8a-pooler.c-3.ap-southeast-1.aws.neon.tech\` | \`neondb\` | \`neondb_owner\` | **ISOLATED STAGING BRANCH** |

* **Migration Workspace:** \`${WORKSPACE}\`
* **Execution Timestamp:** \`${migrationData.startedAt}\`
* **Completed Timestamp:** \`${new Date().toISOString()}\`

---

## 3. Database Reconciliation (Live Source vs Neon Staging)

| Table Name | Source Rows | Neon Rows | Variance | Source SHA-256 (16) | Neon SHA-256 (16) | Status |
|---|:---:|:---:|:---:|:---:|:---:|:---:|
${reconciliationReport.map(r => `| \`${r.tableName}\` | ${r.sourceCount} | ${r.neonCount} | ${r.variance} | \`${r.sourceChecksum}\` | \`${r.neonChecksum}\` | **${r.status}** |`).join("\n")}

### Aggregate Statistics
* **Total Application Tables Migrated:** \`${appTables.length}\`
* **Total Source Rows:** \`${totalSourceRows}\`
* **Total Neon Rows:** \`${totalNeonRows}\`
* **Row Count Parity:** \`${allCountsMatch ? "100% MATCH" : "MISMATCH"}\`
* **Deterministic SHA-256 Parity:** \`${allChecksumsMatch ? "100% MATCH" : "MISMATCH"}\`

---

## 4. Live Auth System Inventory & Manifest

* **Total Live Users:** \`${migrationData.auth.totalUsers}\`
* **Total Identities:** \`${migrationData.auth.totalIdentities}\`
* **Verified Emails:** \`${migrationData.auth.verifiedUsers}\`
* **Users with Passwords:** \`${migrationData.auth.usersWithPassword}\`
* **Users with Multiple Identities:** \`${migrationData.auth.usersWithMultipleIdentities}\`
* **Provider Distribution:**
${Object.entries(migrationData.auth.providerCounts || {}).map(([p, c]) => `  - **${p}:** ${c}`).join("\n")}
* **Auth Manifest Artifact:** \`reports/auth-manifest.json\` (Legacy Supabase UUIDs strictly preserved).

---

## 5. Storage Inventory

* **Total Storage Buckets:** \`${migrationData.storage.bucketCount || 0}\`
* **Total Storage Objects:** \`${migrationData.storage.objectCount || 0}\`
* **Storage Status:** ${env.AWS_ACCESS_KEY_ID ? "Re-hosted on Neon S3" : "Inventory recorded. Binary upload paused until S3 access keys configured in `.migration.env`."}

---

## 6. Staging Application & RLS Verification

* **Profiles:** \`${neonProfiles.rows[0].count}\` active profile records verified.
* **Institutes:** \`${neonInstitutes.rows[0].count}\` colleges and universities across \`${neonInstitutes.rows[0].distinct_locations}\` locations.
* **Job Portal:** \`${neonJobs.rows[0].count}\` active job postings with recruiter relationships.
* **Mentorship & LMS:** \`${neonMentors.rows[0].count}\` mentors, \`${neonEvents.rows[0].count}\` events, \`${neonCourses.rows[0].count}\` courses loaded with full referential integrity.
* **Transaction RLS Isolation:** Verified via \`set_config('app.current_user_id', ...)\` with automatic rollback on transaction boundaries.

---

## 7. Supabase Runtime Dependency Audit (Current Codebase)

* **Category A (Active Production Core):** \`src/integrations/supabase/client.ts\`, \`src/contexts/AuthContext.tsx\`, \`src/lib/server/supabase.ts\` (Kept intact for live production until cutover).
* **Category B (Neon Adapters Ready):** \`src/lib/neon/database.ts\`, \`src/lib/neon/auth.ts\`, \`src/lib/neon/storage.ts\`.
* **Category C (Test Fixtures):** \`src/test/neon-*.test.ts\`.
* **Category D (Documentation):** \`docs/neon-*.md\`.
* **Category E (Cutover Replacements):** API route handlers in \`app/api/v1/*\`.

---

## 8. Final Verdict & Stop Condition

\`\`\`text
SOURCE:                 CURRENT PRODUCTION VERIFIED
DATABASE:               REAL IMPORT VERIFIED
AUTH:                   REAL SOURCE MANIFEST VERIFIED
STORAGE:                ${env.AWS_ACCESS_KEY_ID ? "REAL BINARY MIGRATION VERIFIED" : "REAL BINARY MIGRATION BLOCKED (S3 Keys)"}
RECONCILIATION:         PASSED
STAGING APPLICATION:    VERIFIED
PRODUCTION CUTOVER:     NO-GO
\`\`\`
`;

  fs.writeFileSync(path.join(process.cwd(), "docs/neon-real-production-migration-2026-10-08.md"), reportMd, "utf8");
  fs.writeFileSync(path.join(DIRS.reports, "migration-report.md"), reportMd, "utf8");
  log("Wrote final evidence report to docs/neon-real-production-migration-2026-10-08.md and reports/.");

  await supa.end();
  await neon.end();

  log("================================================================================");
  log("MIGRATION COMPLETED SUCCESSFULLY WITH 100% PARITY.");
  log("================================================================================");
}

main().catch(err => {
  console.error("Migration Fatal Error:", err);
  process.exit(1);
});
