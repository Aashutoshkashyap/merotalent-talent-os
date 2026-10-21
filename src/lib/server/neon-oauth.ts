/** Official Managed Auth OAuth transport only; application identity grants stay separate. */
import { handleAuthProxyRequest, processAuthMiddleware } from "@neondatabase/auth/server";
import { getNeonAuthBaseUrl } from "@/lib/neon/neon-config";
import { requireSameOrigin } from "./neon-session";

function configuration() {
  const baseUrl = getNeonAuthBaseUrl();
  const cookieSecret = process.env.NEON_AUTH_COOKIE_SECRET;
  if (process.env.NEON_GOOGLE_OAUTH_ENABLED !== "true" || !cookieSecret || cookieSecret.length < 32) {
    throw new Error("MANAGED_OAUTH_UNAVAILABLE");
  }
  return { baseUrl, cookieSecret, sessionDataTtl: 0 };
}

export async function startNeonGoogleOAuth(request: Request): Promise<Response> {
  requireSameOrigin(request);
  const raw = await request.text();
  if (raw.length > 1024) return Response.json({ error: "INVALID_AUTH_REQUEST" }, { status: 400 });
  const body = JSON.parse(raw) as Record<string, unknown>;
  if (!body || Object.keys(body).length !== 1 || body.provider !== "google") {
    return Response.json({ error: "INVALID_AUTH_REQUEST" }, { status: 400 });
  }
  const config = configuration();
  const upstreamRequest = new Request(request.url, { method: "POST", headers: request.headers,
    body: JSON.stringify({ provider: "google", callbackURL: new URL("/auth/neon/callback", request.url).href,
      errorCallbackURL: new URL("/login", request.url).href, disableRedirect: true }) });
  const response = await handleAuthProxyRequest({ ...config, request: upstreamRequest, path: "sign-in/social" });
  if (response.ok) {
    const payload = await response.clone().json().catch(() => null);
    let destination: URL;
    try { destination = new URL(payload?.url); } catch { throw new Error("INVALID_OAUTH_DESTINATION"); }
    const base = new URL(config.baseUrl);
    if (destination.protocol !== "https:" || destination.username || destination.password ||
      !(destination.origin === "https://accounts.google.com" || destination.origin === base.origin &&
        destination.pathname.startsWith(`${base.pathname}/`))) throw new Error("INVALID_OAUTH_DESTINATION");
  }
  response.headers.set("cache-control", "private, no-store");
  return response;
}

export async function finishNeonGoogleOAuth(request: Request): Promise<Response> {
  const config = configuration();
  const url = new URL(request.url);
  const result = await processAuthMiddleware({ ...config, request, pathname: url.pathname,
    skipRoutes: ["/auth/neon/callback"], loginUrl: "/login", logLevel: "silent" });
  const destination = result.action === "redirect_oauth" ? result.redirectUrl : new URL("/auth/callback", url);
  // Never let an upstream callback become an external redirect.
  if (destination.origin !== url.origin || ![url.pathname, "/auth/neon/callback", "/auth/callback"].includes(destination.pathname)) {
    return Response.json({ error: "INVALID_AUTH_CALLBACK" }, { status: 400 });
  }
  // The SDK may return to the application's root. Consume the verified exchange
  // there too, then use one fixed application authorization/recovery callback.
  const headers = new Headers({ location: new URL("/auth/callback", url).href, "cache-control": "private, no-store",
    "referrer-policy": "no-referrer" });
  for (const cookie of result.cookies ?? []) headers.append("set-cookie", cookie);
  return new Response(null, { status: 303, headers });
}
