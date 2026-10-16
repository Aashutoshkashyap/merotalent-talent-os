/** Exact-run crash recovery for the disposable local browser UAT harness. */
import dotenv from "dotenv";
import pg from "pg";
import { execFileSync } from "node:child_process";
import { S3Client, ListObjectsV2Command, DeleteObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import { requireNeonMigrationStaging } from "./require-neon-migration-staging.mjs";

dotenv.config({ path: ".migration.env", quiet: true });
requireNeonMigrationStaging(process.env.NEON_STAGING_DATABASE_URL);
const run = process.argv.find(value => value.startsWith("--run="))?.slice(6);
const apply = process.argv.includes("--apply-staging");
if (!run || !/^[a-f0-9]{12}$/.test(run) || process.argv.slice(2).some(value => value !== `--run=${run}` && value !== "--apply-staging")) {
  throw new Error("EXACT_SYNTHETIC_RUN_REQUIRED");
}
const branchId = "br-frosty-haze-azsnybmr", projectId = "summer-sky-63693897";
const endpoint = "https://br-frosty-haze-azsnybmr.storage.c-3.ap-southeast-1.aws.neon.tech";
if (process.env.NEON_STAGING_BRANCH_ID !== branchId || process.env.AWS_ENDPOINT_URL_S3 !== endpoint) throw new Error("UNEXPECTED_STAGING_TARGET");
const emails = [`neon-browser-admin-${run}@example.com`, `neon-browser-college-${run}@example.com`];
const db = new pg.Client({ connectionString: process.env.NEON_STAGING_DATABASE_URL, connectionTimeoutMillis: 10000 });
const s3 = new S3Client({ endpoint, region: process.env.AWS_REGION, forcePathStyle: true,
  credentials: { accessKeyId: process.env.AWS_ACCESS_KEY_ID, secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY } });
const buckets = ["resumes", "profile-media", "college-media", "mentor-media", "job-files", "event-media",
  "event-attachments", "application-files", "payment-proofs", "chat-attachments", "course-media", "ad-media"];
const objects = [];
let connected = false;
try {
  await db.connect(); connected = true;
  const subjects = (await db.query('SELECT id,email,name FROM neon_auth."user" WHERE email=ANY($1::text[])', [emails])).rows;
  if (subjects.some(value => !emails.includes(value.email) || ![`Synthetic Browser Admin ${run}`, `Synthetic Browser College Admin ${run}`].includes(value.name))) {
    throw new Error("SYNTHETIC_PROVIDER_NAME_MISMATCH");
  }
  const profiles = (await db.query(`SELECT p.user_id,p.email,l.neon_auth_user_id,l.verification_method
    FROM public.profiles p LEFT JOIN public.neon_application_accounts a ON a.legacy_user_id=p.user_id
    LEFT JOIN public.neon_identity_links l ON l.application_account_id=a.id WHERE p.email=ANY($1::text[])`, [emails])).rows;
  if (profiles.some(value => !emails.includes(value.email) || value.verification_method !== "isolated_staging_synthetic_signup" ||
    !subjects.some(subject => subject.id === value.neon_auth_user_id && subject.email === value.email))) throw new Error("SYNTHETIC_MAPPING_MISMATCH");
  const ids = profiles.map(value => value.user_id), authIds = subjects.map(value => value.id);
  const colleges = (await db.query(`SELECT id FROM public.institutes WHERE owner_user_id=ANY($1::uuid[]) AND slug=ANY($2::text[])`,
    [ids, [`synthetic-browser-${run}-0`, `synthetic-browser-${run}-1`]])).rows.map(value => value.id);
  const companies = (await db.query("SELECT id FROM public.companies WHERE user_id=ANY($1::uuid[])", [ids])).rows.map(value => value.id);
  const mentors = (await db.query("SELECT id FROM public.mentors WHERE user_id=ANY($1::uuid[])", [ids])).rows.map(value => value.id);
  const events = (await db.query("SELECT id FROM public.events WHERE organizer_user_id=ANY($1::uuid[])", [ids])).rows.map(value => value.id);
  const payments = (await db.query("SELECT id FROM public.payments WHERE user_id=ANY($1::uuid[])", [ids])).rows.map(value => value.id);
  for (const bucket of buckets) for (const id of ids) {
    let token;
    do {
      let list;
      try { list = await s3.send(new ListObjectsV2Command({ Bucket: bucket, Prefix: `${id}/`, ContinuationToken: token })); }
      catch (error) { if (error?.$metadata?.httpStatusCode === 404) break; throw new Error("SYNTHETIC_OBJECT_INVENTORY_FAILED"); }
      for (const object of list.Contents ?? []) if (object.Key?.startsWith(`${id}/`)) objects.push({ bucket, key: object.Key });
      token = list.IsTruncated ? list.NextContinuationToken : undefined;
    } while (token);
  }
  const counts = { accounts: subjects.length, profiles: ids.length, colleges: colleges.length, companies: companies.length,
    mentors: mentors.length, events: events.length, payments: payments.length, objects: objects.length };
  if (!apply) console.log(JSON.stringify({ mode: "EXACT_RUN_DRY_RUN", counts, productionWrites: 0 }));
  else {
    for (const object of objects) {
      await s3.send(new DeleteObjectCommand({ Bucket: object.bucket, Key: object.key }));
      try { await s3.send(new HeadObjectCommand({ Bucket: object.bucket, Key: object.key })); throw new Error("SYNTHETIC_OBJECT_NOT_REMOVED"); }
      catch (error) { if (error?.$metadata?.httpStatusCode !== 404) throw error; }
    }
    await db.query("BEGIN");
    await db.query("DELETE FROM public.payment_proofs WHERE payment_id=ANY($1::uuid[])", [payments]);
    await db.query("DELETE FROM public.payment_checkout_sessions WHERE user_id=ANY($1::uuid[])", [ids]);
    await db.query("DELETE FROM public.module_entitlements WHERE user_id=ANY($1::uuid[])", [ids]);
    await db.query("DELETE FROM public.subscriptions WHERE user_id=ANY($1::uuid[])", [ids]);
    await db.query("DELETE FROM public.entity_scope_requests WHERE user_id=ANY($1::uuid[])", [ids]);
    await db.query("DELETE FROM public.sub_admin_requests WHERE user_id=ANY($1::uuid[])", [ids]);
    await db.query("DELETE FROM public.payments WHERE user_id=ANY($1::uuid[])", [ids]);
    await db.query("DELETE FROM public.leads WHERE applicant_user_id=ANY($1::uuid[]) OR owner_user_id=ANY($1::uuid[])", [ids]);
    await db.query("DELETE FROM public.neon_application_events WHERE recipient_user_id=ANY($1::uuid[])", [ids]);
    await db.query("DELETE FROM public.notifications WHERE recipient_id=ANY($1::uuid[]) OR sender_id=ANY($1::uuid[]) OR entity_id=ANY($2::uuid[])",
      [ids, [...colleges, ...companies, ...mentors, ...events, ...payments]]);
    await db.query("DELETE FROM public.entity_admin_assignments WHERE user_id=ANY($1::uuid[])", [ids]);
    await db.query("DELETE FROM public.user_module_capabilities WHERE user_id=ANY($1::uuid[])", [ids]);
    await db.query("DELETE FROM public.media_upload_intents WHERE user_id=ANY($1::uuid[])", [ids]);
    await db.query("DELETE FROM public.institute_notices WHERE institute_id=ANY($1::uuid[])", [colleges]);
    await db.query("DELETE FROM public.college_blogs WHERE institute_id=ANY($1::uuid[])", [colleges]);
    await db.query("DELETE FROM public.institutes WHERE id=ANY($1::uuid[])", [colleges]);
    await db.query("DELETE FROM public.companies WHERE id=ANY($1::uuid[])", [companies]);
    await db.query("DELETE FROM public.mentor_services WHERE mentor_id=ANY($1::uuid[])", [mentors]);
    await db.query("DELETE FROM public.mentors WHERE id=ANY($1::uuid[])", [mentors]);
    await db.query("DELETE FROM public.event_tickets WHERE event_id=ANY($1::uuid[])", [events]);
    await db.query("DELETE FROM public.events WHERE id=ANY($1::uuid[])", [events]);
    await db.query("DELETE FROM public.audit_logs WHERE actor_user_id=ANY($1::uuid[])", [ids]);
    await db.query("DELETE FROM public.user_roles WHERE user_id=ANY($1::uuid[])", [ids]);
    await db.query("DELETE FROM public.neon_identity_links WHERE neon_auth_user_id=ANY($1::uuid[])", [authIds]);
    await db.query("DELETE FROM public.neon_application_accounts WHERE legacy_user_id=ANY($1::uuid[])", [ids]);
    await db.query("DELETE FROM public.profiles WHERE user_id=ANY($1::uuid[])", [ids]);
    await db.query("COMMIT");
    for (const id of authIds) execFileSync("npx", ["--yes", "neon@latest", "neon-auth", "user", "delete", id,
      "--project-id", projectId, "--branch", branchId], { stdio: ["ignore", "pipe", "pipe"], timeout: 30000 });
    const remaining = (await db.query(`SELECT
      (SELECT count(*)::int FROM neon_auth."user" WHERE id::text=ANY($1::text[])) AS auth,
      (SELECT count(*)::int FROM public.profiles WHERE user_id=ANY($2::uuid[])) AS profiles,
      (SELECT count(*)::int FROM public.neon_identity_links WHERE neon_auth_user_id=ANY($3::uuid[])) AS links`, [authIds, ids, authIds])).rows[0];
    if (remaining.auth || remaining.profiles || remaining.links) throw new Error("SYNTHETIC_REMOVAL_NOT_CONFIRMED");
    console.log(JSON.stringify({ cleanup: "PASS", counts, remaining, productionWrites: 0 }));
  }
} catch (error) {
  if (connected) await db.query("ROLLBACK").catch(() => undefined);
  console.error(JSON.stringify({ cleanup: "REVIEW_REQUIRED", code: typeof error?.code === "string" && /^[A-Z0-9]{5}$/.test(error.code) ? error.code : null,
    check: typeof error?.message === "string" && /^[A-Z0-9_]{2,80}$/.test(error.message) ? error.message : "SYNTHETIC_CLEANUP_FAILED" }));
  process.exitCode = 1;
} finally { if (connected) await db.end().catch(() => undefined); s3.destroy(); }
