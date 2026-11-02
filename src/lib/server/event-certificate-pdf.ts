import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { PDFDocument, rgb, type PDFFont } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import QRCode from "qrcode";
import { certificatePresentationSchema, type CertificateTemplate } from "../events/certificate-contract";

let fontBytes: Promise<Buffer> | undefined;
export async function renderEventCertificate(input: { name: string; event: string; title: string; number: string;
  issuedAt: Date; layout: CertificateTemplate["layout"]; presentation?: CertificateTemplate["presentation"]; score?: number | null;
  background?: { bytes: Uint8Array; type: string }; logo?: { bytes: Uint8Array; type: string }; signature?: { bytes: Uint8Array; type: string } }) {
  const doc = await PDFDocument.create(); doc.registerFontkit(fontkit);
  fontBytes ??= readFile(join(process.cwd(), "public/fonts/NotoSansDevanagari.ttf"));
  const font = await doc.embedFont(new Uint8Array(await fontBytes), { subset: true });
  const page = doc.addPage([842, 595]);
  if (input.background) {
    const image = input.background.type === "image/png" ? await doc.embedPng(input.background.bytes) : await doc.embedJpg(input.background.bytes);
    page.drawImage(image, { x: 0, y: 0, width: 842, height: 595 });
  } else {
    page.drawRectangle({ x: 0, y: 0, width: 842, height: 595, color: rgb(0.99, 0.98, 0.96) });
    page.drawRectangle({ x: 24, y: 24, width: 794, height: 547, borderWidth: 2, borderColor: rgb(0.75, 0.28, 0.06) });
    if (!input.logo) page.drawText("MeroTalent", { x: 60, y: 510, size: 24, font, color: rgb(0.04, 0.1, 0.21) });
  }
  const presentation = certificatePresentationSchema.parse(input.presentation ?? {});
  for (const [image, x, y, width, height] of [[input.logo, 55, 475, 90, 60], [input.signature, 635, 115, 100, 50]] as const) {
    if (!image) continue;
    const embedded = image.type === "image/png" ? await doc.embedPng(image.bytes) : await doc.embedJpg(image.bytes);
    const fit = embedded.scaleToFit(width, height); page.drawImage(embedded, { x, y, ...fit });
  }
  const values: Record<string, string> = { recipient: input.name, event: input.event, title: input.title,
    date: input.issuedAt.toISOString().slice(0, 10), reference: input.number, organization: presentation.organization_name,
    score: input.score == null ? "" : `Score: ${input.score.toFixed(2)}%`, signatory: presentation.signatory_name, designation: presentation.signatory_designation };
  values.body = presentation.body_text.replace(/\{\{(recipient|event|title|date|reference|organization|score|signatory|designation)\}\}/g, (_match, key: string) => values[key]);
  for (const [key, text] of Object.entries(values)) {
    if (!text) continue;
    const field = input.layout[key as keyof typeof input.layout];
    centered(page, font, text, field.x, field.y, field.size);
  }
  const verification = `https://www.merotalent.com/verify/certificates/${encodeURIComponent(input.number)}`;
  const qr = await doc.embedPng(new Uint8Array(await QRCode.toBuffer(verification, { type: "png", width: 180, margin: 1 })));
  page.drawImage(qr, { x: 720, y: 40, width: 65, height: 65 });
  doc.setTitle(input.title); doc.setAuthor("MeroTalent"); doc.setSubject(`Verification: ${verification}`);
  return doc.save();
}
function centered(page: import("pdf-lib").PDFPage, font: PDFFont, text: string, x: number, y: number, size: number) {
  const safe = text.replace(/[\u0000-\u001f]/g, " ");
  const available = Math.max(30, Math.min(x - 30, 812 - x) * 2);
  const width = font.widthOfTextAtSize(safe, size), actualSize = Math.max(8, Math.min(size, available / Math.max(width, 1) * size));
  if (font.widthOfTextAtSize(safe, actualSize) > available) throw new Error("Certificate text exceeds the configured field. Adjust the template.");
  page.drawText(safe, { x: x - font.widthOfTextAtSize(safe, actualSize) / 2, y, size: actualSize, font, color: rgb(0.04, 0.1, 0.21) });
}
