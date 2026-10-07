import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const hook = readFileSync(resolve(process.cwd(), "src/hooks/useSiteCMS.ts"), "utf8");
const homepage = readFileSync(resolve(process.cwd(), "src/screens/Index.tsx"), "utf8");
const serverPage = readFileSync(resolve(process.cwd(), "app/[[...slug]]/page.tsx"), "utf8");
const clientApp = readFileSync(resolve(process.cwd(), "app/client-app.tsx"), "utf8");
const migration = readFileSync(
  resolve(process.cwd(), "supabase/migrations/20260910120000_expose_public_component_visibility.sql"),
  "utf8",
);
const seedMigration = readFileSync(
  resolve(process.cwd(), "supabase/migrations/20260910121000_seed_homepage_component_controls.sql"),
  "utf8",
);

describe("public CMS component visibility contract", () => {
  it("reads the narrow public visibility registry instead of inferring hidden rows are absent", () => {
    expect(hook).toContain('rpc("get_public_page_section_visibility"');
    expect(hook).toContain("const isSectionVisible");
    expect(hook).toContain("const hasSectionConfiguration");
  });

  it("provides the authoritative visibility snapshot before the public homepage renders", () => {
    expect(serverPage).toContain("getHomeCmsSnapshot");
    expect(serverPage).toContain('rpc("get_public_page_section_visibility"');
    expect(serverPage).toContain("initialCmsSnapshot={homeCmsSnapshot}");
    expect(clientApp).toContain("initialCmsSnapshot={initialCmsSnapshot}");
    expect(homepage).toContain('useSiteCMS("home", initialCmsSnapshot)');
    expect(hook).toContain("if (serverSnapshot)");
    expect(hook).toContain("cmsCache.set(page");
    expect(homepage).not.toContain("animate-pulse");
  });

  it("keeps editable hidden content private while exposing only component state", () => {
    expect(migration).toContain("SECURITY DEFINER");
    expect(migration).toContain("section.section_key");
    expect(migration).toContain("section.display_order");
    expect(migration).toContain("section.is_visible");
    expect(migration).not.toContain("section.body");
    expect(migration).not.toContain("section.title");
  });

  it("puts every controllable homepage component behind a visibility check", () => {
    for (const key of [
      "hero_banner",
      "featured_content",
      "advertisements",
      "trust_strip",
      "competitions_section",
      "internships_section",
      "jobs_section",
      "about_us",
      "testimonials",
      "faq",
      "contact_form",
      "cta",
    ]) {
      expect(homepage).toContain(`key: \"${key}\"`);
    }
    expect(homepage).toContain("isConfiguredSectionVisible");
  });

  it("gives existing Super Admin installations controls for every homepage component", () => {
    for (const key of ["hero_banner", "featured_content", "advertisements", "contact_form", "cta"]) {
      expect(seedMigration).toContain(`'${key}'`);
    }
    expect(seedMigration).toContain("ON CONFLICT (page, section_key) DO NOTHING");
  });
});
