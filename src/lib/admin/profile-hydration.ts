import { supabase } from "@/integrations/supabase/client";

export interface AdminProfileSummary {
  user_id: string;
  email: string | null;
  full_name: string | null;
}

export async function loadAdminProfiles(userIds: Array<string | null | undefined>) {
  const ids = [...new Set(userIds.filter((id): id is string => Boolean(id)))];
  if (ids.length === 0) return new Map<string, AdminProfileSummary>();

  const { data, error } = await supabase
    .from("profiles")
    .select("user_id, email, full_name")
    .in("user_id", ids);
  if (error) throw error;
  return new Map((data || []).map((profile) => [profile.user_id, profile as AdminProfileSummary]));
}
