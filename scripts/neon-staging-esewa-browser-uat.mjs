/** Genuine eSewa UAT through application checkout; disposable synthetic staging account only. */
import { createServer } from "node:http";
import { randomBytes, randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";
import dotenv from "dotenv";
import pg from "pg";
import { requireNeonMigrationStaging } from "./require-neon-migration-staging.mjs";

dotenv.config({ path: ".migration.env", quiet: true });
requireNeonMigrationStaging(process.env.NEON_STAGING_DATABASE_URL);
const app = "http://localhost:3210";
const auth = process.env.NEON_AUTH_BASE_URL;
if (auth !== "https://ep-wispy-credit-azt6tgwj.neonauth.c-3.ap-southeast-1.aws.neon.tech/neondb/auth") throw new Error("Unexpected Auth branch.");
const db = new pg.Client({ connectionString: process.env.NEON_STAGING_DATABASE_URL });
const studentId = randomUUID(), ownerId = randomUUID();
const suffix = randomBytes(6).toString("hex");
const email = `neon-esewa-${suffix}@example.com`, password = randomBytes(32).toString("base64url");
let managedId, accountId, mentorId, serviceId, eventId, bookingId, registrationId, cookie;
let server, cleaning = false;
const check = (value, label) => { if (!value) throw new Error(label); };
const request = async (path, body) => {
  const response = await fetch(`${app}${path}`, { method: body ? "POST" : "GET",
    headers: { cookie, ...(body ? { origin: app, "content-type": "application/json" } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(30000) });
  const json = await response.json().catch(() => null);
  check(response.ok, `${path} returned ${response.status}: ${json?.error ?? "unavailable"}`);
  return json.data;
};
const escape = value => String(value).replace(/[&<>"']/g, letter => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[letter]);
const fixtures = [];

async function cleanup() {
  if (cleaning) return;
  cleaning = true;
  server?.close();
  try {
    await db.query("BEGIN");
    await db.query("DELETE FROM public.event_tickets WHERE event_id=$1::uuid", [eventId ?? null]);
    await db.query("DELETE FROM public.payment_checkout_sessions WHERE user_id=$1::uuid", [studentId]);
    await db.query("DELETE FROM public.module_entitlements WHERE user_id=$1::uuid", [studentId]);
    await db.query("DELETE FROM public.leads WHERE applicant_user_id=$1::uuid OR owner_user_id=$2::uuid", [studentId, ownerId]);
    await db.query("DELETE FROM public.neon_application_events WHERE recipient_user_id=ANY($1::uuid[])", [[studentId, ownerId]]);
    await db.query("DELETE FROM public.notifications WHERE recipient_id=ANY($1::uuid[]) OR sender_id=ANY($1::uuid[])", [[studentId, ownerId]]);
    await db.query("DELETE FROM public.mentor_bookings WHERE student_id=$1::uuid", [studentId]);
    await db.query("DELETE FROM public.event_registrations WHERE user_id=$1::uuid", [studentId]);
    await db.query("DELETE FROM public.payments WHERE user_id=$1::uuid", [studentId]);
    await db.query("DELETE FROM public.events WHERE id=$1::uuid", [eventId ?? null]);
    await db.query("DELETE FROM public.mentor_services WHERE mentor_id=$1::uuid", [mentorId ?? null]);
    await db.query("DELETE FROM public.mentors WHERE id=$1::uuid", [mentorId ?? null]);
    if (accountId) {
      await db.query("DELETE FROM public.neon_identity_links WHERE application_account_id=$1::uuid", [accountId]);
      await db.query("DELETE FROM public.neon_application_accounts WHERE id=$1::uuid", [accountId]);
    }
    await db.query("DELETE FROM public.user_roles WHERE user_id=ANY($1::uuid[])", [[studentId, ownerId]]);
    await db.query("DELETE FROM public.profiles WHERE user_id=ANY($1::uuid[])", [[studentId, ownerId]]);
    await db.query("COMMIT");
    // Delete only this script's disposable subject through the supported Auth CLI.
    if (managedId) execFileSync("npx", ["--yes","neon@latest","neon-auth","user","delete",managedId,
      "--project-id","summer-sky-63693897","--branch","br-frosty-haze-azsnybmr"],
    {stdio:["ignore","pipe","pipe"],timeout:30000});
  } catch (error) { await db.query("ROLLBACK").catch(() => undefined);
    console.error(JSON.stringify({cleanup:"REVIEW_REQUIRED",code:error?.code ?? "unknown",constraint:error?.constraint ?? null})); }
  await db.end();
}

try {
  await db.connect();
  const configuration = (await db.query("SELECT provider_name,is_enabled,public_config FROM public.provider_configurations WHERE provider_kind='payment'")).rows[0];
  check(configuration?.provider_name === "esewa" && configuration.is_enabled &&
    configuration.public_config?.environment === "uat" && configuration.public_config?.merchant_code === "EPAYTEST", "Approved eSewa UAT configuration is required.");
  const signup = await fetch(`${auth}/sign-up/email`, { method: "POST", headers: { "content-type": "application/json", origin: app },
    body: JSON.stringify({ email, password, name: "Disposable eSewa UAT student" }), signal: AbortSignal.timeout(30000) });
  check(signup.ok, "Synthetic staging signup failed.");
  const signupCookie = signup.headers.getSetCookie().map(value => value.split(";", 1)[0]).join("; ");
  const session = await fetch(`${auth}/get-session`, { headers: { cookie: signupCookie }, signal: AbortSignal.timeout(30000) });
  managedId = (await session.json())?.user?.id;
  check(managedId, "Managed Auth did not create a subject.");
  await db.query("BEGIN");
  await db.query(`INSERT INTO public.profiles(user_id,email,full_name,phone,location,education)
    VALUES ($1::uuid,$2,'Disposable eSewa UAT student','9800000000','Kathmandu','Bachelor'),
      ($3::uuid,$4,'Disposable eSewa UAT mentor','9800000001','Kathmandu','Bachelor')`, [studentId,email,ownerId,`owner-${suffix}@example.com`]);
  accountId = (await db.query("INSERT INTO public.neon_application_accounts(legacy_user_id) VALUES ($1::uuid) RETURNING id", [studentId])).rows[0].id;
  await db.query(`INSERT INTO public.neon_identity_links(neon_auth_user_id,application_account_id,status,verification_method,verified_at)
    VALUES ($1::uuid,$2::uuid,'verified','isolated_staging_synthetic_signup',now())`, [managedId,accountId]);
  mentorId = (await db.query(`INSERT INTO public.mentors(user_id,headline,description,expertise,hourly_rate,is_available,approval_status,availability)
    VALUES ($1::uuid,'Disposable UAT mentor','Non-production sandbox fixture',ARRAY['Career'],100,true,'approved','{}') RETURNING id`, [ownerId])).rows[0].id;
  serviceId = (await db.query(`INSERT INTO public.mentor_services(mentor_id,title,session_type,duration_minutes,capacity,price,currency)
    VALUES ($1::uuid,'Disposable UAT session','one_to_one',60,1,10,'NPR') RETURNING id`, [mentorId])).rows[0].id;
  eventId = (await db.query(`INSERT INTO public.events(organizer_user_id,organizer_type,title,event_type,format,start_date,end_date,
    capacity,ticket_price,currency,is_active,status,approval_status)
    VALUES ($1::uuid,'user','Disposable UAT event','paid','online',now()+interval '3 days',now()+interval '4 days',3,10,'NPR',true,'published','approved') RETURNING id`, [ownerId])).rows[0].id;
  await db.query("COMMIT");
  const signin = await fetch(`${app}/api/v1/neon-staging/auth/sign-in/email`, { method: "POST",
    headers: { "content-type": "application/json", origin: app }, body: JSON.stringify({ email,password }), signal: AbortSignal.timeout(30000) });
  cookie = signin.headers.getSetCookie().map(value => value.split(";",1)[0]).join("; ");
  check(signin.ok && cookie, "Application staging session failed.");
  const start = new Date(Date.now()+86400000).toISOString();
  bookingId = (await request("/api/v1/mentors/book", { mentorId,mentorServiceId:serviceId,scheduledStart:start,
    scheduledEnd:new Date(Date.parse(start)+3600000).toISOString(),topic:"Sandbox verification" })).id;
  check(bookingId, "Pending booking not created.");
  const registration = await request("/api/v1/neon-staging/events/registrations", { eventId,ticketQuantity:1,
    participants:[{fullName:"Synthetic UAT attendee",email}] });
  registrationId = registration.id;
  check(registrationId, "Pending event registration not created.");
  for (const [kind,targetId] of [["mentor_booking",bookingId],["event_registration",registrationId]]) {
    const checkout = await request("/api/v1/neon-staging/payments/checkout", {kind,targetId});
    check(checkout.checkoutUrl?.startsWith("https://rc-epay.esewa.com.np/") && checkout.checkoutFields?.product_code === "EPAYTEST", "Checkout is not the authorized sandbox.");
    fixtures.push({kind,targetId,checkout});
  }
  server = createServer(async (req,res) => {
    const url = new URL(req.url, "http://localhost:3222");
    if (url.pathname === "/status") {
      const states = [];
      for (const fixture of fixtures) {
        const reference=fixture.checkout.session.provider_reference;
        const payment=(await db.query("SELECT status,amount::float AS amount FROM public.payments WHERE id=$1::uuid",[reference])).rows[0];
        states.push({kind:fixture.kind,status:payment?.status,amount:payment?.amount});
      }
      res.writeHead(200,{"content-type":"application/json","cache-control":"no-store"});res.end(JSON.stringify({states}));return;
    }
    if (url.pathname === "/verify") {
      const checks=[];
      for (const fixture of fixtures) {
        const reference=fixture.checkout.session.provider_reference;
        const before=(await db.query("SELECT status FROM public.payments WHERE id=$1::uuid",[reference])).rows[0];
        const fakePayload=Buffer.from(JSON.stringify({transaction_uuid:reference,total_amount:"10.00",status:"COMPLETE",
          product_code:"EPAYTEST",transaction_code:"FORGED",signed_field_names:"transaction_code,status,total_amount,transaction_uuid,product_code,signed_field_names",signature:"invalid"})).toString("base64");
        const forged=await fetch(`${app}/api/v1/neon-staging/payments/esewa/return?data=${encodeURIComponent(fakePayload)}`,{redirect:"manual"});
        const repeated=await fetch(`${app}/api/v1/neon-staging/payments/esewa/return?reference=${reference}`,{redirect:"manual"});
        const after=(await db.query("SELECT status FROM public.payments WHERE id=$1::uuid",[reference])).rows[0];
        checks.push({kind:fixture.kind,settled:before?.status==="success",forgedCallbackDenied:forged.status===400,
          duplicateReturn:repeated.status===307&&before?.status===after?.status,
          entity:(await db.query(fixture.kind==="mentor_booking"?"SELECT status,payment_status FROM public.mentor_bookings WHERE id=$1::uuid":"SELECT status,payment_status FROM public.event_registrations WHERE id=$1::uuid",[fixture.targetId])).rows[0]});
      }
      res.writeHead(200,{"content-type":"application/json"});res.end(JSON.stringify({checks}));return;
    }
    res.writeHead(200,{"content-type":"text/html; charset=utf-8","cache-control":"no-store"});
    res.end(`<html><body><h1>MeroTalent isolated eSewa sandbox UAT</h1><p>Two disposable staging transactions. UAT only; no real charge.</p>${fixtures.map(f=>`<form method="POST" action="${escape(f.checkout.checkoutUrl)}"><h2>${escape(f.kind)}: NPR 10 test amount</h2>${Object.entries(f.checkout.checkoutFields).map(([key,value])=>`<input type="hidden" name="${escape(key)}" value="${escape(value)}">`).join("")}<button type="submit">Continue to eSewa ${escape(f.kind)}</button></form>`).join("")}<a href="/status">Check settlement state</a></body></html>`);
  });
  await new Promise(resolve=>server.listen(3222,"127.0.0.1",resolve));
  console.log(JSON.stringify({mode:"ISOLATED_ESEWA_BROWSER_UAT",harnessUrl:"http://localhost:3222",pendingCheckouts:fixtures.length,
    syntheticSourceMapping:false,credentialsPrinted:false}));
  process.on("SIGINT",async()=>{await cleanup();process.exit(0);});
  process.on("SIGTERM",async()=>{await cleanup();process.exit(0);});
} catch (error) {
  console.error("Isolated eSewa UAT setup failed:",error instanceof Error?error.message:"Unknown error");
  await db.query("ROLLBACK").catch(()=>undefined);await cleanup();process.exitCode=1;
}
