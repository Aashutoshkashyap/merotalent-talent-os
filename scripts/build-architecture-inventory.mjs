/** Deterministic tracked-file inventory. Emits paths/counts only, never matched secret values. */
import { execFileSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";

export function classifyLegacyPath(file) {
  if (file.startsWith("scripts/sql/"))
    return { disposition: "HISTORICAL/RECOVERY", owner: "Migration operator", retirement: "Reviewed isolated staging forward SQL; preserve provenance and target guards." };
  if ([".github/workflows/ci.yml", "scripts/check-schema-drift.mjs", "scripts/ingest-edusanjal-bulk.mjs",
    "scripts/seed-esewa-test-credentials.mjs", "scripts/seed-test-users.mjs"].includes(file))
    return { disposition: "MIGRATION REQUIRED", owner: "Platform / College ingestion", retirement: "Legacy operator or CI path; verify a Neon counterpart and scope before removal or execution." };
  if ([".env.example", "README.md", "next.config.ts", "tsconfig.json", "scripts/build-architecture-inventory.mjs",
    "scripts/inventory-supabase-runtime.mjs", "scripts/verify-neon-production-storage.mjs"].includes(file))
    return { disposition: "ACTIVE", owner: "Platform configuration / inventory", retirement: "Retain documented boundaries, recovery sources and build contracts; not evidence of fallback traffic." };
  if (file.startsWith("scripts/") && /schema|audit|classify|diagnose|preflight|candidate-preview|readonly/.test(file))
    return { disposition: "HISTORICAL/RECOVERY", owner: "Migration operator", retirement: "Reviewed staging/source diagnostic or restoration asset; preserve and obey target guards." };
  if (file.startsWith("supabase/") || /migrat|reconcil|snapshot|backup|rollback|restore|source-|identity-|staging-.*uat/.test(file) && file.startsWith("scripts/"))
    return { disposition: "HISTORICAL/RECOVERY", owner: "Migration operator", retirement: "Retain for recovery and reproducibility; never bulk-delete." };
  if (file.startsWith("docs/") && !file.startsWith("docs/architecture/"))
    return { disposition: "HISTORICAL/RECOVERY", owner: "Migration operator", retirement: "Historical evidence, not authority to replay old production SQL." };
  if (/\.(test|spec)\.[cm]?[jt]sx?$/.test(file) || file.startsWith("src/test/"))
    return { disposition: "ACTIVE", owner: "Regression suite", retirement: "Retain security, denial and compatibility contracts until corresponding workflows retire." };
  if (file === "src/integrations/supabase/types.ts")
    return { disposition: "ACTIVE", owner: "Schema contracts", retirement: "Replace structural types only after schema parity; imports do not imply network traffic." };
  if (file === "src/lib/auth/legacy-recovery.ts")
    return { disposition: "ACTIVE", owner: "Identity recovery", retirement: "Remove only after proof-based historical-account recovery is completed or explicitly dispositioned." };
  if (file === "src/integrations/supabase/client.ts" || file === "src/lib/server/supabase.ts")
    return { disposition: "ACTIVE", owner: "Backend boundary", retirement: "Fail closed in Neon; legacy-only factories retained pending compatibility retirement." };
  if (file.startsWith("app/") || file.startsWith("src/"))
    return { disposition: "MIGRATION REQUIRED", owner: "Domain runtime", retirement: "Trace each caller and prove deployed Neon behavior before deleting its legacy branch; no fallback is authorized." };
  if (file === "package.json" || file === "package-lock.json")
    return { disposition: "ACTIVE", owner: "Dependency management", retirement: "SDK retained for explicit recovery/legacy code; package removal requires all consumers retired." };
  return { disposition: "UNKNOWN", owner: "Platform operator", retirement: "Inspect execution/configuration ownership before removal; a string match is not reachability proof." };
}

const tracked = execFileSync("git", ["ls-files", "--cached", "--others", "--exclude-standard", "-z"], { encoding: "utf8" }).split("\0");
const records = [];
for (const file of [...new Set(tracked)].filter(Boolean).sort()) {
  if (file.startsWith("docs/architecture/") || !/\.(?:[cm]?[jt]sx?|json|md|sql|ya?ml|toml|example)$/.test(file)) continue;
  let contents;
  try { contents = await readFile(file, "utf8"); } catch (error) { if (error.code === "ENOENT") continue; throw error; }
  const count = contents.split("\n").filter(line => /supabase/i.test(line)).length;
  if (count) records.push({ file, referenceLines: count, ...classifyLegacyPath(file) });
}
const runtime = JSON.parse(execFileSync(process.execPath, ["scripts/inventory-supabase-runtime.mjs"], { encoding: "utf8" }));
const report = { method: "Tracked and nonignored text files; Supabase reference line counts plus AST runtime imports. Conservative dispositions are not runtime acceptance.",
  excluded: ["node_modules", ".git", "build artifacts", "ignored private credentials/artifacts", "this generated architecture directory"],
  summary: Object.fromEntries(["ACTIVE", "MIGRATION REQUIRED", "DEAD", "HISTORICAL/RECOVERY", "UNKNOWN"].map(key => [key, records.filter(row => row.disposition === key).length])),
  runtimeImportInventory: runtime, records };
if (process.argv.includes("--check")) {
  const existing = await readFile("docs/architecture/legacy-cleanup-inventory.json", "utf8");
  if (existing !== JSON.stringify(report, null, 2) + "\n") { console.error("Architecture inventory is stale. Run the documented generator."); process.exitCode = 1; }
} else {
  await mkdir("docs/architecture", { recursive: true });
  await writeFile("docs/architecture/legacy-cleanup-inventory.json", JSON.stringify(report, null, 2) + "\n");
  console.log(JSON.stringify({ summary: report.summary, runtimeImportFiles: runtime.files }));
}
