import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const publicClient = readFileSync(resolve(process.cwd(), "src/lib/institutes/public-institutes.ts"), "utf8");
const directoryRoute = readFileSync(resolve(process.cwd(), "app/api/v1/institutes/directory/route.ts"), "utf8");
const detailPage = readFileSync(resolve(process.cwd(), "src/screens/institutes/InstituteDetailPage.tsx"), "utf8");
const migration = readFileSync(resolve(process.cwd(), "supabase/migrations/20260925100000_internalize_college_directory_provenance.sql"), "utf8");

describe("public college source policy", () => {
  it("uses an explicit MeroTalent directory projection with no external-source field", () => {
    expect(directoryRoute).toContain("const columns = [");
    expect(directoryRoute).not.toContain('"source_url"');
    expect(publicClient).not.toContain("edusanjal.com");
    expect(directoryRoute).toContain("FROM public.institute_directory d");
    expect(publicClient).toContain("/api/v1/institutes/directory?");
    expect(publicClient).not.toContain('from("institute_directory")');
  });

  it("does not render third-party directory links but retains a safe official website", () => {
    expect(detailPage).not.toContain("Directory source");
    expect(detailPage).not.toContain("sourceUrl");
    expect(detailPage).toContain("Official website");
    expect(detailPage).toContain("safeExternalUrl(institute?.website)");
  });

  it("keeps provenance protected and removes legacy source URLs from the public view", () => {
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS public.institute_ingestion_provenance");
    expect(migration).toContain("UPDATE public.institutes\nSET source_url = NULL");
    expect(migration).toContain("not expose the legacy source_url");
    const view = migration
      .slice(migration.indexOf("CREATE OR REPLACE VIEW public.institute_directory"))
      .slice(0, migration.slice(migration.indexOf("CREATE OR REPLACE VIEW public.institute_directory")).indexOf("REVOKE ALL ON public.institute_ingestion_provenance"));
    expect(view).not.toContain("i.source_url");
    expect(view).toContain("NULL::text AS source_url");
    expect(view).not.toContain("institute_ingestion_provenance");
  });
});
