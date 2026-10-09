/**
 * MeroTalent — Apply effective application schema to Neon staging
 *
 * Reads all supabase/migrations/*.sql files in order, strips
 * Supabase-specific constructs that cannot run on Neon, and applies
 * the effective schema to the isolated Neon staging branch.
 *
 * SAFETY:
 *   - NEVER modifies Supabase
 *   - NEVER touches production Neon branch
 *   - Only applies to NEON_STAGING_DATABASE_URL
 *
 * Usage:
 *   NEON_STAGING_DATABASE_URL=<url> node scripts/apply-schema-to-neon.mjs
 */

import pg from "pg";
import fs from "fs";
import path from "path";
import { requireNeonMigrationStaging } from "./require-neon-migration-staging.mjs";

const { Client } = pg;

const NEON_URL = process.env.NEON_STAGING_DATABASE_URL;
if (!NEON_URL) {
  console.error("BLOCKED: NEON_STAGING_DATABASE_URL not set");
  process.exit(1);
}
requireNeonMigrationStaging(NEON_URL);

const MIGRATIONS_DIR = path.resolve("supabase/migrations");
const log = (msg) => console.log(`[${new Date().toISOString()}] ${msg}`);

// Supabase-specific patterns that must be skipped or rewritten for Neon
const SKIP_PATTERNS = [
  // Supabase auth references that are managed infrastructure
  /^grant\s+usage\s+on\s+schema\s+auth/i,
  /^grant\s+.*\s+to\s+supabase_/i,
  /^alter\s+default\s+privileges.*supabase_/i,
  /^create\s+policy.*using\s*\(\s*auth\.uid\(\)/i,
];

function shouldSkipLine(line) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("--")) return false;
  return SKIP_PATTERNS.some(p => p.test(trimmed));
}

// Replace Supabase auth context functions with Neon-compatible equivalents
function adaptSql(sql) {
  return sql
    // Replace auth.uid() with application-level GUC approach
    .replace(/\bauth\.uid\(\)/g, "(current_setting('app.current_user_id', true))::uuid")
    // Replace auth.jwt() with a JSON placeholder (policies using JWT will need rework)
    .replace(/\bauth\.jwt\(\)/g, "('{}')::json")
    // Remove supabase vault references
    .replace(/vault\.\w+\([^)]*\)/g, "NULL")
    // Normalize supabase realtime publication setup (skip it)
    .replace(/alter\s+publication\s+supabase_realtime[^;]+;/gi, "-- supabase_realtime skipped for Neon");
}

async function applySchemaToNeon() {
  const client = new Client({
    connectionString: NEON_URL,
    ssl: { rejectUnauthorized: false },
    statement_timeout: 120000,
  });
  await client.connect();

  const meta = await client.query("SELECT version(), current_database(), current_user");
  const row = meta.rows[0];
  log("Connected to Neon:");
  log("  DB      : " + row.current_database);
  log("  User    : " + row.current_user);
  log("  Version : " + row.version.split(" on ")[0]);

  const tablesBefore = await client.query(
    "SELECT COUNT(*) AS cnt FROM information_schema.tables WHERE table_schema='public'"
  );
  log("  Tables before schema apply: " + tablesBefore.rows[0].cnt);

  // Read migrations in order
  const files = fs.readdirSync(MIGRATIONS_DIR)
    .filter(f => f.endsWith(".sql"))
    .sort();

  log(`\nApplying ${files.length} migration files to Neon staging...`);

  let applied = 0; let skipped = 0; let errors = 0;

  // First: ensure required extensions are enabled
  const requiredExtensions = [
    "pgcrypto", "uuid-ossp", "pg_trgm", "pg_stat_statements",
    "unaccent", "btree_gin", "btree_gist",
  ];
  for (const ext of requiredExtensions) {
    try {
      await client.query(`CREATE EXTENSION IF NOT EXISTS "${ext}"`);
    } catch { /* not available — skip silently */ }
  }

  // Create Supabase-compat schemas/stubs so migrations referencing them don't fail
  await client.query(`
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'extensions') THEN
        CREATE SCHEMA extensions;
      END IF;
    END $$;
  `).catch(() => {});

  for (const file of files) {
    const filePath = path.join(MIGRATIONS_DIR, file);
    let sql = fs.readFileSync(filePath, "utf8");

    // Adapt Supabase-specific constructs
    sql = adaptSql(sql);

    // Split on semicolons to execute statement-by-statement
    // Handle dollar-quoted strings carefully
    const statements = splitSqlStatements(sql);

    let fileApplied = 0; let fileErrors = 0;
    for (const stmt of statements) {
      const trimmed = stmt.trim();
      if (!trimmed || trimmed.startsWith("--")) continue;

      // Skip Supabase-infrastructure statements
      if (
        /^grant\s+usage\s+on\s+schema\s+(auth|storage|realtime)/i.test(trimmed) ||
        /^grant\s+.*\s+to\s+supabase_/i.test(trimmed) ||
        /^alter\s+default\s+privileges.*supabase_/i.test(trimmed) ||
        /^create\s+publication\s+supabase_realtime/i.test(trimmed) ||
        /^alter\s+publication\s+supabase_realtime/i.test(trimmed) ||
        /create\s+schema\s+(if\s+not\s+exists\s+)?auth\b/i.test(trimmed) ||
        /create\s+schema\s+(if\s+not\s+exists\s+)?storage\b/i.test(trimmed) ||
        /create\s+schema\s+(if\s+not\s+exists\s+)?realtime\b/i.test(trimmed) ||
        /^comment\s+on\s+extension/i.test(trimmed)
      ) {
        skipped++;
        continue;
      }

      try {
        await client.query(trimmed);
        fileApplied++;
      } catch (e) {
        // Tolerate "already exists" errors
        if (
          e.message.includes("already exists") ||
          e.message.includes("does not exist") && trimmed.toLowerCase().startsWith("drop") ||
          e.message.includes("relation") && e.message.includes("already exists") ||
          e.message.includes("extension") ||
          e.code === "42P07" || // duplicate table
          e.code === "42710" || // duplicate object
          e.code === "42723" || // duplicate function
          e.code === "23505"    // unique violation
        ) {
          fileApplied++; // count as applied (idempotent)
        } else {
          fileErrors++;
          if (fileErrors <= 3) {
            log(`  WARN [${file}]: ${e.message.slice(0, 120)}`);
          }
        }
      }
    }

    applied += fileApplied;
    errors += fileErrors;
    log(`  [${applied} stmts] ${file} — ${fileApplied} applied, ${fileErrors} errors`);
  }

  const tablesAfter = await client.query(
    "SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name"
  );
  log(`\n✓ Schema apply complete.`);
  log(`  Statements applied : ${applied}`);
  log(`  Statements skipped : ${skipped}`);
  log(`  Errors (non-fatal) : ${errors}`);
  log(`  Tables now in Neon : ${tablesAfter.rows.length}`);

  const tableList = tablesAfter.rows.map(r => r.table_name);
  fs.writeFileSync("neon-schema-applied-tables.json", JSON.stringify(tableList, null, 2));

  await client.end();
  return { tablesCreated: tablesAfter.rows.length, tableList };
}

/**
 * Splits a SQL string into individual statements, respecting:
 * - Dollar-quoted strings ($$ ... $$)
 * - Single-quoted strings
 * - Line comments (--)
 * - Block comments (/* ... * /)
 */
function splitSqlStatements(sql) {
  const statements = [];
  let current = "";
  let i = 0;
  let inDollarQuote = false;
  let dollarTag = "";

  while (i < sql.length) {
    // Dollar quoting
    if (!inDollarQuote && sql[i] === "$") {
      const tagMatch = sql.slice(i).match(/^\$([a-zA-Z_]*)\$/);
      if (tagMatch) {
        inDollarQuote = true;
        dollarTag = tagMatch[0];
        current += dollarTag;
        i += dollarTag.length;
        continue;
      }
    }
    if (inDollarQuote) {
      if (sql.slice(i).startsWith(dollarTag)) {
        current += dollarTag;
        i += dollarTag.length;
        inDollarQuote = false;
        dollarTag = "";
        continue;
      }
      current += sql[i++];
      continue;
    }
    // Single-quoted string
    if (sql[i] === "'") {
      current += sql[i++];
      while (i < sql.length) {
        if (sql[i] === "'" && sql[i + 1] === "'") {
          current += "''";
          i += 2;
        } else if (sql[i] === "'") {
          current += sql[i++];
          break;
        } else {
          current += sql[i++];
        }
      }
      continue;
    }
    // Line comment
    if (sql[i] === "-" && sql[i + 1] === "-") {
      while (i < sql.length && sql[i] !== "\n") i++;
      continue;
    }
    // Block comment
    if (sql[i] === "/" && sql[i + 1] === "*") {
      i += 2;
      while (i < sql.length && !(sql[i] === "*" && sql[i + 1] === "/")) i++;
      i += 2;
      continue;
    }
    // Statement terminator
    if (sql[i] === ";") {
      if (current.trim()) statements.push(current.trim());
      current = "";
      i++;
      continue;
    }
    current += sql[i++];
  }
  if (current.trim()) statements.push(current.trim());
  return statements;
}

applySchemaToNeon().catch(err => {
  console.error("FATAL:", err.message);
  process.exit(1);
});
