import { isNeonClientRuntime } from "@/lib/backend-selection";
import { supabase } from "@/integrations/supabase/client";

export interface AdminProfileSummary {
  user_id: string;
  email: string | null;
  full_name: string | null;
}

export async function loadAdminProfiles(userIds: Array<string | null | undefined>) {
  const ids = [...new Set(userIds.filter((id): id is string => Boolean(id)))];
  if (ids.length === 0) return new Map<string, AdminProfileSummary>();

  if (isNeonClientRuntime()) {
    const profiles: AdminProfileSummary[] = [];
    for (let offset = 0; offset < ids.length; offset += 100) {
      const response = await fetch("/api/v1/neon-staging/admin/profiles", { method: "POST", credentials: "same-origin", cache: "no-store",
        headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids: ids.slice(offset, offset + 100) }) });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !Array.isArray(payload?.data)) throw new Error(payload?.error || "Administrative profiles unavailable.");
      profiles.push(...payload.data);
    }
    return new Map(profiles.map(profile => [profile.user_id, profile]));
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("user_id, email, full_name")
    .in("user_id", ids);
  if (error) throw error;
  return new Map((data || []).map((profile) => [profile.user_id, profile as AdminProfileSummary]));
}
