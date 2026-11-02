import { describe, expect, it } from "vitest";
import { mkdir, writeFile } from "node:fs/promises";
import { PDFDocument } from "pdf-lib";
import { certificateTemplateSchema, defaultCertificateLayout } from "@/lib/events/certificate-contract";
import { renderEventCertificate } from "@/lib/server/event-certificate-pdf";
describe("Event certificate rules and rendering", () => {
  const template = { title: "Certificate of completion", kind: "completion", background_file_id: null, auto_issue: true, is_active: true,
    layout: defaultCertificateLayout, eligibility: { activity_ids: [], require_attendance: true, minimum_percent: 0 } };
  it("never permits purchase-only eligibility or an unassessed achievement", () => {
    expect(certificateTemplateSchema.safeParse(template).success).toBe(true);
    expect(certificateTemplateSchema.safeParse({ ...template, eligibility: { ...template.eligibility, require_attendance: false } }).success).toBe(false);
    expect(certificateTemplateSchema.safeParse({ ...template, kind: "achievement" }).success).toBe(false);
    expect(certificateTemplateSchema.safeParse({ ...template, layout: { ...defaultCertificateLayout, recipient: { x: 10000, y: 5, size: 1000 } } }).success).toBe(false);
  });
  it("creates a real Unicode PDF with a verifiable reference for visual QA", async () => {
    const bytes = await renderEventCertificate({ name: "Aashutosh Jha / आशुतोष झा", event: "MeroTalent Engineering Challenge",
      title: template.title, number: "MTCC-11111111-1111-4111-8111-111111111111", issuedAt: new Date("2026-11-01T00:00:00Z"), layout: defaultCertificateLayout,
      presentation: { organization_name: "MeroTalent Event Organizers", signatory_name: "Synthetic Signatory", signatory_designation: "Event Coordinator",
        body_text: "This certificate is awarded to", logo_file_id: null, signature_file_id: null }, score: 95.5 });
    const pdf = await PDFDocument.load(bytes);
    expect(pdf.getPageCount()).toBe(1); expect(pdf.getPage(0).getWidth()).toBe(842);
    expect(pdf.getAuthor()).toBe("MeroTalent"); expect(bytes.length).toBeGreaterThan(1000);
    await mkdir("tmp/pdfs", { recursive: true }); await writeFile("tmp/pdfs/event-certificate-layout-test.pdf", bytes);
  });
});
