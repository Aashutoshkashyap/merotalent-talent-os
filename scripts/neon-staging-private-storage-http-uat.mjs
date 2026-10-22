/** Real Managed Auth + real private Object Storage authorization matrix.
 * All identities, profiles, entities, and files are synthetic staging fixtures created by this run.
 */
import { randomBytes, randomUUID } from "node:crypto";
import dotenv from "dotenv";
import pg from "pg";
import { S3Client, DeleteObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import { requireNeonMigrationStaging } from "./require-neon-migration-staging.mjs";
import {stagingUatOrigin} from './staging-uat-origin.mjs';

dotenv.config({ path: ".migration.env", quiet: true });
requireNeonMigrationStaging(process.env.NEON_STAGING_DATABASE_URL);
const auth = "https://ep-wispy-credit-azt6tgwj.neonauth.c-3.ap-southeast-1.aws.neon.tech/neondb/auth";
const endpoint = "https://br-frosty-haze-azsnybmr.storage.c-3.ap-southeast-1.aws.neon.tech";
if (process.env.NEON_AUTH_BASE_URL !== auth || process.env.AWS_ENDPOINT_URL_S3 !== endpoint) throw new Error("UNEXPECTED_STAGING_TARGET");
const app = stagingUatOrigin();
const database = new URL(process.env.NEON_STAGING_DATABASE_URL);
database.searchParams.set("sslmode", "verify-full");
const createClient = () => {
  const client = new pg.Client({ connectionString: database.href, connectionTimeoutMillis: 30000, query_timeout: 30000 });
  client.on("error", () => console.error(JSON.stringify({ result: "STAGING_CONNECTION_LOST", productionWrites: 0 })));
  return client;
};
let db = createClient();
const s3 = new S3Client({ endpoint, region: process.env.AWS_REGION, forcePathStyle: true,
  credentials: { accessKeyId: process.env.AWS_ACCESS_KEY_ID, secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY } });
const runId = randomBytes(6).toString("hex"), accounts = [], objects = [], checks = [];
const bytes = Buffer.from(`%PDF-1.4\nSynthetic private-storage ${runId}\n%%EOF`);
let companyId = null, jobId = null, mentorId = null, conversationId = null, paymentId = null, eventId = null;
let connected = false;
const check = (ok,name) => { checks.push({name,pass:!!ok}); if (!ok) throw new Error(name); };
const cookieOf = response => response.headers.getSetCookie().map(value=>value.split(";",1)[0]).join("; ");
async function request(path, { method="GET", account=null, body=null, form=null, origin=app }={}) {
  // Retry only reads (including the explicit signed-download operation), never
  // uploads, deletes, application submission, or payment/fulfillment mutations.
  const readOnly = method === "GET" || path === "/api/v1/media/download-url";
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const response = await fetch(`${app}${path}`, { method, cache:"no-store", signal:AbortSignal.timeout(45000),
        headers: { ...(account ? {cookie:account.cookie}:{}), ...(body ? {"content-type":"application/json"}:{}),
          ...(method!=="GET"?{origin}:{}) }, ...(form?{body:form}:body?{body:JSON.stringify(body)}:{}) });
      const result = {status:response.status,json:await response.json().catch(()=>null),headers:response.headers};
      if (readOnly && response.status === 503 && attempt === 0) continue;
      return result;
    } catch (error) {
      if (!readOnly || attempt !== 0) throw error;
    }
  }
}
async function createAccount(label) {
  const email = `storage-${label}-${runId}@example.com`, password = randomBytes(32).toString("base64url");
  const signUp = await fetch(`${auth}/sign-up/email`, {method:"POST",headers:{"content-type":"application/json",origin:app},
    body:JSON.stringify({email,password,name:`Synthetic Storage ${label}`}),signal:AbortSignal.timeout(30000)});
  check(signUp.ok, `${label}: real staging Managed Auth signup`);
  const created=await signUp.clone().json().catch(()=>null);
  const returnedSubject=created?.user?.id;
  check(typeof returnedSubject==="string" && /^[0-9a-f-]{36}$/i.test(returnedSubject),`${label}: created provider identity recorded for cleanup`);
  const account={label,email,userId:randomUUID(),subject:returnedSubject,cookie:cookieOf(signUp)}; accounts.push(account);
  const initialCookie=cookieOf(signUp);
  const sessionResponse=await fetch(`${auth}/get-session`,{headers:{cookie:initialCookie},signal:AbortSignal.timeout(30000)});
  const session=await sessionResponse.json();
  check(sessionResponse.ok && session?.user?.id===session?.session?.userId && session.user.id===returnedSubject, `${label}: provider-verified session subject`);
  await db.query(`INSERT INTO public.profiles(user_id,email,full_name,phone,location,education)
    VALUES($1::uuid,$2,$3,'9800000000','Kathmandu','Bachelor')`,[account.userId,email,`Synthetic Storage ${label}`]);
  const applicationAccount=(await db.query(`INSERT INTO public.neon_application_accounts(legacy_user_id)
    VALUES($1::uuid) RETURNING id`,[account.userId])).rows[0];
  await db.query(`INSERT INTO public.neon_identity_links(neon_auth_user_id,application_account_id,status,verification_method,verified_at)
    VALUES($1::uuid,$2::uuid,'verified','isolated_staging_synthetic_signup',now())`,[account.subject,applicationAccount.id]);
  const signIn=await fetch(`${app}/api/v1/neon-staging/auth/sign-in/email`,{method:"POST",
    headers:{"content-type":"application/json",origin:app},body:JSON.stringify({email,password}),signal:AbortSignal.timeout(30000)});
  check(signIn.ok && !!cookieOf(signIn),`${label}: same-origin authenticated application session`);
  account.cookie=cookieOf(signIn); return account;
}
const pdfForm = fields => {
  const form=new FormData(); form.set("file",new Blob([bytes],{type:"application/pdf"}),"synthetic.pdf");
  for(const [key,value] of Object.entries(fields)) form.set(key,value); return form;
};
function remember(bucket,key) {
  check(typeof key==="string" && accounts.some(account=>key.startsWith(`${account.userId}/`)) &&
    !key.includes("\\") && !key.split("/").includes(".."),`${bucket}: canonical object path returned`);
  objects.push({bucket,key});
}
async function signedBytes(response,label) {
  check(response.status===200 && typeof response.json?.data?.signedUrl==="string",`${label}: authorized signed URL issued`);
  check(response.headers.get("cache-control")==="private, no-store",`${label}: private response is not cached`);
  const signed=new URL(response.json.data.signedUrl);
  check(Number(signed.searchParams.get("X-Amz-Expires"))<=300,`${label}: short-lived signature`);
  const download=await fetch(signed,{signal:AbortSignal.timeout(30000)});
  check(download.ok && Buffer.from(await download.arrayBuffer()).equals(bytes),`${label}: actual storage bytes match`);
  const anonymous=new URL(signed); anonymous.search="";
  check((await fetch(anonymous,{signal:AbortSignal.timeout(30000)})).status===403,`${label}: unsigned storage GET denied`);
  const manipulated=new URL(signed); manipulated.pathname=manipulated.pathname.replace(/[^/]+$/,`${randomUUID()}.pdf`);
  check((await fetch(manipulated,{signal:AbortSignal.timeout(30000)})).status===403,`${label}: signed path manipulation denied`);
}

try {
  await db.connect();connected=true;
  const student=await createAccount("student"), recruiter=await createAccount("recruiter"),
    unrelated=await createAccount("unrelated"), superAdmin=await createAccount("superadmin");
  await db.query(`INSERT INTO public.user_roles(user_id,role) VALUES($1::uuid,'admin')`,[superAdmin.userId]);
  companyId=(await db.query(`INSERT INTO public.companies(user_id,name) VALUES($1::uuid,'Private storage ACL fixture') RETURNING id`,[recruiter.userId])).rows[0].id;
  jobId=(await db.query(`INSERT INTO public.jobs(company_id,title,description,status,approval_status,is_active,application_deadline)
    VALUES($1::uuid,'Private ACL test job','Synthetic staging role','published','approved',true,now()+interval '1 day') RETURNING id`,[companyId])).rows[0].id;
  const capability=(await db.query(`INSERT INTO public.user_module_capabilities(user_id,capability_id,status)
    SELECT $1::uuid,id,'active' FROM public.module_capabilities WHERE module_key='jobs' RETURNING id`,[recruiter.userId])).rows[0];
  await db.query(`INSERT INTO public.entity_admin_assignments(user_id,user_capability_id,entity_type,entity_id,status)
    VALUES($1::uuid,$2::uuid,'company',$3::uuid,'active')`,[recruiter.userId,capability.id,companyId]);
  await db.query(`INSERT INTO public.module_entitlements(user_id,module_key,entity_type,entity_id,source,status,features)
    VALUES($1::uuid,'jobs','company',$2::uuid,'ADMIN_MANUAL','active','{"job_applications":true}'::jsonb)`,[recruiter.userId,companyId]);
  mentorId=(await db.query(`INSERT INTO public.mentors(user_id,headline,description,expertise,hourly_rate,is_available,approval_status,availability)
    VALUES($1::uuid,'Storage ACL mentor','Synthetic',ARRAY['Career']::text[],100,true,'approved','{}'::jsonb) RETURNING id`,[recruiter.userId])).rows[0].id;
  conversationId=(await db.query(`INSERT INTO public.conversations(mentor_id,mentee_id,is_active) VALUES($1::uuid,$2::uuid,true) RETURNING id`,[mentorId,student.userId])).rows[0].id;
  paymentId=(await db.query(`INSERT INTO public.payments(user_id,payment_type,reference_id,amount,currency,status,payment_method,gateway,metadata)
    VALUES($1::uuid,'mentor_booking',$2::uuid,100,'NPR','pending','manual','manual','{}'::jsonb) RETURNING id`,[student.userId,randomUUID()])).rows[0].id;
  eventId=(await db.query(`INSERT INTO public.events(organizer_user_id,organizer_type,title,event_type,format,start_date,end_date,
    ticket_price,currency,is_active,status,approval_status)
    VALUES($1::uuid,'user','Private event attachment ACL fixture','free','online',now()+interval '3 days',now()+interval '4 days',
      0,'NPR',true,'published','approved') RETURNING id`,[recruiter.userId])).rows[0].id;
  const eventCapability=(await db.query(`INSERT INTO public.user_module_capabilities(user_id,capability_id,status)
    SELECT $1::uuid,id,'active' FROM public.module_capabilities WHERE module_key='events' RETURNING id`,[recruiter.userId])).rows[0];
  await db.query(`INSERT INTO public.entity_admin_assignments(user_id,user_capability_id,entity_type,entity_id,status)
    VALUES($1::uuid,$2::uuid,'event',$3::uuid,'active')`,[recruiter.userId,eventCapability.id,eventId]);
  await db.query(`INSERT INTO public.module_entitlements(user_id,module_key,entity_type,entity_id,source,status,features)
    VALUES($1::uuid,'events','event',$2::uuid,'ADMIN_MANUAL','active','{"media_management":true}'::jsonb)`,[recruiter.userId,eventId]);

  const resume=await request("/api/v1/neon-staging/resume",{method:"POST",account:student,form:pdfForm({})});
  check(resume.status===201,"resume: owner upload persisted");remember("resumes",resume.json?.data?.path);
  const resumePath=`/api/v1/neon-staging/resume?path=${encodeURIComponent(resume.json.data.path)}`;
  check((await request(resumePath)).status===401,"resume: anonymous denied");
  check((await request(resumePath,{account:unrelated})).status===403,"resume: unrelated linked user denied");
  await signedBytes(await request(resumePath,{account:student}),"resume owner");
  await signedBytes(await request(resumePath,{account:superAdmin}),"resume Super Admin");
  const missingPath=resume.json.data.path.replace(/[^/]+$/,`${randomUUID()}.pdf`);
  check((await request(`/api/v1/neon-staging/resume?path=${encodeURIComponent(missingPath)}`,{account:student})).status===404,
    "resume: correctly-scoped missing object returns 404");
  check((await request("/api/v1/neon-staging/resume",{method:"POST",account:student,origin:"https://evil.example",form:pdfForm({})})).status===403,
    "resume: cross-origin upload denied");

  const documents={};
  for(const kind of ["experience","training"]) {
    const uploaded=await request("/api/v1/neon-staging/jobs/documents",{method:"POST",account:student,form:pdfForm({jobId,kind})});
    check(uploaded.status===201,`${kind}: applicant uploaded actual private file`);remember("job-files",uploaded.json?.data?.path);
    documents[kind]=uploaded.json.data.path;
  }
  const application=await request("/api/v1/jobs/apply",{method:"POST",account:student,
    body:{jobId,skills:["PostgreSQL"],experienceLetterUrl:documents.experience,trainingDocumentUrl:documents.training}});
  check(application.status===201 && !!application.json?.data?.application?.id,"job: real application persisted with both document references");
  const applicationId=application.json.data.application.id;
  for(const kind of ["experience","training"]) {
    const path=`/api/v1/jobs/applications/${applicationId}/documents?kind=${kind}`;
    check((await request(path)).status===401,`${kind}: anonymous denied`);
    check((await request(path,{account:student})).status===403,`${kind}: applicant denied recruiter endpoint`);
    check((await request(path,{account:unrelated})).status===403,`${kind}: unrelated linked user denied`);
    await signedBytes(await request(path,{account:recruiter}),`${kind} assigned recruiter`);
    await signedBytes(await request(path,{account:superAdmin}),`${kind} Super Admin`);
  }
  const recruiterResumePath=`/api/v1/jobs/applications/${applicationId}/resume`;
  await signedBytes(await request(recruiterResumePath,{account:recruiter}),"submitted resume assigned recruiter");
  check((await request(recruiterResumePath,{account:unrelated})).status===403,"submitted resume: unrelated user denied");
  await db.query(`UPDATE public.module_entitlements SET start_at=now()-interval '2 days',expires_at=now()-interval '1 day'
    WHERE user_id=$1::uuid`,[recruiter.userId]);
  check((await request(`/api/v1/jobs/applications/${applicationId}/documents?kind=training`,{account:recruiter})).status===403,
    "training: expired recruiter subscription denied");
  check((await request(recruiterResumePath,{account:recruiter})).status===403,"submitted resume: expired recruiter subscription denied");
  check((await request(recruiterResumePath,{account:superAdmin})).status===200,"submitted resume: Super Admin bypasses subscription");
  await db.query(`UPDATE public.module_entitlements SET expires_at=NULL WHERE user_id=$1::uuid`,[recruiter.userId]);

  const proof=await request("/api/v1/neon-staging/payments/proofs",{method:"POST",account:student,
    form:pdfForm({paymentId,note:"Synthetic private storage evidence only",proofType:"receipt"})});
  check(proof.status===201,"payment proof: owner uploads actual private file");
  const proofId=proof.json.data.id;
  const proofKey=(await db.query(`SELECT storage_path FROM public.payment_proofs WHERE id=$1::uuid`,[proofId])).rows[0].storage_path;
  remember("payment-proofs",proofKey);
  const proofRoute=`/api/v1/neon-staging/payments/proofs?id=${proofId}`;
  check((await request(proofRoute)).status===401,"payment proof: anonymous denied");
  check((await request(proofRoute,{account:unrelated})).status===404,"payment proof: unrelated account gets no metadata");
  check((await request("/api/v1/neon-staging/payments/proofs?queue=1",{account:student})).status===403,"payment proof: student cannot read admin queue");
  await signedBytes(await request(proofRoute,{account:student}),"payment proof owner");
  await signedBytes(await request(proofRoute,{account:superAdmin}),"payment proof Super Admin");
  check((await request("/api/v1/neon-staging/payments/proofs",{method:"POST",account:unrelated,
    form:pdfForm({paymentId,note:"Foreign payment proof attempt",proofType:"receipt"})})).status===403,
    "payment proof: another user's payment cannot receive a proof");
  check((await db.query(`SELECT status FROM public.payments WHERE id=$1::uuid`,[paymentId])).rows[0].status==="pending",
    "payment proof: upload alone never confirms payment");

  const attachment=await request("/api/v1/neon-staging/messaging/attachments",{method:"POST",account:student,form:pdfForm({conversationId})});
  check(attachment.status===201,"chat: participant upload and persisted message");remember("chat-attachments",attachment.json?.data?.attachment_path);
  const attachmentRoute=`/api/v1/neon-staging/messaging/attachments?conversationId=${conversationId}&messageId=${attachment.json.data.id}`;
  check((await request(attachmentRoute)).status===401,"chat: anonymous denied");
  check((await request(attachmentRoute,{account:unrelated})).status===403,"chat: unrelated linked user denied");
  check((await request(attachmentRoute,{account:superAdmin})).status===403,"chat: nonparticipant Super Admin cannot read private conversation");
  await signedBytes(await request(attachmentRoute,{account:student}),"chat sender");
  await signedBytes(await request(attachmentRoute,{account:recruiter}),"chat mentor participant");
  check((await request(`${attachmentRoute}&path=${encodeURIComponent(attachment.json.data.attachment_path)}`,{account:student})).status===422,
    "chat: raw object-path injection denied");
  await db.query(`UPDATE public.conversations SET is_active=false WHERE id=$1::uuid`,[conversationId]);
  check((await request(attachmentRoute,{account:student})).status===403,"chat: revoked conversation denies attachment");
  await db.query(`UPDATE public.conversations SET is_active=true WHERE id=$1::uuid`,[conversationId]);
  await db.query(`UPDATE public.profiles SET account_status='suspended' WHERE user_id=$1::uuid`,[student.userId]);
  check((await request(resumePath,{account:student})).status===403,"resume: existing session denied after account suspension");
  check((await request(proofRoute,{account:student})).status===403,"payment proof: existing session denied after suspension");
  await db.query(`UPDATE public.profiles SET account_status='active' WHERE user_id=$1::uuid`,[student.userId]);
  const replacement=await request("/api/v1/neon-staging/resume",{method:"POST",account:student,form:pdfForm({})});
  check(replacement.status===201,"resume: owner replacement persisted");remember("resumes",replacement.json?.data?.path);
  check((await request(resumePath,{account:student})).status===200,"resume: submitted historical object retained after replacement");
  await signedBytes(await request(recruiterResumePath,{account:recruiter}),"historical application resume after profile replacement");
  const deleted=await request("/api/v1/neon-staging/resume",{method:"DELETE",account:student});
  check(deleted.status===200,"resume: owner delete persisted");
  check((await request(`/api/v1/neon-staging/resume?path=${encodeURIComponent(replacement.json.data.path)}`,{account:student})).status===404,
    "resume: deleted object unavailable");

  const eventUpload=await request("/api/v1/neon-staging/media",{method:"POST",account:recruiter,
    form:pdfForm({module:"event_attachment",resourceId:eventId})});
  check(eventUpload.status===201,"event attachment: assigned organizer uploads actual private file");
  remember("event-attachments",eventUpload.json?.data?.path);
  const eventPath=eventUpload.json.data.path;
  check(eventUpload.json.data.publicUrl==="","event attachment: no public URL exposed");
  await db.query(`UPDATE public.events SET attachment_path=$2,attachment_name='synthetic.pdf',attachment_mime_type='application/pdf'
    WHERE id=$1::uuid`,[eventId,eventPath]);
  const eventDownloadBody={module:"event_attachment",resourceId:eventId,path:eventPath,download:true};
  const eventDownload=account=>request("/api/v1/media/download-url",{method:"POST",account,body:eventDownloadBody});
  check((await eventDownload(null)).status===401,"event attachment: anonymous denied");
  check((await eventDownload(unrelated)).status===403,"event attachment: unrelated linked user denied");
  check((await eventDownload(student)).status===403,"event attachment: student denied administrative download");
  await signedBytes(await eventDownload(recruiter),"event attachment assigned organizer");
  await signedBytes(await eventDownload(superAdmin),"event attachment Super Admin");
  const substitutedEvent=await request("/api/v1/media/download-url",{method:"POST",account:recruiter,
    body:{...eventDownloadBody,resourceId:randomUUID()}});
  check(substitutedEvent.status>=400 && substitutedEvent.status<500,"event attachment: resource-ID substitution denied");
  await db.query(`UPDATE public.module_entitlements SET start_at=now()-interval '2 days',expires_at=now()-interval '1 day'
    WHERE user_id=$1::uuid AND module_key='events'`,[recruiter.userId]);
  check((await eventDownload(recruiter)).status===403,"event attachment: expired organizer entitlement denied");
  check((await eventDownload(superAdmin)).status===200,"event attachment: Super Admin bypasses organizer expiry");
  await db.query(`UPDATE public.module_entitlements SET expires_at=NULL WHERE user_id=$1::uuid AND module_key='events'`,[recruiter.userId]);
  const eventDeleteBody={module:"event_attachment",resourceId:eventId,path:eventPath};
  check((await request("/api/v1/neon-staging/media",{method:"DELETE",account:unrelated,body:eventDeleteBody})).status===403,
    "event attachment: unrelated user cannot delete uploaded object");
  check((await request("/api/v1/neon-staging/media",{method:"DELETE",account:recruiter,body:eventDeleteBody})).status===409,
    "event attachment: referenced object cannot be deleted");
  await db.query(`UPDATE public.events SET attachment_path=NULL,attachment_name=NULL,attachment_mime_type=NULL WHERE id=$1::uuid`,[eventId]);
  check((await request("/api/v1/neon-staging/media",{method:"DELETE",account:recruiter,body:eventDeleteBody})).status===200,
    "event attachment: uploader deletes an unreferenced object");
  check((await eventDownload(recruiter)).status===404,"event attachment: deleted or unbound file returns404");
  console.log(JSON.stringify({result:"PASS",checkCount:checks.length,checksPassed:checks.filter(check=>check.pass).length,
    ...(process.argv.includes("--verbose")?{checks}:{}),scope:"synthetic sessions and fixtures on migration-staging; actual private S3 downloads and denials",
    categories:["resume","job experience","job training","payment proof","chat attachment","event attachment"],productionWrites:0}));
} catch(error) {
  const reason=error instanceof Error && checks.some(check=>check.name===error.message)?error.message:"PRIVATE_STORAGE_UAT_FAILED";
  console.error(JSON.stringify({result:"FAIL",checksPassed:checks.filter(check=>check.pass).length,lastChecks:checks.slice(-6),reason,
    databaseCode:typeof error?.code==="string" && /^[A-Z0-9]{5}$/.test(error.code)?error.code:null}));process.exitCode=1;
} finally {
  let cleanup=true;
  for(const object of objects) {
    try { await s3.send(new DeleteObjectCommand({Bucket:object.bucket,Key:object.key})); }
    catch {cleanup=false;}
  }
  if(connected) {
    const ids=accounts.map(account=>account.userId), subjects=accounts.map(account=>account.subject);
    try {
      // Human/browser/network checks can outlive an idle database socket.
      // Cleanup uses a fresh connection and only this run's exact fixture IDs.
      await db.end().catch(()=>undefined);
      db = createClient();
      await db.connect();
      await db.query("BEGIN");
      await db.query(`DELETE FROM public.neon_application_events WHERE recipient_user_id=ANY($1::uuid[])`,[ids]);
      await db.query(`DELETE FROM public.notifications WHERE recipient_id=ANY($1::uuid[])`,[ids]);
      await db.query(`DELETE FROM public.leads WHERE applicant_user_id=ANY($1::uuid[])`,[ids]);
      await db.query(`DELETE FROM public.messages WHERE conversation_id=$1::uuid`,[conversationId]);
      await db.query(`DELETE FROM public.conversations WHERE id=$1::uuid`,[conversationId]);
      await db.query(`DELETE FROM public.mentors WHERE id=$1::uuid`,[mentorId]);
      await db.query(`DELETE FROM public.events WHERE id=$1::uuid`,[eventId]);
      await db.query(`DELETE FROM public.payment_proofs WHERE payment_id=$1::uuid`,[paymentId]);
      await db.query(`DELETE FROM public.payments WHERE id=$1::uuid`,[paymentId]);
      await db.query(`DELETE FROM public.neon_job_document_drafts WHERE job_id=$1::uuid`,[jobId]);
      await db.query(`DELETE FROM public.job_applications WHERE job_id=$1::uuid`,[jobId]);
      await db.query(`DELETE FROM public.jobs WHERE id=$1::uuid`,[jobId]);
      await db.query(`DELETE FROM public.companies WHERE id=$1::uuid`,[companyId]);
      await db.query(`DELETE FROM public.module_entitlements WHERE user_id=ANY($1::uuid[])`,[ids]);
      await db.query(`DELETE FROM public.entity_admin_assignments WHERE user_id=ANY($1::uuid[])`,[ids]);
      await db.query(`DELETE FROM public.user_module_capabilities WHERE user_id=ANY($1::uuid[])`,[ids]);
      await db.query(`DELETE FROM public.user_roles WHERE user_id=ANY($1::uuid[])`,[ids]);
      await db.query(`DELETE FROM public.media_upload_intents WHERE user_id=ANY($1::uuid[])`,[ids]);
      await db.query(`DELETE FROM public.audit_logs WHERE actor_user_id=ANY($1::uuid[])`,[ids]);
      await db.query(`DELETE FROM public.neon_identity_links WHERE neon_auth_user_id=ANY($1::uuid[])`,[subjects]);
      await db.query(`DELETE FROM public.neon_application_accounts WHERE legacy_user_id=ANY($1::uuid[])`,[ids]);
      await db.query(`DELETE FROM public.profiles WHERE user_id=ANY($1::uuid[])`,[ids]);
      await db.query(`DELETE FROM neon_auth."user" WHERE id::text=ANY($1::text[])`,[subjects]);
      await db.query("COMMIT");
      const remaining=(await db.query(`SELECT
        (SELECT count(*)::int FROM neon_auth."user" WHERE id::text=ANY($1::text[])) AS auth,
        (SELECT count(*)::int FROM public.profiles WHERE user_id=ANY($2::uuid[])) AS profiles,
        (SELECT count(*)::int FROM public.neon_identity_links WHERE neon_auth_user_id=ANY($3::uuid[])) AS links`,
      [subjects,ids,subjects])).rows[0];
      if(remaining.auth!==0 || remaining.profiles!==0 || remaining.links!==0) cleanup=false;
    } catch {await db.query("ROLLBACK").catch(()=>undefined);cleanup=false;}
    await db.end().catch(()=>undefined);
  }
  for(const object of objects) {
    try {await s3.send(new HeadObjectCommand({Bucket:object.bucket,Key:object.key}));cleanup=false;}
    catch(error) {if(error?.$metadata?.httpStatusCode!==404) cleanup=false;}
  }
  s3.destroy();
  console.log(JSON.stringify({cleanup:cleanup?"PASS":"FAIL",syntheticAccountsRemoved:cleanup?accounts.length:null,
    syntheticObjectsRemoved:cleanup?objects.length:null}));
  if(!cleanup) process.exitCode=1;
}
