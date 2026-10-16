/** Disposable browser UAT: real Managed Auth sessions, synthetic staging rows only.
 * Local /open merely scopes an authentic application cookie to localhost. It is
 * never installed as an application endpoint and contains no authorization bypass.
 */
import { createServer } from "node:http";
import { randomBytes, randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";
import dotenv from "dotenv";
import pg from "pg";
import { S3Client, ListObjectsV2Command, DeleteObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import { requireNeonMigrationStaging } from "./require-neon-migration-staging.mjs";

dotenv.config({ path: ".migration.env", quiet: true });
requireNeonMigrationStaging(process.env.NEON_STAGING_DATABASE_URL);
const app = "http://localhost:3210", port = 3223;
const auth = "https://ep-wispy-credit-azt6tgwj.neonauth.c-3.ap-southeast-1.aws.neon.tech/neondb/auth";
const endpoint = "https://br-frosty-haze-azsnybmr.storage.c-3.ap-southeast-1.aws.neon.tech";
const projectId = "summer-sky-63693897", branchId = "br-frosty-haze-azsnybmr";
if (process.env.NEON_AUTH_BASE_URL !== auth || process.env.AWS_ENDPOINT_URL_S3 !== endpoint ||
    process.env.NEON_STAGING_BRANCH_ID !== branchId) throw new Error("UNEXPECTED_ISOLATED_STAGING_TARGET");
const db = new pg.Client({ connectionString: process.env.NEON_STAGING_DATABASE_URL, connectionTimeoutMillis: 10000 });
const s3 = new S3Client({ endpoint, region: process.env.AWS_REGION, forcePathStyle: true,
  credentials: { accessKeyId: process.env.AWS_ACCESS_KEY_ID, secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY } });
const runId = randomBytes(6).toString("hex"), accounts = [];
const collegeIds = [randomUUID(), randomUUID()], companyId = randomUUID(), mentorId = randomUUID(), eventId = randomUUID();
const paymentId = randomUUID(), privateObjects = [];
const names = { admin: `Synthetic Browser Admin ${runId}`, college: `Synthetic Browser College Admin ${runId}`,
  colleges: [`Synthetic Browser College A ${runId}`, `Synthetic Browser College B ${runId}`],
  company: `Synthetic Browser Company ${runId}`, mentor: `Synthetic Browser Mentor ${runId}`, event: `Synthetic Browser Event ${runId}` };
let connected = false, ready = false, cleaning;
const check = (condition, code) => { if (!condition) throw new Error(code); };
const cookieOf = response => response.headers.getSetCookie().map(value => value.split(";", 1)[0]).join("; ");
const safeError = error => ({ code: typeof error?.code === "string" && /^[A-Z0-9_]{2,60}$/.test(error.code) ? error.code : "UAT_SETUP_OR_CLEANUP_FAILED",
  check: typeof error?.message === "string" && /^[A-Z0-9_]{2,80}$/.test(error.message) ? error.message : null });
async function appRequest(account, path) {
  const response = await fetch(`${app}${path}`, { headers: account ? { cookie: account.cookie } : {},
    cache: "no-store", signal: AbortSignal.timeout(30000) });
  return { status: response.status, json: await response.json().catch(() => null) };
}
async function createAccount(kind) {
  // Reserved, nondeliverable example.com identities; no invitation, OTP,
  // verification-email, reset-email or payment API is called by this harness.
  const email = `neon-browser-${kind}-${runId}@example.com`, password = randomBytes(32).toString("base64url");
  const signUp = await fetch(`${auth}/sign-up/email`, { method: "POST", headers: { origin: app, "content-type": "application/json" },
    body: JSON.stringify({ email, password, name: names[kind] }), redirect: "manual", signal: AbortSignal.timeout(30000) });
  const created = await signUp.clone().json().catch(() => null);
  check(signUp.ok && typeof created?.user?.id === "string" && /^[0-9a-f-]{36}$/i.test(created.user.id), "SYNTHETIC_MANAGED_AUTH_SIGNUP_FAILED");
  const account = { kind, email, password, subject: created.user.id, userId: randomUUID(), accountId: null,
    cookie: cookieOf(signUp), setCookies: [] };
  accounts.push(account);
  const sessionResponse = await fetch(`${auth}/get-session`, { headers: { cookie: account.cookie }, signal: AbortSignal.timeout(30000) });
  const session = await sessionResponse.json().catch(() => null);
  check(sessionResponse.ok && session?.user?.id === account.subject && session?.session?.userId === account.subject, "MANAGED_SESSION_SUBJECT_MISMATCH");
  check((await appRequest(account, "/api/v1/neon-staging/profile")).status === 403, "UNLINKED_SYNTHETIC_SUBJECT_NOT_DENIED");
  return account;
}
async function applicationSignIn(account) {
  const response = await fetch(`${app}/api/v1/neon-staging/auth/sign-in/email`, { method: "POST",
    headers: { origin: app, "content-type": "application/json" }, body: JSON.stringify({ email: account.email, password: account.password }),
    redirect: "manual", signal: AbortSignal.timeout(30000) });
  check(response.ok, "APPLICATION_MANAGED_AUTH_SIGNIN_FAILED");
  account.setCookies = response.headers.getSetCookie().filter(value => /^(?:__Secure-|__Host-)?(?:better-auth|neon-auth)\.[A-Za-z_]+=/.test(value));
  account.cookie = account.setCookies.map(value => value.split(";", 1)[0]).join("; ");
  check(account.cookie && account.setCookies.length, "APPLICATION_COOKIE_NOT_ISSUED");
  const profile = await appRequest(account, "/api/v1/neon-staging/profile");
  check(profile.status === 200 && profile.json?.data?.user_id === account.userId, "APPLICATION_PROFILE_SUBJECT_MISMATCH");
  account.password = null;
}

const handler = async (req, res) => {
  res.setHeader("Cache-Control", "private, no-store");
  if (!req.socket.remoteAddress || !["127.0.0.1", "::1", "::ffff:127.0.0.1"].includes(req.socket.remoteAddress) ||
    ![`localhost:${port}`, `127.0.0.1:${port}`].includes(req.headers.host ?? "") || req.method !== "GET") {
    res.writeHead(403); res.end("Local browser UAT only."); return;
  }
  const url = new URL(req.url, `http://localhost:${port}`);
  if (url.pathname === "/status") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ready, syntheticAccounts: accounts.length, fixtureNames: names, credentialsPrinted: false })); return;
  }
  if (url.pathname !== "/open" || !ready) { res.writeHead(ready ? 404 : 503); res.end("UAT setup is not ready."); return; }
  const college = url.searchParams.get("role") === "college";
  const account = accounts.find(value => value.kind === (college ? "college" : "admin"));
  // Browser cookies are port-independent on localhost. These are the authentic
  // HttpOnly cookies returned by the application's own sign-in endpoint.
  res.writeHead(302, { "Set-Cookie": account.setCookies, Location: `${app}${college ? "/institute" : "/admin"}` });
  res.end();
};
const server = createServer(handler), ipv6Server = createServer(handler);

async function cleanup() {
  if (cleaning) return cleaning;
  ready = false;
  cleaning = (async () => {
    await Promise.all([server, ipv6Server].map(value => new Promise(resolve => value.close(resolve))));
    let success = true;
    if (connected) {
      const ids = accounts.map(account => account.userId), subjects = accounts.map(account => account.subject);
      // Discover only exact object keys under newly generated fixture UUIDs;
      // never remove an imported key or delete an object by wildcard/prefix.
      const buckets = ["resumes", "profile-media", "college-media", "mentor-media", "job-files", "event-media",
        "event-attachments", "application-files", "payment-proofs", "chat-attachments", "course-media", "ad-media"];
      for (const bucket of buckets) for (const id of ids) {
        try {
          let token;
          do {
            const objects = await s3.send(new ListObjectsV2Command({ Bucket: bucket, Prefix: `${id}/`, ContinuationToken: token }));
            for (const item of objects.Contents ?? []) {
              if (item.Key?.startsWith(`${id}/`)) privateObjects.push({ bucket, key: item.Key });
            }
            token = objects.IsTruncated ? objects.NextContinuationToken : undefined;
          } while (token);
        } catch (error) { if (error?.$metadata?.httpStatusCode !== 404) success = false; }
      }
      for (const object of privateObjects) {
        try {
          await s3.send(new DeleteObjectCommand({ Bucket: object.bucket, Key: object.key }));
          try { await s3.send(new HeadObjectCommand({ Bucket: object.bucket, Key: object.key })); success = false; }
          catch (error) { if (error?.$metadata?.httpStatusCode !== 404) success = false; }
        } catch { success = false; }
      }
      try {
        await db.query("BEGIN");
        await db.query("DELETE FROM public.payment_proofs WHERE payment_id IN (SELECT id FROM public.payments WHERE user_id=ANY($1::uuid[]))", [ids]);
        await db.query("DELETE FROM public.payment_checkout_sessions WHERE user_id=ANY($1::uuid[])", [ids]);
        await db.query("DELETE FROM public.module_entitlements WHERE user_id=ANY($1::uuid[])", [ids]);
        await db.query("DELETE FROM public.subscriptions WHERE user_id=ANY($1::uuid[])", [ids]);
        await db.query("DELETE FROM public.payments WHERE user_id=ANY($1::uuid[])", [ids]);
        await db.query("DELETE FROM public.neon_application_events WHERE recipient_user_id=ANY($1::uuid[])", [ids]);
        await db.query("DELETE FROM public.notifications WHERE recipient_id=ANY($1::uuid[]) OR sender_id=ANY($1::uuid[])", [ids]);
        await db.query("DELETE FROM public.entity_scope_requests WHERE user_id=ANY($1::uuid[])", [ids]);
        await db.query("DELETE FROM public.sub_admin_requests WHERE user_id=ANY($1::uuid[])", [ids]);
        await db.query("DELETE FROM public.entity_admin_assignments WHERE user_id=ANY($1::uuid[])", [ids]);
        await db.query("DELETE FROM public.user_module_capabilities WHERE user_id=ANY($1::uuid[])", [ids]);
        await db.query("DELETE FROM public.media_upload_intents WHERE user_id=ANY($1::uuid[])", [ids]);
        await db.query("DELETE FROM public.institute_notices WHERE institute_id=ANY($1::uuid[])", [collegeIds]);
        await db.query("DELETE FROM public.college_blogs WHERE institute_id=ANY($1::uuid[])", [collegeIds]);
        await db.query("DELETE FROM public.institutes WHERE id=ANY($1::uuid[])", [collegeIds]);
        await db.query("DELETE FROM public.companies WHERE id=$1::uuid", [companyId]);
        await db.query("DELETE FROM public.mentors WHERE id=$1::uuid", [mentorId]);
        await db.query("DELETE FROM public.events WHERE id=$1::uuid", [eventId]);
        await db.query("DELETE FROM public.audit_logs WHERE actor_user_id=ANY($1::uuid[])", [ids]);
        await db.query("DELETE FROM public.user_roles WHERE user_id=ANY($1::uuid[])", [ids]);
        await db.query("DELETE FROM public.neon_identity_links WHERE neon_auth_user_id=ANY($1::uuid[])", [subjects]);
        await db.query("DELETE FROM public.neon_application_accounts WHERE legacy_user_id=ANY($1::uuid[])", [ids]);
        await db.query("DELETE FROM public.profiles WHERE user_id=ANY($1::uuid[])", [ids]);
        await db.query("COMMIT");
      } catch (error) { await db.query("ROLLBACK").catch(() => undefined); success = false;
        console.error(JSON.stringify({ cleanup: "REVIEW_REQUIRED", ...safeError(error) })); }
      // The supported provider CLI removes each known disposable subject. No
      // auth table SQL deletion, matching-email lookup, or bulk filter is used.
      if (success) for (const account of accounts) {
        try {
          execFileSync("npx", ["--yes", "neon@latest", "neon-auth", "user", "delete", account.subject,
            "--project-id", projectId, "--branch", branchId], { stdio: ["ignore", "pipe", "pipe"], timeout: 30000 });
          check((await db.query('SELECT id FROM neon_auth."user" WHERE id::text=$1', [account.subject])).rowCount === 0, "SYNTHETIC_AUTH_CLEANUP_NOT_CONFIRMED");
        } catch { success = false; }
      }
      await db.end().catch(() => undefined);
    }
    s3.destroy();
    console.log(JSON.stringify({ cleanup: success ? "PASS" : "REVIEW_REQUIRED", syntheticAccounts: accounts.length,
      syntheticObjects: privateObjects.length, productionWrites: 0 }));
    return success;
  })();
  return cleaning;
}
process.on("SIGINT", async () => process.exit((await cleanup()) ? 0 : 1));
process.on("SIGTERM", async () => process.exit((await cleanup()) ? 0 : 1));

try {
  await new Promise((resolve, reject) => { server.once("error", reject); server.listen(port, "127.0.0.1", resolve); });
  await new Promise((resolve, reject) => { ipv6Server.once("error", reject); ipv6Server.listen({ port, host: "::1", ipv6Only: true }, resolve); });
  await db.connect(); connected = true;
  check((await appRequest(null, "/api/v1/neon-staging/profile")).status === 401, "LOCAL_APPLICATION_NOT_IN_NEON_STAGING");
  const admin = await createAccount("admin"), college = await createAccount("college");
  await db.query("BEGIN");
  for (const account of accounts) {
    await db.query(`INSERT INTO public.profiles(user_id,email,full_name,phone,location,education,onboarding_completed)
      VALUES($1::uuid,$2,$3,'9800000000','Kathmandu','Bachelor',true)`, [account.userId, account.email, names[account.kind]]);
    account.accountId = (await db.query("INSERT INTO public.neon_application_accounts(legacy_user_id) VALUES($1::uuid) RETURNING id", [account.userId])).rows[0].id;
    await db.query(`INSERT INTO public.neon_identity_links(neon_auth_user_id,application_account_id,status,verification_method,verified_at)
      VALUES($1::uuid,$2::uuid,'verified','isolated_staging_synthetic_signup',now())`, [account.subject, account.accountId]);
    await db.query("INSERT INTO public.user_roles(user_id,role) VALUES($1::uuid,$2)", [account.userId, account.kind === "admin" ? "super_admin" : "talent"]);
  }
  for (let index = 0; index < collegeIds.length; index++) {
    await db.query(`INSERT INTO public.institutes(id,name,slug,type,location,description,owner_user_id,status,applications_enabled)
      VALUES($1::uuid,$2,$3,'college','Kathmandu','Disposable browser UAT institution',$4::uuid,'approved',true)`,
    [collegeIds[index], names.colleges[index], `synthetic-browser-${runId}-${index}`, college.userId]);
  }
  await db.query("INSERT INTO public.companies(id,user_id,name) VALUES($1::uuid,$2::uuid,$3)", [companyId, college.userId, names.company]);
  await db.query(`INSERT INTO public.mentors(id,user_id,headline,description,expertise,hourly_rate,is_available,approval_status,availability)
    VALUES($1::uuid,$2::uuid,$3,'Disposable browser UAT mentor',ARRAY['Career'],100,true,'approved','{}')`, [mentorId, college.userId, names.mentor]);
  await db.query(`INSERT INTO public.events(id,organizer_user_id,organizer_type,title,event_type,format,start_date,end_date,
    capacity,ticket_price,currency,is_active,status,approval_status) VALUES($1::uuid,$2::uuid,'user',$3,'free','online',
    now()+interval '10 days',now()+interval '11 days',5,0,'NPR',true,'published','approved')`, [eventId, college.userId, names.event]);
  const capability = (await db.query(`INSERT INTO public.user_module_capabilities(user_id,capability_id,status,granted_by)
    SELECT $1::uuid,id,'active',$2::uuid FROM public.module_capabilities WHERE module_key='college' AND is_active RETURNING id`, [college.userId, admin.userId])).rows[0];
  check(capability, "COLLEGE_CAPABILITY_UNAVAILABLE");
  let firstAssignment;
  for (const id of collegeIds) {
    const assignment = (await db.query(`INSERT INTO public.entity_admin_assignments(user_id,user_capability_id,entity_type,entity_id,status,assigned_by)
      VALUES($1::uuid,$2::uuid,'college',$3::uuid,'active',$4::uuid) RETURNING id`, [college.userId, capability.id, id, admin.userId])).rows[0];
    firstAssignment ??= assignment.id;
    await db.query(`INSERT INTO public.module_entitlements(user_id,module_key,entity_type,entity_id,source,status,start_at,expires_at,features,granted_by,reason)
      VALUES($1::uuid,'college','college',$2::uuid,'ADMIN_MANUAL','active',now()-interval '1 minute',now()+interval '14 days',
      '{"profile_editing":true,"media_management":true,"lead_viewing":true,"college_applications":true}'::jsonb,$3::uuid,'Disposable browser UAT scope')`,
    [college.userId, id, admin.userId]);
  }
  await db.query(`INSERT INTO public.payments(id,user_id,payment_type,reference_id,amount,currency,status,payment_method,transaction_id,gateway,gateway_transaction_id,metadata)
    VALUES($1::uuid,$2::uuid,'module_subscription',$3::uuid,500,'NPR','pending','manual',$4,'manual',$4,
    jsonb_build_object('module','college','entity_type','college','entity_id',$5::uuid,'start_at',now(),'expires_at',now()+interval '14 days','source','synthetic_browser_uat'))`,
  [paymentId, college.userId, firstAssignment, `SYNTHETIC-BROWSER-${runId}`, collegeIds[0]]);
  await db.query("COMMIT");
  for (const account of accounts) await applicationSignIn(account);
  const overview = await appRequest(admin, "/api/v1/neon-staging/admin/payments");
  check(overview.status === 200, "ADMIN_BILLING_COOKIE_NOT_AUTHORIZED");
  const workspaces = await appRequest(college, "/api/v1/neon-staging/college-workspaces");
  check(workspaces.status === 200, "COLLEGE_WORKSPACE_COOKIE_NOT_AUTHORIZED");
  ready = true;
  console.log(JSON.stringify({ mode: "ISOLATED_ADMIN_BROWSER_UAT", adminOpenUrl: `http://localhost:${port}/open`,
    collegeOpenUrl: `http://localhost:${port}/open?role=college`, fixtureNames: names,
    syntheticManagedSubjects: accounts.length, credentialsPrinted: false, productionWrites: 0 }));
} catch (error) {
  console.error(JSON.stringify({ result: "FAIL", ...safeError(error) }));
  if (connected) await db.query("ROLLBACK").catch(() => undefined);
  await cleanup(); process.exitCode = 1;
}
