/** Authenticated synthetic Mentors/Events HTTP UAT; isolated Neon staging only. */
import { randomBytes, randomUUID } from "node:crypto";
import dotenv from "dotenv";
import pg from "pg";
import { S3Client, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { requireNeonMigrationStaging } from "./require-neon-migration-staging.mjs";
import {stagingUatOrigin} from './staging-uat-origin.mjs';

dotenv.config({ path: ".migration.env", quiet: true });
requireNeonMigrationStaging(process.env.NEON_STAGING_DATABASE_URL);
const auth = process.env.NEON_AUTH_BASE_URL;
if (auth !== "https://ep-wispy-credit-azt6tgwj.neonauth.c-3.ap-southeast-1.aws.neon.tech/neondb/auth") {
  throw new Error("Refusing UAT: unexpected Managed Auth branch.");
}
const app = stagingUatOrigin();
const db = new pg.Client({ connectionString: process.env.NEON_STAGING_DATABASE_URL, connectionTimeoutMillis: 10000 });
const suffix = randomBytes(6).toString("hex");
const studentId = randomUUID(), mentorOwnerId = randomUUID();
let accountId = null, mentorId = null, serviceId = null, freeEventId = null, paidEventId = null, tierId = null;
let paymentId = null, proofPath = null;
let attachmentPath = null, avatarPath = null;
let conversationId = null, seededNotificationId = null, incomingMessageId = null;
let cookie = "", connected = false;
const checks = [];
function check(ok, name) { checks.push({ name, pass: !!ok }); if (!ok) throw new Error(name); }
async function request(path, { method = "GET", body, signedIn = false, origin = app } = {}) {
  const response = await fetch(`${app}${path}`, { method, cache: "no-store",
    headers: { ...(signedIn ? { cookie } : {}), ...(body ? { "content-type": "application/json" } : {}),
      ...(method !== "GET" ? { origin } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}),
    signal: AbortSignal.timeout(30000) });
  return { status: response.status, value: await response.json().catch(() => null) };
}
async function streamContains(path, fragment) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);
  try {
    const response = await fetch(`${app}${path}`, { headers: { cookie }, signal: controller.signal });
    if (!response.ok || !response.body) return false;
    const reader = response.body.getReader();
    let received = "";
    while (received.length < 100000) {
      const chunk = await reader.read();
      if (chunk.done) break;
      received += new TextDecoder().decode(chunk.value);
      if (received.includes(fragment)) return true;
    }
    return false;
  } catch { return false; }
  finally { clearTimeout(timeout); controller.abort(); }
}

try {
  await db.connect(); connected = true;
  check((await request("/api/v1/mentors/bookings")).status === 401, "anonymous mentor bookings denied");
  check((await request("/api/v1/events/my-tickets")).status === 401, "anonymous event tickets denied");
  const email = `neon-me-${suffix}@example.com`;
  const password = randomBytes(32).toString("base64url");
  const signUp = await fetch(`${auth}/sign-up/email`, { method: "POST", headers: { "content-type": "application/json", origin: app },
    body: JSON.stringify({ email, password, name: "Synthetic MeroTalent Student" }), signal: AbortSignal.timeout(30000) });
  check(signUp.ok, "synthetic staging Managed Auth subject created");
  const managedCookie = signUp.headers.getSetCookie().map(v => v.split(";", 1)[0]).join("; ");
  const managedSession = await fetch(`${auth}/get-session`, { headers: { cookie: managedCookie }, signal: AbortSignal.timeout(30000) });
  const managed = await managedSession.json();
  check(managedSession.ok && !!managed?.user?.id, "verified staging Managed Auth subject");

  await db.query("BEGIN");
  try {
    await db.query(`INSERT INTO public.profiles(user_id,email,full_name,phone,location,education)
      VALUES ($1::uuid,$2,'Synthetic Student','9800000000','Kathmandu','Bachelor')`, [studentId, email]);
    await db.query(`INSERT INTO public.profiles(user_id,email,full_name,phone,location,education)
      VALUES ($1::uuid,$2,'Synthetic Mentor','9800000001','Kathmandu','Bachelor')`, [mentorOwnerId, `mentor-${suffix}@example.com`]);
    accountId = (await db.query(`INSERT INTO public.neon_application_accounts(legacy_user_id)
      VALUES ($1::uuid) RETURNING id`, [studentId])).rows[0].id;
    await db.query(`INSERT INTO public.neon_identity_links
      (neon_auth_user_id,application_account_id,status,verification_method,verified_at)
      VALUES ($1::uuid,$2::uuid,'verified','isolated_staging_synthetic_signup',now())`, [managed.user.id, accountId]);
    mentorId = (await db.query(`INSERT INTO public.mentors(user_id,headline,description,expertise,hourly_rate,
      is_available,approval_status,availability)
      VALUES ($1::uuid,'Synthetic mentor','Staging-only profile',ARRAY['Career']::text[],1000,
        true,'approved','{}'::jsonb) RETURNING id`, [mentorOwnerId])).rows[0].id;
    serviceId = (await db.query(`INSERT INTO public.mentor_services
      (mentor_id,title,session_type,duration_minutes,capacity,price,currency)
      VALUES ($1::uuid,'Staging career session','one_to_one',60,1,750,'NPR') RETURNING id`, [mentorId])).rows[0].id;
    const eventBase = `organizer_user_id,organizer_type,title,event_type,format,start_date,end_date,
      capacity,ticket_price,currency,is_active,status,approval_status`;
    freeEventId = (await db.query(`INSERT INTO public.events(${eventBase}) VALUES
      ($1::uuid,'user','Synthetic Free Workshop','free','online',now()+interval '3 days',now()+interval '4 days',
        3,0,'NPR',true,'published','approved') RETURNING id`, [mentorOwnerId])).rows[0].id;
    paidEventId = (await db.query(`INSERT INTO public.events(${eventBase}) VALUES
      ($1::uuid,'user','Synthetic Paid Hackathon','paid','online',now()+interval '3 days',now()+interval '4 days',
        4,100,'NPR',true,'published','approved') RETURNING id`, [mentorOwnerId])).rows[0].id;
    tierId = (await db.query(`INSERT INTO public.event_ticket_types(event_id,name,price,currency,total_quantity)
      VALUES ($1::uuid,'Early Bird',250,'NPR',2) RETURNING id`, [paidEventId])).rows[0].id;
    await db.query("COMMIT");
  } catch (error) { await db.query("ROLLBACK"); throw error; }

  check((await request(`/api/v1/mentors/${mentorId}`)).status === 200, "public mentor detail and services");
  const mentorList = await request("/api/v1/mentors?search=Synthetic%20Mentor");
  check(mentorList.status === 200 && mentorList.value?.data?.some(m => m.id === mentorId), "public mentor directory");
  check(!JSON.stringify(mentorList.value?.data ?? []).includes(`mentor-${suffix}@example.com`), "mentor private email excluded");
  check((await request(`/api/v1/events/${freeEventId}`)).status === 200, "public event detail");
  const eventList = await request("/api/v1/events?search=Synthetic%20Free%20Workshop");
  check(eventList.status === 200 && eventList.value?.data?.some(e => e.id === freeEventId), "public event listing");

  const signIn = await fetch(`${app}/api/v1/neon-staging/auth/sign-in/email`, { method: "POST",
    headers: { "content-type": "application/json", origin: app }, body: JSON.stringify({ email, password }),
    signal: AbortSignal.timeout(30000) });
  cookie = signIn.headers.getSetCookie().map(v => v.split(";", 1)[0]).join("; ");
  check(signIn.ok && !!cookie, "same-origin staging browser session");
  check((await request("/api/v1/neon-staging/notifications")).status === 401, "anonymous notifications denied");
  seededNotificationId = (await db.query(`INSERT INTO public.notifications
    (recipient_id,title,message,type,is_read,action_url)
    VALUES ($1::uuid,'Synthetic notice','Staging-only notification','info',false,'/dashboard/jobs') RETURNING id`, [studentId])).rows[0].id;
  await db.query(`INSERT INTO public.neon_application_events(recipient_user_id,kind,source_id)
    VALUES ($1::uuid,'notification',$2::uuid)`, [studentId,seededNotificationId]);
  const ownNotices = await request("/api/v1/neon-staging/notifications", { signedIn: true });
  check(ownNotices.status === 200 && ownNotices.value?.data?.notifications?.some(n => n.id === seededNotificationId) &&
    ownNotices.value?.data?.unreadCount >= 1, "own notifications and unread count loaded");
  check((await request("/api/v1/neon-staging/notifications", { method: "PATCH", signedIn: true,
    origin: "https://evil.example", body: { id: seededNotificationId } })).status === 403,
    "cross-origin notification mutation denied");
  const readNotice = await request("/api/v1/neon-staging/notifications", { method: "PATCH", signedIn: true,
    body: { id: seededNotificationId } });
  check(readNotice.status === 200 && readNotice.value?.data?.updated === 1, "own notification marked read");
  const unreadNotice = await request("/api/v1/neon-staging/notifications", { method: "PATCH", signedIn: true,
    body: { id: seededNotificationId, read: false } });
  check(unreadNotice.status === 200 && unreadNotice.value?.data?.updated === 1, "own notification restored unread");
  check(await streamContains("/api/v1/realtime/stream?cursor=0", seededNotificationId),
    "durable notification SSE event delivered to linked recipient");

  conversationId = (await db.query(`INSERT INTO public.conversations(mentor_id,mentee_id,is_active)
    VALUES ($1::uuid,$2::uuid,true) RETURNING id`, [mentorId,studentId])).rows[0].id;
  check((await request("/api/v1/neon-staging/messaging")).status === 401, "anonymous conversations denied");
  const conversations = await request("/api/v1/neon-staging/messaging", { signedIn: true });
  check(conversations.status === 200 && conversations.value?.data?.some(c => c.id === conversationId),
    "linked participant lists conversation");
  check((await request(`/api/v1/neon-staging/messaging?conversationId=${randomUUID()}`, { signedIn: true })).status === 403,
    "guessed conversation history denied");
  check((await request(`/api/v1/realtime/stream?conversationId=${randomUUID()}`, { signedIn: true })).status === 403,
    "guessed conversation stream denied");
  check((await request("/api/v1/neon-staging/messaging", { method: "POST", signedIn: true,
    body: { conversationId, content: "  " } })).status === 400, "empty message rejected");
  check((await request("/api/v1/neon-staging/messaging", { method: "POST", signedIn: true,
    body: { conversationId, content: "Private message", attachment: { path: "guessed", mimeType: "application/pdf" } } })).status === 400,
    "unverified private attachment path rejected");
  const sent = await request("/api/v1/neon-staging/messaging", { method: "POST", signedIn: true,
    body: { conversationId, content: "Hello from staging" } });
  check(sent.status === 201 && sent.value?.data?.sender_id === studentId, "participant text message persisted");
  const history = await request(`/api/v1/neon-staging/messaging?conversationId=${conversationId}`, { signedIn: true });
  check(history.status === 200 && history.value?.data?.messages?.some(m => m.id === sent.value.data.id),
    "participant message history loaded");
  const attachmentForm = new FormData();
  attachmentForm.set("conversationId", conversationId);
  attachmentForm.set("file", new Blob(["%PDF-1.4\nprivate chat fixture\n%%EOF"], { type: "application/pdf" }), "message.pdf");
  const attachmentResponse = await fetch(`${app}/api/v1/neon-staging/messaging/attachments`, {
    method: "POST", headers: { cookie, origin: app }, body: attachmentForm, signal: AbortSignal.timeout(30000) });
  const attachmentValue = await attachmentResponse.json().catch(() => null);
  check(attachmentResponse.status === 201 && attachmentValue?.data?.conversation_id === conversationId,
    "authenticated participant uploaded private chat attachment and persisted message");
  attachmentPath = attachmentValue.data.attachment_path;
  const attachmentId = attachmentValue.data.id;
  const attachmentQuery = `/api/v1/neon-staging/messaging/attachments?conversationId=${conversationId}&messageId=${attachmentId}`;
  check((await request(attachmentQuery)).status === 401, "anonymous chat attachment denied");
  check((await request(`/api/v1/neon-staging/messaging/attachments?conversationId=${randomUUID()}&messageId=${attachmentId}`,
    { signedIn: true })).status === 403, "cross-conversation chat attachment denied");
  check((await request(`${attachmentQuery}&path=${encodeURIComponent(attachmentPath)}`, { signedIn: true })).status === 422,
    "raw object key rejected by attachment read route");
  const attachmentRead = await request(attachmentQuery, { signedIn: true });
  check(attachmentRead.status === 200 && typeof attachmentRead.value?.data?.signedUrl === "string" &&
    attachmentRead.value?.data?.expiresIn === 60, "participant receives short-lived private attachment URL");
  const attachmentBytes = await fetch(attachmentRead.value.data.signedUrl, { signal: AbortSignal.timeout(30000) });
  check(attachmentBytes.ok && (await attachmentBytes.text()).startsWith("%PDF-1.4"),
    "actual isolated staging chat object downloaded");
  check((await request(attachmentQuery, { method: "DELETE", signedIn: true })).status === 405,
    "chat attachment deletion unavailable");

  const avatarForm = new FormData();
  avatarForm.set("file", new Blob([Uint8Array.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a,0,0,0,0])],
    { type: "image/png" }), "avatar.png");
  const avatarResponse = await fetch(`${app}/api/v1/neon-staging/profile/avatar`, {
    method: "POST", headers: { cookie, origin: app }, body: avatarForm, signal: AbortSignal.timeout(30000) });
  const avatarValue = await avatarResponse.json().catch(() => null);
  check(avatarResponse.status === 201 && typeof avatarValue?.data?.avatarUrl === "string",
    "linked student uploaded own avatar to isolated staging storage");
  avatarPath = (await db.query(`SELECT avatar_url FROM public.profiles WHERE user_id=$1::uuid`, [studentId])).rows[0].avatar_url;
  const avatarProfile = await request("/api/v1/neon-staging/profile", { signedIn: true });
  check(avatarProfile.status === 200 && avatarProfile.value?.data?.avatar_url?.startsWith("https://"),
    "own profile resolves stored avatar path for browser display");
  incomingMessageId = (await db.query(`INSERT INTO public.messages
    (conversation_id,sender_id,receiver_id,content,is_read)
    VALUES ($1::uuid,$2::uuid,$3::uuid,'Incoming staging reply',false) RETURNING id`,
    [conversationId,mentorOwnerId,studentId])).rows[0].id;
  await db.query(`INSERT INTO public.neon_application_events(recipient_user_id,kind,source_id,conversation_id)
    VALUES ($1::uuid,'message',$2::uuid,$3::uuid)`, [studentId,incomingMessageId,conversationId]);
  check(await streamContains(`/api/v1/realtime/stream?cursor=0&conversationId=${conversationId}`, incomingMessageId),
    "recipient receives scoped durable message SSE event");
  const markedMessages = await request("/api/v1/neon-staging/messaging", { method: "POST", signedIn: true,
    body: { action: "mark-read", conversationId } });
  check(markedMessages.status === 200 && markedMessages.value?.data?.markedCount === 1,
    "recipient message read state persisted");
  const start = new Date(Date.now() + 86400000).toISOString();
  const end = new Date(new Date(start).getTime() + 3600000).toISOString();
  const bookingInput = { mentorId, mentorServiceId: serviceId, scheduledStart: start, scheduledEnd: end, topic: "Career guidance" };
  check((await request("/api/v1/mentors/book", { method: "POST", body: bookingInput })).status === 401, "anonymous booking denied");
  check((await request("/api/v1/mentors/book", { method: "POST", body: bookingInput, signedIn: true,
    origin: "https://evil.example" })).status === 403, "cross-origin booking denied");
  check((await request("/api/v1/mentors/book", { method: "POST", body: { ...bookingInput, amount: 1 },
    signedIn: true })).status === 422, "client price manipulation denied");
  const booked = await request("/api/v1/mentors/book", { method: "POST", body: bookingInput, signedIn: true });
  check(booked.status === 201 && booked.value?.data?.amount === 750 &&
    booked.value?.data?.payment_status === "pending" && booked.value?.data?.status === "pending",
    "paid mentor booking stored pending at server price");
  const duplicate = await request("/api/v1/mentors/book", { method: "POST", body: bookingInput, signedIn: true });
  check(duplicate.status === 403, "overlapping mentor booking denied");
  const ownBookings = await request("/api/v1/mentors/bookings", { signedIn: true });
  check(ownBookings.status === 200 && ownBookings.value?.data?.some(b => b.id === booked.value.data.id), "student reads own booking");
  const unavailableCheckout = await request("/api/v1/neon-staging/payments/checkout", { method: "POST", signedIn: true,
    body: { kind: "mentor_booking", targetId: booked.value.data.id, amount: 1 } });
  check(unavailableCheckout.status === 422, "browser checkout price manipulation denied");
  const sandboxCheckout = await request("/api/v1/neon-staging/payments/checkout", { method: "POST", signedIn: true,
    body: { kind: "mentor_booking", targetId: booked.value.data.id } });
  check(sandboxCheckout.status === 503 || (sandboxCheckout.status === 201 && typeof sandboxCheckout.value?.data?.checkoutUrl === "string"),
    "sandbox checkout returns 503 if unconfigured or 201 initiated checkout");

  paymentId = (await db.query(`INSERT INTO public.payments
    (user_id,payment_type,reference_id,amount,currency,status,payment_method,gateway,metadata)
    VALUES ($1::uuid,'mentor_booking',$2::uuid,750,'NPR','pending','manual','manual','{}'::jsonb) RETURNING id`,
    [studentId, booked.value.data.id])).rows[0].id;
  const proofForm = new FormData();
  proofForm.set("paymentId", paymentId); proofForm.set("note", "Isolated staging proof fixture");
  proofForm.set("proofType", "receipt");
  proofForm.set("file", new Blob(["%PDF-1.4\n1 0 obj\n<<>>\nendobj\n%%EOF"], { type: "application/pdf" }), "staging-proof.pdf");
  const proofResponse = await fetch(`${app}/api/v1/neon-staging/payments/proofs`, {
    method: "POST", headers: { cookie, origin: app }, body: proofForm, signal: AbortSignal.timeout(30000) });
  const proofPayload = await proofResponse.json().catch(() => null);
  check(proofResponse.status === 201 && proofPayload?.data?.status === "pending", "authenticated proof uploaded to private staging storage");
  proofPath = (await db.query(`SELECT storage_path FROM public.payment_proofs WHERE id=$1::uuid`, [proofPayload.data.id])).rows[0].storage_path;
  check((await request(`/api/v1/neon-staging/payments/proofs?id=${proofPayload.data.id}`)).status === 401,
    "anonymous proof download denied");
  const proofDownload = await request(`/api/v1/neon-staging/payments/proofs?id=${proofPayload.data.id}`, { signedIn: true });
  check(proofDownload.status === 200 && typeof proofDownload.value?.data?.signedUrl === "string",
    "owner receives short-lived private proof URL");
  const proofBytes = await fetch(proofDownload.value.data.signedUrl, { signal: AbortSignal.timeout(30000) });
  check(proofBytes.ok && (await proofBytes.text()).startsWith("%PDF-1.4"), "actual staging proof object download verified");

  const paid = await request(`/api/v1/events/${paidEventId}/register`, { method: "POST", signedIn: true,
    body: { ticketTypeId: tierId, attendeeCount: 2, participants: [{ fullName: "Student One" }, { fullName: "Student Two" }] } });
  check(paid.status === 201 && paid.value?.data?.registration?.total_amount === 500 &&
    paid.value?.data?.registration?.payment_status === "pending", "paid event priced from tier and held pending");
  const paidPasses = (await db.query(`SELECT count(*)::int AS count FROM public.event_tickets WHERE event_id=$1::uuid`, [paidEventId])).rows[0].count;
  check(paidPasses === 0, "no ticket issued before verified payment");
  const fakePayment = await request("/api/v1/neon-staging/payments", { method: "POST", signedIn: true,
    body: { action: "verify", paymentId: randomUUID(), gatewayTransactionId: "FAKE", status: "completed" } });
  check(fakePayment.status === 503, "browser cannot assert eSewa payment completion");
  const free = await request(`/api/v1/events/${freeEventId}/register`, { method: "POST", signedIn: true,
    body: { attendeeCount: 2, participants: [{ fullName: "Student One" }, { fullName: "Student Two" }] } });
  check(free.status === 201 && free.value?.data?.isFree === true, "free event registration confirmed");
  const ownTickets = await request("/api/v1/events/my-tickets", { signedIn: true });
  if (ownTickets.status !== 200 || ownTickets.value?.data?.filter(t => t.event?.id === freeEventId).length !== 2) {
    const evidence = (await db.query(`SELECT r.status,r.payment_status,
      (SELECT count(*)::int FROM public.event_tickets t WHERE t.registration_id=r.id) AS tickets
      FROM public.event_registrations r WHERE r.event_id=$1::uuid AND r.user_id=$2::uuid`,[freeEventId,studentId])).rows;
    console.error(JSON.stringify({ticketReadDiagnostic:{httpStatus:ownTickets.status,errorCode:ownTickets.value?.error?.code??null,
      ticketRows:Array.isArray(ownTickets.value?.data)?ownTickets.value.data.length:null,registrations:evidence}}));
  }
  check(ownTickets.status === 200 && ownTickets.value?.data?.filter(t => t.event?.id === freeEventId).length === 2,
    "student sees two real free-event passes");
  check((await request(`/api/v1/events/${freeEventId}/register`, { method: "POST", signedIn: true,
    body: { attendeeCount: 1 } })).status === 403, "duplicate event registration denied");
  const registrationCount = (await db.query(`SELECT count(*)::int AS count FROM public.event_registrations
    WHERE event_id IN ($1::uuid,$2::uuid)`, [freeEventId, paidEventId])).rows[0].count;
  check(registrationCount === 2, "exactly two synthetic registrations stored");
  const signOut = await fetch(`${app}/api/v1/neon-staging/auth/sign-out`, { method: "POST",
    headers: { cookie, origin: app, "content-type": "application/json" }, body: "{}",
    signal: AbortSignal.timeout(30000) });
  check(signOut.ok, "staging browser logout");
  check((await request("/api/v1/events/my-tickets", { signedIn: true })).status === 401,
    "logged-out session denied");
  check((await request("/api/v1/neon-staging/notifications", { signedIn: true })).status === 401,
    "logged-out notifications denied");
  check((await request(`/api/v1/neon-staging/messaging?conversationId=${conversationId}`, { signedIn: true })).status === 401,
    "logged-out conversation history denied");
  check((await request(`/api/v1/neon-staging/messaging/attachments?conversationId=${conversationId}&messageId=${attachmentId}`,
    { signedIn: true })).status === 401, "logged-out chat attachment denied");
  check((await request("/api/v1/realtime/stream?cursor=0", { signedIn: true })).status === 401,
    "logged-out event stream denied");
  console.log(JSON.stringify({ result: "PASS", checks }));
} catch (error) {
  console.error(JSON.stringify({ result: "FAIL", checks, reason: error instanceof Error ? error.message : "unknown" }));
  process.exitCode = 1;
} finally {
  if (connected) {
    if (proofPath || attachmentPath || avatarPath) {
      try {
        const s3 = new S3Client({ endpoint: process.env.AWS_ENDPOINT_URL_S3,
          region: process.env.AWS_REGION || "ap-southeast-1", forcePathStyle: true,
          credentials: { accessKeyId: process.env.AWS_ACCESS_KEY_ID, secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY } });
        for (const [bucket, path] of [["payment-proofs", proofPath], ["chat-attachments", attachmentPath], ["profile-media", avatarPath]]) {
          if (path) await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: path }));
        }
        s3.destroy();
      } catch (error) { console.error(`Storage fixture cleanup needs review: ${error instanceof Error ? error.message : "unknown"}`); process.exitCode = 1; }
    }
    await db.query("BEGIN").catch(() => undefined);
    try {
      await db.query(`DELETE FROM public.payment_checkout_sessions WHERE user_id IN ($1::uuid,$2::uuid)`, [studentId, mentorOwnerId]);
      await db.query(`DELETE FROM public.payment_proofs WHERE payment_id=$1::uuid`, [paymentId]);
      await db.query(`DELETE FROM public.payments WHERE id=$1::uuid`, [paymentId]);
      await db.query(`DELETE FROM public.neon_application_events WHERE recipient_user_id IN ($1::uuid,$2::uuid)`, [studentId, mentorOwnerId]);
      await db.query(`DELETE FROM public.notifications WHERE recipient_id IN ($1::uuid,$2::uuid)`, [studentId, mentorOwnerId]);
      await db.query(`DELETE FROM public.messages WHERE conversation_id=$1::uuid`, [conversationId]);
      await db.query(`DELETE FROM public.event_tickets WHERE event_id IN ($1::uuid,$2::uuid)`, [freeEventId, paidEventId]);
      await db.query(`DELETE FROM public.event_registrations WHERE event_id IN ($1::uuid,$2::uuid)`, [freeEventId, paidEventId]);
      await db.query(`DELETE FROM public.event_ticket_types WHERE id=$1::uuid`, [tierId]);
      await db.query(`DELETE FROM public.events WHERE id IN ($1::uuid,$2::uuid)`, [freeEventId, paidEventId]);
      await db.query(`DELETE FROM public.conversations WHERE mentor_id=$1::uuid`, [mentorId]);
      await db.query(`DELETE FROM public.mentor_bookings WHERE mentor_id=$1::uuid`, [mentorId]);
      await db.query(`DELETE FROM public.mentor_services WHERE mentor_id=$1::uuid`, [mentorId]);
      await db.query(`DELETE FROM public.mentors WHERE id=$1::uuid`, [mentorId]);
      await db.query(`DELETE FROM public.neon_identity_links WHERE application_account_id=$1::uuid`, [accountId]);
      await db.query(`DELETE FROM public.neon_application_accounts WHERE id=$1::uuid`, [accountId]);
      await db.query(`DELETE FROM public.profiles WHERE user_id IN ($1::uuid,$2::uuid)`, [studentId, mentorOwnerId]);
      await db.query(`DELETE FROM neon_auth."user" WHERE email=$1`, [`student-${suffix}@example.com`]);
      await db.query("COMMIT");
    } catch (error) {
      await db.query("ROLLBACK").catch(() => undefined);
      console.error(`Synthetic staging fixture cleanup needs review: ${error instanceof Error ? error.message : "unknown"}`);
      process.exitCode = 1;
    }
    await db.end().catch(() => undefined);
  }
}
