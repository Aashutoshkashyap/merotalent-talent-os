#!/usr/bin/env node

/**
 * Fails when a change modifies or deletes a migration that already exists on
 * the base branch. Only brand-new migration files are allowed.
 *
 * Why this is a hard rule rather than a style preference: a migration that has
 * run is recorded in supabase_migrations.schema_migrations and never runs again,
 * so editing the file changes nothing in that database. Meanwhile a local
 * `supabase db reset` replays every migration from empty, so the edit looks
 * correct on the author's machine. `CREATE TABLE IF NOT EXISTS` widens the gap:
 * on a database that already has the table it is a no-op and reconciles no
 * columns, so a column added to that block reaches only fresh databases.
 *
 * page_sections.parent_id and extra_data were lost exactly this way and needed
 * migration 20260822130000 to reconcile them.
 *
 * To change an existing table, add a NEW migration with an explicit
 * ALTER TABLE ... ADD COLUMN IF NOT EXISTS.
 *
 * Usage:
 *   node scripts/check-migration-immutability.mjs [baseRef]
 *
 * baseRef defaults to origin/main, or GITHUB_BASE_REF when running on a pull
 * request. Requires full history — set fetch-depth: 0 in CI.
 */

import { execFileSync } from "node:child_process";

const DIR = "supabase/migrations/";

const git = (args) =>
  execFileSync("git", args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();

const resolveBase = () => {
  const explicit = process.argv[2];
  if (explicit) return explicit;
  if (process.env.GITHUB_BASE_REF) return `origin/${process.env.GITHUB_BASE_REF}`;
  return "origin/main";
};

const main = () => {
  const base = resolveBase();

  let mergeBase;
  try {
    mergeBase = git(["merge-base", base, "HEAD"]);
  } catch {
    console.log(`· Could not resolve ${base}; skipping migration immutability check.`);
    console.log("  In CI, check out with fetch-depth: 0 so history is available.");
    return;
  }

  if (mergeBase === git(["rev-parse", "HEAD"])) {
    console.log("✔ No commits ahead of the base branch; nothing to check.");
    return;
  }

  // Name-status against the merge base: A added, M modified, D deleted, R renamed.
  const raw = git(["diff", "--name-status", "--find-renames", `${mergeBase}..HEAD`, "--", DIR]);
  if (!raw) {
    console.log("✔ No migration changes in this branch.");
    return;
  }

  const violations = [];
  for (const line of raw.split("\n")) {
    const [status, ...paths] = line.split("\t");
    const file = paths[paths.length - 1];
    if (!file || !file.endsWith(".sql")) continue;

    const code = status[0];
    if (code === "A") continue; // a brand-new migration is the correct pattern
    const label =
      code === "M" ? "modified" : code === "D" ? "deleted" : code === "R" ? "renamed" : status;
    violations.push({ file, label });
  }

  if (violations.length === 0) {
    const added = raw.split("\n").filter((l) => l.startsWith("A")).length;
    console.log(`✔ ${added} new migration(s), none of the existing ones touched.`);
    return;
  }

  console.error("\n✖ An existing migration was changed.\n");
  for (const { file, label } of violations) {
    console.error(`  ${label.padEnd(9)} ${file}`);
  }
  console.error(
    "\n  A migration that has already run will never run again, so this edit will not",
  );
  console.error("  reach any database that already applied it — but a local `db reset` replays");
  console.error("  from empty, so it will look correct on your machine.");
  console.error("\n  Add a NEW migration with an explicit ALTER TABLE ... ADD COLUMN IF NOT EXISTS");
  console.error("  instead. See the README section on never editing an applied migration.\n");
  process.exitCode = 1;
};

main();
