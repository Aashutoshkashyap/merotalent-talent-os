import { isNeonClientRuntime } from "@/lib/backend-selection";
export const useNeonRoleWorkspaces = isNeonClientRuntime();
export async function requestRoleWorkspace(url: string, init?: RequestInit) {
  const response = await fetch(url, { credentials: "same-origin", cache: "no-store", ...init });
  const result = await response.json().catch(() => null);
  if (!response.ok) throw new Error(result?.message || result?.error || "The workspace operation failed.");
  return result.data;
}
/** A shared form adapter; authorization and record ownership remain server-side. */
export async function saveRoleWorkspaceRecord(resource: "job" | "event" | "mentor" | "company" | "mentor-service", payload: unknown, id?: string) {
  try {
    return { data: await requestRoleWorkspace("/api/v1/neon-staging/role-workspaces", { method: "POST",
      headers: { "Content-Type": "application/json" }, body: JSON.stringify({ resource, payload, id }) }), error: null };
  } catch (error) { return { data: null, error: { message: error instanceof Error ? error.message : "The record was not saved." } }; }
}
