import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { tokenizeInstituteSearch } from "./directory-search";

const searchMigration = readFileSync(
  resolve(
    process.cwd(),
    "supabase/migrations/20260810112000_directory_search_document.sql",
  ),
  "utf8",
);

const originalDirectoryMigration = readFileSync(
  resolve(
    process.cwd(),
    "supabase/migrations/20260810110000_secure_college_directory_and_applications.sql",
  ),
  "utf8",
);

const directoryRoute = readFileSync(
  resolve(process.cwd(), "app/api/v1/institutes/directory/route.ts"),
  "utf8",
);

const selectProjection = (migration: string) =>
  migration
    .match(/CREATE(?: OR REPLACE)? VIEW public\.institute_directory[\s\S]*?\nSELECT\n([\s\S]*?)\nFROM public\.institutes i/)?.[1]
    .trim();

describe("education directory search", () => {
  it("normalizes and bounds search tokens for AND matching", () => {
    expect(tokenizeInstituteSearch("  BSc   Computer, Kathmandu!  ")).toEqual([
      "BSc",
      "Computer",
      "Kathmandu",
    ]);
    expect(
      tokenizeInstituteSearch("one two three four five six seven eight nine ten"),
    ).toHaveLength(8);
  });

  it("keeps the public view security and payment contracts while enriching search", () => {
    expect(searchMigration).toContain(
      "WITH (security_invoker = true, security_barrier = true)",
    );
    expect(searchMigration).toContain(
      "public.is_college_payment_verified(i.id) AS payment_verified",
    );
    expect(searchMigration).toContain("programs.program_names");
    expect(searchMigration).toContain("tags.search_tags");
    expect(searchMigration).toContain(") AS search_document");
    expect(searchMigration).toContain(
      "GRANT SELECT ON public.institute_directory TO anon, authenticated",
    );
  });

  it("preserves every existing public column in its original order", () => {
    const originalProjection = selectProjection(originalDirectoryMigration);
    const enrichedProjection = selectProjection(searchMigration)
      ?.split(/,\n  programs\.program_names/)[0]
      .replace(/,\s*$/, "");

    expect(originalProjection).toBeTruthy();
    expect(enrichedProjection).toBe(originalProjection);
  });

  it("applies every normalized search token as an AND filter", () => {
    expect(directoryRoute).toContain('const patterns = tokens.map((token) => `%${token.toLowerCase()}%`)');
    expect(directoryRoute).toContain("lower(d.search_document) LIKE ALL($1::text[])");
    expect(directoryRoute).not.toContain("name.ilike.${pattern}");
  });

  it.each([
    "i.name",
    "i.location",
    "i.affiliation",
    "i.level",
    "i.description",
    "programs.program_names",
    "i.salient_features",
    "i.scholarships",
    "i.admission_guidelines",
  ])("includes %s in the search document", (field) => {
    expect(searchMigration).toContain(field);
  });
});
