/** One controlled real-Auth SSE smoke against the isolated local staging app. */
import { randomBytes, randomUUID } from "node:crypto";
import pg from "pg";
import dotenv from "dotenv";
import { requireNeonMigrationStaging } from "./require-neon-migration-staging.mjs";
import {stagingUatOrigin} from './staging-uat-origin.mjs';

dotenv.config({ path: ".migration.env", quiet: true });
requireNeonMigrationStaging(process.env.NEON_STAGING_DATABASE_URL);
const auth = process.env.NEON_AUTH_BASE_URL;
if (auth !== "https://ep-wispy-credit-azt6tgwj.neonauth.c-3.ap-southeast-1.aws.neon.tech/neondb/auth") {
  throw new Error("Refusing UAT: Auth endpoint is not the isolated staging branch.");
}
const app = stagingUatOrigin();
const email = `neon-event-uat-${randomBytes(7).toString("hex")}@example.com`;
const password = randomBytes(36).toString("base64url");
const profileId = randomUUID();
const checks = [];
const db = new pg.Client({ connectionString: process.env.NEON_STAGING_DATABASE_URL, connectionTimeoutMillis: 10000 });
let connected = false;
let cookie = "";
let subject = "";
let ownNotification = "";
let otherNotification = "";

function check(value, label) {
  checks.push({ check: label, pass: !!value });
  if (!value) throw new Error(`UAT failed: ${label}`);
}

function cookies(response) {
  return response.headers.getSetCookie().map(value => value.split(";", 1)[0]).join("; ");
}

async function get(path, currentCookie = cookie, extraHeaders = {}) {
  return fetch(`${app}${path}`, {
    headers: { ...(currentCookie ? { cookie: currentCookie } : {}), ...extraHeaders },
    cache: "no-store",
    signal: AbortSignal.timeout(30000),
  });
}

async function readEvent(response, expectedSource) {
  const reader = response.body?.getReader();
  if (!reader) throw new Error("SSE response has no body.");
  const decoder = new TextDecoder();
  let data = "";
  try {
    while (data.length < 16_384) {
      const part = await reader.read();
      if (part.done) break;
      data += decoder.decode(part.value);
      if (data.includes(`"sourceId":"${expectedSource}"`)) return data;
    }
    throw new Error("Expected notification was not streamed.");
  } finally {
    await reader.cancel().catch(() => undefined);
  }
}

try {
  await db.connect();
  connected = true;
  const preexisting = (await db.query(`SELECT count(*)::int AS count FROM neon_auth."user"
    WHERE email LIKE 'neon-event-uat-%@example.com'`)).rows[0].count;
  // One prior attempt may leave an unlinked Managed Auth subject: Managed Auth
  // deletion is provider-owned and must not be faked with raw SQL.
  check(preexisting <= 1, "at most one previous unlinked realtime test identity");
  check((await get("/api/v1/realtime/stream", "")).status === 401, "unauthenticated stream 401");

  const signup = await fetch(`${auth}/sign-up/email`, {
    method: "POST", headers: { "content-type": "application/json", origin: app },
    body: JSON.stringify({ email, password, name: "Neon Event UAT" }), redirect: "manual",
  });
  check(signup.ok, `isolated Managed Auth signup ${signup.status}`);
  cookie = cookies(signup);
  check(!!cookie, "Managed Auth session cookie issued");
  const sessionResponse = await fetch(`${auth}/get-session`, { headers: { cookie }, cache: "no-store" });
  const session = await sessionResponse.json();
  subject = session?.user?.id;
  check(sessionResponse.ok && typeof subject === "string" && subject === session?.session?.userId,
    "real Managed Auth subject verified");
  check((await get("/api/v1/realtime/stream")).status === 403, "unlinked identity denied");

  await db.query("BEGIN");
  try {
    await db.query(`INSERT INTO public.profiles(user_id,email,full_name) VALUES ($1,$2,$3)`,
      [profileId, email, "Neon Event UAT"]);
    const account = (await db.query(`INSERT INTO public.neon_application_accounts(legacy_user_id)
      VALUES ($1) RETURNING id`, [profileId])).rows[0];
    await db.query(`INSERT INTO public.neon_identity_links
      (neon_auth_user_id,application_account_id,status,verification_method,verified_at)
      VALUES ($1,$2,'verified','isolated_staging_synthetic_signup',now())`, [subject, account.id]);
    const otherId = (await db.query(`SELECT user_id FROM public.profiles
      WHERE user_id <> $1 AND account_status='active' ORDER BY user_id LIMIT 1`, [profileId])).rows[0]?.user_id;
    check(!!otherId, "different staging recipient exists");
    otherNotification = (await db.query(`INSERT INTO public.notifications(recipient_id,title,message)
      VALUES ($1,'Staging event UAT','Temporary isolation test') RETURNING id`, [otherId])).rows[0].id;
    ownNotification = (await db.query(`INSERT INTO public.notifications(recipient_id,title,message)
      VALUES ($1,'Staging event UAT','Temporary recipient test') RETURNING id`, [profileId])).rows[0].id;
    await db.query(`INSERT INTO public.neon_application_events(recipient_user_id,kind,source_id)
      VALUES ($1,'notification',$2),($3,'notification',$4)`, [otherId, otherNotification, profileId, ownNotification]);
    await db.query("COMMIT");
  } catch (error) { await db.query("ROLLBACK"); throw error; }

  check((await get(`/api/v1/realtime/stream?conversationId=${randomUUID()}`)).status === 403,
    "unrelated conversation subscription denied");
  const stream = await get("/api/v1/realtime/stream?cursor=0");
  check(stream.ok && stream.headers.get("content-type")?.includes("text/event-stream"), "authenticated SSE opens");
  const first = await readEvent(stream, ownNotification);
  check(first.includes("event: notification") && !first.includes(otherNotification),
    "SSE contains only recipient's notification");
  const replay = await get("/api/v1/realtime/stream", cookie, { "last-event-id": "0" });
  check(replay.ok && (await readEvent(replay, ownNotification)).includes(ownNotification),
    "missed event replays from Last-Event-ID");
  const logout = await fetch(`${auth}/sign-out`, {
    method: "POST", headers: { cookie, "content-type": "application/json", origin: app }, body: "{}",
  });
  check(logout.ok, "Managed Auth logout succeeds");
  check((await get("/api/v1/realtime/stream")).status === 401, "logged-out stream denied");
  console.log(JSON.stringify({ result: "PASS", checks }));
} catch (error) {
  console.error(JSON.stringify({ result: "FAIL", checks,
    reason: error instanceof Error ? error.message : "unknown" }));
  process.exitCode = 1;
} finally {
  // Remove only this run's application rows. The managed synthetic Auth subject
  // remains unlinked because direct writes to Neon-managed Auth are forbidden.
  if (connected) {
    await db.query("BEGIN").catch(() => undefined);
    try {
      if (ownNotification || otherNotification) {
        await db.query("DELETE FROM public.neon_application_events WHERE source_id IN ($1::uuid,$2::uuid)",
          [ownNotification || null, otherNotification || null]);
        await db.query("DELETE FROM public.notifications WHERE id IN ($1::uuid,$2::uuid)",
          [ownNotification || null, otherNotification || null]);
      }
      if (subject) await db.query("DELETE FROM public.neon_identity_links WHERE neon_auth_user_id=$1::uuid", [subject]);
      await db.query("DELETE FROM public.neon_application_accounts WHERE legacy_user_id=$1::uuid", [profileId]);
      await db.query("DELETE FROM public.profiles WHERE user_id=$1::uuid", [profileId]);
      await db.query("COMMIT");
    } catch {
      await db.query("ROLLBACK").catch(() => undefined);
      console.error("Synthetic application-fixture cleanup needs manual review.");
      process.exitCode = 1;
    }
    await db.end().catch(() => undefined);
  }
}
