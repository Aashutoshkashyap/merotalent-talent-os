/** Recover cleanup only for individually proven browser-UAT fixtures created by the matching script. */
import { execFileSync } from "node:child_process";
import dotenv from "dotenv";
import pg from "pg";
import { requireNeonMigrationStaging } from "./require-neon-migration-staging.mjs";
import { readEncryptedSourceSnapshot } from "./source-snapshot-artifact.mjs";
import { summarizeSourceSnapshot } from "./source-auth-snapshot.mjs";
dotenv.config({path:".migration.env",quiet:true});
requireNeonMigrationStaging(process.env.NEON_STAGING_DATABASE_URL);
const databaseUrl=new URL(process.env.NEON_STAGING_DATABASE_URL);databaseUrl.searchParams.set('sslmode','verify-full');
const db=new pg.Client({connectionString:databaseUrl.href,connectionTimeoutMillis:15000,query_timeout:30000});
const apply=process.argv.includes("--apply-staging");
const sourcePath=process.argv.find(arg=>arg.startsWith("--source-snapshot="))?.slice("--source-snapshot=".length);
const expectedHash=process.argv.find(arg=>arg.startsWith("--source-sha256="))?.slice("--source-sha256=".length);
try {
  if (!sourcePath || !expectedHash) throw new Error("Reviewed source snapshot required before fixture cleanup.");
  const source=await readEncryptedSourceSnapshot(sourcePath);
  if (summarizeSourceSnapshot(source).snapshotSha256!==expectedHash) throw new Error("Source snapshot hash mismatch.");
  const sourceIds=new Set(source.auth.users.map(raw=>JSON.parse(raw).id));
  await db.connect();
  const rows=(await db.query(`SELECT p.user_id,p.email,a.id AS account_id,l.neon_auth_user_id
    FROM public.profiles p JOIN public.neon_application_accounts a ON a.legacy_user_id=p.user_id
    JOIN public.neon_identity_links l ON l.application_account_id=a.id
    WHERE p.full_name='Disposable eSewa UAT student' AND p.email ~ '^neon-esewa-[0-9a-f]{12}@example[.]com$'
      AND l.verification_method='isolated_staging_synthetic_signup'`)).rows;
  let cleaned=0;
  for (const row of rows) {
    if(sourceIds.has(row.user_id))throw new Error("Source account must never be cleaned as a fixture.");
    const ownerEmail=row.email.replace("neon-esewa-","owner-");
    const owner=(await db.query(`SELECT user_id FROM public.profiles
      WHERE email=$1 AND full_name='Disposable eSewa UAT mentor'`,[ownerEmail])).rows[0];
    if (!owner) throw new Error("Synthetic fixture owner cannot be proven.");
    if(sourceIds.has(owner.user_id))throw new Error("Source owner must never be cleaned as a fixture.");
    if (!apply) continue;
    await db.query("BEGIN");
    try {
      const userIds=[row.user_id,owner.user_id];
      await db.query("DELETE FROM public.neon_application_events WHERE recipient_user_id=ANY($1::uuid[])",[userIds]);
      await db.query("DELETE FROM public.event_tickets WHERE user_id=$1::uuid",[row.user_id]);
      await db.query("DELETE FROM public.payment_checkout_sessions WHERE user_id=$1::uuid",[row.user_id]);
      await db.query("DELETE FROM public.module_entitlements WHERE user_id=$1::uuid",[row.user_id]);
      await db.query("DELETE FROM public.leads WHERE applicant_user_id=$1::uuid OR owner_user_id=$2::uuid",userIds);
      await db.query("DELETE FROM public.notifications WHERE recipient_id=ANY($1::uuid[]) OR sender_id=ANY($1::uuid[])",[userIds]);
      await db.query("DELETE FROM public.mentor_bookings WHERE student_id=$1::uuid",[row.user_id]);
      await db.query("DELETE FROM public.event_registrations WHERE user_id=$1::uuid",[row.user_id]);
      await db.query("DELETE FROM public.payments WHERE user_id=$1::uuid",[row.user_id]);
      await db.query("DELETE FROM public.events WHERE organizer_user_id=$1::uuid AND title='Disposable UAT event'",[owner.user_id]);
      await db.query("DELETE FROM public.mentor_services WHERE mentor_id IN (SELECT id FROM public.mentors WHERE user_id=$1::uuid AND headline='Disposable UAT mentor')",[owner.user_id]);
      await db.query("DELETE FROM public.mentors WHERE user_id=$1::uuid AND headline='Disposable UAT mentor'",[owner.user_id]);
      await db.query("DELETE FROM public.neon_identity_links WHERE application_account_id=$1::uuid",[row.account_id]);
      await db.query("DELETE FROM public.neon_application_accounts WHERE id=$1::uuid",[row.account_id]);
      await db.query("DELETE FROM public.user_roles WHERE user_id=ANY($1::uuid[])",[userIds]);
      await db.query("DELETE FROM public.profiles WHERE user_id=ANY($1::uuid[])",[userIds]);
      await db.query("COMMIT");
    } catch(error) {await db.query("ROLLBACK");throw error;}
    execFileSync("npx",["--yes","neon@8.8.0","neon-auth","user","delete",row.neon_auth_user_id,
      "--project-id","summer-sky-63693897","--branch","br-frosty-haze-azsnybmr"],{stdio:["ignore","pipe","pipe"],timeout:30000});
    cleaned++;
  }
  console.log(JSON.stringify({mode:apply?"APPLIED_STAGING_ONLY":"DRY_RUN",provenSyntheticFixtureSets:rows.length,cleaned}));
} catch(error) {
  console.error(JSON.stringify({cleanup:"FAILED",code:error?.code ?? "unknown",constraint:error?.constraint ?? null}));process.exitCode=1;
} finally {await db.end();}
