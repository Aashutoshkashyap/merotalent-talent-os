/** Real HTTP acceptance against the already running disposable staging browser fixture.
 * No production URL, credentials, role fabrication, provider calls or real charges.
 * Start neon-staging-admin-browser-uat.mjs first; its cleanup owns all fixture rows/objects.
 */
import dotenv from "dotenv";
import { createHash } from "node:crypto";
import { PDFDocument } from "pdf-lib";
import { requireNeonMigrationStaging } from "./require-neon-migration-staging.mjs";
dotenv.config({ path: ".migration.env", quiet: true });
requireNeonMigrationStaging(process.env.NEON_STAGING_DATABASE_URL);
const app = "http://localhost:3210", helper = "http://localhost:3223", checks = [];
const check = (condition, name) => { checks.push({ name, pass: !!condition }); if (!condition) throw new Error(name); };
const hash = bytes => createHash("sha256").update(bytes).digest("hex");
async function cookie(role) {
  const response = await fetch(`${helper}/open?role=${role}`, { redirect: "manual", signal: AbortSignal.timeout(10000) });
  check(response.status === 302 && response.headers.get("location")?.startsWith(app), `isolated_${role}_session`);
  return response.headers.getSetCookie().map(value => value.split(";", 1)[0]).join("; ");
}
async function request(auth, path, options = {}) {
  const response = await fetch(`${app}${path}`, { ...options, headers: { ...(auth ? { cookie: auth } : {}),
    ...(options.method ? { Origin: app } : {}), ...(options.body && !(options.body instanceof FormData) ? { "Content-Type": "application/json" } : {}), ...options.headers },
    redirect: "manual", signal: AbortSignal.timeout(45000) });
  return { response, body: response.headers.get("content-type")?.includes("application/json") ? await response.json() : null };
}
try {
  const fixture = await (await fetch(`${helper}/event-fixture`)).json();
  check(fixture.productionWrites === 0 && fixture.eventName?.startsWith("Synthetic Browser Event ") && /^[0-9a-f-]{36}$/.test(fixture.eventId), "synthetic_fixture_only");
  const student = await cookie("student"), organizer = await cookie("events"), base = `/api/v1/events/${fixture.eventId}/activities`;
  const profile = await request(student, "/api/v1/neon-staging/profile");
  check(profile.response.ok, "real_authenticated_staging_profile");
  const activities = await request(student, base);
  check(activities.response.ok, "confirmed_enrollment_activity_access");
  const assignment = activities.body.data.find(row => row.kind === "assignment" && row.title === "Browser verified assignment");
  check(assignment && assignment.event_id === fixture.eventId, "browser_created_assignment_available");
  const doc = await PDFDocument.create(); doc.addPage(); doc.setTitle("Synthetic staging upload acceptance"); const bytes = await doc.save();
  const form = new FormData(); form.append("file", new Blob([bytes], { type: "application/pdf" }), "synthetic-staging-acceptance.pdf"); form.append("purpose", "assignment"); form.append("activityId", assignment.id);
  const upload = await request(student, `${base}/files`, { method: "POST", body: form });
  check(upload.response.ok && upload.body.data.id, "actual_authenticated_multipart_upload");
  const fileId = upload.body.data.id, filePath = `${base}/files?fileId=${fileId}`;
  check((await request(null, filePath)).response.status === 401, "logged_out_private_file_denied");
  check((await request(organizer, filePath)).response.status === 403, "other_uploader_private_path_denied_without_management");
  const download = await request(student, filePath);
  check(download.response.ok, "owner_signed_download_authorized");
  const signed = new URL(download.body.data.signedUrl);
  check(signed.hostname === "br-frosty-haze-azsnybmr.storage.c-3.ap-southeast-1.aws.neon.tech", "download_pinned_to_staging_storage");
  check(hash(new Uint8Array(await (await fetch(signed)).arrayBuffer())) === hash(bytes), "private_download_exact_bytes");
  signed.search = ""; check(!(await fetch(signed)).ok, "anonymous_object_url_denied");
  const input = JSON.stringify({ file_ids: [fileId], comments: "Synthetic HTTP acceptance; no real academic decision." });
  const submissionPath = `${base}/${assignment.id}/submissions`;
  const submitted = await request(student, submissionPath, { method: "POST", body: input });
  check(submitted.response.ok && submitted.body.data.id, "assignment_persisted_via_actual_route");
  const duplicate = await request(student, submissionPath, { method: "POST", body: input });
  check(duplicate.body?.data?.id === submitted.body.data.id && duplicate.body.data.duplicate, "duplicate_submission_idempotent");
  check((await request(student, filePath, { method: "DELETE" })).response.status === 409, "submitted_document_retained");
  const before = await request(student, submissionPath);
  check(before.body.data[0]?.marks === null && before.body.data[0]?.feedback === null, "unpublished_grade_hidden");
  const grade = await request(organizer, base, { method: "POST", body: JSON.stringify({ action: "grade", payload: {
    id: submitted.body.data.id, state: "published", marks: 80, feedback: "Synthetic PDF accepted in isolated staging." } }) });
  check(grade.response.ok, "scoped_organizer_publishes_review");
  const result = await request(student, submissionPath);
  check(Number(result.body.data[0]?.marks) === 80, "student_receives_only_published_result");
  const certs = await request(student, `${base}/certificates`, { method: "POST", body: JSON.stringify({ action: "generate" }) });
  check(certs.response.ok && certs.body.data.length === 1, "eligible_completed_participant_certificate_issued");
  const certificate = certs.body.data[0];
  const certRetry = await request(student, `${base}/certificates`, { method: "POST", body: JSON.stringify({ action: "generate" }) });
  check(certRetry.body.data.length === 1 && certRetry.body.data[0].id === certificate.id, "certificate_issuance_exactly_once");
  const certUrl = await request(student, `${base}/files?fileId=${certificate.file_id}`);
  check(certUrl.response.ok, "recipient_certificate_download_authorized");
  const certBytes = new Uint8Array(await (await fetch(certUrl.body.data.signedUrl)).arrayBuffer());
  check(Buffer.from(certBytes.subarray(0, 5)).toString() === "%PDF-", "actual_certificate_pdf_readable");
  const verify = await request(null, `/api/v1/certificates/verify/${certificate.certificate_number}`);
  check(verify.response.ok && verify.body.data.valid && !JSON.stringify(verify.body).includes("full_name") && !JSON.stringify(verify.body).includes(fixture.studentId), "public_verification_minimal_and_valid");
  check((await request(student, `${base}?export=attempts`)).response.status === 403, "student_cannot_export_participants");
  const exported = await request(organizer, `${base}?export=attempts`);
  check(exported.response.ok && exported.response.headers.get("content-type").startsWith("text/csv"), "scoped_csv_export_actual_route");
  console.log(JSON.stringify({ result: "PASS", checks, certificateNumber: certificate.certificate_number,
    publicVerificationUrl: `${app}/verify/certificates/${certificate.certificate_number}`, productionWrites: 0, providerCalls: 0, credentialsPrinted: false }));
} catch (error) {
  console.error(JSON.stringify({ result: "FAIL", checks, code: /^[a-z_]+$/.test(error?.message ?? "") ? error.message : "HTTP_ACCEPTANCE_FAILED", productionWrites: 0 })); process.exitCode = 1;
}
