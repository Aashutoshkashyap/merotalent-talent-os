/** Controlled Jobs HTTP UAT. Synthetic data is isolated to Neon migration-staging. */
import { randomBytes, randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";
import dotenv from "dotenv";
import pg from "pg";
import { S3Client, DeleteObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import { requireNeonMigrationStaging } from "./require-neon-migration-staging.mjs";
import {stagingUatOrigin} from './staging-uat-origin.mjs';

dotenv.config({ path: ".migration.env", quiet: true });
requireNeonMigrationStaging(process.env.NEON_STAGING_DATABASE_URL);
const auth = process.env.NEON_AUTH_BASE_URL;
if (auth !== "https://ep-wispy-credit-azt6tgwj.neonauth.c-3.ap-southeast-1.aws.neon.tech/neondb/auth") {
  throw new Error("Refusing Jobs UAT: wrong Managed Auth branch.");
}
const app = stagingUatOrigin();
const runId = randomBytes(6).toString("hex");
const studentId = randomUUID();
const recruiterId = randomUUID();
const checks = [];
const db = new pg.Client({ connectionString: process.env.NEON_STAGING_DATABASE_URL, connectionTimeoutMillis: 10000 });
let companyId = null;
let jobId = null;
let otherJobId = null;
let resumeJobId = null;
let uploadedResumePath = null;
const retainedResumePaths = [];
let uploadedDocumentPath = null;
let agedDraftPath = null;
let connected = false;

function check(ok, label) {
  checks.push({ check: label, pass: !!ok });
  if (!ok) throw new Error(`Jobs UAT failed: ${label}`);
}
function cookieOf(response) {
  return response.headers.getSetCookie().map(value => value.split(";", 1)[0]).join("; ");
}
async function signup(kind) {
  const email = `neon-jobs-${kind}-${runId}@example.com`;
  const password = randomBytes(32).toString("base64url");
  const response = await fetch(`${auth}/sign-up/email`, {
    method: "POST", headers: { "content-type": "application/json", origin: app },
    body: JSON.stringify({ email, name: `Neon Jobs ${kind}`, password }),
    redirect: "manual", signal: AbortSignal.timeout(30000),
  });
  check(response.ok, `${kind} isolated Managed Auth signup`);
  const cookie = cookieOf(response);
  check(!!cookie, `${kind} session cookie issued`);
  const sessionResponse = await fetch(`${auth}/get-session`, { headers: { cookie }, cache: "no-store" });
  const session = await sessionResponse.json();
  check(sessionResponse.ok && session?.user?.id === session?.session?.userId,
    `${kind} real Managed Auth session`);
  return { email, password, cookie, subject: session.user.id };
}
async function request(path, { method = "GET", cookie = "", body, headers = {} } = {}) {
  for (let attempt = 0; attempt < 2; attempt++) {
    const response = await fetch(`${app}${path}`, {
      method, headers: { ...(cookie ? { cookie } : {}), ...(body ? { "content-type": "application/json" } : {}),
        ...(method !== "GET" ? { origin: app } : {}), ...headers },
      ...(body ? { body: JSON.stringify(body) } : {}), cache: "no-store", signal: AbortSignal.timeout(30000),
    });
    const json = await response.json().catch(() => null);
    if (response.status !== 503 || method !== "GET" || attempt === 1) return { status: response.status, json };
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  throw new Error("Unreachable bounded request retry state.");
}
async function link(subject, profileId, email, name) {
  await db.query(`INSERT INTO public.profiles(user_id,email,full_name,phone,location,education)
    VALUES ($1::uuid,$2,$3,'9800000000','Kathmandu','Bachelor')`, [profileId, email, name]);
  const [account] = (await db.query(`INSERT INTO public.neon_application_accounts(legacy_user_id)
    VALUES ($1::uuid) RETURNING id`, [profileId])).rows;
  await db.query(`INSERT INTO public.neon_identity_links
    (neon_auth_user_id,application_account_id,status,verification_method,verified_at)
    VALUES ($1::uuid,$2::uuid,'verified','isolated_staging_synthetic_signup',now())`, [subject, account.id]);
}

try {
  await db.connect(); connected = true;
  check((await request("/api/v1/jobs/saved")).status === 401, "unauthenticated private request 401");
  check((await request("/api/v1/jobs/saved", { cookie: "better-auth.session_token=invalid" })).status === 401,
    "invalid session 401");
  const student = await signup("student");
  const recruiter = await signup("recruiter");
  check((await request("/api/v1/jobs/saved", { cookie: student.cookie })).status === 403,
    "unlinked account denied");
  await db.query("BEGIN");
  try {
    await link(student.subject, studentId, student.email, "Staging Jobs Student");
    await link(recruiter.subject, recruiterId, recruiter.email, "Staging Jobs Recruiter");
    companyId = (await db.query(`INSERT INTO public.companies(user_id,name)
      VALUES ($1::uuid,'Neon Jobs HTTP UAT') RETURNING id`, [recruiterId])).rows[0].id;
    jobId = (await db.query(`INSERT INTO public.jobs
      (company_id,title,description,status,approval_status,is_active,application_deadline)
      VALUES ($1::uuid,'Neon HTTP UAT Role','Synthetic staging job','published','approved',true,
              now()+interval '1 day') RETURNING id`, [companyId])).rows[0].id;
    otherJobId = (await db.query(`INSERT INTO public.jobs
      (title,description,status,approval_status,is_active)
      VALUES ('Other Neon HTTP UAT Role','Unrelated job','published','approved',true) RETURNING id`)).rows[0].id;
    const [capability] = (await db.query(`INSERT INTO public.user_module_capabilities
      (user_id,capability_id,status)
      SELECT $1::uuid,id,'active' FROM public.module_capabilities WHERE module_key='jobs'
      RETURNING id`, [recruiterId])).rows;
    await db.query(`INSERT INTO public.entity_admin_assignments
      (user_id,user_capability_id,entity_type,entity_id,status)
      VALUES ($1::uuid,$2::uuid,'company',$3::uuid,'active')`, [recruiterId, capability.id, companyId]);
    await db.query(`INSERT INTO public.module_entitlements
      (user_id,module_key,entity_type,entity_id,source,status,features)
      VALUES ($1::uuid,'jobs','company',$2::uuid,'ADMIN_MANUAL','active',
              '{"job_applications":true}'::jsonb)`, [recruiterId, companyId]);
    await db.query("COMMIT");
  } catch (error) { await db.query("ROLLBACK"); throw error; }

  const browserSignIn = await fetch(`${app}/api/v1/neon-staging/auth/sign-in/email`, {
    method: "POST", headers: { "content-type": "application/json", origin: app },
    body: JSON.stringify({ email: student.email, password: student.password }),
    redirect: "manual", signal: AbortSignal.timeout(30000),
  });
  check(browserSignIn.ok && !!cookieOf(browserSignIn), "same-origin Managed Auth browser sign-in bridge");
  student.cookie = cookieOf(browserSignIn);
  const ownProfile = await request("/api/v1/neon-staging/profile", { cookie: student.cookie });
  check(ownProfile.status === 200 && ownProfile.json?.data?.user_id === studentId,
    "student loads own employment profile through verified session");
  const profileUpdate = await request("/api/v1/neon-staging/profile", {
    method: "PATCH", cookie: student.cookie,
    body: { phone: "9800000001", education: "Bachelor of Computing",
      skills: ["TypeScript", "PostgreSQL"],
      education_history: [{ institution: "Staging University", degree: "BSc" }],
      experience_history: [{ organization: "Staging Employer", role: "Engineer" }] },
  });
  check(profileUpdate.status === 200 && profileUpdate.json?.data?.skills?.includes("TypeScript"),
    "student updates own employment profile");
  const [persistedProfile] = (await db.query(`SELECT phone,education,skills,education_history,experience_history
    FROM public.profiles WHERE user_id=$1::uuid`, [studentId])).rows;
  check(persistedProfile?.phone === "9800000001" && persistedProfile?.education === "Bachelor of Computing"
    && persistedProfile?.skills?.includes("TypeScript") && persistedProfile?.education_history?.length === 1
    && persistedProfile?.experience_history?.length === 1, "employment profile persists in isolated Neon");
  const spoofedProfile = await request("/api/v1/neon-staging/profile", {
    method: "PATCH", cookie: student.cookie, body: { user_id: recruiterId, full_name: "Spoofed" },
  });
  check(spoofedProfile.status === 400, "client-supplied profile identity rejected");
  const foreignProfile = await request(`/api/v1/neon-staging/profile?userId=${recruiterId}`, { cookie: student.cookie });
  check(foreignProfile.status === 200 && foreignProfile.json?.data?.user_id === studentId,
    "foreign profile query cannot change own-profile scope");

  const publicList = await request("/api/v1/jobs?search=Neon%20HTTP%20UAT&limit=5");
  check(publicList.status === 200 && publicList.json?.data?.some(item => item.id === jobId), "public list");
  const publicDetail = await request(`/api/v1/jobs?id=${jobId}`);
  check(publicDetail.status === 200 && publicDetail.json?.data?.id === jobId, "public detail");
  const preferences = await request("/api/v1/jobs/preferences", {
    method: "PUT", cookie: student.cookie, body: { preferred_job_titles: ["Engineer"] },
  });
  check(preferences.status === 200, "student updates own preferences");
  const persistedPrefs = await request("/api/v1/jobs/preferences", { cookie: student.cookie });
  check(persistedPrefs.status === 200 && persistedPrefs.json?.data?.preferred_job_titles?.includes("Engineer"),
    "student preferences persist");
  const saved = await request("/api/v1/jobs/saved", { method: "POST", cookie: student.cookie, body: { jobId } });
  check(saved.status === 200 && saved.json?.data?.saved === true, "student saves job");
  const ownSaved = await request("/api/v1/jobs/saved", { cookie: student.cookie });
  check(ownSaved.status === 200 && ownSaved.json?.data?.some(item => item.id === jobId), "own saved job read");
  const unsaved = await request(`/api/v1/jobs/saved?jobId=${jobId}`, { method: "DELETE", cookie: student.cookie });
  check(unsaved.status === 200 && unsaved.json?.data?.saved === false, "student unsaves job");
  const documentBytes = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34]);
  const documentForm = new FormData();
  documentForm.set("file", new File([documentBytes], "experience.pdf", { type: "application/pdf" }));
  documentForm.set("jobId", jobId);
  documentForm.set("kind", "experience");
  const documentUploadResponse = await fetch(`${app}/api/v1/neon-staging/jobs/documents`, {
    method: "POST", headers: { cookie: student.cookie, origin: app }, body: documentForm,
    signal: AbortSignal.timeout(30000),
  });
  const documentUpload = await documentUploadResponse.json().catch(() => null);
  uploadedDocumentPath = documentUpload?.data?.path ?? null;
  check(documentUploadResponse.status === 201 && !!uploadedDocumentPath, "private experience PDF uploaded to staging");
  const wrongTypeForm = new FormData();
  wrongTypeForm.set("file", new File(["plain text"], "experience.txt", { type: "text/plain" }));
  wrongTypeForm.set("jobId", jobId);
  wrongTypeForm.set("kind", "experience");
  const wrongType = await fetch(`${app}/api/v1/neon-staging/jobs/documents`, {
    method: "POST", headers: { cookie: student.cookie, origin: app }, body: wrongTypeForm,
    signal: AbortSignal.timeout(30000),
  });
  check(wrongType.status >= 400 && wrongType.status < 500, "non-PDF document rejected");
  const fabricated = await request("/api/v1/jobs/apply", {
    method: "POST", cookie: student.cookie,
    body: { jobId: otherJobId, experienceLetterUrl: uploadedDocumentPath },
  });
  check(fabricated.status >= 400 && fabricated.status < 500, "document from another job rejected");
  const application = await request("/api/v1/jobs/apply", {
    method: "POST", cookie: student.cookie,
    body: { jobId, skills: ["TypeScript"], experienceLetterUrl: uploadedDocumentPath },
  });
  const applicationId = application.json?.data?.application?.id;
  check(application.status === 201 && !!applicationId,
    `student application stored before success (HTTP ${application.status}, ${application.json?.error?.code ?? "no error code"})`);
  const [stored] = (await db.query(`
    SELECT id,user_id,form_data->>'experienceLetterUrl' AS experience_path
    FROM public.job_applications WHERE id=$1::uuid`, [applicationId])).rows;
  check(stored?.user_id === studentId && stored.experience_path === uploadedDocumentPath,
    "application snapshot preserves the student's submitted PDF");
  const recruiterDocument = await request(`/api/v1/jobs/applications/${applicationId}/documents?kind=experience`,
    { cookie: recruiter.cookie });
  check(recruiterDocument.status === 200 && recruiterDocument.json?.data?.expiresIn === 300 &&
    !!recruiterDocument.json?.data?.signedUrl, "scoped recruiter receives 300-second signed document URL");
  const signedDocument = await fetch(recruiterDocument.json.data.signedUrl, { signal: AbortSignal.timeout(30000) });
  check(signedDocument.ok && new Uint8Array(await signedDocument.arrayBuffer()).slice(0, 5).every((byte, i) =>
    byte === documentBytes[i]), "recruiter signed URL reads exact private PDF bytes");
  const studentDocument = await request(`/api/v1/jobs/applications/${applicationId}/documents?kind=experience`,
    { cookie: student.cookie });
  check(studentDocument.status === 403, "applicant denied recruiter document endpoint");
  const anonymousDocument = await request(`/api/v1/jobs/applications/${applicationId}/documents?kind=experience`);
  check(anonymousDocument.status === 401, "anonymous user denied recruiter document endpoint");
  const submittedDelete = await request("/api/v1/neon-staging/jobs/documents", {
    method: "DELETE", cookie: student.cookie, body: { jobId, path: uploadedDocumentPath },
  });
  check(submittedDelete.status === 409, "submitted document cannot be deleted through draft endpoint");
  const [documentLedger] = (await db.query(`SELECT state, application_id
    FROM public.neon_job_document_drafts WHERE path=$1`, [uploadedDocumentPath])).rows;
  check(documentLedger?.state === "submitted" && documentLedger.application_id === applicationId,
    "document draft atomically attached to submitted application");
  const agedForm = new FormData();
  agedForm.set("file", new File([documentBytes], "unsubmitted-training.pdf", { type: "application/pdf" }));
  agedForm.set("jobId", jobId);
  agedForm.set("kind", "training");
  const agedUploadResponse = await fetch(`${app}/api/v1/neon-staging/jobs/documents`, {
    method: "POST", headers: { cookie: student.cookie, origin: app }, body: agedForm,
    signal: AbortSignal.timeout(30000),
  });
  const agedUpload = await agedUploadResponse.json().catch(() => null);
  agedDraftPath = agedUpload?.data?.path ?? null;
  check(agedUploadResponse.status === 201 && !!agedDraftPath,
    "synthetic unsubmitted PDF registered as a draft");
  await db.query(`UPDATE public.neon_job_document_drafts
    SET uploaded_at=now()-interval '73 hours' WHERE path IN ($1,$2)`,
    [agedDraftPath, uploadedDocumentPath]);
  const cleanupDryRun = JSON.parse(execFileSync(process.execPath,
    ["scripts/cleanup-neon-staging-job-drafts.mjs", `--path=${agedDraftPath}`],
    { encoding: "utf8", timeout: 30000 }));
  check(cleanupDryRun.mode === "DRY_RUN" && cleanupDryRun.candidateCount === 1
    && cleanupDryRun.deletedCount === 0, "aged synthetic draft appears in targeted dry-run");
  const cleanupApply = JSON.parse(execFileSync(process.execPath,
    ["scripts/cleanup-neon-staging-job-drafts.mjs", "--apply", `--path=${agedDraftPath}`],
    { encoding: "utf8", timeout: 30000 }));
  check(cleanupApply.mode === "APPLY" && cleanupApply.deletedCount === 1,
    "aged synthetic draft deleted by targeted cleanup");
  const [cleanedDraft] = (await db.query(`SELECT state, deleted_at FROM public.neon_job_document_drafts
    WHERE path=$1`, [agedDraftPath])).rows;
  const [preservedSubmitted] = (await db.query(`SELECT state, application_id FROM public.neon_job_document_drafts
    WHERE path=$1`, [uploadedDocumentPath])).rows;
  check(cleanedDraft?.state === "deleted" && !!cleanedDraft.deleted_at
    && preservedSubmitted?.state === "submitted" && preservedSubmitted.application_id === applicationId,
  "aged draft marked deleted while aged submitted document stays protected");
  const cleanupS3 = new S3Client({ endpoint: process.env.AWS_ENDPOINT_URL_S3,
    region: process.env.AWS_REGION, forcePathStyle: true, credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID, secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    } });
  try {
    let agedObjectMissing = false;
    try { await cleanupS3.send(new HeadObjectCommand({ Bucket: "job-files", Key: agedDraftPath })); }
    catch (error) { agedObjectMissing = error?.$metadata?.httpStatusCode === 404; }
    check(agedObjectMissing, "aged unsubmitted synthetic object absent from private storage");
    const retained = await cleanupS3.send(new HeadObjectCommand({ Bucket: "job-files", Key: uploadedDocumentPath }));
    check(retained.$metadata.httpStatusCode === 200,
      "aged submitted synthetic object remains in private storage");
  } finally { cleanupS3.destroy(); }
  const ownApplications = await request("/api/v1/jobs/applications", { cookie: student.cookie });
  check(ownApplications.status === 200 && ownApplications.json?.data?.some(item => item.id === applicationId),
    "student sees own application");
  const deniedReview = await request("/api/v1/jobs/applications", {
    method: "PATCH", cookie: student.cookie, body: { id: applicationId, status: "screening" },
  });
  check(deniedReview.status === 403,
    `student cannot review own application (HTTP ${deniedReview.status}, ${deniedReview.json?.error?.code ?? "no error code"})`);
  const scoped = await request(`/api/v1/jobs/applications?mode=review&jobId=${jobId}`, { cookie: recruiter.cookie });
  check(scoped.status === 200 && scoped.json?.data?.some(item => item.id === applicationId),
    "scoped recruiter sees own company's applicant");
  const foreign = await request(`/api/v1/jobs/applications?mode=review&jobId=${otherJobId}`, { cookie: recruiter.cookie });
  check(foreign.status === 403, "recruiter denied unrelated job");
  const review = await request("/api/v1/jobs/applications", {
    method: "PATCH", cookie: recruiter.cookie, body: { id: applicationId, status: "screening" },
  });
  check(review.status === 200 && review.json?.data?.status === "screening", "recruiter status transition");
  const [reviewed] = (await db.query(`
    SELECT status FROM public.job_applications WHERE id=$1::uuid`, [applicationId])).rows;
  check(reviewed?.status === "screening", "status transition database effect");
  const crossOrigin = await request("/api/v1/jobs/saved", {
    method: "POST", cookie: student.cookie, body: { jobId }, headers: { origin: "https://evil.example" },
  });
  check(crossOrigin.status === 403, "cross-origin cookie write denied");

  const pdf = new File([new Uint8Array([0x25,0x50,0x44,0x46,0x2d,0x31,0x2e,0x34])], "resume.pdf", { type: "application/pdf" });
  const form = new FormData(); form.set("file", pdf);
  const uploadResponse = await fetch(`${app}/api/v1/neon-staging/resume`, {
    method: "POST", headers: { cookie: student.cookie, origin: app }, body: form,
    signal: AbortSignal.timeout(30000),
  });
  const upload = await uploadResponse.json().catch(() => null);
  uploadedResumePath = upload?.data?.path ?? null;
  check(uploadResponse.status === 201 && !!uploadedResumePath, "private resume uploaded");
  const [linkedResume] = (await db.query(`SELECT resume_url FROM public.profiles WHERE user_id=$1::uuid`, [studentId])).rows;
  check(linkedResume?.resume_url === uploadedResumePath, "resume metadata linked to own profile");
  const ownResume = await request(`/api/v1/neon-staging/resume?path=${encodeURIComponent(uploadedResumePath)}`,
    { cookie: student.cookie });
  check(ownResume.status === 200 && !!ownResume.json?.data?.signedUrl, "owner receives short-lived resume URL");
  const foreignResume = await request(`/api/v1/neon-staging/resume?path=${encodeURIComponent(uploadedResumePath)}`,
    { cookie: recruiter.cookie });
  check(foreignResume.status === 403, "other user denied private resume URL");

  resumeJobId = (await db.query(`INSERT INTO public.jobs
    (company_id,title,description,status,approval_status,is_active,application_deadline)
    VALUES ($1::uuid,'Neon Resume Review Role','Synthetic staging job','published','approved',true,
            now()+interval '1 day') RETURNING id`, [companyId])).rows[0].id;
  const resumeApplication = await request("/api/v1/jobs/apply", {
    method: "POST", cookie: student.cookie, body: { jobId: resumeJobId },
  });
  const resumeApplicationId = resumeApplication.json?.data?.application?.id;
  check(resumeApplication.status === 201 && !!resumeApplicationId,
    "student applies to scoped recruiter job with stored resume");
  const recruiterList = await request("/api/v1/jobs/applications?offset=0", { cookie: recruiter.cookie });
  check(recruiterList.status === 200 && recruiterList.json?.data?.some(item =>
    item.id === resumeApplicationId && item.job_title === "Neon Resume Review Role"),
  "recruiter inbox resolves job title and exact company scope");
  const recruiterResume = await request(`/api/v1/jobs/applications/${resumeApplicationId}/resume`,
    { cookie: recruiter.cookie });
  check(recruiterResume.status === 200 && !!recruiterResume.json?.data?.signedUrl,
    "scoped recruiter receives short-lived applicant resume URL");
  const deniedStudentResume = await request(`/api/v1/jobs/applications/${resumeApplicationId}/resume`,
    { cookie: student.cookie });
  check(deniedStudentResume.status === 403, "student denied recruiter document endpoint");

  const profileApplication = await request("/api/v1/jobs/apply", {
    method: "POST", cookie: student.cookie, body: { jobId: otherJobId },
  });
  check(profileApplication.status === 201, "second application uses stored profile");
  const [profileSnapshot] = (await db.query(`SELECT resume_url,form_data FROM public.job_applications
    WHERE id=$1::uuid`, [profileApplication.json?.data?.application?.id])).rows;
  check(profileSnapshot?.resume_url === uploadedResumePath,
    "application snapshot reuses own stored private resume");

  const replacementForm = new FormData(); replacementForm.set("file", pdf);
  const replacementResponse = await fetch(`${app}/api/v1/neon-staging/resume`, {
    method: "POST", headers: { cookie: student.cookie, origin: app }, body: replacementForm,
    signal: AbortSignal.timeout(30000),
  });
  const replacement = await replacementResponse.json().catch(() => null);
  check(replacementResponse.status === 201 && replacement?.data?.path !== uploadedResumePath,
    "resume replacement creates a new private object");
  const oldResumePath = uploadedResumePath;
  retainedResumePaths.push(oldResumePath);
  uploadedResumePath = replacement.data.path;
  const staleRead = await request(`/api/v1/neon-staging/resume?path=${encodeURIComponent(oldResumePath)}`,
    { cookie: student.cookie });
  check(staleRead.status === 200, "replaced resume retained because historical applications reference it");
  const preservedRecruiterResume = await request(`/api/v1/jobs/applications/${resumeApplicationId}/resume`,
    { cookie: recruiter.cookie });
  check(preservedRecruiterResume.status === 200, "recruiter can still read the submitted resume after profile replacement");
  const deleteResume = await request("/api/v1/neon-staging/resume", { method: "DELETE", cookie: student.cookie });
  check(deleteResume.status === 200, "student deletes own current resume");
  const deletedRead = await request(`/api/v1/neon-staging/resume?path=${encodeURIComponent(uploadedResumePath)}`,
    { cookie: student.cookie });
  check(deletedRead.status === 404, "deleted private object no longer downloadable");

  const logout = await fetch(`${app}/api/v1/neon-staging/auth/sign-out`, {
    method: "POST", headers: { cookie: student.cookie, "content-type": "application/json", origin: app }, body: "{}",
  });
  check(logout.ok, "student logout");
  check((await request("/api/v1/jobs/saved", { cookie: student.cookie })).status === 401,
    "logged-out session denied");
  console.log(JSON.stringify({ result: "PASS", checks }));
} catch (error) {
  console.error(JSON.stringify({ result: "FAIL", checks,
    reason: error instanceof Error ? error.message : "unknown" }));
  process.exitCode = 1;
} finally {
  for (const retainedPath of retainedResumePaths) {
    try {
      const endpoint = new URL(process.env.AWS_ENDPOINT_URL_S3);
      if (!endpoint.hostname.includes("br-frosty-haze-azsnybmr")) throw new Error("Wrong staging storage endpoint.");
      const s3 = new S3Client({ endpoint: endpoint.toString(), region: process.env.AWS_REGION,
        forcePathStyle: true, credentials: { accessKeyId: process.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY } });
      await s3.send(new DeleteObjectCommand({ Bucket: "resumes", Key: retainedPath }));
      s3.destroy();
    } catch { console.error("Synthetic historical resume cleanup needs review."); process.exitCode = 1; }
  }
  if (uploadedResumePath) {
    try {
      const endpoint = new URL(process.env.AWS_ENDPOINT_URL_S3);
      if (!endpoint.hostname.includes("br-frosty-haze-azsnybmr")) throw new Error("Wrong staging storage endpoint.");
      const s3 = new S3Client({ endpoint: endpoint.toString(), region: process.env.AWS_REGION,
        forcePathStyle: true, credentials: { accessKeyId: process.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY } });
      await s3.send(new DeleteObjectCommand({ Bucket: "resumes", Key: uploadedResumePath }));
    } catch { console.error("Synthetic resume cleanup needs manual review."); process.exitCode = 1; }
  }
  if (uploadedDocumentPath) {
    try {
      const endpoint = new URL(process.env.AWS_ENDPOINT_URL_S3);
      if (!endpoint.hostname.includes("br-frosty-haze-azsnybmr")) throw new Error("Wrong staging storage endpoint.");
      const s3 = new S3Client({ endpoint: endpoint.toString(), region: process.env.AWS_REGION,
        forcePathStyle: true, credentials: { accessKeyId: process.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY } });
      await s3.send(new DeleteObjectCommand({ Bucket: "job-files", Key: uploadedDocumentPath }));
    } catch { console.error("Synthetic job-document cleanup needs manual review."); process.exitCode = 1; }
  }
  if (agedDraftPath) {
    try {
      const endpoint = new URL(process.env.AWS_ENDPOINT_URL_S3);
      if (!endpoint.hostname.includes("br-frosty-haze-azsnybmr")) throw new Error("Wrong staging storage endpoint.");
      const s3 = new S3Client({ endpoint: endpoint.toString(), region: process.env.AWS_REGION,
        forcePathStyle: true, credentials: { accessKeyId: process.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY } });
      await s3.send(new DeleteObjectCommand({ Bucket: "job-files", Key: agedDraftPath }));
      s3.destroy();
    } catch { console.error("Synthetic aged-draft cleanup needs manual review."); process.exitCode = 1; }
  }
  if (connected) {
    await db.query("BEGIN").catch(() => undefined);
    try {
      await db.query(`DELETE FROM public.neon_application_events WHERE recipient_user_id IN ($1::uuid,$2::uuid)`,
        [studentId, recruiterId]);
      await db.query(`DELETE FROM public.notifications WHERE recipient_id IN ($1::uuid,$2::uuid)`,
        [studentId, recruiterId]);
      if (jobId || otherJobId || resumeJobId) {
        await db.query(`DELETE FROM public.neon_job_document_drafts
          WHERE job_id IN ($1::uuid,$2::uuid,$3::uuid)`, [jobId, otherJobId, resumeJobId]);
        await db.query(`DELETE FROM public.job_applications WHERE job_id IN ($1::uuid,$2::uuid,$3::uuid)`, [jobId, otherJobId, resumeJobId]);
        await db.query(`DELETE FROM public.saved_jobs WHERE job_id IN ($1::uuid,$2::uuid,$3::uuid)`, [jobId, otherJobId, resumeJobId]);
        await db.query(`DELETE FROM public.jobs WHERE id IN ($1::uuid,$2::uuid,$3::uuid)`, [jobId, otherJobId, resumeJobId]);
      }
      if (companyId) await db.query(`DELETE FROM public.companies WHERE id=$1::uuid`, [companyId]);
      await db.query(`DELETE FROM public.module_entitlements WHERE user_id=$1::uuid`, [recruiterId]);
      await db.query(`DELETE FROM public.entity_admin_assignments WHERE user_id=$1::uuid`, [recruiterId]);
      await db.query(`DELETE FROM public.user_module_capabilities WHERE user_id=$1::uuid`, [recruiterId]);
      await db.query(`DELETE FROM public.neon_identity_links WHERE application_account_id IN
        (SELECT id FROM public.neon_application_accounts WHERE legacy_user_id IN ($1::uuid,$2::uuid))`,
        [studentId, recruiterId]);
      await db.query(`DELETE FROM public.neon_application_accounts WHERE legacy_user_id IN ($1::uuid,$2::uuid)`,
        [studentId, recruiterId]);
      await db.query(`DELETE FROM public.profiles WHERE user_id IN ($1::uuid,$2::uuid)`, [studentId, recruiterId]);
      await db.query("COMMIT");
    } catch { await db.query("ROLLBACK").catch(() => undefined);
      console.error("Synthetic Jobs fixture cleanup needs manual review."); process.exitCode = 1; }
    await db.end().catch(() => undefined);
  }
}
