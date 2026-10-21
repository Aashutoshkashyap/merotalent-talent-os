/** Same-origin browser bridge to the approved isolated Neon Managed Auth service. */
import { getBackendMode } from "@/lib/server/backend-mode";
import { getNeonAuthBaseUrl } from "@/lib/neon/neon-config";
import { startNeonGoogleOAuth } from "@/lib/server/neon-oauth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const noStore = { "cache-control": "private, no-store" };
const allowed = new Set(["sign-in/email", "sign-up/email", "send-verification-email", "email-otp/verify-email",
  "sign-out", "get-session", "request-password-reset", "reset-password", "change-password"]);

async function forward(request: Request, action: string[], method: "GET" | "POST") {
  if (getBackendMode() === "legacy") return new Response(null, { status: 404 });
  const path = action.join("/");
  if (path === "sign-in/social" && method === "POST") {
    try { return await startNeonGoogleOAuth(request); }
    catch (error) {
      const status = error && typeof error === "object" && "code" in error && error.code === "CROSS_ORIGIN_WRITE_DENIED" ? 403
        : error instanceof SyntaxError ? 400 : 503;
      return Response.json({ error: status === 403 ? "INVALID_ORIGIN" : status === 400 ? "INVALID_AUTH_REQUEST" : "AUTH_UNAVAILABLE" }, { status, headers: noStore });
    }
  }
  if (!allowed.has(path) || (method === "GET") !== (path === "get-session")) {
    return Response.json({ error: "AUTH_ACTION_UNAVAILABLE" }, { status: 404, headers: noStore });
  }
  if (method === "POST") {
    const origin = request.headers.get("origin");
    let sameOrigin = false;
    try { sameOrigin = !!origin && new URL(origin).origin === new URL(request.url).origin; } catch { /* Invalid origin is denied. */ }
    if (!sameOrigin) {
      return Response.json({ error: "INVALID_ORIGIN" }, { status: 403, headers: noStore });
    }
  }
  let raw = method === "POST" ? await request.text() : undefined;
  if (raw && raw.length > 4096) {
    return Response.json({ error: "REQUEST_TOO_LARGE" }, { status: 413, headers: noStore });
  }
  if (method === "POST" && ["sign-up/email", "send-verification-email", "email-otp/verify-email"].includes(path)) {
    if (process.env.NEON_STAGING_IDENTITY_LINK_MODE !== "verified-source") {
      return Response.json({ error: "RECOVERY_UNAVAILABLE" }, { status: 503, headers: noStore });
    }
    let body: unknown;
    try { body = JSON.parse(raw ?? ""); } catch { body = null; }
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return Response.json({ error: "INVALID_AUTH_REQUEST" }, { status: 400, headers: noStore });
    }
    const fields = body as Record<string, unknown>;
    const expected = path === "sign-up/email" ? ["email", "password", "name"]
      : path === "send-verification-email" ? ["email"] : ["email", "otp"];
    if (Object.keys(fields).length !== expected.length || Object.keys(fields).some(field => !expected.includes(field)) ||
        typeof fields.email !== "string" || fields.email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.email) ||
        (path === "sign-up/email" && (typeof fields.password !== "string" || fields.password.length < 8 || fields.password.length > 128 ||
          typeof fields.name !== "string" || fields.name.trim().length < 2 || fields.name.length > 120)) ||
        (path === "email-otp/verify-email" && (typeof fields.otp !== "string" || !/^\d{6,10}$/.test(fields.otp)))) {
      return Response.json({ error: "INVALID_AUTH_REQUEST" }, { status: 400, headers: noStore });
    }
    raw = JSON.stringify({ ...fields, email: fields.email.trim().toLowerCase(),
      ...(path !== "email-otp/verify-email" ? { callbackURL: new URL("/account-recovery", request.url).toString() } : {}) });
  }
  if (method === "POST" && (path === "request-password-reset" || path === "reset-password")) {
    let body: unknown;
    try { body = JSON.parse(raw ?? ""); } catch { body = null; }
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return Response.json({ error: "INVALID_AUTH_REQUEST" }, { status: 400, headers: noStore });
    }
    const fields = body as Record<string, unknown>;
    if (path === "request-password-reset") {
      if (Object.keys(fields).length !== 1 || typeof fields.email !== "string" ||
          fields.email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.email)) {
        return Response.json({ error: "INVALID_AUTH_REQUEST" }, { status: 400, headers: noStore });
      }
      raw = JSON.stringify({ email: fields.email.trim().toLowerCase(),
        redirectTo: new URL("/reset-password", request.url).toString() });
    } else {
      if (Object.keys(fields).length !== 2 || typeof fields.token !== "string" ||
          !fields.token || fields.token.length > 2048 || typeof fields.newPassword !== "string" ||
          fields.newPassword.length < 8 || fields.newPassword.length > 128) {
        return Response.json({ error: "INVALID_AUTH_REQUEST" }, { status: 400, headers: noStore });
      }
    }
  }
  if (method === "POST" && path === "change-password") {
    let body: unknown;
    try { body = JSON.parse(raw ?? ""); } catch { body = null; }
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return Response.json({ error: "INVALID_AUTH_REQUEST" }, { status: 400, headers: noStore });
    }
    const fields = body as Record<string, unknown>;
    if (Object.keys(fields).length !== 2 || typeof fields.currentPassword !== "string" ||
        !fields.currentPassword || fields.currentPassword.length > 128 ||
        typeof fields.newPassword !== "string" || fields.newPassword.length < 8 ||
        fields.newPassword.length > 128) {
      return Response.json({ error: "INVALID_AUTH_REQUEST" }, { status: 400, headers: noStore });
    }
  }
  try {
    const upstream = await fetch(`${getNeonAuthBaseUrl()}/${path}`, {
      method,
      headers: {
        accept: "application/json",
        ...(method === "POST" ? { "content-type": "application/json", origin: new URL(request.url).origin } : {}),
        ...(request.headers.get("cookie") ? { cookie: request.headers.get("cookie")! } : {}),
      },
      body: raw,
      cache: "no-store",
      redirect: "manual",
      signal: AbortSignal.timeout(8000),
    });
    const headers = new Headers({ ...noStore, "content-type": "application/json" });
    for (const cookie of upstream.headers.getSetCookie()) {
      if (!/^(?:__Secure-|__Host-)?(?:better-auth|neon-auth)\.[A-Za-z_]+=/i.test(cookie)) continue;
      let scoped = cookie.replace(/;\s*Domain=[^;]*/gi, "");
      // Prefix cookies are rejected by browsers without Secure, including on
      // trustworthy localhost origins. Never invalidate the provider's prefix.
      if (new URL(request.url).protocol !== "https:" && !/^__(?:Secure|Host)-/.test(scoped)) {
        scoped = scoped.replace(/;\s*Secure/gi, "");
      }
      headers.append("set-cookie", scoped);
    }
    return new Response(await upstream.text(), { status: upstream.status, headers });
  } catch {
    return Response.json({ error: "AUTH_UNAVAILABLE" }, { status: 503, headers: noStore });
  }
}

export async function GET(request: Request, context: { params: Promise<{ action: string[] }> }) {
  return forward(request, (await context.params).action, "GET");
}

export async function POST(request: Request, context: { params: Promise<{ action: string[] }> }) {
  return forward(request, (await context.params).action, "POST");
}
