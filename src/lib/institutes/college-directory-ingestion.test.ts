import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import {
  extractStructuredFactsFromHtml,
  isRobotsAllowed,
  mergeSourceRecord,
  normalizeSourceRecord,
  reconcileSourceRecord,
} from "../../../scripts/lib/college-directory-ingestion.mjs";

const fixture = JSON.parse(readFileSync(
  resolve(process.cwd(), "scripts/fixtures/approved-college-record.json"),
 "utf8",
));
const reconciliationMigration = readFileSync(
  resolve(process.cwd(), "supabase/migrations/20260925110000_college_directory_reconciliation.sql"),
  "utf8",
);
const importerScript = readFileSync(
  resolve(process.cwd(), "scripts/ingest-edusanjal-bulk.mjs"),
  "utf8",
);

describe("college directory ingestion", () => {
  it("maps approved factual source data into the existing institute contract", () => {
    const record = normalizeSourceRecord(fixture, { sourceName: "Edusanjal" });
    expect(record).toMatchObject({
      name: "Example Institute of Technology",
      slug: "example-institute-of-technology",
      institution_category: "college",
      website: "https://example.edu.np/",
      source_name: "Edusanjal",
      source_url: fixture.source_url,
      established_year: 2001,
    });
    expect(record.courses_offered).toEqual([
      { name: "BSc Computer Science" },
      { name: "Bachelor of Business Administration", level: "Bachelor" },
    ]);
    expect(record.description).toBeUndefined();
  });

  it("uses the source hash for an idempotent repeat and updates only permitted factual fields", () => {
    const first = normalizeSourceRecord(fixture, { sourceName: "Edusanjal" });
    const existing = {
      id: "college-a",
      ...first,
      directory_source_metadata: { source_hash: first.source_hash },
    };
    const repeated = mergeSourceRecord(existing, first);
    expect(repeated.changedFields).toEqual([]);

    const changed = normalizeSourceRecord({ ...fixture, affiliation: "Updated University" }, { sourceName: "Edusanjal" });
    const updated = mergeSourceRecord(existing, changed);
    expect(updated.record.affiliation).toBe("Updated University");
    expect(updated.record.slug).toBe(first.slug);
  });

  it("never overwrites a claimed profile or MeroTalent-managed field", () => {
    const incoming = normalizeSourceRecord({ ...fixture, location: "Different location", website: "https://different.example.edu.np" }, { sourceName: "Edusanjal" });
    const claimed = mergeSourceRecord({
      id: "college-a",
      owner_user_id: "admin-a",
      name: "Managed college name",
      location: "Managed location",
      website: "https://managed.example.edu.np",
      description: "MeroTalent-authored profile",
    }, incoming);
    expect(claimed.record.name).toBe("Managed college name");
    expect(claimed.record.location).toBe("Managed location");
    expect(claimed.record.website).toBe("https://managed.example.edu.np");
    expect(claimed.record.description).toBe("MeroTalent-authored profile");

    const marked = mergeSourceRecord({
      id: "college-b",
      name: incoming.name,
      slug: incoming.slug,
      location: "MeroTalent location",
      merotalent_managed_fields: ["location"],
    }, incoming);
    expect(marked.record.location).toBe("MeroTalent location");
  });

  it("reconciles against an existing directory before considering a new row", () => {
    const incoming = normalizeSourceRecord(fixture, { sourceName: "Edusanjal" });
    const existing = {
      id: "existing-patan",
      name: incoming.name,
      slug: "different-merotalent-slug",
      website: incoming.website,
      location: incoming.location,
      affiliation: incoming.affiliation,
    };
    const match = reconcileSourceRecord([existing], incoming);
    expect(match).toMatchObject({ status: "matched", reason: "official_website", record: existing });
  });

  it("flags an uncertain possible duplicate for review instead of inserting it", () => {
    const incoming = normalizeSourceRecord({ ...fixture, name: "Example Institute of Technology - Kathmandu" }, { sourceName: "Edusanjal" });
    const result = reconcileSourceRecord([{
      id: "possible-duplicate",
      name: "Example Institute of Technology",
      slug: "example-it",
      location: "Different location",
    }], incoming);
    expect(result.status).toBe("needs_review");
    expect(result.reason).toBe("name_similarity");
    expect(result.candidates.map((record) => record.id)).toEqual(["possible-duplicate"]);
  });

  it("classifies an unrelated record as new only after all exact and review signals fail", () => {
    const incoming = normalizeSourceRecord({ ...fixture, name: "Completely New Academic Institute", website: "https://new.example.edu.np" }, { sourceName: "Edusanjal" });
    expect(reconcileSourceRecord([{
      id: "existing",
      name: "Established College",
      slug: "established-college",
      website: "https://established.edu.np",
    }], incoming)).toMatchObject({ status: "new", reason: "no_existing_match" });
  });

  it("extracts only structured facts and rejects source-hosted official websites", () => {
    const html = `
      <script type="application/ld+json">{
        "@context":"https://schema.org", "@type":"CollegeOrUniversity",
        "name":"Structured College", "url":"https://structured.edu.np",
        "telephone":"+977-1-1234567", "email":"info@structured.edu.np",
        "address":{"addressLocality":"Lalitpur"}, "foundingDate":"1999",
        "hasCourse":[{"name":"BCA"}], "image":"https://edusanjal.com/protected.jpg"
      }</script>`;
    const record = extractStructuredFactsFromHtml(html, "https://edusanjal.com/college/structured-college/");
    expect(record).toMatchObject({ name: "Structured College", website: "https://structured.edu.np/", location: "Lalitpur" });
    expect(record).not.toHaveProperty("image");
    expect(normalizeSourceRecord({ ...fixture, website: "https://edusanjal.com/college/example/" }, { sourceName: "Edusanjal" }).website).toBeNull();
  });

  it("honors robots allow and disallow rules before a remote source request", () => {
    expect(isRobotsAllowed("User-agent: *\nAllow: /", "https://edusanjal.com/college/a/", "MeroTalentDirectoryImporter")).toBe(true);
    expect(isRobotsAllowed("User-agent: *\nDisallow: /college/private/", "https://edusanjal.com/college/private/a/", "MeroTalentDirectoryImporter")).toBe(false);
  });

  it("keeps ambiguous source records in an internal review queue and makes write modes explicit", () => {
    expect(reconciliationMigration).toContain("CREATE TABLE IF NOT EXISTS public.institute_ingestion_reviews");
    expect(reconciliationMigration).toContain("'needs_review'");
    expect(reconciliationMigration).toContain("'name_similarity'");
    expect(reconciliationMigration).toContain("'pending', false");
    expect(importerScript).toContain('"dry-run", "refresh-existing", "new-only", "full-reconcile"');
    expect(importerScript).toContain("--confirm-reconciliation");
    expect(importerScript).toContain("skipped_by_mode");
  });
});
