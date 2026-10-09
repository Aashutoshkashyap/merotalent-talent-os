/** Signed-in, staging-only college admission submission. Never accepts applicant identity from JSON. */
import type { QueryResultRow } from "pg";
import {
  NeonAuthorizationError,
  neonQueryExecutor,
  type NeonActor,
  type NeonQueryExecutor,
} from "./neon-authorization";

export interface CollegeAdmissionInput {
  programInterest: string;
  intake?: string;
  message?: string;
}

interface SubmissionGate extends QueryResultRow {
  exists: boolean;
  accepting: boolean;
  linked: boolean;
  profile_complete: boolean;
  application_id: string | null;
  application_status: string | null;
  submitted_at: string | null;
}

export function parseCollegeAdmissionInput(value: unknown): CollegeAdmissionInput | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const body = value as Record<string, unknown>;
  if (Object.keys(body).some((key) => !["programInterest", "intake", "message"].includes(key))) return null;
  if (typeof body.programInterest !== "string") return null;
  const programInterest = body.programInterest.trim();
  if (programInterest.length < 2 || programInterest.length > 160) return null;
  if (body.intake !== undefined && typeof body.intake !== "string") return null;
  if (body.message !== undefined && typeof body.message !== "string") return null;
  const intake = (body.intake as string | undefined)?.trim();
  const message = (body.message as string | undefined)?.trim();
  if ((intake?.length ?? 0) > 120 || (message?.length ?? 0) > 2000) return null;
  return { programInterest, ...(intake ? { intake } : {}), ...(message ? { message } : {}) };
}

/**
 * The profile, publication gate, and insert are evaluated by one PostgreSQL
 * statement. Success is returned only from INSERT ... RETURNING. The copied
 * Supabase RLS cannot be treated as a Neon-session authorization boundary.
 */
export async function submitCollegeAdmission(
  actor: NeonActor,
  instituteId: string,
  input: CollegeAdmissionInput,
  db: NeonQueryExecutor = neonQueryExecutor,
): Promise<{ id: string; status: string; submittedAt: string } | null> {
  const [result] = await db.query<SubmissionGate>(`
    WITH target AS (
      SELECT i.id, i.status = 'approved' AND i.applications_enabled IS TRUE
        AND i.admission_status = 'open'
        AND (i.admission_deadline IS NULL OR i.admission_deadline > now()) AS accepting
      FROM public.institutes i
      WHERE i.id = $2::uuid AND i.deleted_at IS NULL
    ), applicant AS (
      SELECT p.user_id, btrim(p.full_name) AS full_name,
             lower(btrim(p.email)) AS email, btrim(p.phone) AS phone,
             NULLIF(btrim(p.whatsapp_number), '') AS whatsapp_number,
             p.account_status = 'active' AND p.deleted_at IS NULL
             AND char_length(btrim(p.full_name)) BETWEEN 2 AND 120
             AND btrim(p.email) <> ''
             AND char_length(regexp_replace(COALESCE(p.phone, ''), '[^0-9]', '', 'g')) BETWEEN 7 AND 15
             AND NULLIF(btrim(p.location), '') IS NOT NULL
             AND (NULLIF(btrim(p.education), '') IS NOT NULL OR
                  CASE WHEN jsonb_typeof(p.education_history) = 'array'
                       THEN jsonb_array_length(p.education_history) > 0 ELSE false END)
               AS complete
      FROM public.profiles p
      JOIN public.neon_application_accounts account
        ON account.legacy_user_id = p.user_id AND account.status = 'active'
      JOIN public.neon_identity_links link
        ON link.application_account_id = account.id AND link.status = 'verified'
       AND link.neon_auth_user_id = $6::uuid
      WHERE p.user_id = $1::uuid
    ), inserted AS (
      INSERT INTO public.college_applications (
        institute_id, applicant_id, full_name, email, phone, whatsapp_number,
        program_interest, intake, message, attachments, form_data, status
      )
      SELECT t.id, a.user_id, a.full_name, a.email, a.phone, a.whatsapp_number,
             $3::text, NULLIF($4::text, ''), NULLIF($5::text, ''), '[]'::jsonb,
             jsonb_build_object('programInterest', $3::text, 'intake', $4::text, 'message', $5::text),
             'submitted'
      FROM target t CROSS JOIN applicant a
      WHERE t.accepting AND a.complete
      RETURNING id, status, submitted_at
    )
    SELECT EXISTS (SELECT 1 FROM target) AS exists,
           COALESCE((SELECT accepting FROM target), false) AS accepting,
           EXISTS (SELECT 1 FROM applicant) AS linked,
           COALESCE((SELECT complete FROM applicant), false) AS profile_complete,
           (SELECT id FROM inserted) AS application_id,
           (SELECT status FROM inserted) AS application_status,
           (SELECT submitted_at FROM inserted) AS submitted_at`,
  [actor.userId, instituteId, input.programInterest, input.intake ?? "", input.message ?? "", actor.neonAuthUserId]);
  if (!result?.exists) return null;
  if (!result.accepting) {
    throw new NeonAuthorizationError(403, "ADMISSIONS_CLOSED", "This institution is not accepting applications.");
  }
  if (!result.linked) {
    throw new NeonAuthorizationError(403, "IDENTITY_NOT_LINKED", "The application identity link is inactive.");
  }
  if (!result.profile_complete) {
    throw new NeonAuthorizationError(403, "PROFILE_INCOMPLETE", "Complete your student profile before applying.");
  }
  if (!result.application_id || !result.application_status || !result.submitted_at) {
    throw new Error("College admission was not saved.");
  }
  return { id: result.application_id, status: result.application_status, submittedAt: result.submitted_at };
}
