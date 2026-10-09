import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("public discovery contract", () => {
  it("keeps anonymous mentor visibility limited to approved available mentors with active public profiles", () => {
    const migration = read("supabase/migrations/20261005100000_restore_public_module_discovery.sql");
    expect(migration).toContain("approval_status = 'approved'");
    expect(migration).toContain("is_available = true");
    expect(migration).toContain("deleted_at IS NULL");
    expect(migration).toContain("FROM public.public_profile_directory profile");
    expect(migration).not.toContain("FROM public.profiles p");
    expect(migration).toContain("FOR SELECT TO anon\nUSING (status IN ('upcoming', 'ongoing'))");
  });

  it("surfaces only public module records and hides empty homepage sections", () => {
    const home = read("src/screens/Index.tsx");
    expect(home).toContain("fetchPublicInstitutes({");
    expect(home).toContain('.eq("approval_status", "approved")');
    expect(home).toContain('.eq("status", "published")');
    expect(home).toContain(".filter(isLivePartnerCourse)");
    expect(home).toContain('colleges.length > 0 && isConfiguredSectionVisible("colleges_section")');
    expect(home).toContain('collegeUpdates.length > 0 && isConfiguredSectionVisible("college_updates_section")');
    expect(home).toContain('mentorResult.error');
    const editor = read("src/screens/admin/AdminPageEditor.tsx");
    for (const key of ["colleges_section", "mentors_section", "events_section", "courses_section", "college_updates_section"]) {
      expect(editor).toContain(`section_key: "${key}"`);
    }
    const sectionMigration = read("supabase/migrations/20261005110000_register_home_discovery_sections.sql");
    expect(sectionMigration).toContain("ON CONFLICT (page, section_key) DO NOTHING");
    const featured = read("src/components/landing/FeaturedSection.tsx");
    const featuredRoute = read("app/api/v1/featured/route.ts");
    expect(featuredRoute).toContain('is_featured = true');
    expect(featured).toContain('if (cards.length === 0) return null;');
    expect(featured).toContain('fetch("/api/v1/featured")');
    const hero = read("src/components/landing/HeroCategorySection.tsx");
    expect(hero).toMatch(/title: "Events",[\s\S]*?path: "\/events"/);
    const detail = read("src/screens/institutes/InstituteDetailPage.tsx");
    expect(detail).toContain('id="updates"');
    expect(detail).toContain('.eq("status", "published")');
  });
});
