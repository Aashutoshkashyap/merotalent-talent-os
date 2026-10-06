import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { getAdminResource } from "./admin-resources";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("college publication and discovery", () => {
  it("returns the college relation with private admin applications", () => {
    expect(getAdminResource("college-applications").select).toContain("institutes(name)");
    const screen = read("src/screens/admin/AdminApplications.tsx");
    expect(screen).toContain("collegeName(app)");
    expect(screen).toContain("Application details");
  });

  it("does not promote pending featured colleges to public visibility", () => {
    const admin = read("src/screens/admin/AdminInstitutions.tsx");
    const featured = read("src/screens/admin/AdminFeaturedItems.tsx");
    const directory = read("supabase/migrations/20260925100000_internalize_college_directory_provenance.sql");
    expect(admin).toContain("Featured · awaiting approval");
    expect(admin).toContain("Publish to directory");
    expect(featured).toContain('from("institute_directory")');
    expect(directory).toContain("i.status = 'approved'");
  });

  it("uses numbered placement after editorial ordering and includes featured colleges in the student dashboard", () => {
    const directory = read("src/lib/institutes/public-institutes.ts");
    expect(directory).toContain('.order("is_featured"');
    expect(directory).toContain('placeInstitutes(');
    expect(directory).toContain('.eq("admission_status", "open")');
    expect(read("src/screens/Index.tsx")).toContain('sort: "recommended", limit: 6');
    expect(read("src/screens/dashboard/Dashboard.tsx")).toContain('<FeaturedSection title="Featured opportunities" />');
    expect(read("src/screens/dashboard/Colleges.tsx")).toContain("college.is_featured");
  });
});

describe("footer content", () => {
  it("does not render fabricated address, social accounts, or dead footer routes", () => {
    const footer = read("src/components/landing/Footer.tsx");
    expect(footer).not.toContain("123 Technology Park");
    expect(footer).not.toContain('href="https://facebook.com"');
    expect(footer).not.toContain('to="/sitemap"');
    expect(footer).toContain("settings.contact_address");
  });
});
