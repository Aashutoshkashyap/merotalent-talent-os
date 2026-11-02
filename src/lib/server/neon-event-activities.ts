/** Event activities extend the existing registration, quiz and scoped workspace runtime. */
import { createHash, randomUUID } from "node:crypto";
import type { PoolClient, QueryResultRow } from "pg";
import { z } from "zod";
import { withTransaction } from "./db";
import { NeonAuthorizationError, type NeonActor } from "./neon-authorization";
import { assertRoleWorkspaceIdentity, requireRoleWorkspaceAccess } from "./neon-role-workspaces";
import { appendNotificationEvent } from "./neon-application-events";
import { queueNeonReservationEmail } from "./neon-reservation-email";
import { expireNeonPurchaseHolds } from "./neon-purchase-expiry";
import { activitySchema, activitySettingsSchema, attemptWriteSchema, manualEnrollmentSchema, type ActivitySettings } from "../events/activity-contract";
import { gradeAssessment, publicQuestion, questionSchema, resultVisibility, type AssessmentQuestion, type StudentAnswer } from "../events/assessment";
import { createPresignedDownloadUrl, deleteObject, headObject, uploadObject, readObjectBytes } from "./storage";
import { certificateTemplateSchema, type CertificateTemplate } from "../events/certificate-contract";
import { getBackendMode } from "./backend-mode";
import { eventExportKinds } from "../events/export";

type Client = Pick<PoolClient, "query">;
type Run = <T>(operation: (client: PoolClient) => Promise<T>) => Promise<T>;
type Storage = { put: typeof uploadObject; remove: typeof deleteObject; head: typeof headObject; sign: typeof createPresignedDownloadUrl };
const storage: Storage = { put: uploadObject, remove: deleteObject, head: headObject, sign: createPresignedDownloadUrl };
const activityBucket = "event-attachments";
interface Activity extends QueryResultRow {
  id: string; event_id: string; kind: "quiz" | "assignment"; quiz_id: string | null; title: string; instructions: string;
  status: string; opens_at: Date; closes_at: Date; duration_seconds: number; max_attempts: number;
  max_marks: number; results_publish_at: Date | null; review_answers: boolean;
  settings: ActivitySettings;
}
interface Attempt extends QueryResultRow {
  id: string; user_id: string; registration_id: string; activity_id: string; state: string;
  answers: Record<string, StudentAnswer>; question_snapshot: AssessmentQuestion[];
  started_at: Date; deadline_at: Date; completed_at: Date | null; total_score: number | null; total_marks: number | null;
  policy_snapshot: ActivitySettings; navigation_index: number;
}
const uuid = z.string().uuid();
const deny = (status: 400 | 403 | 404 | 409, code: string, message: string): never => { throw new NeonAuthorizationError(status, code, message); };
async function audit(db: Client, actor: NeonActor, action: string, id: string, metadata: Record<string, unknown> = {}) {
  await db.query(`INSERT INTO public.audit_logs(actor_user_id,action,entity_type,entity_id,metadata)
    VALUES($1::uuid,$2,'event_activities',$3,$4::jsonb)`, [actor.userId, action, id, JSON.stringify(metadata)]);
}
async function activityNotice(db: Client, userId: string, reference: string, state: string, title: string, message: string, due?: Date | string | null) {
  await db.query(`UPDATE public.notifications SET next_delivery_attempt_at=$4::timestamptz,email_delivery_enabled=true
    WHERE recipient_id=$1::uuid AND entity_type='event_activity' AND entity_id=$2::uuid
      AND channel='email' AND status='queued' AND metadata->>'activity_event'=$3`, [userId, reference, state, due ?? null]);
  await db.query(`INSERT INTO public.notifications(recipient_id,title,message,type,category,channel,status,entity_type,entity_id,
    action_url,email_to,email_delivery_enabled,next_delivery_attempt_at,metadata)
    SELECT p.user_id,$3,$4,'info','event_activity','email','queued','event_activity',$2::uuid,
      '/dashboard/tickets',p.email,true,$7::timestamptz,jsonb_build_object('activity_event',$5::text,'delivery_environment',$6::text)
    FROM public.profiles p WHERE p.user_id=$1::uuid AND p.account_status='active' AND p.deleted_at IS NULL
      AND p.email ~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$'
      AND NOT EXISTS(SELECT 1 FROM public.notifications n WHERE n.recipient_id=p.user_id AND n.entity_type='event_activity'
        AND n.entity_id=$2::uuid AND n.channel='email' AND n.metadata->>'activity_event'=$5)`,
  [userId, reference, title, `${message} View your record at https://www.merotalent.com/dashboard/tickets.`, state, getBackendMode(), due ?? null]);
}
async function admin(db: Client, actor: NeonActor, eventId: string, feature = "event_management") {
  uuid.parse(eventId);
  await assertRoleWorkspaceIdentity(db, actor);
  await requireRoleWorkspaceAccess(db, actor, "events", "event", eventId, feature);
  const event = (await db.query<{ id: string; title: string; capacity: number | null }>(`SELECT id,title,capacity
    FROM public.events WHERE id=$1::uuid AND deleted_at IS NULL FOR UPDATE`, [eventId])).rows[0];
  if (!event) deny(404, "EVENT_UNAVAILABLE", "Event unavailable.");
  return event;
}
async function activityRow(db: Client, eventId: string, activityId: string) {
  uuid.parse(activityId);
  const activity = (await db.query<Activity>(`SELECT * FROM public.event_activities
    WHERE id=$1::uuid AND event_id=$2::uuid FOR UPDATE`, [activityId, eventId])).rows[0];
  if (!activity) deny(404, "ACTIVITY_UNAVAILABLE", "Activity unavailable.");
  return activity;
}
async function certificateImage(db: Client, eventId: string, id?: string | null) {
  if (!id) return undefined;
  const file = (await db.query<{ object_path: string; content_type: string }>(`SELECT object_path,content_type FROM public.event_activity_files
    WHERE id=$1::uuid AND event_id=$2::uuid AND purpose='certificate_template' AND content_type IN ('image/png','image/jpeg')`, [id, eventId])).rows[0];
  if (!file) deny(400, "INVALID_CERTIFICATE_BACKGROUND", "Use a validated PNG or JPEG uploaded for this event's certificate template.");
  return { bytes: await readObjectBytes(activityBucket, file.object_path), type: file.content_type };
}
/** A redirect, a pending payment, or admin capability never qualifies as student enrollment. */
async function enrollment(db: Client, actor: Pick<NeonActor, "userId">, eventId: string, activityId?: string) {
  const registration = (await db.query<{ id: string; activity_access: string[] }>(`SELECT r.id,r.activity_access
    FROM public.event_registrations r JOIN public.events e ON e.id=r.event_id
    WHERE r.event_id=$1::uuid AND r.user_id=$2::uuid AND r.deleted_at IS NULL
      AND r.status='confirmed' AND NOT r.access_suspended
      AND (r.access_expires_at IS NULL OR r.access_expires_at>now())
      AND e.deleted_at IS NULL AND (e.is_active OR e.status='completed') AND e.approval_status='approved'
      AND e.status IN ('approved','published','completed') AND COALESCE(e.lifecycle_status,'published') NOT IN ('cancelled','archived')
      AND ((r.total_amount=0 AND r.payment_status='not_required' AND r.enrollment_source='checkout')
        OR (r.enrollment_source='manual' AND r.enrolled_by IS NOT NULL AND EXISTS(
          SELECT 1 FROM public.audit_logs a WHERE a.action='manual_event_enrollment'
            AND a.entity_id=r.id::text AND a.actor_user_id=r.enrolled_by))
        OR (r.payment_status='success' AND EXISTS(SELECT 1 FROM public.payments p
          JOIN public.payment_checkout_sessions c ON c.provider_reference=p.id::text
          WHERE p.id=r.payment_id AND p.user_id=r.user_id AND p.payment_type='event_ticket'
            AND p.reference_id=r.id AND p.amount=r.total_amount AND p.status='success'
            AND c.entity_type='event_registration' AND c.entity_id=r.id AND c.user_id=r.user_id
            AND c.status='successful' AND c.provider_name='esewa' AND c.amount=p.amount AND c.currency=p.currency
            AND p.currency='NPR' AND p.gateway='esewa' AND p.gateway_transaction_id IS NOT NULL
            AND p.metadata->>'provider_status'='successful')))
    ORDER BY r.registered_at DESC LIMIT 1 FOR UPDATE OF r`, [eventId, actor.userId])).rows[0];
  if (!registration || (activityId && !registration.activity_access.includes(activityId)))
    deny(403, "EVENT_ENROLLMENT_REQUIRED", "An active enrollment with this activity included is required.");
  return registration;
}
function attemptDto(attempt: Attempt, activity: Activity, now: Date) {
  const visibility = resultVisibility(activity, now);
  const policy = activitySettingsSchema.parse(attempt.policy_snapshot ?? {});
  const questions = !attempt.completed_at && policy.navigation === "forward_only"
    ? attempt.question_snapshot.slice(attempt.navigation_index, attempt.navigation_index + 1) : attempt.question_snapshot;
  return { id: attempt.id, state: attempt.state, started_at: attempt.started_at, deadline_at: attempt.deadline_at,
    completed_at: attempt.completed_at, answers: attempt.answers,
    questions: questions.map(publicQuestion), server_time: now.toISOString(), question_count: attempt.question_snapshot.length,
    question_index: attempt.navigation_index, navigation: policy.navigation, require_all_answers: policy.require_all_answers,
    score: visibility.published && attempt.completed_at ? Number(attempt.total_score) : null,
    total_marks: visibility.published && attempt.completed_at ? Number(attempt.total_marks) : null,
    review: visibility.review && attempt.completed_at ? attempt.question_snapshot.map(q => ({ id: q.id,
      correct_answer: q.correct_answer, explanation: q.answer_rules.explanation })) : null };
}
function assignmentOpen(activity: Activity, now: Date) {
  const settings = activitySettingsSchema.parse(activity.settings);
  return activity.status === "published" && now >= new Date(activity.opens_at) &&
    (now < new Date(activity.closes_at) || settings.allow_late && settings.late_until && now < new Date(settings.late_until));
}
const answered = (value: StudentAnswer | undefined) => Array.isArray(value) ? value.length > 0 : typeof value === "string" && !!value.trim();
async function finish(db: Client, attempt: Attempt, expired: boolean) {
  if (attempt.completed_at) return attempt;
  const grade = gradeAssessment(attempt.question_snapshot, attempt.answers);
  return (await db.query<Attempt>(`UPDATE public.quiz_attempts SET completed_at=now(),state=$2,
    total_score=$3,total_marks=$4 WHERE id=$1::uuid AND completed_at IS NULL RETURNING *`,
  [attempt.id, expired ? "expired" : "submitted", grade.score, grade.total])).rows[0] ?? attempt;
}

/** Existing authenticated cron owns unattended deadline finalization; no user impersonation. */
export async function expireEventAttempts(db: Client, eventId?: string) {
  const due = (await db.query<Attempt & { title: string; results_publish_at: Date | null }>(`SELECT q.*,a.title,a.results_publish_at
    FROM public.quiz_attempts q JOIN public.event_activities a ON a.id=q.activity_id
    WHERE q.completed_at IS NULL AND q.question_snapshot IS NOT NULL
      AND LEAST(q.deadline_at,a.closes_at)<=clock_timestamp() AND ($1::uuid IS NULL OR a.event_id=$1::uuid)
    ORDER BY q.deadline_at,q.id LIMIT 100 FOR UPDATE OF q SKIP LOCKED`, [eventId ?? null])).rows;
  for (const attempt of due) {
    await finish(db, attempt, true);
    await db.query(`INSERT INTO public.audit_logs(action,entity_type,entity_id,metadata)
      VALUES('expire_event_quiz','quiz_attempts',$1,jsonb_build_object('activity_id',$2::uuid,'reason','server_deadline'))`, [attempt.id, attempt.activity_id]);
    if (attempt.results_publish_at) await activityNotice(db, attempt.user_id, attempt.id, "results_published", "Your event results are available",
      `Results for ${attempt.title} are available.`, attempt.results_publish_at);
  }
  return due.length;
}

export class NeonEventActivities {
  constructor(private readonly run: Run = withTransaction, private readonly io: Storage = storage) {}
  async uploadFile(actor: NeonActor, eventId: string, input: { purpose: "question" | "assignment" | "certificate_template";
    activityId: string | null; fileName: string; bytes: Uint8Array }) {
    uuid.parse(eventId); if (input.activityId) uuid.parse(input.activityId);
    const id = randomUUID(), path = `activities/${eventId}/${actor.userId}/${id}.${input.fileName.split(".").pop()!.toLowerCase()}`;
    let uploaded = false;
    try {
      return await this.run(async db => {
        await assertRoleWorkspaceIdentity(db, actor);
        if (input.purpose !== "assignment") await admin(db, actor, eventId);
        else {
          if (!input.activityId) deny(400, "ACTIVITY_REQUIRED", "Choose an assignment.");
          const activity = await activityRow(db, eventId, input.activityId);
          await enrollment(db, actor, eventId, activity.id);
          if (activity.kind !== "assignment" || activity.status !== "published") deny(403, "ASSIGNMENT_CLOSED", "This assignment is unavailable.");
          const now = (await db.query<{ now: Date }>(`SELECT clock_timestamp() AS now`)).rows[0].now;
          if (!assignmentOpen(activity, now)) deny(403, "ASSIGNMENT_CLOSED", "The submission window is closed.");
          const policy = activitySettingsSchema.parse(activity.settings);
          if (input.bytes.length > policy.max_file_bytes || !policy.allowed_extensions.includes(input.fileName.split(".").pop()!.toLowerCase() as typeof policy.allowed_extensions[number]))
            deny(400, "ASSIGNMENT_FILE_POLICY", "This file exceeds the assignment's configured format or size limits.");
        }
        if (input.activityId && !(await db.query(`SELECT id FROM public.event_activities WHERE id=$1::uuid AND event_id=$2::uuid`, [input.activityId, eventId])).rowCount)
          deny(400, "INVALID_ACTIVITY_SCOPE", "This activity belongs to another event.");
        const used = (await db.query<{ count: number; bytes: number }>(`SELECT count(*)::int AS count,COALESCE(sum(size_bytes),0)::float AS bytes
          FROM public.event_activity_files WHERE event_id=$1::uuid AND user_id=$2::uuid`, [eventId, actor.userId])).rows[0];
        if (used.count >= 100 || used.bytes + input.bytes.length > 200 * 1024 * 1024) deny(409, "UPLOAD_LIMIT", "This account has reached the event upload allowance. Remove unused files first.");
        const { validateEventActivityFile } = await import("./event-activity-files");
        const contentType = await validateEventActivityFile(input.bytes, input.fileName, input.purpose !== "assignment");
        await this.io.put(activityBucket, path, input.bytes, contentType); uploaded = true;
        await db.query(`INSERT INTO public.event_activity_files(id,event_id,activity_id,user_id,purpose,object_path,file_name,content_type,size_bytes,sha256)
          VALUES($1::uuid,$2::uuid,$3::uuid,$4::uuid,$5,$6,$7,$8,$9,$10)`,
        [id, eventId, input.activityId, actor.userId, input.purpose, path, input.fileName, contentType, input.bytes.length, createHash("sha256").update(input.bytes).digest("hex")]);
        await audit(db, actor, "upload_event_activity_file", eventId, { file_id: id, purpose: input.purpose });
        return { id, file_name: input.fileName, content_type: contentType, size_bytes: input.bytes.length };
      });
    } catch (error) {
      if (uploaded) await this.io.remove(activityBucket, path).catch(() => console.error(JSON.stringify({ event: "event_activity_orphan_cleanup_required", file_id: id })));
      throw error;
    }
  }
  async fileUrl(actor: NeonActor, eventId: string, fileId: string, management = false) {
    uuid.parse(eventId); uuid.parse(fileId);
    return this.run(async db => {
      await assertRoleWorkspaceIdentity(db, actor);
      const file = (await db.query<{ id: string; user_id: string; purpose: string; activity_id: string | null; object_path: string; content_type: string }>(
        `SELECT id,user_id,purpose,activity_id,object_path,content_type FROM public.event_activity_files WHERE id=$1::uuid AND event_id=$2::uuid FOR SHARE`, [fileId, eventId])).rows[0];
      if (!file) deny(404, "FILE_UNAVAILABLE", "File unavailable.");
      if (management) await admin(db, actor, eventId, ["assignment", "certificate"].includes(file.purpose) ? "registration_management" : "event_management");
      else if (file.purpose === "certificate") {
        if (!(await db.query(`SELECT id FROM public.certificates WHERE user_id=$1::uuid AND event_id=$2::uuid
          AND revoked_at IS NULL AND template_data->>'file_id'=$3`, [actor.userId, eventId, file.id])).rowCount)
          deny(403, "FILE_ACCESS_DENIED", "This certificate belongs to another recipient.");
      }
      else {
        const registration = await enrollment(db, actor, eventId, file.purpose === "assignment" ? file.activity_id ?? undefined : undefined);
        if (file.purpose === "assignment") { if (file.user_id !== actor.userId) deny(403, "FILE_ACCESS_DENIED", "This file belongs to another student."); }
        else if (file.purpose === "question") {
          // Only images actually present in a started attempt may be downloaded; not future/private bank media.
          const allowed = await db.query(`SELECT id FROM public.quiz_attempts a WHERE a.user_id=$1::uuid
            AND a.registration_id=$2::uuid AND a.activity_id=ANY($3::uuid[]) AND EXISTS(SELECT 1 FROM jsonb_array_elements(a.question_snapshot) q
              WHERE q->>'media_file_id'=$4 OR EXISTS(SELECT 1 FROM jsonb_array_elements(q->'options') o WHERE o->>'image_file_id'=$4))`,
          [actor.userId, registration.id, registration.activity_access, file.id]);
          if (!allowed.rowCount) deny(403, "FILE_ACCESS_DENIED", "This question image is not included in your attempt.");
        } else deny(403, "FILE_ACCESS_DENIED", "This file requires organizer access.");
      }
      if (!await this.io.head(activityBucket, file.object_path)) deny(404, "FILE_UNAVAILABLE", "The file is missing. Contact the organizer.");
      return this.io.sign(activityBucket, file.object_path, 120, !file.content_type.startsWith("image/"));
    });
  }
  async deleteUnusedFile(actor: NeonActor, eventId: string, fileId: string) {
    uuid.parse(eventId); uuid.parse(fileId);
    const path = await this.run(async db => {
      await assertRoleWorkspaceIdentity(db, actor);
      const file = (await db.query<{ object_path: string; activity_id: string | null; purpose: string }>(`SELECT object_path,activity_id,purpose
        FROM public.event_activity_files WHERE id=$1::uuid AND event_id=$2::uuid AND user_id=$3::uuid FOR UPDATE`, [fileId, eventId, actor.userId])).rows[0];
      if (!file) deny(404, "FILE_UNAVAILABLE", "File unavailable for this uploader.");
      if (file.purpose === "certificate") deny(409, "FILE_RETAINED", "Issued certificates are retained. Use the revocation workflow.");
      if (file.purpose === "assignment") await enrollment(db, actor, eventId, file.activity_id ?? undefined);
      else await admin(db, actor, eventId);
      const referenced = await db.query(`SELECT 1 WHERE EXISTS(SELECT 1 FROM public.event_assignment_submissions WHERE $1::uuid=ANY(file_ids))
        OR EXISTS(SELECT 1 FROM public.quiz_questions WHERE media_file_id=$1::uuid OR options @> jsonb_build_array(jsonb_build_object('image_file_id',$1::text)))
        OR EXISTS(SELECT 1 FROM public.quiz_attempts a WHERE EXISTS(SELECT 1 FROM jsonb_array_elements(COALESCE(a.question_snapshot,'[]')) q
          WHERE q->>'media_file_id'=$1::text OR q->'options' @> jsonb_build_array(jsonb_build_object('image_file_id',$1::text))))
        OR EXISTS(SELECT 1 FROM public.event_certificate_templates WHERE background_file_id=$1::uuid
          OR presentation->>'logo_file_id'=$1::text OR presentation->>'signature_file_id'=$1::text)`, [fileId]);
      if (referenced.rowCount) deny(409, "FILE_RETAINED", "This file is retained by a question, attempt, submission or certificate template.");
      await db.query(`DELETE FROM public.event_activity_files WHERE id=$1::uuid`, [fileId]);
      await audit(db, actor, "delete_unused_event_activity_file", eventId, { file_id: fileId, object_path: file.object_path });
      return file.object_path;
    });
    try { await this.io.remove(activityBucket, path); return { deleted: true, cleanup_pending: false }; }
    catch { console.error(JSON.stringify({ event: "event_activity_deleted_object_cleanup_required", file_id: fileId })); return { deleted: true, cleanup_pending: true }; }
  }
  async assignment(actor: NeonActor, eventId: string, activityId: string, raw?: unknown) {
    uuid.parse(eventId);
    const input = raw === undefined ? undefined : z.object({ file_ids: z.array(uuid).min(1).max(10), comments: z.string().max(10000).default("") }).strict().parse(raw);
    return this.run(async db => {
      await assertRoleWorkspaceIdentity(db, actor);
      const activity = await activityRow(db, eventId, activityId);
      const registration = await enrollment(db, actor, eventId, activityId);
      if (activity.kind !== "assignment") deny(400, "NOT_AN_ASSIGNMENT", "Choose an assignment activity.");
      const rows = (await db.query<{ id: string; revision: number; file_ids: string[]; state: string; comments: string }>(`SELECT * FROM public.event_assignment_submissions
        WHERE activity_id=$1::uuid AND user_id=$2::uuid ORDER BY revision DESC FOR UPDATE`, [activityId, actor.userId])).rows;
      const now = (await db.query<{ now: Date }>(`SELECT clock_timestamp() AS now`)).rows[0].now;
      if (!input) return rows.map(row => ({ id: row.id, revision: row.revision, file_ids: row.file_ids, comments: row.comments, state: row.state,
        ...(row.state === "published" && resultVisibility(activity, now).published ? row : { marks: null, feedback: null }) }));
      const latest = rows[0];
      if (latest && JSON.stringify(latest.file_ids) === JSON.stringify(input.file_ids) && latest.comments === input.comments) return { id: latest.id, duplicate: true };
      const policy = activitySettingsSchema.parse(activity.settings);
      if (!assignmentOpen(activity, now)) deny(403, "ASSIGNMENT_CLOSED", "The submission window is closed.");
      if (rows.length >= activity.max_attempts || (latest && !policy.allow_resubmission && latest.state !== "resubmit_requested")) deny(409, "RESUBMISSION_DENIED", "Another submission is not currently permitted.");
      if (input.file_ids.length > policy.max_files) deny(400, "ASSIGNMENT_FILE_POLICY", "Too many files for this assignment.");
      if (new Set(input.file_ids).size !== input.file_ids.length || (await db.query(`SELECT id FROM public.event_activity_files
        WHERE id=ANY($1::uuid[]) AND user_id=$2::uuid AND event_id=$3::uuid AND activity_id=$4::uuid AND purpose='assignment'
          AND size_bytes<=$5 AND lower(regexp_replace(file_name,'^.*[.]',''))=ANY($6::text[]) FOR SHARE`,
      [input.file_ids, actor.userId, eventId, activityId, policy.max_file_bytes, policy.allowed_extensions])).rowCount !== input.file_ids.length) deny(400, "INVALID_SUBMISSION_FILES", "Use your own uploaded files matching this assignment's policy.");
      const result = (await db.query<{ id: string }>(`INSERT INTO public.event_assignment_submissions(activity_id,registration_id,user_id,revision,file_ids,comments,is_late)
        VALUES($1::uuid,$2::uuid,$3::uuid,$4,$5::uuid[],$6,$7) RETURNING id`, [activityId, registration.id, actor.userId, rows.length + 1, input.file_ids, input.comments, now >= new Date(activity.closes_at)])).rows[0];
      await audit(db, actor, "submit_event_assignment", eventId, { submission_id: result.id, activity_id: activityId, revision: rows.length + 1 });
      await activityNotice(db, actor.userId, result.id, "submitted", "Assignment received", `Your submission for ${activity.title} was received. Reference: ${result.id}.`);
      return { ...result, duplicate: false };
    });
  }
  async reviewAssignments(actor: NeonActor, eventId: string, raw?: unknown) {
    const input = raw === undefined ? undefined : z.object({ id: uuid, state: z.enum(["under_review", "resubmit_requested", "evaluated", "published", "withheld"]),
      marks: z.number().min(0).max(100000).nullable(), feedback: z.string().max(10000) }).strict().parse(raw);
    return this.run(async db => {
      await admin(db, actor, eventId, "registration_management");
      if (!input) return (await db.query(`SELECT s.*,a.title,a.max_marks,p.full_name FROM public.event_assignment_submissions s
        JOIN public.event_activities a ON a.id=s.activity_id JOIN public.profiles p ON p.user_id=s.user_id
        WHERE a.event_id=$1::uuid ORDER BY s.submitted_at DESC LIMIT 500`, [eventId])).rows;
      const row = (await db.query<{ id: string; max_marks: number; state: string; marks: string | null; feedback: string | null }>(`SELECT s.id,s.state,s.marks,s.feedback,a.max_marks
        FROM public.event_assignment_submissions s JOIN public.event_activities a ON a.id=s.activity_id
        WHERE s.id=$1::uuid AND a.event_id=$2::uuid FOR UPDATE OF s,a`, [input.id, eventId])).rows[0];
      if (!row) deny(404, "SUBMISSION_UNAVAILABLE", "Submission unavailable for this event.");
      if ((input.state === "evaluated" || input.state === "published") && (input.marks === null || input.marks > Number(row.max_marks)))
        deny(400, "INVALID_GRADE", "Provide marks within the activity maximum before publishing.");
      if (row.state === input.state && (row.marks === null ? null : Number(row.marks)) === input.marks && row.feedback === input.feedback) return { id: input.id, duplicate: true };
      await db.query(`UPDATE public.event_assignment_submissions SET state=$2,marks=$3,feedback=$4,graded_by=$5::uuid,
        graded_at=now(),published_at=CASE WHEN $2='published' THEN now() ELSE NULL END WHERE id=$1::uuid`,
      [input.id, input.state, input.marks, input.feedback, actor.userId]);
      await db.query(`INSERT INTO public.event_assignment_reviews(submission_id,actor_user_id,state,marks,feedback)
        VALUES($1::uuid,$2::uuid,$3,$4,$5)`, [input.id, actor.userId, input.state, input.marks, input.feedback]);
      await audit(db, actor, "review_event_assignment", eventId, { submission_id: input.id, state: input.state });
      const recipient = (await db.query<{ user_id: string; results_publish_at: Date | null }>(`SELECT s.user_id,a.results_publish_at
        FROM public.event_assignment_submissions s JOIN public.event_activities a ON a.id=s.activity_id WHERE s.id=$1::uuid`, [input.id])).rows[0];
      if (input.state !== "published") await db.query(`UPDATE public.notifications SET email_delivery_enabled=false
        WHERE entity_type='event_activity' AND entity_id=$1::uuid AND status='queued' AND metadata->>'activity_event'='published'`, [input.id]);
      if (input.state !== "published" || recipient.results_publish_at) await activityNotice(db, recipient.user_id, input.id, input.state, "Assignment review updated",
        input.state === "published" ? "Your assignment results are available." : `Your submission status is ${input.state.replaceAll("_", " ")}.`, input.state === "published" ? recipient.results_publish_at : null);
      return { id: input.id, duplicate: false };
    });
  }
  async certificateTemplates(actor: NeonActor, eventId: string, raw?: unknown, id?: string) {
    const payload = raw === undefined ? undefined : certificateTemplateSchema.parse(raw); if (id) uuid.parse(id);
    return this.run(async db => {
      await admin(db, actor, eventId);
      if (!payload) return (await db.query(`SELECT * FROM public.event_certificate_templates WHERE event_id=$1::uuid ORDER BY created_at,id`, [eventId])).rows;
      const eligibility = payload.eligibility;
      if (eligibility.activity_ids.length && (await db.query(`SELECT id FROM public.event_activities WHERE event_id=$1::uuid
        AND id=ANY($2::uuid[]) FOR SHARE`, [eventId, eligibility.activity_ids])).rowCount !== eligibility.activity_ids.length)
        deny(400, "INVALID_CERTIFICATE_SCOPE", "Certificate activities must belong to this event.");
      for (const fileId of [payload.background_file_id, payload.presentation.logo_file_id, payload.presentation.signature_file_id])
        if (fileId && !(await db.query(`SELECT id FROM public.event_activity_files WHERE id=$1::uuid
          AND event_id=$2::uuid AND purpose='certificate_template' AND content_type IN ('image/png','image/jpeg') FOR SHARE`,
        [fileId, eventId])).rowCount) deny(400, "INVALID_CERTIFICATE_BACKGROUND", "Use validated PNG or JPEG certificate images from this event.");
      if (id && !(await db.query(`SELECT id FROM public.event_certificate_templates WHERE id=$1::uuid AND event_id=$2::uuid FOR UPDATE`, [id, eventId])).rowCount)
        deny(404, "TEMPLATE_UNAVAILABLE", "Template unavailable.");
      const templateId = id ?? randomUUID();
      await db.query(`INSERT INTO public.event_certificate_templates(id,event_id,title,kind,background_file_id,layout,eligibility,auto_issue,is_active,created_by,presentation)
        VALUES($1::uuid,$2::uuid,$3,$4,$5::uuid,$6::jsonb,$7::jsonb,$8,$9,$10::uuid,$11::jsonb) ON CONFLICT(id) DO UPDATE SET title=EXCLUDED.title,
        kind=EXCLUDED.kind,background_file_id=EXCLUDED.background_file_id,layout=EXCLUDED.layout,eligibility=EXCLUDED.eligibility,
        auto_issue=EXCLUDED.auto_issue,is_active=EXCLUDED.is_active,presentation=EXCLUDED.presentation,updated_at=now()`, [templateId, eventId, payload.title, payload.kind,
        payload.background_file_id, JSON.stringify(payload.layout), JSON.stringify(payload.eligibility), payload.auto_issue, payload.is_active, actor.userId, JSON.stringify(payload.presentation)]);
      await audit(db, actor, "save_event_certificate_template", eventId, { template_id: templateId });
      return { id: templateId };
    });
  }
  /** Automatic eligibility evaluation on recipient request; never requires or fabricates another login. */
  async myCertificates(actor: NeonActor, eventId: string, generate = false, manual?: { user_id: string; template_id: string; reason: string }) {
    uuid.parse(eventId); const uploaded: string[] = [];
    if (manual) z.object({ user_id: uuid, template_id: uuid, reason: z.string().trim().min(10).max(2000) }).strict().parse(manual);
    try {
      return await this.run(async db => {
        await assertRoleWorkspaceIdentity(db, actor);
        if (manual) await admin(db, actor, eventId, "registration_management");
        const recipientId = manual?.user_id ?? actor.userId;
        if (generate) {
          await db.query(`SELECT id FROM public.events WHERE id=$1::uuid FOR UPDATE`, [eventId]);
          const registration = await enrollment(db, { userId: recipientId }, eventId);
          const context = (await db.query<{ title: string; full_name: string }>(`SELECT e.title,p.full_name FROM public.events e
            JOIN public.profiles p ON p.user_id=$2::uuid WHERE e.id=$1::uuid AND p.account_status='active' AND p.deleted_at IS NULL`, [eventId, recipientId])).rows[0];
          if (!context) deny(404, "STUDENT_UNAVAILABLE", "The enrolled recipient is not active.");
          const templates = (await db.query<CertificateTemplate & { id: string }>(`SELECT * FROM public.event_certificate_templates
            WHERE event_id=$1::uuid AND is_active AND ($2::uuid IS NULL AND auto_issue OR id=$2::uuid) ORDER BY id FOR UPDATE`, [eventId, manual?.template_id ?? null])).rows;
          if (manual && !templates.length) deny(404, "TEMPLATE_UNAVAILABLE", "Choose an active template belonging to this event.");
          for (const template of templates) {
            const parsed = certificateTemplateSchema.parse({ title: template.title, kind: template.kind, background_file_id: template.background_file_id,
              layout: template.layout, eligibility: template.eligibility, auto_issue: template.auto_issue, is_active: template.is_active, presentation: template.presentation });
            if ((await db.query(`SELECT id FROM public.certificates WHERE template_id=$1::uuid AND registration_id=$2::uuid`, [template.id, registration.id])).rowCount) continue;
            if (parsed.eligibility.require_attendance && !(await db.query(`SELECT id FROM public.event_tickets WHERE registration_id=$1::uuid
              AND user_id=$2::uuid AND status='used' AND checked_in_at IS NOT NULL`, [registration.id, recipientId])).rowCount) continue;
            let eligible = true; const percents: number[] = [];
            for (const id of parsed.eligibility.activity_ids) {
              if (!registration.activity_access.includes(id)) { eligible = false; break; }
              const activity = (await db.query<Activity>(`SELECT * FROM public.event_activities WHERE id=$1::uuid AND event_id=$2::uuid`, [id, eventId])).rows[0];
              if (!activity || !resultVisibility(activity, new Date()).published) { eligible = false; break; }
              const result = activity.kind === "quiz" ? (await db.query<{ percent: number }>(`SELECT (total_score/NULLIF(total_marks,0)*100)::float AS percent
                FROM public.quiz_attempts WHERE activity_id=$1::uuid AND user_id=$2::uuid AND registration_id=$3::uuid
                  AND state='submitted' AND completed_at IS NOT NULL ORDER BY total_score/NULLIF(total_marks,0) DESC LIMIT 1`, [id, recipientId, registration.id])).rows[0]
                : (await db.query<{ percent: number }>(`SELECT (marks/$4::numeric*100)::float AS percent FROM public.event_assignment_submissions
                  WHERE activity_id=$1::uuid AND user_id=$2::uuid AND registration_id=$3::uuid AND state='published'
                  ORDER BY revision DESC LIMIT 1`, [id, recipientId, registration.id, activity.max_marks])).rows[0];
              if (!result || result.percent === null || Number(result.percent) < parsed.eligibility.minimum_percent) { eligible = false; break; }
              percents.push(Number(result.percent));
            }
            if (!eligible) continue;
            const number = `MTCC-${randomUUID()}`, fileId = randomUUID(), now = new Date();
            const [background, logo, signature] = await Promise.all([certificateImage(db, eventId, parsed.background_file_id),
              certificateImage(db, eventId, parsed.presentation.logo_file_id), certificateImage(db, eventId, parsed.presentation.signature_file_id)]);
            const score = percents.length ? percents.reduce((sum, percent) => sum + percent, 0) / percents.length : null;
            const { renderEventCertificate } = await import("./event-certificate-pdf");
            const bytes = await renderEventCertificate({ name: context.full_name, event: context.title, title: parsed.title, number, issuedAt: now, layout: parsed.layout, background, logo, signature, presentation: parsed.presentation, score });
            const path = `activities/${eventId}/${recipientId}/${fileId}.pdf`;
            await this.io.put(activityBucket, path, bytes, "application/pdf"); uploaded.push(path);
            await db.query(`INSERT INTO public.event_activity_files(id,event_id,user_id,purpose,object_path,file_name,content_type,size_bytes,sha256)
              VALUES($1::uuid,$2::uuid,$3::uuid,'certificate',$4,$5,'application/pdf',$6,$7)`, [fileId, eventId, recipientId, path, `${number}.pdf`, bytes.length, createHash("sha256").update(bytes).digest("hex")]);
            await db.query(`INSERT INTO public.certificates(user_id,event_id,template_id,registration_id,certificate_number,issued_at,template_data,pdf_url)
              VALUES($1::uuid,$2::uuid,$3::uuid,$4::uuid,$5,$6,$7::jsonb,$8)`, [recipientId, eventId, template.id, registration.id, number, now,
              JSON.stringify({ file_id: fileId, title: parsed.title, kind: parsed.kind, eligibility: parsed.eligibility, layout: parsed.layout, presentation: parsed.presentation, score }), path]);
            await audit(db, actor, "issue_event_certificate", eventId, { template_id: template.id, registration_id: registration.id, certificate_number: number, eligibility: parsed.eligibility,
              ...(manual ? { manual: true, reason: manual.reason, recipient_id: recipientId } : {}) });
            await activityNotice(db, recipientId, fileId, "certificate_issued", "Your event certificate is ready", `${parsed.title} for ${context.title}. Reference: ${number}.`);
          }
        }
        return (await db.query(`SELECT id,certificate_number,issued_at,revoked_at,template_data->>'title' AS title,
          template_data->>'file_id' AS file_id FROM public.certificates WHERE user_id=$1::uuid AND event_id=$2::uuid
          AND ($3::uuid IS NULL OR template_id=$3::uuid) ORDER BY issued_at DESC`, [recipientId, eventId, manual?.template_id ?? null])).rows;
      });
    } catch (error) { for (const path of uploaded) await this.io.remove(activityBucket, path).catch(() => console.error(JSON.stringify({ event: "certificate_orphan_cleanup_required" }))); throw error; }
  }
  async verifyCertificate(number: string) {
    if (!/^MTCC-[0-9a-f-]{36}$/.test(number)) deny(404, "CERTIFICATE_UNAVAILABLE", "Certificate not found.");
    return this.run(async db => {
      const certificate = (await db.query(`SELECT c.certificate_number,c.issued_at,c.revoked_at,
        c.template_data->>'title' AS title,e.title AS event_title FROM public.certificates c JOIN public.events e ON e.id=c.event_id
        WHERE c.certificate_number=$1 AND c.template_id IS NOT NULL`, [number])).rows[0];
      if (!certificate) deny(404, "CERTIFICATE_UNAVAILABLE", "Certificate not found.");
      return { ...certificate, valid: certificate.revoked_at === null };
    });
  }
  async revokeCertificate(actor: NeonActor, eventId: string, raw: unknown) {
    const input = z.object({ id: uuid, reason: z.string().trim().min(10).max(2000) }).strict().parse(raw);
    return this.run(async db => {
      await admin(db, actor, eventId, "registration_management");
      const result = await db.query(`UPDATE public.certificates SET revoked_at=now() WHERE id=$1::uuid
        AND event_id=$2::uuid AND revoked_at IS NULL RETURNING id`, [input.id, eventId]);
      if (result.rowCount) await audit(db, actor, "revoke_event_certificate", eventId, { certificate_id: input.id, reason: input.reason });
      return { id: input.id, changed: !!result.rowCount };
    });
  }
  async issuedCertificates(actor: NeonActor, eventId: string) {
    return this.run(async db => {
      await admin(db, actor, eventId, "registration_management");
      return (await db.query(`SELECT c.id,c.certificate_number,c.issued_at,c.revoked_at,p.full_name,
        c.template_data->>'title' AS title,c.template_data->>'file_id' AS file_id FROM public.certificates c
        JOIN public.profiles p ON p.user_id=c.user_id WHERE c.event_id=$1::uuid ORDER BY c.issued_at DESC LIMIT 500`, [eventId])).rows;
    });
  }
  async exportRecords(actor: NeonActor, eventId: string, raw: unknown) {
    const kind = z.enum(eventExportKinds).parse(raw);
    return this.run(async db => {
      await admin(db, actor, eventId, "registration_management");
      const queries = {
        participants: `SELECT t.ticket_number,t.attendee_name,t.attendee_email,t.status,t.checked_in_at,r.registration_number FROM public.event_tickets t JOIN public.event_registrations r ON r.id=t.registration_id WHERE t.event_id=$1::uuid AND r.deleted_at IS NULL ORDER BY t.created_at,t.id LIMIT 5000`,
        enrollments: `SELECT r.id,r.user_id,p.full_name,r.registration_number,r.status,r.payment_status,r.total_amount,r.ticket_quantity,r.enrollment_source,r.activity_access,r.access_expires_at,r.access_suspended,r.registered_at FROM public.event_registrations r JOIN public.profiles p ON p.user_id=r.user_id WHERE r.event_id=$1::uuid AND r.deleted_at IS NULL ORDER BY r.registered_at,r.id LIMIT 5000`,
        attempts: `SELECT q.id,q.user_id,p.full_name,a.title,q.state,q.started_at,q.deadline_at,q.completed_at,q.total_score,q.total_marks FROM public.quiz_attempts q JOIN public.event_activities a ON a.id=q.activity_id JOIN public.profiles p ON p.user_id=q.user_id WHERE a.event_id=$1::uuid ORDER BY q.started_at,q.id LIMIT 5000`,
        assignments: `SELECT s.id,s.user_id,p.full_name,a.title,s.revision,s.state,s.file_ids,s.submitted_at,s.is_late,s.marks,s.feedback,s.graded_by,s.graded_at,s.published_at FROM public.event_assignment_submissions s JOIN public.event_activities a ON a.id=s.activity_id JOIN public.profiles p ON p.user_id=s.user_id WHERE a.event_id=$1::uuid ORDER BY s.submitted_at,s.id LIMIT 5000`,
        evaluations: `SELECT v.id,v.submission_id,v.actor_user_id,v.state,v.marks,v.feedback,v.created_at FROM public.event_assignment_reviews v JOIN public.event_assignment_submissions s ON s.id=v.submission_id JOIN public.event_activities a ON a.id=s.activity_id WHERE a.event_id=$1::uuid ORDER BY v.created_at,v.id LIMIT 5000`,
        certificates: `SELECT c.id,c.user_id,p.full_name,c.certificate_number,c.issued_at,c.revoked_at,c.template_data->>'title' AS title FROM public.certificates c JOIN public.profiles p ON p.user_id=c.user_id WHERE c.event_id=$1::uuid ORDER BY c.issued_at,c.id LIMIT 5000`,
      };
      const rows = (await db.query(queries[kind], [eventId])).rows;
      await audit(db, actor, "export_event_records", eventId, { kind, rows: rows.length, limit: 5000 });
      return rows;
    });
  }
  async previewCertificate(actor: NeonActor, eventId: string, raw: unknown) {
    const payload = certificateTemplateSchema.parse(raw);
    return this.run(async db => {
      const event = await admin(db, actor, eventId);
      const [background, logo, signature] = await Promise.all([certificateImage(db, eventId, payload.background_file_id),
        certificateImage(db, eventId, payload.presentation.logo_file_id), certificateImage(db, eventId, payload.presentation.signature_file_id)]);
      const { renderEventCertificate } = await import("./event-certificate-pdf");
      return renderEventCertificate({ name: "Preview recipient / नमूना", event: event.title, title: payload.title,
        number: "PREVIEW - NOT ISSUED OR VALID", issuedAt: new Date(), layout: payload.layout, background, logo, signature, presentation: payload.presentation, score: 80 });
    });
  }
  async management(actor: NeonActor, eventId: string) {
    return this.run(async db => {
      await admin(db, actor, eventId);
      const activities = (await db.query(`SELECT a.*,COALESCE((SELECT array_agg(ticket_type_id) FROM public.event_activity_ticket_access
        WHERE activity_id=a.id),'{}') AS ticket_type_ids,COALESCE((SELECT array_agg(question_id ORDER BY position)
        FROM public.event_activity_questions WHERE activity_id=a.id),'{}') AS question_ids
        FROM public.event_activities a WHERE event_id=$1::uuid ORDER BY opens_at,id`, [eventId])).rows;
      const questions = (await db.query(`SELECT id,question,question_type,options,correct_answer,COALESCE(event_points,points)::float AS points,
        answer_rules,media_file_id,status FROM public.quiz_questions WHERE event_id=$1::uuid ORDER BY created_at,id`, [eventId])).rows;
      const tickets = (await db.query(`SELECT id,name FROM public.event_ticket_types WHERE event_id=$1::uuid AND deleted_at IS NULL ORDER BY name`, [eventId])).rows;
      return { activities, questions, tickets };
    });
  }
  async enrollments(actor: NeonActor, eventId: string, raw?: unknown) {
    const payload = raw === undefined ? undefined : z.object({ id: uuid, activity_ids: z.array(uuid).max(100),
      access_expires_at: z.string().datetime().nullable(), access_suspended: z.boolean(), reason: z.string().trim().min(10).max(2000) }).strict().parse(raw);
    return this.run(async db => {
      await admin(db, actor, eventId, "registration_management");
      if (!payload) return (await db.query(`SELECT r.id,r.user_id,p.full_name,r.status,r.payment_status,r.enrollment_source,
        r.activity_access,r.access_expires_at,r.access_suspended FROM public.event_registrations r
        JOIN public.profiles p ON p.user_id=r.user_id WHERE r.event_id=$1::uuid AND r.deleted_at IS NULL
        ORDER BY r.registered_at DESC LIMIT 500`, [eventId])).rows;
      if (new Set(payload.activity_ids).size !== payload.activity_ids.length || (payload.activity_ids.length &&
        (await db.query(`SELECT id FROM public.event_activities WHERE event_id=$1::uuid AND id=ANY($2::uuid[]) FOR SHARE`, [eventId, payload.activity_ids])).rowCount !== payload.activity_ids.length))
        deny(400, "INVALID_ACTIVITY_SCOPE", "Choose distinct activities belonging to this event.");
      const row = (await db.query<{ activity_access: string[]; access_suspended: boolean; access_expires_at: Date | null }>(`SELECT activity_access,access_suspended,access_expires_at
        FROM public.event_registrations WHERE id=$1::uuid AND event_id=$2::uuid AND deleted_at IS NULL AND status NOT IN ('cancelled','refunded') FOR UPDATE`, [payload.id, eventId])).rows[0];
      if (!row) deny(404, "REGISTRATION_UNAVAILABLE", "Active registration unavailable for this event.");
      if (JSON.stringify([...row.activity_access].sort()) === JSON.stringify([...payload.activity_ids].sort()) && row.access_suspended === payload.access_suspended &&
        (row.access_expires_at ? new Date(row.access_expires_at).toISOString() : null) === payload.access_expires_at) return { id: payload.id, duplicate: true };
      await db.query(`UPDATE public.event_registrations SET activity_access=$3::uuid[],access_suspended=$4,access_expires_at=$5,updated_at=now()
        WHERE id=$1::uuid AND event_id=$2::uuid`, [payload.id, eventId, payload.activity_ids, payload.access_suspended, payload.access_expires_at]);
      await audit(db, actor, "change_event_enrollment_access", eventId, { registration_id: payload.id, before: row,
        activity_ids: payload.activity_ids, suspended: payload.access_suspended, expires_at: payload.access_expires_at, reason: payload.reason });
      return { id: payload.id, duplicate: false };
    });
  }
  async saveQuestion(actor: NeonActor, eventId: string, raw: unknown) {
    const payload = questionSchema.parse(raw);
    return this.run(async db => {
      await admin(db, actor, eventId);
      const id = payload.id ?? randomUUID();
      const mediaIds = [payload.media_file_id, ...payload.options.map(o => o.image_file_id)].filter(Boolean);
      if (mediaIds.length && (await db.query(`SELECT id FROM public.event_activity_files WHERE event_id=$1::uuid
        AND id=ANY($2::uuid[]) AND purpose='question' AND content_type IN ('image/png','image/jpeg','image/webp') FOR SHARE`,
      [eventId, [...new Set(mediaIds)]])).rowCount !== new Set(mediaIds).size) deny(400, "INVALID_MEDIA", "Use question images belonging to this event.");
      const values = [id, eventId, payload.question, payload.question_type, JSON.stringify(payload.options), payload.correct_answer,
        payload.points, JSON.stringify(payload.answer_rules), payload.media_file_id, payload.status];
      const row = payload.id ? (await db.query(`UPDATE public.quiz_questions SET question=$3,question_type=$4,
        options=$5::jsonb,correct_answer=$6,event_points=$7,answer_rules=$8::jsonb,media_file_id=$9::uuid,status=$10
        WHERE id=$1::uuid AND event_id=$2::uuid RETURNING id`, values)).rows[0]
        : (await db.query(`INSERT INTO public.quiz_questions(id,event_id,question,question_type,options,correct_answer,event_points,answer_rules,media_file_id,status)
          VALUES($1::uuid,$2::uuid,$3,$4,$5::jsonb,$6,$7,$8::jsonb,$9::uuid,$10) RETURNING id`, values)).rows[0];
      if (!row) deny(404, "QUESTION_UNAVAILABLE", "Question unavailable for this event.");
      await audit(db, actor, "save_event_question", eventId, { question_id: id });
      return row;
    });
  }
  async saveActivity(actor: NeonActor, eventId: string, raw: unknown, activityId?: string) {
    const payload = activitySchema.parse(raw);
    return this.run(async db => {
      await admin(db, actor, eventId);
      const prior = activityId ? await activityRow(db, eventId, activityId) : null;
      if (prior && prior.kind !== payload.kind) deny(409, "ACTIVITY_KIND_LOCKED", "Create another activity to change its type.");
      if (payload.ticket_type_ids.length && (await db.query(`SELECT id FROM public.event_ticket_types
        WHERE event_id=$1::uuid AND id=ANY($2::uuid[]) AND deleted_at IS NULL FOR SHARE`, [eventId, payload.ticket_type_ids])).rowCount !== payload.ticket_type_ids.length)
        deny(400, "INVALID_TICKET_SCOPE", "All ticket types must belong to this event.");
      const questions = payload.question_ids.length ? await db.query<{ id: string; points: number }>(`SELECT id,COALESCE(event_points,points)::float AS points FROM public.quiz_questions WHERE event_id=$1::uuid
        AND id=ANY($2::uuid[]) AND status='published' FOR SHARE`, [eventId, payload.question_ids]) : { rows: [], rowCount: 0 };
      if (questions.rowCount !== payload.question_ids.length)
        deny(400, "INVALID_QUESTION_SCOPE", "Select published questions belonging to this event.");
      let maximum = payload.max_marks;
      if (payload.kind === "quiz" && questions.rows.length) { maximum = 0; for (const question of questions.rows) maximum += Number(question.points); }
      // Existing attempts have immutable snapshots; future attempts use the saved configuration.
      let quizId = prior?.quiz_id;
      if (!prior && payload.kind === "quiz") quizId = (await db.query<{ id: string }>(`INSERT INTO public.quizzes
        (event_id,title,description,duration_minutes,created_by) VALUES($1::uuid,$2,$3,$4,$5::uuid) RETURNING id`,
      [eventId, payload.title, payload.instructions, Math.ceil(payload.duration_seconds / 60), actor.userId])).rows[0].id;
      const id = activityId ?? randomUUID();
      await db.query(`INSERT INTO public.event_activities(id,event_id,kind,quiz_id,title,instructions,status,opens_at,closes_at,
        duration_seconds,max_attempts,max_marks,results_publish_at,review_answers,created_by,settings)
        VALUES($1::uuid,$2::uuid,$3,$4::uuid,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15::uuid,$16::jsonb)
        ON CONFLICT(id) DO UPDATE SET title=EXCLUDED.title,instructions=EXCLUDED.instructions,status=EXCLUDED.status,
          opens_at=EXCLUDED.opens_at,closes_at=EXCLUDED.closes_at,duration_seconds=EXCLUDED.duration_seconds,
          max_attempts=EXCLUDED.max_attempts,max_marks=EXCLUDED.max_marks,results_publish_at=EXCLUDED.results_publish_at,
          review_answers=EXCLUDED.review_answers,settings=EXCLUDED.settings,updated_at=now()`,
      [id, eventId, payload.kind, quizId ?? null, payload.title, payload.instructions, payload.status, payload.opens_at,
        payload.closes_at, payload.duration_seconds, payload.max_attempts, maximum, payload.results_publish_at, payload.review_answers, actor.userId, JSON.stringify(payload.settings)]);
      await db.query(`DELETE FROM public.event_activity_ticket_access WHERE activity_id=$1::uuid`, [id]);
      for (const ticket of payload.ticket_type_ids) await db.query(`INSERT INTO public.event_activity_ticket_access(event_id,activity_id,ticket_type_id)
        VALUES($1::uuid,$2::uuid,$3::uuid)`, [eventId, id, ticket]);
      await db.query(`DELETE FROM public.event_activity_questions WHERE activity_id=$1::uuid`, [id]);
      for (const [position, question] of payload.question_ids.entries()) await db.query(`INSERT INTO public.event_activity_questions(event_id,activity_id,question_id,position)
        VALUES($1::uuid,$2::uuid,$3::uuid,$4)`, [eventId, id, question, position]);
      await audit(db, actor, "save_event_activity", eventId, { activity_id: id, status: payload.status, existing_purchases_unchanged: true });
      if (payload.results_publish_at) {
        const attempts = (await db.query<{ id: string; user_id: string }>(`SELECT id,user_id FROM public.quiz_attempts
          WHERE activity_id=$1::uuid AND completed_at IS NOT NULL`, [id])).rows;
        for (const attempt of attempts) await activityNotice(db, attempt.user_id, attempt.id, "results_published",
          "Your event results are available", `Results for ${payload.title} are available.`, payload.results_publish_at);
        const submissions = (await db.query<{ id: string; user_id: string }>(`SELECT id,user_id FROM public.event_assignment_submissions
          WHERE activity_id=$1::uuid AND state='published'`, [id])).rows;
        for (const submission of submissions) await activityNotice(db, submission.user_id, submission.id, "published",
          "Assignment review updated", `Results for ${payload.title} are available.`, payload.results_publish_at);
      } else {
        await db.query(`UPDATE public.notifications SET email_delivery_enabled=false WHERE entity_type='event_activity' AND status='queued'
          AND (metadata->>'activity_event'='results_published' AND entity_id IN(SELECT id FROM public.quiz_attempts WHERE activity_id=$1::uuid)
            OR metadata->>'activity_event'='published' AND entity_id IN(SELECT id FROM public.event_assignment_submissions WHERE activity_id=$1::uuid))`, [id]);
      }
      return { id };
    });
  }
  async manualEnroll(actor: NeonActor, eventId: string, raw: unknown) {
    const payload = manualEnrollmentSchema.parse(raw);
    const hash = createHash("sha256").update(JSON.stringify({ ...payload, activity_ids: [...payload.activity_ids].sort() })).digest("hex");
    return this.run(async db => {
      const event = await admin(db, actor, eventId, "registration_management");
      const replay = (await db.query<{ id: string; manual_request_hash: string; enrolled_by: string }>(`SELECT id,manual_request_hash,enrolled_by
        FROM public.event_registrations WHERE manual_request_key=$1::uuid FOR UPDATE`, [payload.idempotency_key])).rows[0];
      if (replay) {
        if (replay.manual_request_hash !== hash || replay.enrolled_by !== actor.userId) deny(409, "IDEMPOTENCY_CONFLICT", "This enrollment key was already used for another request.");
        return { id: replay.id, duplicate: true };
      }
      const student = (await db.query<{ full_name: string; email: string }>(`SELECT full_name,email FROM public.profiles
        WHERE user_id=$1::uuid AND account_status='active' AND deleted_at IS NULL FOR SHARE`, [payload.user_id])).rows[0];
      if (!student) deny(404, "STUDENT_UNAVAILABLE", "Choose an existing active student account.");
      if (payload.access_expires_at && new Date(payload.access_expires_at) <= new Date()) deny(400, "INVALID_EXPIRY", "Access expiry must be in the future.");
      if (new Set(payload.activity_ids).size !== payload.activity_ids.length || (payload.activity_ids.length &&
        (await db.query(`SELECT id FROM public.event_activities WHERE event_id=$1::uuid AND id=ANY($2::uuid[]) FOR SHARE`,
        [eventId, payload.activity_ids])).rowCount !== payload.activity_ids.length)) deny(400, "INVALID_ACTIVITY_SCOPE", "Choose activities belonging to this event.");
      if (payload.ticket_type_id && !(await db.query(`SELECT id FROM public.event_ticket_types WHERE id=$1::uuid
        AND event_id=$2::uuid AND deleted_at IS NULL AND ticket_kind='individual' FOR UPDATE`, [payload.ticket_type_id, eventId])).rowCount)
        deny(400, "INVALID_TICKET_SCOPE", "Manual individual enrollment requires a ticket belonging to this event.");
      await expireNeonPurchaseHolds(db, eventId);
      if ((await db.query(`SELECT id FROM public.event_registrations WHERE event_id=$1::uuid AND user_id=$2::uuid
        AND status NOT IN ('cancelled','refunded') AND deleted_at IS NULL FOR UPDATE`, [eventId, payload.user_id])).rowCount)
        deny(409, "ALREADY_ENROLLED", "This student already has a registration. Update its access explicitly.");
      const reserved = (await db.query<{ count: number }>(`SELECT COALESCE(sum(GREATEST(COALESCE(attendee_count,0),ticket_quantity)),0)::int AS count
        FROM public.event_registrations WHERE event_id=$1::uuid AND status NOT IN ('cancelled','refunded') AND deleted_at IS NULL`, [eventId])).rows[0]?.count ?? 0;
      if (event.capacity && reserved >= event.capacity) deny(409, "EVENT_FULL", "Event capacity has been reached.");
      if (payload.ticket_type_id && (await db.query(`SELECT t.id FROM public.event_ticket_types t WHERE t.id=$1::uuid
        AND t.total_quantity IS NOT NULL AND t.total_quantity<=(SELECT COALESCE(sum(r.ticket_quantity),0)
          FROM public.event_registrations r WHERE r.ticket_type_id=t.id AND r.deleted_at IS NULL AND r.status NOT IN ('cancelled','refunded'))`, [payload.ticket_type_id])).rowCount)
        deny(409, "TICKET_FULL", "Ticket inventory has been reached.");
      const id = randomUUID();
      await db.query(`INSERT INTO public.event_registrations(id,event_id,user_id,ticket_type_id,status,payment_status,ticket_quantity,
        total_amount,attendee_count,activity_access,access_expires_at,enrollment_source,enrolled_by,enrollment_notes,manual_request_key,manual_request_hash,form_data)
        VALUES($1::uuid,$2::uuid,$3::uuid,$4::uuid,'confirmed','not_required',1,0,1,$5::uuid[],$6,'manual',$7::uuid,$8,$9::uuid,$10,$11::jsonb)`,
      [id, eventId, payload.user_id, payload.ticket_type_id, payload.activity_ids, payload.access_expires_at, actor.userId, payload.reason,
        payload.idempotency_key, hash, JSON.stringify({ fullName: student.full_name, email: student.email, manuallyEnrolled: true })]);
      await db.query(`INSERT INTO public.event_tickets(ticket_number,registration_id,event_id,ticket_type_id,user_id,attendee_name,attendee_email,qr_token,status)
        VALUES($1,$2::uuid,$3::uuid,$4::uuid,$5::uuid,$6,$7,$8,'active')`, [`MT-${randomUUID()}`, id, eventId, payload.ticket_type_id,
        payload.user_id, student.full_name || "Attendee", student.email, randomUUID()]);
      await db.query(`INSERT INTO public.audit_logs(actor_user_id,action,entity_type,entity_id,metadata)
        VALUES($1::uuid,'manual_event_enrollment','event_registrations',$2,$3::jsonb)`, [actor.userId, id,
        JSON.stringify({ event_id: eventId, user_id: payload.user_id, reason: payload.reason, payment_waived: true, activity_ids: payload.activity_ids })]);
      const notification = (await db.query<{ id: string }>(`INSERT INTO public.notifications(recipient_id,title,message,type,is_read)
        VALUES($1::uuid,'Event enrollment confirmed',$2,'event_registration',false) RETURNING id`, [payload.user_id, `An authorized organizer enrolled you in ${event.title}.`])).rows[0];
      await appendNotificationEvent(db, payload.user_id, notification.id);
      await queueNeonReservationEmail(db, "event", id, "confirmed");
      return { id, duplicate: false };
    });
  }
  async studentActivities(actor: NeonActor, eventId: string) {
    uuid.parse(eventId);
    return this.run(async db => {
      await assertRoleWorkspaceIdentity(db, actor);
      const registration = await enrollment(db, actor, eventId);
      return (await db.query(`SELECT a.id,event_id,kind,title,instructions,status,opens_at,closes_at,duration_seconds,max_attempts,
        results_publish_at,review_answers,settings,max_marks,(SELECT q.id FROM public.quiz_attempts q WHERE q.activity_id=a.id AND q.user_id=$3::uuid
          ORDER BY q.started_at DESC LIMIT 1) AS last_attempt_id
        FROM public.event_activities a WHERE event_id=$1::uuid AND id=ANY($2::uuid[])
        AND status<>'draft' ORDER BY opens_at,id`, [eventId, registration.activity_access, actor.userId])).rows;
    });
  }
  async attempt(actor: NeonActor, eventId: string, activityId: string, attemptId?: string, raw?: unknown) {
    uuid.parse(eventId); if (attemptId) uuid.parse(attemptId);
    const payload = raw === undefined ? undefined : attemptWriteSchema.parse(raw);
    return this.run(async db => {
      await assertRoleWorkspaceIdentity(db, actor);
      // Lock order matches all organizer changes: event, activity, enrollment, attempt.
      await db.query(`SELECT id FROM public.events WHERE id=$1::uuid FOR SHARE`, [eventId]);
      const activity = await activityRow(db, eventId, activityId);
      const registration = await enrollment(db, actor, eventId, activityId);
      const now = (await db.query<{ now: Date }>(`SELECT clock_timestamp() AS now`)).rows[0].now;
      if (activity.kind !== "quiz") deny(400, "NOT_A_QUIZ", "This activity is not a quiz.");
      let attempt = (await db.query<Attempt>(`SELECT * FROM public.quiz_attempts WHERE activity_id=$1::uuid
        AND user_id=$2::uuid AND ($3::uuid IS NULL AND completed_at IS NULL OR id=$3::uuid)
        ORDER BY started_at DESC LIMIT 1 FOR UPDATE`, [activityId, actor.userId, attemptId ?? null])).rows[0];
      if (attemptId && !attempt) deny(404, "ATTEMPT_UNAVAILABLE", "Attempt unavailable.");
      if (!attempt) {
        if (activity.status !== "published" || now < new Date(activity.opens_at) || now >= new Date(activity.closes_at))
          deny(403, "ACTIVITY_CLOSED", "The quiz is not open.");
        const count = (await db.query<{ count: number }>(`SELECT count(*)::int AS count FROM public.quiz_attempts
          WHERE activity_id=$1::uuid AND user_id=$2::uuid`, [activityId, actor.userId])).rows[0].count;
        if (count >= activity.max_attempts) deny(409, "ATTEMPT_LIMIT", "All permitted attempts have been used.");
        const questions = (await db.query<AssessmentQuestion>(`SELECT q.id,q.question,q.question_type,q.options,q.correct_answer,
          COALESCE(q.event_points,q.points)::float AS points,q.answer_rules,q.media_file_id,q.status FROM public.event_activity_questions aq
          JOIN public.quiz_questions q ON q.id=aq.question_id AND q.event_id=aq.event_id
          WHERE aq.activity_id=$1::uuid ORDER BY aq.position FOR SHARE OF q`, [activityId])).rows.map(q => questionSchema.parse(q) as AssessmentQuestion);
        if (!questions.length) deny(409, "EMPTY_QUIZ", "The organizer has not configured quiz questions.");
        const deadline = new Date(Math.min(now.getTime() + activity.duration_seconds * 1000, new Date(activity.closes_at).getTime()));
        attempt = (await db.query<Attempt>(`INSERT INTO public.quiz_attempts(quiz_id,user_id,activity_id,registration_id,started_at,
          deadline_at,question_snapshot,answers,state,policy_snapshot) VALUES($1::uuid,$2::uuid,$3::uuid,$4::uuid,$5,$6,$7::jsonb,'{}','in_progress',$8::jsonb) RETURNING *`,
        [activity.quiz_id, actor.userId, activityId, registration.id, now, deadline, JSON.stringify(questions), JSON.stringify(activitySettingsSchema.parse(activity.settings))])).rows[0];
      }
      if (attempt.completed_at) return attemptDto(attempt, activity, now);
      if (now >= new Date(attempt.deadline_at) || now >= new Date(activity.closes_at)) {
        attempt = await finish(db, attempt, true);
        return attemptDto(attempt, activity, now);
      }
      if (activity.status !== "published") deny(403, "ACTIVITY_PAUSED", "This activity is currently paused or closed.");
      if (payload) {
        const policy = activitySettingsSchema.parse(attempt.policy_snapshot ?? {});
        if (policy.navigation === "forward_only" && payload.question_index !== attempt.navigation_index)
          return attemptDto(attempt, activity, now); // A stale/retried Next request cannot skip another question.
        for (const [id, answer] of Object.entries(payload.answers)) {
          const q = attempt.question_snapshot.find(question => question.id === id);
          if (!q || (q.question_type === "multiple" ? !Array.isArray(answer) : typeof answer !== "string") ||
            (["single", "boolean", "multiple"].includes(q.question_type) &&
              (Array.isArray(answer) ? answer : answer ? [answer] : []).some(value => !q.options.some(option => option.id === value))))
            deny(400, "INVALID_ANSWER", "Answers must match this attempt's questions and options.");
          if (policy.navigation === "forward_only" && attempt.question_snapshot[attempt.navigation_index]?.id !== id &&
            JSON.stringify(attempt.answers[id]) !== JSON.stringify(answer)) deny(403, "QUESTION_LOCKED", "Previously completed and future questions cannot be changed.");
        }
        const answers = { ...attempt.answers, ...payload.answers };
        if (payload.submit && policy.require_all_answers && attempt.question_snapshot.some(q => !answered(answers[q.id])))
          deny(400, "UNANSWERED_QUESTIONS", "Answer every question before submitting.");
        let index = attempt.navigation_index;
        if (payload.next) {
          if (policy.navigation !== "forward_only" || index >= attempt.question_snapshot.length - 1 || payload.submit)
            deny(400, "INVALID_NAVIGATION", "Use Submit on the final question.");
          if (policy.require_all_answers && !answered(answers[attempt.question_snapshot[index].id]))
            deny(400, "UNANSWERED_QUESTIONS", "Answer the current question before continuing.");
          index++;
        }
        attempt = (await db.query<Attempt>(`UPDATE public.quiz_attempts SET answers=answers || $2::jsonb
          ,navigation_index=$3 WHERE id=$1::uuid AND completed_at IS NULL RETURNING *`, [attempt.id, JSON.stringify(payload.answers), index])).rows[0];
        if (payload.submit) {
          attempt = await finish(db, attempt, false);
          await audit(db, actor, "submit_event_quiz", eventId, { activity_id: activityId, attempt_id: attempt.id });
          await activityNotice(db, actor.userId, attempt.id, "quiz_submitted", "Quiz submitted", `${activity.title} was submitted. Reference: ${attempt.id}.`);
          if (activity.results_publish_at) await activityNotice(db, actor.userId, attempt.id, "results_published",
            "Your event results are available", `Results for ${activity.title} are available.`, activity.results_publish_at);
        }
      }
      return attemptDto(attempt, activity, now);
    });
  }
}
