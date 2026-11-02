/** Actual staging SQL/policy tests. Every change, including schema, is rolled back. No provider calls. */
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import dotenv from "dotenv";
import pg from "pg";
import { NeonEventActivities, expireEventAttempts } from "@/lib/server/neon-event-activities";
import { NeonEventsRepository } from "@/lib/server/neon-events";
import type { NeonActor } from "@/lib/server/neon-authorization";
import { PDFDocument } from "pdf-lib";
import { createPresignedDownloadUrl, deleteObject, headObject, uploadObject } from "@/lib/server/storage";
import { defaultCertificateLayout } from "@/lib/events/certificate-contract";
import { eventPresentation } from "@/lib/server/neon-event-presentation";
import { NEON_MIGRATION_STAGING_BRANCH_ID, getNeonConfig } from "@/lib/neon/neon-config";

let db: pg.Client, service: NeonEventActivities, owner: NeonActor, student: NeonActor;
let eventId: string, otherEventId: string, ticketId: string, questionId: string, activityId: string;
let serial = 0;
const stored = new Set<string>();
const payload = () => ({ kind: "quiz", title: "Rollback-only staging quiz", instructions: "Test",
  status: "published", opens_at: new Date(Date.now() - 3600000).toISOString(), closes_at: new Date(Date.now() + 3600000).toISOString(),
  duration_seconds: 300, max_attempts: 2, max_marks: 10, results_publish_at: null, review_answers: false,
  ticket_type_ids: [ticketId], question_ids: [questionId] });
async function enroll() {
  return service.manualEnroll(owner, eventId, { user_id: student.userId, ticket_type_id: ticketId,
    activity_ids: [activityId], access_expires_at: null, reason: "Explicit isolated staging policy test", idempotency_key: randomUUID() });
}
describe("actual Neon Event activity runtime (all writes rolled back)", () => {
  beforeAll(async () => {
    const env = dotenv.config({ path: ".migration.env", quiet: true }).parsed ?? {};
    const url = new URL(env.NEON_STAGING_DATABASE_URL ?? "https://invalid.local");
    if (!/^ep-wispy-credit-azt6tgwj(?:-pooler)?\.c-3\.ap-southeast-1\.aws\.neon\.tech$/.test(url.hostname))
      throw new Error("Refusing non-staging database.");
    process.env.MEROTALENT_BACKEND_MODE = "neon-staging";
    process.env.NEON_STAGING_BRANCH_ID = NEON_MIGRATION_STAGING_BRANCH_ID;
    for (const name of ["NEON_STAGING_DATABASE_URL", "NEON_AUTH_BASE_URL", "AWS_ENDPOINT_URL_S3", "AWS_REGION", "AWS_ACCESS_KEY_ID", "AWS_SECRET_ACCESS_KEY"])
      process.env[name] = env[name];
    getNeonConfig();
    db = new pg.Client({ connectionString: url.toString(), connectionTimeoutMillis: 10000 });
    await db.connect(); await db.query("BEGIN");
    await db.query(await readFile("supabase/migrations/20261101190000_event_activity_assessment_runtime.sql", "utf8"));
    await db.query(await readFile("supabase/migrations/20261101200000_event_activity_policy_snapshots.sql", "utf8"));
    await db.query(await readFile("supabase/migrations/20261101210000_event_public_presentation.sql", "utf8"));
    await db.query(await readFile("supabase/migrations/20261101220000_event_quiz_retakes.sql", "utf8"));
    await db.query(await readFile("supabase/migrations/20261101230000_event_certificate_presentation.sql", "utf8"));
    const identity = (await db.query<{ user_id: string; neon_auth_user_id: string }>(`SELECT p.user_id,l.neon_auth_user_id
      FROM public.profiles p JOIN public.neon_application_accounts a ON a.legacy_user_id=p.user_id AND a.status='active'
      JOIN public.neon_identity_links l ON l.application_account_id=a.id AND l.status='verified'
      WHERE p.account_status='active' AND p.deleted_at IS NULL AND EXISTS(SELECT 1 FROM public.user_roles r
        WHERE r.user_id=p.user_id AND r.role IN ('admin','super_admin')) LIMIT 1`)).rows[0];
    if (!identity) throw new Error("Existing verified staging owner identity required; no role grants will be fabricated.");
    owner = { userId: identity.user_id, neonAuthUserId: identity.neon_auth_user_id, roles: ["super_admin"], platformAdmin: true, permissions: [] };
    student = { ...owner, roles: ["talent"], platformAdmin: false };
    service = new NeonEventActivities(async operation => {
      const point = `activity_operation_${++serial}`;
      await db.query(`SAVEPOINT ${point}`);
      try { const result = await operation(db as unknown as pg.PoolClient); await db.query(`RELEASE SAVEPOINT ${point}`); return result; }
      catch (error) { await db.query(`ROLLBACK TO SAVEPOINT ${point}`); throw error; }
    }, { put: async (...args) => { await uploadObject(...args); stored.add(args[1]); }, head: headObject, sign: createPresignedDownloadUrl,
      remove: async (...args) => { await deleteObject(...args); stored.delete(args[1]); } });
  }, 90000);
  beforeEach(async () => {
    await db.query("SAVEPOINT test_case");
    const createEvent = async () => (await db.query<{ id: string }>(`INSERT INTO public.events
      (organizer_user_id,organizer_type,title,event_type,format,start_date,end_date,capacity,ticket_price,currency,is_active,status,approval_status)
      VALUES($1::uuid,'user','Rollback-only activity fixture','free','online',now()-interval '1 day',now()+interval '2 days',5,0,'NPR',true,'published','approved') RETURNING id`, [owner.userId])).rows[0].id;
    eventId = await createEvent(); otherEventId = await createEvent();
    ticketId = (await db.query<{ id: string }>(`INSERT INTO public.event_ticket_types(event_id,name,price,currency,total_quantity,sales_start_at,sales_end_at)
      VALUES($1::uuid,'Rollback free tier',0,'NPR',3,now()-interval '1 hour',now()+interval '1 day') RETURNING id`, [eventId])).rows[0].id;
    questionId = (await service.saveQuestion(owner, eventId, { question: "What is 2+2?", question_type: "single", options: [{ id: "a", text: "4" }, { id: "b", text: "5" }],
      correct_answer: "a", points: 1.5, answer_rules: { negative_marks: 0.5, tolerance: 0, partial_credit: false, case_sensitive: false, explanation: "Addition" }, status: "published" })).id as string;
    activityId = (await service.saveActivity(owner, eventId, payload())).id;
  }, 90000);
  afterEach(async () => {
    for (const path of stored) {
      if (!path.startsWith(`activities/${eventId}/`)) throw new Error("Unexpected staging cleanup target.");
      await deleteObject("event-attachments", path); stored.delete(path);
    }
    await db.query("ROLLBACK TO SAVEPOINT test_case");
  });
  afterAll(async () => { if (db) { await db.query("ROLLBACK").catch(() => undefined); await db.end(); } });

  it("reuses existing tables, applies decimal scoring and denies cross-event question/ticket scope", async () => {
    await expect(service.saveActivity(owner, otherEventId, payload())).rejects.toMatchObject({ code: "INVALID_TICKET_SCOPE" });
    await expect(service.saveActivity(owner, otherEventId, { ...payload(), ticket_type_ids: [] })).rejects.toMatchObject({ code: "INVALID_QUESTION_SCOPE" });
    const management = await service.management(owner, eventId);
    expect(Number(management.questions[0].points)).toBe(1.5);
    expect(management.activities[0].question_ids).toEqual([questionId]);
    await expect(service.management({ ...owner, neonAuthUserId: randomUUID() }, eventId)).rejects.toMatchObject({ code: "ACCESS_DENIED" });
  });
  it("persists public organizer presentation only within verified event scope and rejects unowned media", async () => {
    const run = async <T,>(operation: (client: pg.PoolClient) => Promise<T>) => {
      await db.query("SAVEPOINT presentation_operation");
      try { const result = await operation(db as unknown as pg.PoolClient); await db.query("RELEASE SAVEPOINT presentation_operation"); return result; }
      catch (error) { await db.query("ROLLBACK TO SAVEPOINT presentation_operation"); throw error; }
    };
    const value = { cover_image_url: null, logo_url: null, gallery_urls: [], contact_email: "organizer@example.com", contact_phone: "+977 9800000000" };
    expect(await eventPresentation(owner, eventId, value, run)).toEqual(value);
    expect(await eventPresentation(owner, eventId, undefined, run)).toEqual(value);
    await expect(eventPresentation({ ...owner, neonAuthUserId: randomUUID() }, eventId, value, run)).rejects.toMatchObject({ code: "ACCESS_DENIED" });
    await expect(eventPresentation(owner, eventId, { ...value, logo_url: "another-event/logo.png" }, run)).rejects.toThrow();
    expect((await db.query("SELECT logo_url FROM public.events WHERE id=$1::uuid", [eventId])).rows[0].logo_url).toBeNull();
  });
  it("honors an assigned Event Admin's exact scope and denies expired or unassigned management", async () => {
    const capability = (await db.query<{ id: string }>(`INSERT INTO public.user_module_capabilities(user_id,capability_id,status,expires_at)
      SELECT $1::uuid,id,'active',NULL FROM public.module_capabilities WHERE module_key='events' AND is_active LIMIT 1
      ON CONFLICT(user_id,capability_id) DO UPDATE SET status='active',expires_at=NULL RETURNING id`, [student.userId])).rows[0];
    await db.query(`INSERT INTO public.entity_admin_assignments(user_id,user_capability_id,entity_type,entity_id,status,scopes)
      VALUES($1::uuid,$2::uuid,'event',$3::uuid,'active','{}')`, [student.userId, capability.id, eventId]);
    const entitlement = (await db.query<{ id: string }>(`INSERT INTO public.module_entitlements(user_id,module_key,entity_type,entity_id,source,status,start_at,expires_at,features,reason)
      VALUES($1::uuid,'events','event',$2::uuid,'ADMIN_MANUAL','active',now()-interval '1 second',now()+interval '1 hour',
        '{"event_management":true,"registration_management":true}'::jsonb,'Rollback-only exact-scope policy verification') RETURNING id`, [student.userId, eventId])).rows[0];
    expect((await service.management(student, eventId)).activities).toHaveLength(1);
    await expect(service.management(student, otherEventId)).rejects.toMatchObject({ code: "ENTITY_ACCESS_REQUIRED" });
    await db.query(`UPDATE public.module_entitlements SET start_at=now()-interval '2 hours',expires_at=now()-interval '1 hour' WHERE id=$1::uuid`, [entitlement.id]);
    await expect(service.management(student, eventId)).rejects.toMatchObject({ code: "ENTITY_ACCESS_REQUIRED" });
    await expect(service.manualEnroll(student, eventId, { user_id: student.userId, ticket_type_id: null, activity_ids: [], access_expires_at: null,
      reason: "Must not bypass expired admin scope", idempotency_key: randomUUID() })).rejects.toMatchObject({ code: "ENTITY_ACCESS_REQUIRED" });
  });
  it("manual enrollment is audited, duplicate-safe and does not create a payment", async () => {
    const input = { user_id: student.userId, ticket_type_id: ticketId, activity_ids: [activityId], access_expires_at: null,
      reason: "Authorized staging complimentary entry", idempotency_key: randomUUID() };
    const first = await service.manualEnroll(owner, eventId, input);
    expect(await service.manualEnroll(owner, eventId, input)).toEqual({ id: first.id, duplicate: true });
    await expect(service.manualEnroll(owner, eventId, { ...input, reason: "Different staging reason" })).rejects.toMatchObject({ code: "IDEMPOTENCY_CONFLICT" });
    expect((await db.query(`SELECT id FROM public.payments WHERE reference_id=$1::uuid`, [first.id])).rowCount).toBe(0);
    expect((await db.query(`SELECT id FROM public.event_tickets WHERE registration_id=$1::uuid`, [first.id])).rowCount).toBe(1);
    expect((await service.studentActivities(student, eventId)).map(row => row.id)).toEqual([activityId]);
  });
  it("free checkout captures purchased activity access and respects independent sale windows", async () => {
    const registration = await new NeonEventsRepository().registerForEvent(student, { eventId, ticketTypeId: ticketId }, db as unknown as pg.PoolClient);
    expect(registration.status).toBe("confirmed");
    await service.saveActivity(owner, eventId, { ...payload(), ticket_type_ids: [] }, activityId);
    expect((await service.studentActivities(student, eventId)).map(row => row.id)).toEqual([activityId]);
  });
  it("a paid/pending or forged confirmed registration grants no activity access", async () => {
    await db.query(`INSERT INTO public.event_registrations(event_id,user_id,status,payment_status,ticket_quantity,total_amount,activity_access)
      VALUES($1::uuid,$2::uuid,'confirmed','success',1,10,ARRAY[$3::uuid])`, [eventId, student.userId, activityId]);
    await expect(service.studentActivities(student, eventId)).rejects.toMatchObject({ code: "EVENT_ENROLLMENT_REQUIRED" });
    await expect(service.attempt(student, eventId, activityId)).rejects.toMatchObject({ code: "EVENT_ENROLLMENT_REQUIRED" });
  });
  it("accepts matching server-settlement ledger evidence but rejects an amount mismatch (policy fixture, not a payment)", async () => {
    const paymentId = randomUUID();
    const registration = (await db.query<{ id: string }>(`INSERT INTO public.event_registrations(event_id,user_id,status,payment_status,ticket_quantity,total_amount,activity_access)
      VALUES($1::uuid,$2::uuid,'confirmed','success',1,10,ARRAY[$3::uuid]) RETURNING id`, [eventId, student.userId, activityId])).rows[0];
    await db.query(`INSERT INTO public.payments(id,user_id,payment_type,reference_id,amount,currency,status,gateway,gateway_transaction_id,metadata)
      VALUES($1::uuid,$2::uuid,'event_ticket',$3::uuid,10,'NPR','success','esewa','STAGING_POLICY_ONLY_NOT_A_PROVIDER_PAYMENT',
        '{"provider_status":"successful","test_only":true}'::jsonb)`, [paymentId, student.userId, registration.id]);
    const checkout = (await db.query<{ id: string }>(`INSERT INTO public.payment_checkout_sessions(user_id,entity_type,entity_id,provider_name,provider_reference,amount,currency,status)
      VALUES($1::uuid,'event_registration',$2::uuid,'esewa',$3,10,'NPR','successful') RETURNING id`, [student.userId, registration.id, paymentId])).rows[0];
    await db.query(`UPDATE public.event_registrations SET payment_id=$2::uuid WHERE id=$1::uuid`, [registration.id, paymentId]);
    expect((await service.studentActivities(student, eventId)).map(row => row.id)).toEqual([activityId]);
    await db.query(`UPDATE public.payment_checkout_sessions SET amount=9 WHERE id=$1::uuid`, [checkout.id]);
    await expect(service.studentActivities(student, eventId)).rejects.toMatchObject({ code: "EVENT_ENROLLMENT_REQUIRED" });
  });
  it("snapshots questions privately, resumes one attempt, saves and grades exactly once", async () => {
    await enroll();
    const first = await service.attempt(student, eventId, activityId);
    expect(await service.attempt(student, eventId, activityId)).toMatchObject({ id: first.id });
    expect(JSON.stringify(first)).not.toContain("correct_answer");
    expect(JSON.stringify(first)).not.toContain("Addition");
    const submitted = await service.attempt(student, eventId, activityId, first.id, { answers: { [questionId]: "a" }, submit: true });
    expect(submitted).toMatchObject({ state: "submitted", score: null, review: null });
    const duplicate = await service.attempt(student, eventId, activityId, first.id, { answers: { [questionId]: "b" }, submit: true });
    expect(duplicate.answers).toEqual({ [questionId]: "a" });
    expect((await db.query(`SELECT total_score::float FROM public.quiz_attempts WHERE id=$1::uuid`, [first.id])).rows[0].total_score).toBe(1.5);
    await service.saveQuestion(owner, eventId, { id: questionId, question: "Changed after start", question_type: "single", options: [{ id: "a", text: "4" }, { id: "b", text: "5" }], correct_answer: "b", points: 2,
      answer_rules: { negative_marks: 0, tolerance: 0, partial_credit: false, case_sensitive: false, explanation: "New key" }, status: "published" });
    expect((await service.attempt(student, eventId, activityId, first.id)).questions[0].question).toBe("What is 2+2?");
  });
  it("rejects unknown answers and never accepts an answer after the server deadline", async () => {
    await enroll(); const first = await service.attempt(student, eventId, activityId);
    await expect(service.attempt(student, eventId, activityId, first.id, { answers: { [randomUUID()]: "a" } })).rejects.toMatchObject({ code: "INVALID_ANSWER" });
    await expect(service.attempt(student, eventId, activityId, first.id, { answers: { [questionId]: "forged" } })).rejects.toMatchObject({ code: "INVALID_ANSWER" });
    await db.query(`UPDATE public.quiz_attempts SET deadline_at=now()-interval '1 second' WHERE id=$1::uuid`, [first.id]);
    expect(await expireEventAttempts(db as unknown as pg.PoolClient, eventId)).toBe(1);
    expect(await expireEventAttempts(db as unknown as pg.PoolClient, eventId)).toBe(0);
    const expired = await service.attempt(student, eventId, activityId, first.id, { answers: { [questionId]: "a" }, submit: true });
    expect(expired).toMatchObject({ state: "expired", answers: {}, review: null });
  });
  it("allows only configured Event retakes while retaining course uniqueness", async () => {
    await enroll(); const first = await service.attempt(student, eventId, activityId);
    await service.attempt(student, eventId, activityId, first.id, { answers: {}, submit: true });
    const second = await service.attempt(student, eventId, activityId);
    expect(second.id).not.toBe(first.id);
    expect((await service.attempt(student, eventId, activityId)).id).toBe(second.id);
    await service.attempt(student, eventId, activityId, second.id, { answers: { [questionId]: "a" }, submit: true });
    await expect(service.attempt(student, eventId, activityId)).rejects.toMatchObject({ code: "ATTEMPT_LIMIT" });
    const courseQuiz = (await db.query<{ id: string }>(`INSERT INTO public.quizzes(title) VALUES('Rollback-only legacy uniqueness') RETURNING id`)).rows[0];
    await db.query(`INSERT INTO public.quiz_attempts(quiz_id,user_id) VALUES($1::uuid,$2::uuid)`, [courseQuiz.id, student.userId]);
    await db.query("SAVEPOINT legacy_duplicate");
    await expect(db.query(`INSERT INTO public.quiz_attempts(quiz_id,user_id) VALUES($1::uuid,$2::uuid)`, [courseQuiz.id, student.userId])).rejects.toMatchObject({ code: "23505" });
    await db.query("ROLLBACK TO SAVEPOINT legacy_duplicate");
  });
  it("enforces forward-only navigation, required answers, immutable policy and idempotent Next", async () => {
    const second = (await service.saveQuestion(owner, eventId, { question: "What is 3+3?", question_type: "single", options: [{ id: "a", text: "6" }, { id: "b", text: "7" }],
      correct_answer: "a", points: 1, answer_rules: { negative_marks: 0, tolerance: 0, partial_credit: false, case_sensitive: false, explanation: "Addition" }, status: "published" })).id as string;
    await service.saveActivity(owner, eventId, { ...payload(), question_ids: [questionId, second], settings: { navigation: "forward_only", require_all_answers: true } }, activityId);
    await enroll(); const first = await service.attempt(student, eventId, activityId);
    expect(first).toMatchObject({ question_count: 2, question_index: 0, navigation: "forward_only" }); expect(first.questions).toHaveLength(1);
    await expect(service.attempt(student, eventId, activityId, first.id, { answers: { [second]: "a" }, question_index: 0 })).rejects.toMatchObject({ code: "QUESTION_LOCKED" });
    await expect(service.attempt(student, eventId, activityId, first.id, { answers: {}, next: true, question_index: 0 })).rejects.toMatchObject({ code: "UNANSWERED_QUESTIONS" });
    await expect(service.attempt(student, eventId, activityId, first.id, { answers: { [questionId]: "a" }, submit: true, question_index: 0 })).rejects.toMatchObject({ code: "UNANSWERED_QUESTIONS" });
    const next = { answers: { [questionId]: "a" }, next: true, question_index: 0 };
    expect(await service.attempt(student, eventId, activityId, first.id, next)).toMatchObject({ question_index: 1 });
    expect(await service.attempt(student, eventId, activityId, first.id, next)).toMatchObject({ question_index: 1 });
    await service.saveActivity(owner, eventId, { ...payload(), question_ids: [questionId, second], settings: { navigation: "free", require_all_answers: false } }, activityId);
    await expect(service.attempt(student, eventId, activityId, first.id, { answers: { [questionId]: "b" }, question_index: 1 })).rejects.toMatchObject({ code: "QUESTION_LOCKED" });
    expect(await service.attempt(student, eventId, activityId, first.id, { answers: { [second]: "a" }, submit: true, question_index: 1 })).toMatchObject({ state: "submitted", navigation: "forward_only" });
  }, 90000);
  it("enforces activity windows, pauses, registration suspension and expiry", async () => {
    const registration = await enroll();
    await db.query(`UPDATE public.event_registrations SET access_suspended=true WHERE id=$1::uuid`, [registration.id]);
    await expect(service.attempt(student, eventId, activityId)).rejects.toMatchObject({ code: "EVENT_ENROLLMENT_REQUIRED" });
    await db.query(`UPDATE public.event_registrations SET access_suspended=false,access_expires_at=now()-interval '1 second' WHERE id=$1::uuid`, [registration.id]);
    await expect(service.attempt(student, eventId, activityId)).rejects.toMatchObject({ code: "EVENT_ENROLLMENT_REQUIRED" });
    await db.query(`UPDATE public.event_registrations SET access_expires_at=NULL WHERE id=$1::uuid`, [registration.id]);
    await db.query(`UPDATE public.event_activities SET status='paused' WHERE id=$1::uuid`, [activityId]);
    await expect(service.attempt(student, eventId, activityId)).rejects.toMatchObject({ code: "ACTIVITY_CLOSED" });
  });
  it("reveals scores only after publication and answers only after explicit post-close review", async () => {
    await enroll(); const first = await service.attempt(student, eventId, activityId);
    await service.attempt(student, eventId, activityId, first.id, { answers: { [questionId]: "a" }, submit: true });
    await db.query(`UPDATE public.event_activities SET results_publish_at=now()-interval '1 second',review_answers=true WHERE id=$1::uuid`, [activityId]);
    expect(await service.attempt(student, eventId, activityId, first.id)).toMatchObject({ score: 1.5, review: null });
    await db.query(`UPDATE public.event_activities SET opens_at=now()-interval '2 days',closes_at=now()-interval '1 second' WHERE id=$1::uuid`, [activityId]);
    expect((await service.attempt(student, eventId, activityId, first.id)).review).toEqual([{ id: questionId, correct_answer: "a", explanation: "Addition" }]);
  });
  it("audits explicit purchased-access changes and cannot scope them into another event", async () => {
    const registration = await enroll();
    const input = { id: registration.id, activity_ids: [], access_suspended: true, access_expires_at: null, reason: "Explicit staging access revocation" };
    await service.enrollments(owner, eventId, input);
    expect(await service.enrollments(owner, eventId, input)).toMatchObject({ duplicate: true });
    await expect(service.enrollments(owner, otherEventId, { ...input, activity_ids: [activityId] })).rejects.toMatchObject({ code: "INVALID_ACTIVITY_SCOPE" });
    await expect(service.studentActivities(student, eventId)).rejects.toMatchObject({ code: "EVENT_ENROLLMENT_REQUIRED" });
    expect((await db.query(`SELECT id FROM public.audit_logs WHERE action='change_event_enrollment_access' AND entity_id=$1`, [eventId])).rowCount).toBe(1);
  });
  it("uploads real private staging objects, retains submissions and publishes reviewed grades separately", async () => {
    const assignmentId = (await service.saveActivity(owner, eventId, { ...payload(), kind: "assignment", question_ids: [], max_attempts: 2 })).id;
    const registration = await enroll();
    await service.enrollments(owner, eventId, { id: registration.id, activity_ids: [activityId, assignmentId], access_suspended: false,
      access_expires_at: null, reason: "Include staging assignment activity" });
    const pdf = await PDFDocument.create(); pdf.addPage();
    const file = await service.uploadFile(student, eventId, { purpose: "assignment", activityId: assignmentId, fileName: "staging-submission.pdf", bytes: await pdf.save() });
    const signed = await service.fileUrl(student, eventId, file.id);
    const downloaded = await fetch(signed.signedUrl);
    expect(downloaded.ok).toBe(true); expect((await downloaded.arrayBuffer()).byteLength).toBe(file.size_bytes);
    const unsigned = new URL(signed.signedUrl); unsigned.search = "";
    expect((await fetch(unsigned)).ok).toBe(false);
    await expect(service.uploadFile({ ...student, neonAuthUserId: randomUUID() }, eventId,
      { purpose: "assignment", activityId: assignmentId, fileName: "denied.pdf", bytes: await pdf.save() })).rejects.toMatchObject({ code: "ACCESS_DENIED" });
    await expect(service.assignment(student, eventId, assignmentId, { file_ids: [randomUUID()] })).rejects.toMatchObject({ code: "INVALID_SUBMISSION_FILES" });
    const submission = await service.assignment(student, eventId, assignmentId, { file_ids: [file.id], comments: "Staging revision" }) as { id: string };
    expect(await service.assignment(student, eventId, assignmentId, { file_ids: [file.id], comments: "Staging revision" })).toMatchObject({ id: submission.id, duplicate: true });
    await expect(service.deleteUnusedFile(student, eventId, file.id)).rejects.toMatchObject({ code: "FILE_RETAINED" });
    await expect(service.reviewAssignments(owner, eventId, { id: submission.id, state: "published", marks: 99999, feedback: "Invalid" })).rejects.toMatchObject({ code: "INVALID_GRADE" });
    await service.reviewAssignments(owner, eventId, { id: submission.id, state: "published", marks: 8, feedback: "Reviewed" });
    const hidden = await service.assignment(student, eventId, assignmentId) as Array<{ marks: number | null; feedback: string | null }>;
    expect(hidden[0]).toMatchObject({ marks: null, feedback: null });
    await service.saveActivity(owner, eventId, { ...payload(), kind: "assignment", question_ids: [], max_attempts: 2,
      results_publish_at: new Date(Date.now() - 1000).toISOString() }, assignmentId);
    expect((await service.assignment(student, eventId, assignmentId) as Array<{ feedback: string }>)[0].feedback).toBe("Reviewed");
    expect((await db.query(`SELECT id FROM public.event_assignment_reviews WHERE submission_id=$1::uuid`, [submission.id])).rowCount).toBe(1);
    const unused = await service.uploadFile(student, eventId, { purpose: "assignment", activityId: assignmentId, fileName: "unused.pdf", bytes: await pdf.save() });
    expect(await service.deleteUnusedFile(student, eventId, unused.id)).toMatchObject({ deleted: true });
    await expect(service.fileUrl(student, eventId, unused.id)).rejects.toMatchObject({ code: "FILE_UNAVAILABLE" });
  }, 90000);
  it("issues a real eligible PDF exactly once, preserves privacy and honors revocation", async () => {
    await enroll();
    const template = await service.certificateTemplates(owner, eventId, { title: "Staging completion certificate", kind: "completion", background_file_id: null,
      layout: defaultCertificateLayout, auto_issue: true, is_active: true, eligibility: { require_attendance: false, activity_ids: [activityId], minimum_percent: 50 } }) as { id: string };
    expect(await service.myCertificates(student, eventId, true)).toEqual([]);
    const first = await service.attempt(student, eventId, activityId);
    await service.attempt(student, eventId, activityId, first.id, { answers: { [questionId]: "a" }, submit: true });
    expect(await service.myCertificates(student, eventId, true)).toEqual([]);
    await service.saveActivity(owner, eventId, { ...payload(), results_publish_at: new Date(Date.now() - 1000).toISOString() }, activityId);
    const issued = await service.myCertificates(student, eventId, true);
    expect(issued).toHaveLength(1);
    expect(await service.myCertificates(student, eventId, true)).toHaveLength(1);
    const url = await service.fileUrl(student, eventId, String(issued[0].file_id));
    expect((await fetch(url.signedUrl)).ok).toBe(true);
    const verified = await service.verifyCertificate(String(issued[0].certificate_number));
    expect(verified.valid).toBe(true); expect(verified).not.toHaveProperty("full_name"); expect(verified).not.toHaveProperty("user_id");
    await service.revokeCertificate(owner, eventId, { id: issued[0].id, reason: "Staging revocation policy test" });
    expect((await service.verifyCertificate(String(issued[0].certificate_number))).valid).toBe(false);
    await expect(service.fileUrl(student, eventId, String(issued[0].file_id))).rejects.toMatchObject({ code: "FILE_ACCESS_DENIED" });
    expect((await db.query(`SELECT id FROM public.certificates WHERE template_id=$1::uuid`, [template.id])).rowCount).toBe(1);
  }, 90000);
  it("manual certificate issuance uses real scoped authority and the same eligibility, without impersonation", async () => {
    await enroll();
    const template = await service.certificateTemplates(owner, eventId, { title: "Manual completion", kind: "completion", background_file_id: null,
      layout: defaultCertificateLayout, auto_issue: false, is_active: true, eligibility: { require_attendance: false, activity_ids: [activityId], minimum_percent: 50 } }) as { id: string };
    const manual = { user_id: student.userId, template_id: template.id, reason: "Explicit rollback-only manual issuance" };
    expect(await service.myCertificates(owner, eventId, true, manual)).toEqual([]);
    await expect(service.myCertificates({ ...owner, neonAuthUserId: randomUUID() }, eventId, true, manual)).rejects.toMatchObject({ code: "ACCESS_DENIED" });
    await expect(service.myCertificates(owner, otherEventId, true, manual)).rejects.toMatchObject({ code: "EVENT_ENROLLMENT_REQUIRED" });
    const attempt = await service.attempt(student, eventId, activityId);
    await service.attempt(student, eventId, activityId, attempt.id, { answers: { [questionId]: "a" }, submit: true });
    await service.saveActivity(owner, eventId, { ...payload(), results_publish_at: new Date(Date.now() - 1000).toISOString() }, activityId);
    expect(await service.myCertificates(student, eventId, true)).toEqual([]);
    expect(await service.myCertificates(owner, eventId, true, manual)).toHaveLength(1);
    expect(await service.myCertificates(owner, eventId, true, manual)).toHaveLength(1);
    expect((await db.query(`SELECT id FROM public.audit_logs WHERE action='issue_event_certificate' AND entity_id=$1 AND metadata->>'manual'='true'`, [eventId])).rowCount).toBe(1);
  }, 90000);
  it("exports only the authorized event, includes real assessment records and no bearer tokens", async () => {
    await enroll();
    const first = await service.attempt(student, eventId, activityId);
    await service.attempt(student, eventId, activityId, first.id, { answers: {}, submit: true });
    for (const kind of ["participants", "enrollments", "attempts", "assignments", "evaluations", "certificates"]) {
      const rows = await service.exportRecords(owner, eventId, kind);
      expect(JSON.stringify(rows)).not.toContain("qr_token"); expect(JSON.stringify(rows)).not.toContain("question_snapshot");
    }
    expect(await service.exportRecords(owner, otherEventId, "attempts")).toEqual([]);
    await expect(service.exportRecords({ ...owner, neonAuthUserId: randomUUID() }, eventId, "attempts")).rejects.toMatchObject({ code: "ACCESS_DENIED" });
    await expect(service.exportRecords(owner, eventId, "secrets")).rejects.toThrow();
  });
  it("enforces configured assignment formats, size/count, late flags and explicit resubmission policy", async () => {
    const settings = { allowed_extensions: ["pdf"], max_file_bytes: 100000, max_files: 1, allow_late: true,
      late_until: new Date(Date.now() + 3600000).toISOString(), allow_resubmission: false, evaluation_criteria: "Staging criterion" };
    const assignment = { ...payload(), kind: "assignment", question_ids: [], max_attempts: 3, settings,
      closes_at: new Date(Date.now() - 60000).toISOString() };
    const id = (await service.saveActivity(owner, eventId, assignment)).id;
    const registration = await enroll();
    await service.enrollments(owner, eventId, { id: registration.id, activity_ids: [id], access_suspended: false, access_expires_at: null, reason: "Staging assignment policy verification" });
    await expect(service.uploadFile(student, eventId, { purpose: "assignment", activityId: id, fileName: "not-permitted.png", bytes: new Uint8Array([1]) })).rejects.toMatchObject({ code: "ASSIGNMENT_FILE_POLICY" });
    const pdf = await PDFDocument.create(); pdf.addPage();
    const file = await service.uploadFile(student, eventId, { purpose: "assignment", activityId: id, fileName: "late.pdf", bytes: await pdf.save() });
    await expect(service.assignment(student, eventId, id, { file_ids: [file.id, file.id] })).rejects.toMatchObject({ code: "ASSIGNMENT_FILE_POLICY" });
    const submitted = await service.assignment(student, eventId, id, { file_ids: [file.id], comments: "First" }) as { id: string };
    expect((await db.query(`SELECT is_late FROM public.event_assignment_submissions WHERE id=$1::uuid`, [submitted.id])).rows[0].is_late).toBe(true);
    await expect(service.assignment(student, eventId, id, { file_ids: [file.id], comments: "Second" })).rejects.toMatchObject({ code: "RESUBMISSION_DENIED" });
    await service.saveActivity(owner, eventId, { ...assignment, settings: { ...settings, allow_resubmission: true } }, id);
    await expect(service.assignment(student, eventId, id, { file_ids: [file.id], comments: "Second" })).resolves.toHaveProperty("id");
  }, 90000);
});
