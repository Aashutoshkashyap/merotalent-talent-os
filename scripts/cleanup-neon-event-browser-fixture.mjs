/** Recovery only for an exact synthetic browser-run nonce. Pinned isolated staging;
 * requires the fixture's exact names, non-deliverable emails and synthetic identity proofs.
 * Never searches by real-user email or accepts a production connection.
 */
import dotenv from "dotenv";
import pg from "pg";
import { execFileSync } from "node:child_process";
import { S3Client, DeleteObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import { requireNeonMigrationStaging } from "./require-neon-migration-staging.mjs";
dotenv.config({ path: ".migration.env", quiet: true });
requireNeonMigrationStaging(process.env.NEON_STAGING_DATABASE_URL);
const run = /^--run=([0-9a-f]{12})$/.exec(process.argv[2] ?? "")?.[1];
if (!run || process.argv.length !== 3) throw new Error("EXACT_SYNTHETIC_RUN_REQUIRED");
const endpoint = "https://br-frosty-haze-azsnybmr.storage.c-3.ap-southeast-1.aws.neon.tech";
if (process.env.AWS_ENDPOINT_URL_S3 !== endpoint) throw new Error("UNEXPECTED_STAGING_STORAGE");
const url = new URL(process.env.NEON_STAGING_DATABASE_URL); url.searchParams.set("sslmode", "verify-full");
const db = new pg.Client({ connectionString: url.href, connectionTimeoutMillis: 10000, query_timeout: 30000 });
const s3 = new S3Client({ endpoint, region: process.env.AWS_REGION, forcePathStyle: true,
  credentials: { accessKeyId: process.env.AWS_ACCESS_KEY_ID, secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY },
  requestHandler: { connectionTimeout: 5000, requestTimeout: 15000 }, maxAttempts: 2 });
const requireCheck = (value, code) => { if (!value) throw new Error(code); };
try {
  await db.connect(); await db.query("BEGIN");
  const names = [`Synthetic Browser Admin ${run}`, `Synthetic Browser College Admin ${run}`, `Synthetic Event Student ${run}`];
  const accounts = (await db.query(`SELECT p.user_id,p.email,p.full_name,l.neon_auth_user_id AS subject
    FROM public.profiles p JOIN public.neon_application_accounts a ON a.legacy_user_id=p.user_id
    JOIN public.neon_identity_links l ON l.application_account_id=a.id AND l.status='verified'
      AND l.verification_method='isolated_staging_synthetic_signup'
    WHERE p.full_name=ANY($1::text[]) FOR UPDATE OF p,a,l`, [names])).rows;
  requireCheck(accounts.length === 3 && accounts.every(account => names.includes(account.full_name) &&
    new RegExp(`^neon-browser-(admin|college|student)-${run}@example[.]com$`).test(account.email)), "SYNTHETIC_IDENTITY_PROOF_REQUIRED");
  const ids = accounts.map(account => account.user_id);
  const events = (await db.query("SELECT id,organizer_user_id FROM public.events WHERE title=ANY($1::text[]) FOR UPDATE", [[`Synthetic Browser Event ${run}`, `Synthetic Browser Event B ${run}`]])).rows;
  requireCheck(events.length >= 1 && events.length <= 2 && events.every(event => ids.includes(event.organizer_user_id)), "EXACT_SYNTHETIC_EVENT_REQUIRED");
  const eventIds = events.map(event => event.id);
  const colleges = (await db.query("SELECT id FROM public.institutes WHERE name=ANY($1::text[]) AND owner_user_id=ANY($2::uuid[])",
    [[`Synthetic Browser College A ${run}`, `Synthetic Browser College B ${run}`], ids])).rows.map(row => row.id);
  requireCheck(colleges.length === 2, "EXACT_SYNTHETIC_COLLEGES_REQUIRED");
  const company = (await db.query("SELECT id FROM public.companies WHERE name=$1 AND user_id=ANY($2::uuid[])", [`Synthetic Browser Company ${run}`, ids])).rows;
  const mentor = (await db.query("SELECT id FROM public.mentors WHERE headline=$1 AND user_id=ANY($2::uuid[])", [`Synthetic Browser Mentor ${run}`, ids])).rows;
  requireCheck(company.length === 1 && mentor.length === 1, "EXACT_SYNTHETIC_ENTITIES_REQUIRED");
  requireCheck(!(await db.query(`SELECT id FROM public.payments WHERE user_id=ANY($1::uuid[])
    AND (gateway IS DISTINCT FROM 'manual' OR status IS DISTINCT FROM 'pending' OR transaction_id NOT LIKE $2)`, [ids, `SYNTHETIC-BROWSER-${run}`])).rowCount, "REAL_FINANCIAL_RECORD_PRESENT");
  requireCheck(!(await db.query("SELECT id FROM public.media_upload_intents WHERE user_id=ANY($1::uuid[])", [ids])).rowCount, "ADDITIONAL_MEDIA_REQUIRES_REVIEW");
  const objects = (await db.query("SELECT object_path,user_id FROM public.event_activity_files WHERE event_id=ANY($1::uuid[])", [eventIds])).rows;
  for (const object of objects) {
    requireCheck(ids.includes(object.user_id) && eventIds.some(id => object.object_path.startsWith(`activities/${id}/${object.user_id}/`)), "EXACT_SYNTHETIC_OBJECT_REQUIRED");
    await s3.send(new DeleteObjectCommand({ Bucket: "event-attachments", Key: object.object_path }));
    let missing = false;
    try { await s3.send(new HeadObjectCommand({ Bucket: "event-attachments", Key: object.object_path })); }
    catch (error) { missing = error?.$metadata?.httpStatusCode === 404; }
    requireCheck(missing, "OBJECT_CLEANUP_NOT_CONFIRMED");
  }
  await db.query("DELETE FROM public.payment_proofs WHERE payment_id IN(SELECT id FROM public.payments WHERE user_id=ANY($1::uuid[]))", [ids]);
  for (const table of ["payment_checkout_sessions", "module_entitlements", "subscriptions", "payments", "entity_scope_requests", "sub_admin_requests", "entity_admin_assignments", "user_module_capabilities", "media_upload_intents", "user_roles"])
    await db.query(`DELETE FROM public.${table} WHERE user_id=ANY($1::uuid[])`, [ids]);
  await db.query("DELETE FROM public.neon_application_events WHERE recipient_user_id=ANY($1::uuid[])", [ids]);
  await db.query("DELETE FROM public.notifications WHERE recipient_id=ANY($1::uuid[]) OR sender_id=ANY($1::uuid[])", [ids]);
  for (const eventId of eventIds) {
  await db.query(`DELETE FROM public.audit_logs WHERE actor_user_id=ANY($1::uuid[]) OR (entity_type='quiz_attempts' AND entity_id IN(
    SELECT q.id::text FROM public.quiz_attempts q JOIN public.event_activities a ON a.id=q.activity_id WHERE a.event_id=$2::uuid))`, [ids, eventId]);
  await db.query("DELETE FROM public.certificates WHERE event_id=$1::uuid", [eventId]);
  await db.query(`DELETE FROM public.event_assignment_reviews WHERE submission_id IN(SELECT s.id FROM public.event_assignment_submissions s
    JOIN public.event_activities a ON a.id=s.activity_id WHERE a.event_id=$1::uuid)`, [eventId]);
  await db.query("DELETE FROM public.event_assignment_submissions WHERE activity_id IN(SELECT id FROM public.event_activities WHERE event_id=$1::uuid)", [eventId]);
  await db.query("DELETE FROM public.quiz_attempts WHERE activity_id IN(SELECT id FROM public.event_activities WHERE event_id=$1::uuid)", [eventId]);
  for (const table of ["event_activity_ticket_access", "event_activity_questions", "quiz_questions", "event_certificate_templates", "event_activity_files", "event_activities", "quizzes", "event_tickets"])
    await db.query(`DELETE FROM public.${table} WHERE event_id=$1::uuid`, [eventId]);
  await db.query("DELETE FROM public.event_participants WHERE registration_id IN(SELECT id FROM public.event_registrations WHERE event_id=$1::uuid)", [eventId]);
  await db.query("DELETE FROM public.event_registrations WHERE event_id=$1::uuid", [eventId]);
  await db.query("DELETE FROM public.event_ticket_types WHERE event_id=$1::uuid", [eventId]);
  }
  await db.query("DELETE FROM public.institute_notices WHERE institute_id=ANY($1::uuid[])", [colleges]);
  await db.query("DELETE FROM public.college_blogs WHERE institute_id=ANY($1::uuid[])", [colleges]);
  await db.query("DELETE FROM public.institutes WHERE id=ANY($1::uuid[])", [colleges]);
  await db.query("DELETE FROM public.companies WHERE id=$1::uuid", [company[0].id]);
  await db.query("DELETE FROM public.mentors WHERE id=$1::uuid", [mentor[0].id]);
  await db.query("DELETE FROM public.events WHERE id=ANY($1::uuid[])", [eventIds]);
  const subjects = accounts.map(account => account.subject);
  await db.query("DELETE FROM public.neon_identity_links WHERE neon_auth_user_id=ANY($1::uuid[])", [subjects]);
  await db.query("DELETE FROM public.neon_application_accounts WHERE legacy_user_id=ANY($1::uuid[])", [ids]);
  await db.query("DELETE FROM public.profiles WHERE user_id=ANY($1::uuid[])", [ids]);
  await db.query("COMMIT");
  requireCheck(!(await db.query("SELECT user_id FROM public.profiles WHERE user_id=ANY($1::uuid[])", [ids])).rowCount &&
    !(await db.query("SELECT id FROM public.events WHERE id=ANY($1::uuid[])", [eventIds])).rowCount &&
    !(await db.query("SELECT id FROM public.event_activity_files WHERE event_id=ANY($1::uuid[])", [eventIds])).rowCount, "PUBLIC_FIXTURE_CLEANUP_NOT_CONFIRMED");
  for (const subject of subjects) {
    execFileSync("npx", ["--yes", "neon@latest", "neon-auth", "user", "delete", subject,
      "--project-id", "summer-sky-63693897", "--branch", "br-frosty-haze-azsnybmr"], { stdio: ["ignore", "pipe", "pipe"], timeout: 30000 });
    requireCheck(!(await db.query('SELECT id FROM neon_auth."user" WHERE id::text=$1', [subject])).rowCount, "AUTH_CLEANUP_NOT_CONFIRMED");
  }
  console.log(JSON.stringify({ result: "PASS", syntheticAccounts: accounts.length, syntheticObjects: objects.length, eventsRemoved: eventIds.length, productionWrites: 0 }));
} catch (error) {
  await db.query("ROLLBACK").catch(() => {});
  console.error(JSON.stringify({ result: "REVIEW_REQUIRED", code: /^[A-Z_]{3,70}$/.test(error?.message ?? "") ? error.message : error.code ?? "CLEANUP_FAILED", productionWrites: 0 })); process.exitCode = 1;
} finally { await db.end().catch(() => {}); s3.destroy(); }
