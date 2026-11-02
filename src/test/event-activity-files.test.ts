import { describe, expect, it } from "vitest";
import { zipSync, strToU8 } from "fflate";
import { PDFDocument } from "pdf-lib";
import { validateEventActivityFile, readEventActivityUpload } from "@/lib/server/event-activity-files";
import { registrationWindowOpen } from "@/lib/events/registration-window";
describe("Event private file validation", () => {
  it("accepts actual PDF bytes but rejects an extension/signature-only forgery", async () => {
    const doc = await PDFDocument.create(); doc.addPage();
    expect(await validateEventActivityFile(await doc.save(), "submission.pdf")).toBe("application/pdf");
    await expect(validateEventActivityFile(strToU8("%PDF-not a document"), "forgery.pdf")).rejects.toMatchObject({ code: "INVALID_ACTIVITY_FILE" });
    await expect(validateEventActivityFile(strToU8("text"), "../submission.pdf")).rejects.toThrow();
  });
  it("accepts bounded private archives and rejects traversal, scripts and compression bombs", async () => {
    expect(await validateEventActivityFile(zipSync({ "notes.txt": strToU8("safe assignment") }), "submission.zip")).toBe("application/zip");
    for (const archive of [zipSync({ "../outside.txt": strToU8("x") }), zipSync({ "run.js": strToU8("alert(1)") }), zipSync({ "bomb.txt": new Uint8Array(2 * 1024 * 1024) })])
      await expect(validateEventActivityFile(archive, "submission.zip")).rejects.toThrow();
  });
  it("requires the Office package structure and refuses macro archives", async () => {
    await expect(validateEventActivityFile(zipSync({ "wrong.txt": strToU8("x") }), "submission.docx")).rejects.toThrow();
    const document = { "[Content_Types].xml": strToU8("<Types/>"), "word/document.xml": strToU8("<w:document/>") };
    expect(await validateEventActivityFile(zipSync(document), "submission.docx")).toContain("wordprocessingml");
    await expect(validateEventActivityFile(zipSync({ ...document, "word/vbaProject.bin": strToU8("macro") }), "submission.docx")).rejects.toThrow();
  });
  it("keeps images separate from document uploads and bounds empty/oversized files", async () => {
    await expect(validateEventActivityFile(strToU8("not an image"), "image.png", true)).rejects.toThrow();
    await expect(validateEventActivityFile(new Uint8Array(), "empty.pdf")).rejects.toThrow();
    await expect(validateEventActivityFile(new Uint8Array(4 * 1024 * 1024 + 1), "oversized.pdf")).rejects.toThrow();
    await expect(readEventActivityUpload(new Request("https://www.merotalent.com/upload", { method: "POST", headers: { "content-type": "text/plain" }, body: "x" }))).rejects.toThrow();
  });
});
describe("independent registration and ticket windows", () => {
  const now = Date.now(), past = new Date(now - 1000), future = new Date(now + 1000);
  it("permits an explicit sale window after the physical event begins", () => {
    expect(registrationWindowOpen({ start_date: past }, { sales_start_at: past, sales_end_at: future }, now)).toBe(true);
    expect(registrationWindowOpen({ start_date: past }, undefined, now)).toBe(false);
  });
  it("enforces both event registration and ticket windows, including the exact close boundary", () => {
    expect(registrationWindowOpen({ start_date: future, registration_open_at: future }, undefined, now)).toBe(false);
    expect(registrationWindowOpen({ start_date: future, registration_close_at: past }, { sales_end_at: future }, now)).toBe(false);
    expect(registrationWindowOpen({ start_date: future }, { sales_end_at: new Date(now) }, now)).toBe(false);
  });
});
