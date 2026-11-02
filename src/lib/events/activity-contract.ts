import { z } from "zod";

export const activitySettingsSchema = z.object({
  navigation: z.enum(["free", "forward_only"]).default("free"),
  require_all_answers: z.boolean().default(false),
  allowed_extensions: z.array(z.enum(["pdf", "docx", "xlsx", "pptx", "png", "jpg", "jpeg", "webp", "zip"])).min(1).max(9)
    .default(["pdf", "docx", "xlsx", "pptx", "png", "jpg", "jpeg", "webp", "zip"]),
  max_file_bytes: z.number().int().min(1024).max(4 * 1024 * 1024).default(4 * 1024 * 1024),
  max_files: z.number().int().min(1).max(10).default(5),
  allow_resubmission: z.boolean().default(false), allow_late: z.boolean().default(false),
  late_until: z.string().datetime().nullable().default(null), evaluation_criteria: z.string().max(10000).default(""),
}).strict();
export type ActivitySettings = z.infer<typeof activitySettingsSchema>;

export const activitySchema = z.object({
  kind: z.enum(["quiz", "assignment"]), title: z.string().trim().min(1).max(240),
  instructions: z.string().max(30000).default(""), status: z.enum(["draft", "published", "paused", "closed"]),
  opens_at: z.string().datetime(), closes_at: z.string().datetime(),
  duration_seconds: z.number().int().min(60).max(86400), max_attempts: z.number().int().min(1).max(10),
  max_marks: z.number().positive().max(100000), results_publish_at: z.string().datetime().nullable(),
  review_answers: z.boolean(), ticket_type_ids: z.array(z.string().uuid()).max(100),
  question_ids: z.array(z.string().uuid()).max(200),
  settings: activitySettingsSchema.default({}),
}).strict().superRefine((value, ctx) => {
  if (new Date(value.closes_at) <= new Date(value.opens_at)) ctx.addIssue({ code: "custom", message: "Activity closing time must follow opening time." });
  for (const key of ["ticket_type_ids", "question_ids"] as const)
    if (new Set(value[key]).size !== value[key].length) ctx.addIssue({ code: "custom", message: "Remove duplicate selections." });
  if (value.kind === "quiz" && value.status === "published" && !value.question_ids.length)
    ctx.addIssue({ code: "custom", message: "Select questions before publishing a quiz." });
  if (value.kind === "assignment" && value.question_ids.length) ctx.addIssue({ code: "custom", message: "Assignments do not contain quiz questions." });
  if (value.settings.allow_late && (!value.settings.late_until || new Date(value.settings.late_until) <= new Date(value.closes_at)))
    ctx.addIssue({ code: "custom", message: "Late submissions require a later final deadline." });
});

export const manualEnrollmentSchema = z.object({
  user_id: z.string().uuid(), ticket_type_id: z.string().uuid().nullable(),
  activity_ids: z.array(z.string().uuid()).max(100), access_expires_at: z.string().datetime().nullable(),
  reason: z.string().trim().min(10).max(2000), idempotency_key: z.string().uuid(),
}).strict();

export const attemptWriteSchema = z.object({
  answers: z.record(z.string().uuid(), z.union([z.string().max(10000), z.array(z.string().max(50)).max(20)])).default({}),
  submit: z.boolean().default(false),
  next: z.boolean().default(false), question_index: z.number().int().min(0).max(199).optional(),
}).strict();
