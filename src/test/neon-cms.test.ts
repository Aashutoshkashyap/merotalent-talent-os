import { describe, expect, it, vi } from "vitest";
import type { NeonActor } from "@/lib/server/neon-authorization";
import { parseCmsPage, parseSection, parseSiteSettings, readAdminCms, readPublicCms,
  saveAdminSection } from "@/lib/server/neon-cms";

const admin: NeonActor = { userId: "10000000-0000-4000-8000-000000000001",
  neonAuthUserId: "20000000-0000-4000-8000-000000000002", roles: ["super_admin"],
  permissions: [], platformAdmin: true };
const ordinary: NeonActor = { ...admin, roles: [], platformAdmin: false };
const section = { page: "home", section_key: "hero", title: "Hero", display_order: 1, is_visible: true };

describe("Neon CMS policy", () => {
  it("rejects arbitrary pages, unsafe URLs, nesting IDs and unapproved setting keys", () => {
    expect(() => parseCmsPage("../../secrets")).toThrow();
    expect(() => parseSection({ ...section, cta_url: "javascript:alert(1)" })).toThrow();
    expect(() => parseSection({ ...section, parent_id: "not-a-uuid" })).toThrow();
    expect(() => parseSiteSettings({ api_key: "secret" })).toThrow();
    expect(() => parseSiteSettings({ facebook_url: "javascript:alert(1)" })).toThrow();
    expect(parseSection({ ...section, cta_url: "/institutes" }).ctaUrl).toBe("/institutes");
  });

  it("denies non-admin CMS inspection and changes before querying", async () => {
    const query = vi.fn(); const run = vi.fn();
    await expect(readAdminCms(ordinary, query)).rejects.toMatchObject({ code: "ADMIN_REQUIRED" });
    await expect(saveAdminSection(ordinary, section, undefined, run))
      .rejects.toMatchObject({ code: "ADMIN_REQUIRED" });
    expect(query).not.toHaveBeenCalled();
    expect(run).not.toHaveBeenCalled();
  });

  it("returns only visible sections while exposing top-level visibility state", async () => {
    const query = vi.fn()
      .mockResolvedValueOnce([{ id: "visible", page: "home", section_key: "hero", is_visible: true }])
      .mockResolvedValueOnce([{ section_key: "hero", display_order: 1, is_visible: true },
        { section_key: "hidden", display_order: 2, is_visible: false },
        { section_key: "contact_form_email", parent_id: "contact", display_order: 1, is_visible: false }])
      .mockResolvedValueOnce([{ key: "site_title", value: "MeroTalent" }]);
    const result = await readPublicCms("home", query);
    expect(result.sections.map(row => row.id)).toEqual(["visible"]);
    expect(result.sectionVisibility.hidden.is_visible).toBe(false);
    expect(result.sectionVisibility.contact_form_email).toMatchObject({ parent_id: "contact", is_visible: false });
    expect(query.mock.calls[1][0]).not.toContain("AND parent_id IS NULL");
    expect(query.mock.calls[1][0]).not.toContain("body");
    expect(result.settings.site_title).toBe("MeroTalent");
    expect(query.mock.calls[0][0]).toContain("parent.is_visible=true");
  });

  it("requires the parent section to belong to the same page inside the write transaction", async () => {
    const client = { query: vi.fn()
      .mockResolvedValueOnce({ rows: [{ user_id: admin.userId }], rowCount: 1 })
      .mockResolvedValueOnce({ rows: [{ id: "parent", page: "faq" }], rowCount: 1 }) };
    const run = vi.fn(async callback => callback(client));
    await expect(saveAdminSection(admin, { ...section,
      parent_id: "30000000-0000-4000-8000-000000000003" }, undefined, run))
      .rejects.toMatchObject({ code: "INVALID_CMS_PARENT" });
    expect(client.query).toHaveBeenCalledTimes(2);
  });
});
