/** Strictly the provider's read-only query endpoint; token is never printed or stored. */
import { execFileSync } from "node:child_process";
import { assertInventorySelect } from "./read-only-query-policy.mjs";

const projectRef = "dtirpilgzlsfryucanlg";
const url = `https://api.supabase.com/v1/projects/${projectRef}/database/query/read-only`;
const token = execFileSync("security", ["find-generic-password", "-s", "Supabase CLI", "-w"],
  { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
if (!token) throw new Error("An existing Supabase CLI Management API credential is required.");

export async function sourceReadOnlyQuery(query, options = {}) {
  assertInventorySelect(query);
  const timeoutMs = options.timeoutMs ?? 30000;
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 120000) {
    throw new Error("Invalid bounded read-only query timeout.");
  }
  const response = await fetch(url, { method: "POST", headers: {
    Authorization: `Bearer ${token}`, "Content-Type": "application/json",
  }, body: JSON.stringify({ query }), signal: AbortSignal.timeout(timeoutMs) });
  if (!response.ok) throw new Error(`Supabase read-only query returned HTTP ${response.status}.`);
  const result = await response.json();
  if (!Array.isArray(result)) throw new Error("Unexpected Supabase read-only query response.");
  return result;
}

export { projectRef as sourceProjectRef };
