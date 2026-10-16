/** Billing uses the trusted Neon cookie session and never falls back to Supabase. */
export async function neonBillingRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(path, { ...init, credentials: "same-origin", cache: "no-store",
    headers: { Accept: "application/json", ...(init.body ? { "Content-Type": "application/json" } : {}), ...init.headers } });
  const body = await response.json().catch(() => null) as { data?: T; error?: string; message?: string } | null;
  if (!response.ok || body?.error || body?.data === undefined) {
    throw new Error(body?.message || "The billing request could not be completed. Please try again.");
  }
  return body.data;
}
