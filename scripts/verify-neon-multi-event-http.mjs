/** Same-event and cross-event acceptance through real authenticated HTTP routes.
 * Requires the disposable two-event browser fixture; never accepts production URLs.
 */
import dotenv from "dotenv";
import { randomUUID, createHash } from "node:crypto";
import { PDFDocument } from "pdf-lib";
import { requireNeonMigrationStaging } from "./require-neon-migration-staging.mjs";
dotenv.config({ path: ".migration.env", quiet: true });
requireNeonMigrationStaging(process.env.NEON_STAGING_DATABASE_URL);
const app = "http://localhost:3210", helper = "http://localhost:3223", checks = [];
const check = (value, name) => { checks.push({ name, pass: !!value }); if (!value) throw new Error(name); };
async function session(role) {
  const response = await fetch(`${helper}/open?role=${role}`, { redirect: "manual", signal: AbortSignal.timeout(10000) });
  check(response.status === 302 && response.headers.get("location")?.startsWith(app), `isolated_${role}_session`);
  return response.headers.getSetCookie().map(value => value.split(";", 1)[0]).join("; ");
}
async function request(cookie, path, body, method = body === undefined ? "GET" : "POST") {
  const response = await fetch(`${app}${path}`, { method, headers: { ...(cookie ? { cookie } : {}),
    ...(method !== "GET" ? { Origin: app } : {}), ...(body !== undefined && !(body instanceof FormData) ? { "Content-Type": "application/json" } : {}) },
    body: body === undefined ? undefined : body instanceof FormData ? body : JSON.stringify(body), signal: AbortSignal.timeout(45000) });
  const json = await response.json().catch(() => null);
  return { status: response.status, data: json?.data, error: json?.error };
}
try {
  const fixture = await (await fetch(`${helper}/event-fixture`)).json();
  const a = fixture.eventId, b = fixture.secondEventId;
  check(fixture.productionWrites === 0 && fixture.eventName?.startsWith("Synthetic Browser Event ") && /^[0-9a-f-]{36}$/.test(a) && /^[0-9a-f-]{36}$/.test(b) && a !== b, "two_distinct_synthetic_events_only");
  const organizer = await session("events"), student = await session("student"), base = id => `/api/v1/events/${id}/activities`;
  const workspace = await request(organizer, "/api/v1/neon-staging/role-workspaces?role=events");
  check(workspace.status === 200 && [a, b].every(id => workspace.data.entityOptions.some(option => option.id === id)), "both_authorized_event_workspaces_available");
  const question = await request(organizer, base(a), { action: "question", payload: { question: "Event A only: what is $2+2$?", question_type: "single",
    options: [{ id: "a", text: "4" }, { id: "b", text: "5" }], correct_answer: "a", points: 1, status: "published",
    answer_rules: { negative_marks: 0, tolerance: 0, partial_credit: false, case_sensitive: false, explanation: "Event A key" } } });
  check(question.status === 200, "event_a_question_bank_created");
  const config = { instructions: "Synthetic staging acceptance only.", status: "published", opens_at: new Date(Date.now() - 60000).toISOString(),
    closes_at: new Date(Date.now() + 3600000).toISOString(), duration_seconds: 300, max_attempts: 1, max_marks: 100,
    results_publish_at: new Date(Date.now() - 60000).toISOString(), review_answers: false, ticket_type_ids: [], question_ids: [] };
  const quiz = await request(organizer, base(a), { action: "activity", payload: { ...config, kind: "quiz", title: "Event A — Quiz", question_ids: [question.data.id] } });
  const assignmentA = await request(organizer, base(a), { action: "activity", payload: { ...config, kind: "assignment", title: "Event A — File submission" } });
  const assignmentB = await request(organizer, base(b), { action: "activity", payload: { ...config, kind: "assignment", title: "Event B — Standalone file submission" } });
  check([quiz, assignmentA, assignmentB].every(value => value.status === 200), "combined_and_standalone_activities_created");
  const enroll = (id, activities) => request(organizer, base(id), { action: "enroll", payload: { user_id: fixture.studentId, ticket_type_id: null,
    activity_ids: activities, access_expires_at: null, reason: "Explicit isolated multi-event acceptance enrollment", idempotency_key: randomUUID() } });
  check((await enroll(a, [quiz.data.id, assignmentA.data.id])).status === 200, "event_a_explicit_enrollment");
  check((await request(student, base(b))).status === 403, "event_a_enrollment_does_not_unlock_b");
  check((await enroll(b, [assignmentB.data.id])).status === 200, "event_b_requires_its_own_enrollment");
  const aList = await request(student, base(a)), bList = await request(student, base(b));
  check(aList.data.length === 2 && aList.data.every(row => row.event_id === a), "same_event_quiz_and_assignment_visible_together");
  check(bList.data.length === 1 && bList.data[0].id === assignmentB.data.id && bList.data[0].kind === "assignment", "different_event_upload_only_has_no_quiz_from_a");
  check((await request(student, `${base(b)}/${quiz.data.id}/attempts`, {})).status === 404, "quiz_cannot_be_opened_through_another_event");
  const attempt = await request(student, `${base(a)}/${quiz.data.id}/attempts`, {});
  check(attempt.status === 200 && !JSON.stringify(attempt.data).includes("correct_answer"), "quiz_snapshot_private_and_scoped");
  const submitted = await request(student, `${base(a)}/${quiz.data.id}/attempts?attemptId=${attempt.data.id}`, { answers: { [question.data.id]: "a" }, submit: true }, "PATCH");
  check(submitted.status === 200 && submitted.data.score === 1 && submitted.data.review === null, "event_a_quiz_submitted_without_key_leak");
  const pdf = await PDFDocument.create(); pdf.addPage(); const bytes = await pdf.save();
  const upload = async (event, activity) => { const form = new FormData(); form.append("file", new Blob([bytes], { type: "application/pdf" }), "synthetic-event-assignment.pdf");
    form.append("purpose", "assignment"); form.append("activityId", activity); return request(student, `${base(event)}/files`, form); };
  const fileA = await upload(a, assignmentA.data.id), fileB = await upload(b, assignmentB.data.id);
  check(fileA.status === 200 && fileB.status === 200, "real_private_uploads_in_each_event");
  const submissionPath = (event, activity) => `${base(event)}/${activity}/submissions`;
  check((await request(student, `${base(b)}/files?fileId=${fileA.data.id}`)).status === 404, "event_a_file_not_downloadable_through_b");
  check((await request(student, submissionPath(b, assignmentB.data.id), { file_ids: [fileA.data.id] })).status === 400, "event_a_file_cannot_be_submitted_to_b");
  check((await request(student, submissionPath(a, assignmentA.data.id), { file_ids: [fileB.data.id] })).status === 400, "event_b_file_cannot_be_submitted_to_a");
  const resultA = await request(student, submissionPath(a, assignmentA.data.id), { file_ids: [fileA.data.id], comments: "Event A only" });
  const resultB = await request(student, submissionPath(b, assignmentB.data.id), { file_ids: [fileB.data.id], comments: "Event B only" });
  check(resultA.status === 200 && resultB.status === 200, "own_event_submissions_persisted");
  for (const [event, result, mark] of [[a, resultA, 80], [b, resultB, 60]]) check((await request(organizer, base(event), { action: "grade", payload: {
    id: result.data.id, state: "published", marks: mark, feedback: "Synthetic scoped review only." } })).status === 200, `scoped_grade_${mark}_published`);
  check((await request(organizer, base(b), { action: "grade", payload: { id: resultA.data.id, state: "published", marks: 1, feedback: "Wrong event" } })).status === 404, "cannot_grade_another_events_submission");
  const ownA = await request(student, submissionPath(a, assignmentA.data.id)), ownB = await request(student, submissionPath(b, assignmentB.data.id));
  check(Number(ownA.data[0].marks) === 80 && Number(ownB.data[0].marks) === 60 && ownB.data[0].comments === "Event B only", "grades_and_submission_history_do_not_bleed");
  const layout = { recipient: { x: 421, y: 310, size: 32 }, event: { x: 421, y: 245, size: 21 }, date: { x: 421, y: 180, size: 13 }, reference: { x: 421, y: 60, size: 9 } };
  const template = { title: "Synthetic completion certificate", kind: "completion", background_file_id: null, layout, auto_issue: true, is_active: true,
    eligibility: { activity_ids: [quiz.data.id, assignmentA.data.id], require_attendance: false, minimum_percent: 50 } };
  check((await request(organizer, `${base(b)}/certificates`, { action: "template", payload: template })).status === 400, "certificate_cannot_depend_on_another_events_activities");
  check((await request(organizer, `${base(a)}/certificates`, { action: "template", payload: template })).status === 200, "combined_event_certificate_rules_saved");
  check((await request(organizer, `${base(b)}/certificates`, { action: "template", payload: { ...template, eligibility: { ...template.eligibility, activity_ids: [assignmentB.data.id] } } })).status === 200, "standalone_event_certificate_rules_saved");
  const certA = await request(student, `${base(a)}/certificates`, { action: "generate" }), certB = await request(student, `${base(b)}/certificates`, { action: "generate" });
  check(certA.status === 200 && certB.status === 200 && certA.data.length === 1 && certB.data.length === 1 && certA.data[0].id !== certB.data[0].id, "certificates_remain_independent_per_event");
  check((await request(student, `${base(b)}/files?fileId=${certA.data[0].file_id}`)).status === 404, "certificate_file_cannot_be_read_through_other_event");
  const file = await request(student, `${base(a)}/files?fileId=${fileA.data.id}`), signed = new URL(file.data.signedUrl);
  check(signed.hostname === "br-frosty-haze-azsnybmr.storage.c-3.ap-southeast-1.aws.neon.tech", "storage_remains_pinned_to_staging");
  const downloaded = new Uint8Array(await (await fetch(signed)).arrayBuffer());
  check(createHash("sha256").update(downloaded).digest("hex") === createHash("sha256").update(bytes).digest("hex"), "event_file_download_matches_exact_upload");
  console.log(JSON.stringify({ result: "PASS", checks, eventIds: [a, b], studentBrowserUrl: `${helper}/open?role=student`, organizerBrowserUrl: `${helper}/open?role=events`, productionWrites: 0, providerCalls: 0, charges: 0 }));
} catch (error) {
  console.error(JSON.stringify({ result: "FAIL", checks, code: /^[a-z_0-9]+$/.test(error?.message ?? "") ? error.message : "HTTP_MULTI_EVENT_ACCEPTANCE_FAILED", productionWrites: 0 })); process.exitCode = 1;
}
