import { z } from "zod";
const position = z.object({ x: z.number().min(30).max(810), y: z.number().min(35).max(560),
  size: z.number().min(8).max(48) }).strict();
export const certificatePresentationSchema = z.object({ organization_name: z.string().max(160).default(""),
  signatory_name: z.string().max(120).default(""), signatory_designation: z.string().max(160).default(""),
  body_text: z.string().max(400).default("This certificate is awarded to"),
  logo_file_id: z.string().uuid().nullable().default(null), signature_file_id: z.string().uuid().nullable().default(null),
}).strict();
export const certificateTemplateSchema = z.object({
  title: z.string().trim().min(1).max(160), kind: z.enum(["participation", "completion", "achievement"]),
  background_file_id: z.string().uuid().nullable(), auto_issue: z.boolean(), is_active: z.boolean(),
  layout: z.object({ recipient: position, event: position, date: position, reference: position,
    title: position.default({ x: 421, y: 420, size: 28 }), organization: position.default({ x: 421, y: 470, size: 18 }),
    body: position.default({ x: 421, y: 365, size: 14 }), score: position.default({ x: 421, y: 210, size: 13 }),
    signatory: position.default({ x: 421, y: 125, size: 14 }), designation: position.default({ x: 421, y: 103, size: 11 }),
  }).strict(),
  presentation: certificatePresentationSchema.default({}),
  eligibility: z.object({ activity_ids: z.array(z.string().uuid()).max(100), require_attendance: z.boolean(),
    minimum_percent: z.number().min(0).max(100) }).strict(),
}).strict().superRefine((value, ctx) => {
  if (!value.eligibility.require_attendance && !value.eligibility.activity_ids.length)
    ctx.addIssue({ code: "custom", message: "Certificates require checked attendance or completed activities, never purchase alone." });
  if (new Set(value.eligibility.activity_ids).size !== value.eligibility.activity_ids.length)
    ctx.addIssue({ code: "custom", message: "Remove duplicate eligibility activities." });
  if (value.kind === "achievement" && (!value.eligibility.activity_ids.length || value.eligibility.minimum_percent <= 0))
    ctx.addIssue({ code: "custom", message: "Achievement certificates require an assessed activity and a positive minimum score." });
});
export type CertificateTemplate = z.infer<typeof certificateTemplateSchema>;
export const defaultCertificateLayout = { recipient: { x: 421, y: 310, size: 32 }, event: { x: 421, y: 245, size: 21 },
  date: { x: 421, y: 180, size: 13 }, reference: { x: 421, y: 60, size: 9 }, title: { x: 421, y: 420, size: 28 },
  organization: { x: 421, y: 470, size: 18 }, body: { x: 421, y: 365, size: 14 }, score: { x: 421, y: 210, size: 13 },
  signatory: { x: 421, y: 125, size: 14 }, designation: { x: 421, y: 103, size: 11 } };
