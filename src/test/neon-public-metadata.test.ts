import { beforeEach, describe, expect, it, vi } from "vitest";

const { queryRows } = vi.hoisted(() => ({ queryRows: vi.fn() }));
vi.mock("@/lib/server/db", () => ({ queryRows }));
import { readNeonPublicRecord } from "@/lib/server/neon-public-metadata";

const id = "11111111-1111-4111-8111-111111111111";

describe("Neon public detail metadata", () => {
  beforeEach(() => queryRows.mockReset());

  it("does not query unknown or malformed detail routes", async () => {
    expect(await readNeonPublicRecord(["jobs", "bad-id"])).toBeNull();
    expect(await readNeonPublicRecord(["private", id])).toBeNull();
    expect(queryRows).not.toHaveBeenCalled();
  });

  it("uses approved college record fields and canonical media URLs", async () => {
    queryRows.mockResolvedValueOnce([{ id, slug: "sample-college", name: "Sample College", description: "Description", logo_url: "institutes/logo.png", cover_image_url: null, location: "Kathmandu", website: "javascript:alert(1)" }]);
    const record = await readNeonPublicRecord(["institutes", "sample-college"]);
    expect(record?.path).toBe("/institutes/sample-college");
    expect(record?.image).toContain("/api/v1/institutes/media?path=");
    expect(record?.jsonLd).not.toHaveProperty("sameAs");
    expect(queryRows.mock.calls[0][0]).toContain("status = 'approved'");
  });

  it("does not emit private job fields or invent a hiring organization", async () => {
    queryRows.mockResolvedValueOnce([{ id, title: "Engineer", description: "Build things", location: null,
      job_type: null, created_at: new Date("2026-10-01"), expires_at: null, application_deadline: null,
      company_name: null, company_logo_url: null }]);
    const record = await readNeonPublicRecord(["jobs", id]);
    expect(record?.jsonLd).not.toHaveProperty("hiringOrganization");
    expect(record?.jsonLd).not.toHaveProperty("jobLocation");
    expect(record?.jsonLd).toHaveProperty("datePosted");
    expect(queryRows.mock.calls[0][0]).toContain("j.approval_status = 'approved'");
  });

  it("excludes missing and unpublished records", async () => {
    queryRows.mockResolvedValueOnce([]);
    expect(await readNeonPublicRecord(["events", id])).toBeNull();
    expect(queryRows.mock.calls[0][0]).toContain("approval_status = 'approved'");
    expect(queryRows.mock.calls[0][0]).toContain("end_date >= now()");
  });
});
