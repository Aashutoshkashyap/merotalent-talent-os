import { isNeonClientRuntime } from "@/lib/backend-selection";
export const useNeonRoleWorkspaces = isNeonClientRuntime();
export async function requestRoleWorkspace(url: string, init?: RequestInit) {
  try {
    const response = await fetch(url, { credentials: "same-origin", cache: "no-store", ...init,
      signal: init?.signal ?? AbortSignal.timeout(30_000) });
    const result = await response.json().catch(() => null);
    if (!response.ok || !result || typeof result !== "object" || !("data" in result)) throw new Error(
      typeof result?.message === "string" ? result.message : typeof result?.error?.message === "string" ? result.error.message
        : typeof result?.error === "string" ? result.error : "The workspace operation failed. Please try again.");
    return result.data;
  } catch (error) {
    if ((error instanceof Error || error instanceof DOMException) && ["TimeoutError", "AbortError"].includes(error.name)) throw new Error(
      init?.method && init.method !== "GET"
        ? "The save response timed out. Refresh the workspace to check whether it saved before trying again."
        : "The workspace request timed out. Please try again.");
    throw error;
  }
}
/** A shared form adapter; authorization and record ownership remain server-side. */
export async function saveRoleWorkspaceRecord(resource: "job" | "event" | "mentor" | "company" | "mentor-service", payload: unknown, id?: string) {
  try {
    return { data: await requestRoleWorkspace("/api/v1/neon-staging/role-workspaces", { method: "POST",
      headers: { "Content-Type": "application/json" }, body: JSON.stringify({ resource, payload, id }) }), error: null };
  } catch (error) { return { data: null, error: { message: error instanceof Error ? error.message : "The record was not saved." } }; }
}
