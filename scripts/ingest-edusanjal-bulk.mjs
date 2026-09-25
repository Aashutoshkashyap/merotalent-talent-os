#!/usr/bin/env node
/**
 * Controlled MeroTalent college-directory ingestion.
 *
 * This is deliberately an admin/development operation. Public pages never
 * import or request the source site. Remote collection is opt-in, checks
 * robots.txt, throttles requests, and requires a reviewer to explicitly
 * confirm they have permission to collect the particular records.
 *
 * Examples:
 *   node scripts/ingest-edusanjal-bulk.mjs --input ./approved-colleges.json
 *   node scripts/ingest-edusanjal-bulk.mjs --input ./approved-colleges.json --mode refresh-existing --write
 *   node scripts/ingest-edusanjal-bulk.mjs --source-url https://edusanjal.com/college/example/ --confirm-permission
 */
import { readFile } from "node:fs/promises";
import process from "node:process";
import { createClient } from "@supabase/supabase-js";
import {
  extractStructuredFactsFromHtml,
  isRobotsAllowed,
  normalizeSourceRecord,
} from "./lib/college-directory-ingestion.mjs";

const USER_AGENT = "MeroTalentDirectoryImporter/1.0 (+https://merotalent.com; contact=admin@merotalent.com)";
const MIN_REQUEST_DELAY_MS = 1000;

const usage = () => `
Usage:
  node scripts/ingest-edusanjal-bulk.mjs --input <approved.json> [--mode dry-run|refresh-existing|new-only|full-reconcile] [--write]
  node scripts/ingest-edusanjal-bulk.mjs --source-url <https://edusanjal.com/...> --confirm-permission [--write]

Without --write the importer is a dry run. --input accepts one object or an
array of reviewed factual records. Remote collection only reads structured
educational-organization data; it does not copy prose, images, logos, or media.
Use --with-database in dry-run mode to reconcile records against the live
directory without writing. full-reconcile also requires --confirm-reconciliation.
`;

const args = process.argv.slice(2).reduce((result, token, index, values) => {
  if (!token.startsWith("--")) return result;
  const [key, inlineValue] = token.slice(2).split("=", 2);
  result[key] = inlineValue ?? (!values[index + 1]?.startsWith("--") ? values[index + 1] : true);
  return result;
}, {});

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const fetchText = async (url) => {
  const response = await fetch(url, {
    headers: { "User-Agent": USER_AGENT, Accept: "text/html,application/xhtml+xml,text/plain;q=0.9" },
    redirect: "follow",
  });
  if (!response.ok) throw new Error(`Source request failed with HTTP ${response.status}.`);
  return response.text();
};

const loadApprovedRecords = async (inputPath) => {
  const source = JSON.parse(await readFile(inputPath, "utf8"));
  return Array.isArray(source) ? source : [source];
};

const collectOneRemoteRecord = async (sourceUrl) => {
  const parsed = new URL(sourceUrl);
  if (!/(^|\.)edusanjal\.com$/i.test(parsed.hostname) || parsed.protocol !== "https:") {
    throw new Error("Remote source URL must be an HTTPS edusanjal.com URL.");
  }
  const robotsUrl = `${parsed.origin}/robots.txt`;
  const robots = await fetchText(robotsUrl);
  if (!isRobotsAllowed(robots, sourceUrl, USER_AGENT)) {
    throw new Error(`robots.txt does not permit collection of ${parsed.pathname}.`);
  }
  await sleep(MIN_REQUEST_DELAY_MS);
  return extractStructuredFactsFromHtml(await fetchText(sourceUrl), sourceUrl);
};

const getAdminClient = () => {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secret = process.env.SUPABASE_SECRET_KEY;
  if (!url || !secret) {
    throw new Error("--write requires SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) and SUPABASE_SECRET_KEY.");
  }
  return createClient(url, secret, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { "X-Client-Info": "merotalent-directory-ingestion" } },
  });
};

async function main() {
  if (args.help || (!args.input && !args["source-url"])) {
    console.log(usage());
    return;
  }
  if (args.input && args["source-url"]) throw new Error("Use either --input or --source-url, not both.");
  if (args["source-url"] && args["confirm-permission"] !== true) {
    throw new Error("Remote collection requires --confirm-permission after reviewing source terms and permissions.");
  }
  const mode = String(args.mode ?? "dry-run");
  if (!new Set(["dry-run", "refresh-existing", "new-only", "full-reconcile"]).has(mode)) {
    throw new Error("--mode must be dry-run, refresh-existing, new-only, or full-reconcile.");
  }
  if (args.write === true && mode === "dry-run") {
    throw new Error("--write requires an explicit non-dry-run --mode.");
  }
  if (mode === "full-reconcile" && args["confirm-reconciliation"] !== true) {
    throw new Error("full-reconcile requires --confirm-reconciliation as an additional production safeguard.");
  }

  const rawRecords = args.input
    ? await loadApprovedRecords(String(args.input))
    : [await collectOneRemoteRecord(String(args["source-url"]))];
  const records = rawRecords.map((record) => normalizeSourceRecord(record, {
    sourceName: "Edusanjal",
    sourceUrl: record.source_url ?? record.sourceUrl ?? args["source-url"],
    allowReviewedFacts: args["reviewed-facts"] === true,
  }));
  const counts = { matched: 0, new: 0, needsReview: 0, added: 0, updated: 0, unchanged: 0, skipped: 0, validationFailures: 0 };
  const client = args.write === true || args["with-database"] === true ? getAdminClient() : null;

  for (const record of records) {
    try {
      if (!client) {
        counts.skipped += 1;
        console.log(JSON.stringify({ outcome: "dry-run-no-database", slug: record.slug, name: record.name }));
        continue;
      }
      const { data: resolution, error: resolutionError } = await client.rpc("resolve_institute_source_match", { p_record: record });
      if (resolutionError) throw resolutionError;
      const status = resolution?.status;
      if (status === "matched") counts.matched += 1;
      else if (status === "new") counts.new += 1;
      else counts.needsReview += 1;

      if (mode === "dry-run") {
        console.log(JSON.stringify({ outcome: `would_${status}`, matchReason: resolution?.reason, instituteId: resolution?.institute_id ?? null, candidateIds: resolution?.candidate_ids ?? [], slug: record.slug }));
        continue;
      }
      const shouldApply = status === "needs_review"
        || (status === "matched" && (mode === "refresh-existing" || mode === "full-reconcile"))
        || (status === "new" && (mode === "new-only" || mode === "full-reconcile"));
      if (!shouldApply) {
        counts.skipped += 1;
        console.log(JSON.stringify({ outcome: "skipped_by_mode", mode, matchStatus: status, slug: record.slug }));
        continue;
      }
      const { data, error } = await client.rpc("ingest_institute_source_record", { p_record: record });
      if (error) throw error;
      const outcome = data?.outcome;
      if (outcome === "added") counts.added += 1;
      else if (outcome === "updated") counts.updated += 1;
      else counts.unchanged += 1;
      console.log(JSON.stringify({ outcome, matchReason: data?.match_reason ?? resolution?.reason, instituteId: data?.institute_id, slug: record.slug, changedFields: data?.changed_fields ?? [], protectedFields: data?.protected_fields ?? [], candidateIds: data?.candidate_ids ?? [] }));
    } catch (error) {
      counts.validationFailures += 1;
      console.error(JSON.stringify({ outcome: "validation-failure", slug: record.slug, message: error instanceof Error ? error.message : String(error) }));
    }
  }
  console.log(JSON.stringify({ summary: counts }));
  if (counts.validationFailures) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
