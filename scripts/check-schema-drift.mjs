#!/usr/bin/env node

/**
 * Diffs a live database against the migrations in this repo.
 *
 * A unit test cannot catch schema drift, because the repo and a fresh local
 * database always agree — that is exactly why "works locally, broken in
 * production" survives review. This script asks the live database instead.
 *
 * Usage:
 *   node scripts/check-schema-drift.mjs                 # uses .env
 *   node scripts/check-schema-drift.mjs --env .env.prod
 *
 * Only the public anon key is needed. PostgREST resolves column names before
 * applying row-level security, so an unprivileged key can still tell a missing
 * column from a row it may not read:
 *
 *   42703    -> the column does not exist
 *   PGRST205 -> the table does not exist
 *   PGRST202 -> no function matched (absent, or a different signature)
 *   42501    -> exists, but this key may not call it
 *   200/[]   -> exists; rows may simply be hidden by RLS
 *
 * Exits 1 when drift is found so CI can gate on it.
 */

import { readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";

const args = process.argv.slice(2);
const envFlag = args.indexOf("--env");
const ENV_FILE = envFlag !== -1 ? args[envFlag + 1] : ".env";
const ROOT = process.cwd();
const MIGRATIONS = resolve(ROOT, "supabase/migrations");

const RESERVED = new Set([
  "primary", "unique", "check", "constraint", "foreign", "references",
  "create", "table", "if", "not", "exists", "public",
]);

/**
 * Objects that are deliberately absent from production, so their absence is the
 * desired state rather than drift.
 *
 * confirm_test_user_email is a local development fixture. 20260820163000 grants
 * EXECUTE on it to anon, which would let any unauthenticated caller confirm any
 * @merotalent.com address — a domain that holds admin accounts. It must not be
 * applied; see docs/HANDOFF-production-tasks.md §5.
 */
const INTENTIONALLY_ABSENT = new Set(["confirm_test_user_email"]);

const readEnv = () => {
  // Prefer real environment variables so CI can pass repository secrets without
  // materialising an env file on disk; fall back to the file for local use.
  // Strip surrounding quotes: a value copied out of an env file often keeps
  // them, and a quoted URL fails to parse.
  const clean = (value) => value?.trim().replace(/^["']|["']$/g, "") || null;
  const url = clean(process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL);
  const key = clean(
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY,
  );
  if (url && key) {
    return { url: url.replace(/\/$/, ""), key, source: "environment" };
  }

  let raw;
  try {
    raw = readFileSync(resolve(ROOT, ENV_FILE), "utf8");
  } catch {
    console.error(
      `✖ No Supabase credentials. Set NEXT_PUBLIC_SUPABASE_URL and ` +
        `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, or provide ${ENV_FILE}.`,
    );
    process.exit(1);
  }
  const pick = (key) => {
    const m = new RegExp(`^${key}=(.+)$`, "m").exec(raw);
    return m ? m[1].trim().replace(/^["']|["']$/g, "") : null;
  };
  const fileUrl = pick("NEXT_PUBLIC_SUPABASE_URL") || pick("SUPABASE_URL");
  const fileKey = pick("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY") || pick("SUPABASE_PUBLISHABLE_KEY");
  if (!fileUrl || !fileKey) {
    console.error(`✖ ${ENV_FILE} is missing a Supabase URL or publishable key.`);
    process.exit(1);
  }
  return { url: fileUrl.replace(/\/$/, ""), key: fileKey, source: ENV_FILE };
};

/** table -> Set(columns), plus the migration that first declared each object. */
const parseMigrations = () => {
  const files = readdirSync(MIGRATIONS).filter((f) => f.endsWith(".sql")).sort();
  const tables = new Map();
  const functions = new Map();
  const origin = new Map();

  const addColumn = (table, column, version) => {
    if (!tables.has(table)) tables.set(table, new Set());
    tables.get(table).add(column);
    const key = `col:${table}.${column}`;
    if (!origin.has(key)) origin.set(key, version);
  };

  for (const file of files) {
    const sql = readFileSync(join(MIGRATIONS, file), "utf8");
    const version = file.slice(0, 14);

    const createRe = /CREATE TABLE (?:IF NOT EXISTS )?public\.([a-z_]+)\s*\(([\s\S]*?)\n\);/gi;
    for (const m of sql.matchAll(createRe)) {
      if (!origin.has(`table:${m[1]}`)) origin.set(`table:${m[1]}`, version);
      for (const rawLine of m[2].split("\n")) {
        const line = rawLine.trim().replace(/,$/, "");
        const cm = /^([a-z_]+)\s+\S/.exec(line);
        if (cm && !RESERVED.has(cm[1].toLowerCase())) addColumn(m[1], cm[1], version);
      }
    }

    const alterRe = /ALTER TABLE (?:IF EXISTS )?public\.([a-z_]+)([\s\S]*?);/gi;
    for (const m of sql.matchAll(alterRe)) {
      for (const am of m[2].matchAll(/ADD COLUMN (?:IF NOT EXISTS )?([a-z_]+)/gi)) {
        addColumn(m[1], am[1], version);
      }
    }

    const fnRe =
      /CREATE OR REPLACE FUNCTION public\.([a-z_]+)\s*\(([\s\S]*?)\)\s*RETURNS\s+([a-zA-Z_ ]+)/gi;
    for (const m of sql.matchAll(fnRe)) {
      if (!functions.has(m[1])) {
        functions.set(m[1], { args: m[2], returns: m[3].trim().toLowerCase(), version });
      }
    }
  }

  return { tables, functions, origin };
};

/** Split a SQL parameter list on top-level commas and take each name. */
const argNames = (args) => {
  const parts = [];
  let depth = 0;
  let current = "";
  for (const ch of args) {
    if (ch === "(") depth += 1;
    else if (ch === ")") depth -= 1;
    if (ch === "," && depth === 0) {
      parts.push(current);
      current = "";
    } else current += ch;
  }
  if (current.trim()) parts.push(current);

  return parts
    .map((raw) => {
      const tokens = raw.trim().split(/\s+/);
      if (tokens.length === 0) return null;
      let name = tokens[0];
      if (["IN", "OUT", "INOUT", "VARIADIC"].includes(name.toUpperCase()) && tokens[1]) {
        name = tokens[1];
      }
      return /^[a-z_][a-z0-9_]*$/.test(name) ? name : null;
    })
    .filter(Boolean);
};

const main = async () => {
  const { url, key, source } = readEnv();
  const { tables, functions, origin } = parseMigrations();
  const headers = { apikey: key, Authorization: `Bearer ${key}` };

  const codeOf = async (response) => {
    try {
      return (await response.json())?.code ?? null;
    } catch {
      return null;
    }
  };

  const get = (path) => fetch(`${url}/rest/v1/${path}`, { headers });

  const missingTables = [];
  const missingColumns = [];
  const inconclusive = [];

  for (const [table, columnSet] of [...tables].sort((a, b) => a[0].localeCompare(b[0]))) {
    const columns = [...columnSet].sort();
    const res = await get(`${table}?select=${columns.join(",")}&limit=0`);
    if (res.ok) continue;

    const code = await codeOf(res);
    if (code === "PGRST205" || code === "42P01") {
      missingTables.push(table);
      continue;
    }
    if (code === "42703") {
      // Narrow to the exact columns this database lacks.
      for (const column of columns) {
        const one = await get(`${table}?select=${column}&limit=0`);
        if (!one.ok && (await codeOf(one)) === "42703") missingColumns.push([table, column]);
      }
      continue;
    }
    inconclusive.push([table, res.status, code]);
  }

  const missingFunctions = [];
  const absentByDesign = [];
  let triggerCount = 0;

  for (const [name, meta] of [...functions].sort((a, b) => a[0].localeCompare(b[0]))) {
    // Trigger functions are never exposed over REST, so absence proves nothing.
    if (meta.returns.includes("trigger")) {
      triggerCount += 1;
      continue;
    }
    if (INTENTIONALLY_ABSENT.has(name)) {
      absentByDesign.push(name);
      continue;
    }
    const body = Object.fromEntries(argNames(meta.args).map((n) => [n, null]));
    const res = await fetch(`${url}/rest/v1/rpc/${name}`, {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok && (await codeOf(res)) === "PGRST202") missingFunctions.push(name);
  }

  const target = new URL(url).host;
  console.log(`\nSchema drift — ${target}`);
  console.log(`  credentials from  : ${source}`);
  console.log(`  migrations parsed : ${tables.size} tables, ${functions.size} functions`);
  console.log(`  trigger functions : ${triggerCount} skipped (not reachable over REST)\n`);

  const line = (label, value) => console.log(`  ${label.padEnd(20)} ${value}`);

  if (missingTables.length) {
    console.log("✖ MISSING TABLES");
    for (const t of missingTables) line(t, `declared in ${origin.get(`table:${t}`) ?? "?"}`);
    console.log("");
  }

  if (missingColumns.length) {
    console.log("✖ MISSING COLUMNS");
    for (const [t, c] of missingColumns) {
      line(`${t}.${c}`, `declared in ${origin.get(`col:${t}.${c}`) ?? "?"}`);
    }
    console.log("");
  }

  if (missingFunctions.length) {
    console.log("✖ MISSING FUNCTIONS");
    for (const f of missingFunctions) line(f, `declared in ${functions.get(f).version}`);
    console.log("");
  }

  if (absentByDesign.length) {
    console.log("· ABSENT BY DESIGN (not drift)");
    for (const f of absentByDesign) line(f, "see handoff doc §5");
    console.log("");
  }

  if (inconclusive.length) {
    console.log("▲ INCONCLUSIVE (not counted as drift)");
    for (const [t, status, code] of inconclusive) line(t, `HTTP ${status} ${code ?? ""}`);
    console.log("");
  }

  const drift = missingTables.length + missingColumns.length + missingFunctions.length;
  if (drift === 0) {
    console.log("✔ No drift. This database matches the migrations in the repo.\n");
    return;
  }

  console.log(`✖ ${drift} difference(s) between this database and the repo.`);
  console.log("  A column declared inside CREATE TABLE IF NOT EXISTS never reaches a database");
  console.log("  that already has the table — reconcile it with an explicit ALTER TABLE.\n");
  process.exitCode = 1;
};

main().catch((error) => {
  console.error(`✖ Drift check failed: ${error.message}`);
  process.exitCode = 1;
});
