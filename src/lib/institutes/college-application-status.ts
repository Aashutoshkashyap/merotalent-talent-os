/**
 * Single source of truth for `public.college_applications.status`.
 *
 * These values MUST stay in sync with the CHECK constraint declared in
 * supabase/migrations/20260806090000_modular_platform_backend.sql. Writing any
 * other value fails the constraint (Postgres 23514) at runtime, which is easy
 * to miss because the Supabase JS client resolves rather than throws on error.
 *
 * `college-application-status-contract.test.ts` asserts this list against the
 * migration so the two cannot drift.
 */
export const COLLEGE_APPLICATION_STATUSES = [
  "submitted",
  "reviewing",
  "contacted",
  "accepted",
  "rejected",
  "withdrawn",
] as const;

export type CollegeApplicationStatus =
  (typeof COLLEGE_APPLICATION_STATUSES)[number];

export const COLLEGE_APPLICATION_STATUS_LABELS: Record<
  CollegeApplicationStatus,
  string
> = {
  submitted: "New",
  reviewing: "Reviewing",
  contacted: "Followed Up",
  accepted: "Admitted",
  rejected: "Rejected",
  withdrawn: "Withdrawn",
};

export const COLLEGE_APPLICATION_STATUS_BADGE_CLASSES: Record<
  CollegeApplicationStatus,
  string
> = {
  submitted: "bg-amber-100 text-amber-800 border-amber-200",
  reviewing: "bg-sky-100 text-sky-800 border-sky-200",
  contacted: "bg-blue-100 text-blue-800 border-blue-200",
  accepted: "bg-emerald-100 text-emerald-800 border-emerald-200",
  rejected: "bg-rose-100 text-rose-800 border-rose-200",
  withdrawn: "bg-slate-100 text-slate-700 border-slate-200",
};

export const isCollegeApplicationStatus = (
  value: unknown,
): value is CollegeApplicationStatus =>
  typeof value === "string" &&
  (COLLEGE_APPLICATION_STATUSES as readonly string[]).includes(value);

export const collegeApplicationStatusLabel = (value: string): string =>
  isCollegeApplicationStatus(value)
    ? COLLEGE_APPLICATION_STATUS_LABELS[value]
    : value.replace(/_/g, " ");

export const collegeApplicationStatusBadgeClass = (value: string): string =>
  isCollegeApplicationStatus(value)
    ? COLLEGE_APPLICATION_STATUS_BADGE_CLASSES[value]
    : "bg-slate-100 text-slate-700 border-slate-200";

/**
 * Every column that actually exists on `public.college_applications`.
 * Selecting anything outside this set returns PostgREST error 42703.
 */
export const COLLEGE_APPLICATION_COLUMNS = [
  "id",
  "institute_id",
  "applicant_id",
  "full_name",
  "email",
  "phone",
  "program_interest",
  "intake",
  "message",
  "attachments",
  "form_data",
  "status",
  "submitted_at",
  "updated_at",
  "deleted_at",
] as const;
