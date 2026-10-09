/** One controlled synthetic Managed Auth UAT. Never run against production. */
import { randomBytes, randomUUID } from "node:crypto";
import pg from "pg";
import dotenv from "dotenv";
import { requireNeonMigrationStaging } from "./require-neon-migration-staging.mjs";

dotenv.config({ path: ".migration.env", quiet: true });
requireNeonMigrationStaging(process.env.NEON_STAGING_DATABASE_URL);
const auth = process.env.NEON_AUTH_BASE_URL;
if (auth !== "https://ep-wispy-credit-azt6tgwj.neonauth.c-3.ap-southeast-1.aws.neon.tech/neondb/auth") {
  throw new Error("Refusing UAT: Auth endpoint is not the isolated staging branch.");
}
const app = "http://localhost:3210";
const suffix = randomBytes(7).toString("hex");
const email = `neon-migration-uat-${suffix}@example.com`;
const password = randomBytes(36).toString("base64url");
const userId = randomUUID();
const checks = [];

function assert(condition, label) {
  checks.push({ check: label, pass: !!condition });
  if (!condition) throw new Error(`UAT failed: ${label}`);
}

function cookieHeader(response) {
  return response.headers.getSetCookie().map(value => value.split(";", 1)[0]).join("; ");
}

async function appRequest(path, cookie, method = "GET", body) {
  return fetch(`${app}${path}`, {
    method,
    headers: { ...(cookie ? { cookie } : {}), ...(body ? { "content-type": "application/json" } : {}) },
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });
}

const db = new pg.Client({ connectionString: process.env.NEON_STAGING_DATABASE_URL, connectionTimeoutMillis: 10000 });
let cookie = "";
try {
  await db.connect();
  const existingSynthetic = (await db.query(`
    SELECT count(*)::int AS count FROM public.profiles
    WHERE email LIKE 'neon-migration-uat-%@example.com'`)).rows[0].count;
  if (existingSynthetic > 0) {
    throw new Error("A synthetic staging identity already exists; refusing to create another. Review and explicitly clean up the isolated fixture before repeating UAT.");
  }
  const [institute] = (await db.query(`
    SELECT id, description FROM public.institutes
    WHERE status='approved' AND deleted_at IS NULL ORDER BY id LIMIT 1`)).rows;
  assert(!!institute, "approved staging institute exists");
  assert((await appRequest(`/api/v1/institutes/${institute.id}`, "")).status === 200, "public institute 200");
  assert((await appRequest("/api/v1/neon-staging/profile", "")).status === 401, "no session 401");
  assert((await appRequest("/api/v1/neon-staging/profile", "invalid=token")).status === 401, "invalid session 401");

  const signup = await fetch(`${auth}/sign-up/email`, {
    method: "POST",
    headers: { "content-type": "application/json", origin: app },
    body: JSON.stringify({ email, password, name: "Neon Migration UAT" }),
    redirect: "manual",
  });
  const signupError = signup.ok ? null : await signup.clone().json().catch(() => null);
  const signupCode = typeof signupError?.code === "string" ? signupError.code.replace(/[^A-Z0-9_]/gi, "") : "UNKNOWN";
  assert(signup.ok, signup.ok
    ? `staging Managed Auth signup HTTP ${signup.status}`
    : `staging Managed Auth signup HTTP ${signup.status} code ${signupCode}`);
  cookie = cookieHeader(signup);
  if (!cookie) {
    const signin = await fetch(`${auth}/sign-in/email`, {
      method: "POST", headers: { "content-type": "application/json", origin: app },
      body: JSON.stringify({ email, password }), redirect: "manual",
    });
    assert(signin.ok, `staging Managed Auth signin HTTP ${signin.status}`);
    cookie = cookieHeader(signin);
  }
  assert(!!cookie, "Managed Auth session cookie issued");
  const sessionResponse = await fetch(`${auth}/get-session`, { headers: { cookie }, cache: "no-store" });
  const session = await sessionResponse.json();
  const subject = session?.user?.id;
  assert(sessionResponse.ok && typeof subject === "string" && subject === session?.session?.userId,
    "real Managed Auth session and subject");
  assert((await appRequest("/api/v1/neon-staging/profile", cookie)).status === 403, "valid session without link 403");

  await db.query("BEGIN");
  try {
    await db.query(`INSERT INTO public.profiles (user_id,email,full_name) VALUES ($1,$2,$3)`,
      [userId, email, "Neon Migration UAT"]);
    const account = (await db.query(`INSERT INTO public.neon_application_accounts (legacy_user_id)
      VALUES ($1) RETURNING id`, [userId])).rows[0];
    await db.query(`INSERT INTO public.neon_identity_links
      (neon_auth_user_id,application_account_id,status,verification_method,verified_at)
      VALUES ($1,$2,'verified','isolated_staging_synthetic_signup',now())`, [subject, account.id]);
    await db.query("COMMIT");
  } catch (error) { await db.query("ROLLBACK"); throw error; }

  const profile = await appRequest("/api/v1/neon-staging/profile", cookie);
  const profileData = await profile.json();
  assert(profile.status === 200 && profileData?.data?.user_id === userId, "linked session resolves application profile 200");
  const updated = await appRequest("/api/v1/neon-staging/profile", cookie, "PATCH", { full_name: "Neon Migration UAT Updated" });
  assert(updated.status === 200, "authorized protected profile write succeeds");
  assert((await appRequest(`/api/v1/institutes/${institute.id}?view=managed`, cookie)).status === 403,
    "cross-entity managed read 403");
  assert((await appRequest(`/api/v1/institutes/${institute.id}`, cookie, "PATCH", { description: "Unauthorized stage write" })).status === 403,
    "unauthorized protected write 403");
  const [unchanged] = (await db.query("SELECT description FROM public.institutes WHERE id=$1", [institute.id])).rows;
  assert(unchanged.description === institute.description, "unauthorized write leaves database unchanged");

  await db.query("UPDATE public.neon_identity_links SET status='disabled' WHERE neon_auth_user_id=$1", [subject]);
  assert((await appRequest("/api/v1/neon-staging/profile", cookie)).status === 403, "disabled link 403");
  await db.query("UPDATE public.neon_identity_links SET status='verified' WHERE neon_auth_user_id=$1", [subject]);

  const logout = await fetch(`${auth}/sign-out`, { method: "POST", headers: { cookie, "content-type": "application/json", origin: app }, body: "{}" });
  assert(logout.ok, "Managed Auth logout succeeds");
  assert((await appRequest("/api/v1/neon-staging/profile", cookie)).status === 401,
    "logged-out cookie cannot access protected route");
  console.log(JSON.stringify({ result: "PASS", checks, syntheticProfileId: userId, managedAuthSubject: subject }));
} catch (error) {
  console.error(JSON.stringify({ result: "FAIL", checks, reason: error instanceof Error ? error.message : "unknown" }));
  process.exitCode = 1;
} finally {
  await db.end().catch(() => undefined);
}
