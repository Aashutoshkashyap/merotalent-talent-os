import { PDFDocument } from "pdf-lib";
import { unzipSync } from "fflate";
import { validateManagedMediaBytes } from "./neon-managed-media";
import { NeonAuthorizationError } from "./neon-authorization";

// Keep multipart overhead below Vercel's 4.5 MB function request-body limit.
export const EVENT_ACTIVITY_MAX_FILE_BYTES = 4 * 1024 * 1024;
const office: Record<string, { mime: string; entry: string }> = {
  docx: { mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", entry: "word/document.xml" },
  xlsx: { mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", entry: "xl/workbook.xml" },
  pptx: { mime: "application/vnd.openxmlformats-officedocument.presentationml.presentation", entry: "ppt/presentation.xml" },
};
function invalid(): never { throw new NeonAuthorizationError(400, "INVALID_ACTIVITY_FILE", "Choose a valid PDF, PNG, JPEG, WebP, DOCX, XLSX, PPTX or safe ZIP, up to 4 MB."); }
export async function validateEventActivityFile(bytes: Uint8Array, name: string, imageOnly = false) {
  if (!bytes.length || bytes.length > EVENT_ACTIVITY_MAX_FILE_BYTES || !/^[^/\\\u0000-\u001f]{1,180}$/.test(name)) invalid();
  const extension = name.split(".").pop()?.toLowerCase() ?? "";
  const image = ({ png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", webp: "image/webp" } as Record<string, string>)[extension];
  if (image) { await validateManagedMediaBytes(bytes, image); return image; }
  if (imageOnly) invalid();
  if (extension === "pdf") {
    if (Buffer.from(bytes.subarray(0, 5)).toString() !== "%PDF-") invalid();
    try { const pdf = await PDFDocument.load(bytes, { updateMetadata: false }); if (!pdf.getPageCount() || pdf.getPageCount() > 500) invalid(); }
    catch { invalid(); }
    return "application/pdf";
  }
  if (extension === "zip" || office[extension]) {
    if (bytes[0] !== 0x50 || bytes[1] !== 0x4b || bytes[2] !== 3 || bytes[3] !== 4) invalid();
    let count = 0, expanded = 0; const names = new Set<string>();
    try {
      // Inspect the central directory before extracting. Never inflate unbounded archives.
      unzipSync(bytes, { filter: entry => {
        count++; expanded += entry.originalSize;
        const parts = entry.name.replaceAll("\\", "/").split("/");
        if (count > 2000 || names.has(entry.name) || expanded > 50 * 1024 * 1024 ||
          entry.originalSize > 20 * 1024 * 1024 || entry.originalSize > Math.max(1024 * 1024, entry.size * 100) ||
          entry.name.startsWith("/") || /^[A-Za-z]:/.test(entry.name) || parts.includes("..") || /[\u0000-\u001f]/.test(entry.name) ||
          /\.(exe|dll|com|bat|cmd|ps1|sh|js|mjs|html?|svg|vbs|jar|msi|scr)$/i.test(entry.name) ||
          /vbaProject\.bin$/i.test(entry.name) || ![0, 8].includes(entry.compression)) invalid();
        names.add(entry.name); return false;
      } });
      if (!count || (office[extension] && (!names.has("[Content_Types].xml") || !names.has(office[extension].entry)))) invalid();
    } catch { invalid(); }
    return office[extension]?.mime ?? "application/zip";
  }
  return invalid();
}

/** Bound multipart bytes even when Content-Length is absent or forged. */
export async function readEventActivityUpload(request: Request) {
  if (!request.headers.get("content-type")?.startsWith("multipart/form-data;")) invalid();
  const limit = EVENT_ACTIVITY_MAX_FILE_BYTES + 65536, reader = request.body?.getReader();
  if (!reader || Number(request.headers.get("content-length") ?? 0) > limit) invalid();
  const chunks: Uint8Array[] = []; let size = 0;
  try {
    while (true) {
      const chunk = await reader.read(); if (chunk.done) break;
      size += chunk.value.byteLength;
      if (size > limit) { await reader.cancel(); invalid(); }
      chunks.push(chunk.value);
    }
    const form = await new Response(Buffer.concat(chunks), { headers: { "content-type": request.headers.get("content-type")! } }).formData();
    const file = form.get("file");
    if (!(file instanceof File) || file.size > EVENT_ACTIVITY_MAX_FILE_BYTES || form.getAll("file").length !== 1) invalid();
    return { file, activityId: form.get("activityId"), purpose: form.get("purpose") };
  } finally { reader.releaseLock(); }
}
