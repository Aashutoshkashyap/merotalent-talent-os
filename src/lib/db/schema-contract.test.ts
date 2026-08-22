import { readdirSync, readFileSync } from "node:fs";
import { extname, join, relative, resolve } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Generalises the college-application contract test to every table.
 *
 * Three failure classes all shipped to production because supabase-js resolves
 * with an `error` field rather than throwing, so a rejected statement is
 * indistinguishable from a successful one at the call site:
 *
 *   1. referencing a column that does not exist        -> 42703
 *   2. omitting a NOT NULL column with no default      -> 23502
 *   3. discarding the result, hiding either of the above
 *
 * This test reads the migrations as the source of truth and checks the client
 * against them.
 */

const ROOT = process.cwd();
const MIGRATIONS = resolve(ROOT, "supabase/migrations");

const RESERVED = new Set([
  "primary", "unique", "check", "constraint", "foreign", "references",
  "create", "table", "if", "not", "exists", "public",
]);

const migrationSql = (() => {
  const files = readdirSync(MIGRATIONS).filter((f) => f.endsWith(".sql")).sort();
  return files.map((f) => readFileSync(join(MIGRATIONS, f), "utf8")).join("\n");
})();

interface TableSchema {
  columns: Set<string>;
  required: Set<string>;
}

const schema: Map<string, TableSchema> = (() => {
  const tables = new Map<string, TableSchema>();
  const ensure = (name: string) => {
    if (!tables.has(name)) tables.set(name, { columns: new Set(), required: new Set() });
    return tables.get(name)!;
  };

  const createRe = /CREATE TABLE (?:IF NOT EXISTS )?public\.([a-z_]+)\s*\(([\s\S]*?)\n\);/gi;
  for (const m of migrationSql.matchAll(createRe)) {
    const table = ensure(m[1]);
    for (const rawLine of m[2].split("\n")) {
      const line = rawLine.trim().replace(/,$/, "");
      const cm = /^([a-z_]+)\s+\S/.exec(line);
      if (!cm || RESERVED.has(cm[1].toLowerCase())) continue;
      table.columns.add(cm[1]);
      if (/\bNOT NULL\b/i.test(line) && !/\bDEFAULT\b/i.test(line)) {
        table.required.add(cm[1]);
      }
    }
  }

  const alterRe = /ALTER TABLE (?:IF EXISTS )?public\.([a-z_]+)([\s\S]*?);/gi;
  for (const m of migrationSql.matchAll(alterRe)) {
    const table = ensure(m[1]);
    const addRe = /ADD COLUMN (?:IF NOT EXISTS )?([a-z_]+)([^,]*)/gi;
    for (const am of m[2].matchAll(addRe)) {
      table.columns.add(am[1]);
      if (/\bNOT NULL\b/i.test(am[2]) && !/\bDEFAULT\b/i.test(am[2])) {
        table.required.add(am[1]);
      }
    }
  }

  return tables;
})();

const clientSources = (() => {
  const out: string[] = [];
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if ([".ts", ".tsx"].includes(extname(entry.name)) && !entry.name.includes(".test.")) {
        out.push(full);
      }
    }
  };
  walk(resolve(ROOT, "src"));
  return out;
})();

/**
 * Isolates one `.from("table")` chain. Stops at the next `.from(` so sibling
 * queries in a Promise.all do not contribute, and at `toast(` because a toast
 * payload's `title` / `description` / `variant` keys are not columns.
 */
const chainAt = (lines: string[], index: number): string => {
  const slice = lines.slice(index, index + 30);
  const kept = [slice[0]];
  for (const line of slice.slice(1)) {
    if (line.includes('.from("') || line.includes("toast(")) break;
    // A new assignment statement ends this chain. Without this, filters that
    // are applied later to a separate query builder (`query = query.eq(...)`)
    // get attributed to whichever table was queried above them.
    if (/^\s*(?:const |let |var )?[a-zA-Z_$][\w$]*\s*=[^=]/.test(line)) break;
    kept.push(line);
  }
  return kept.join("\n");
};

interface Usage {
  file: string;
  line: number;
  table: string;
  chain: string;
}

const usages: Usage[] = [];
for (const file of clientSources) {
  const lines = readFileSync(file, "utf8").split("\n");
  lines.forEach((line, i) => {
    const m = /\.from\("([a-z_]+)"\)/.exec(line);
    if (!m || !schema.has(m[1])) return;
    usages.push({ file: relative(ROOT, file), line: i + 1, table: m[1], chain: chainAt(lines, i) });
  });
}

/** Top-level keys of an insert/update/upsert object literal. */
const writePayload = (chain: string) => {
  const m = /\.(insert|update|upsert)\(\s*\{([\s\S]*?)\n(\s*)\}/.exec(chain);
  if (!m) return null;
  const [, op, body] = m;
  // A spread carries keys this scan cannot see, so required-column checks
  // cannot be trusted for that payload.
  const hasSpread = /\.\.\./.test(body);
  // Only keys at the shallowest indent are top-level; deeper ones belong to a
  // nested object such as a jsonb `metadata` value. Indent must be measured
  // with [ \t] — \s also matches the leading newline, which inflates the first
  // key's indent by one and wrongly classifies it as nested.
  const keyLines = [...body.matchAll(/^([ \t]+)([a-z_]+)\s*:/gm)];
  if (keyLines.length === 0) return { op, keys: new Set<string>(), hasSpread };
  const minIndent = Math.min(...keyLines.map((k) => k[1].length));
  const keys = new Set(keyLines.filter((k) => k[1].length === minIndent).map((k) => k[2]));
  return { op, keys, hasSpread };
};

describe("client queries match the migration schema", () => {
  it("parses a plausible schema from the migrations", () => {
    expect(schema.size).toBeGreaterThan(40);
    expect(schema.get("college_applications")?.columns.has("applicant_id")).toBe(true);
    expect(schema.get("notifications")?.required.has("recipient_id")).toBe(true);
  });

  it("references no column absent from its table", () => {
    const offenders: string[] = [];

    for (const { file, line, table, chain } of usages) {
      const cols = schema.get(table)!.columns;

      for (const sm of chain.matchAll(/\.select\(\s*"([^"]*)"/g)) {
        // Strip embedded resources, e.g. institutes(name).
        const spec = sm[1].includes("(") ? sm[1].replace(/[a-z_]+\([^)]*\)/g, "") : sm[1];
        for (const raw of spec.split(",")) {
          const name = raw.trim();
          if (!name || name === "*" || name.includes(":")) continue;
          if (/^[a-z_]+$/.test(name) && !cols.has(name)) {
            offenders.push(`${file}:${line} ${table}.${name} (select)`);
          }
        }
      }

      const filterRe = /\.(?:eq|neq|is|gt|gte|lt|lte|ilike|like|order|in)\(\s*"([a-z_]+)"/g;
      for (const fm of chain.matchAll(filterRe)) {
        if (!cols.has(fm[1])) offenders.push(`${file}:${line} ${table}.${fm[1]} (filter)`);
      }

      const payload = writePayload(chain);
      if (payload) {
        for (const key of payload.keys) {
          if (!cols.has(key)) offenders.push(`${file}:${line} ${table}.${key} (${payload.op})`);
        }
      }
    }

    expect([...new Set(offenders)]).toEqual([]);
  });

  it("supplies every NOT NULL column that has no default", () => {
    const offenders: string[] = [];

    for (const { file, line, table, chain } of usages) {
      const payload = writePayload(chain);
      if (!payload || payload.op === "update" || payload.hasSpread) continue;
      if (payload.keys.size === 0) continue;

      const missing = [...schema.get(table)!.required].filter((c) => !payload.keys.has(c));
      if (missing.length > 0) {
        offenders.push(`${file}:${line} ${table}.${payload.op} missing ${missing.sort().join(", ")}`);
      }
    }

    expect([...new Set(offenders)]).toEqual([]);
  });
});

describe("client writes never discard the result", () => {
  it("captures error from every write statement", () => {
    const offenders: string[] = [];
    const discarded = /^\s*(?:void\s+)?await\s+\(?(?:supabase|db)\b/;

    for (const file of clientSources) {
      const lines = readFileSync(file, "utf8").split("\n");
      lines.forEach((line, i) => {
        if (!discarded.test(line)) return;
        // auth/storage/rpc helpers have their own result shapes.
        const chain = lines.slice(i, i + 6).join("\n");
        if (/\bauth\.|\bstorage\.|\.rpc\(/.test(chain)) return;
        if (!/\.from\("/.test(chain)) return;
        offenders.push(`${relative(ROOT, file)}:${i + 1}`);
      });
    }

    expect(offenders).toEqual([]);
  });
});
