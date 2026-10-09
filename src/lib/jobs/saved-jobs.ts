import { supabase } from "@/integrations/supabase/client";

/**
 * Server-backed favourites for signed-in students.
 * Queries mode-aware `/api/v1/jobs/saved` endpoint first with fallback.
 */
export const loadSavedJobIds = async (userId: string, token?: string): Promise<string[]> => {
  try {
    const headers: Record<string, string> = {};
    if (token) headers["Authorization"] = `Bearer ${token}`;
    const res = await fetch("/api/v1/jobs/saved", { headers });
    if (res.ok) {
      const json = await res.json();
      if (Array.isArray(json?.data)) {
        return json.data.map((job: any) => job.id || job.job_id).filter(Boolean);
      }
    }
  } catch {
    // Fallback to client query
  }

  const { data, error } = await (supabase as any)
    .from("saved_jobs")
    .select("job_id")
    .eq("user_id", userId)
    .is("deleted_at", null);
  if (error) throw error;
  return (data ?? []).map((row: { job_id: string }) => row.job_id);
};

export const setSavedJob = async (userId: string, jobId: string, saved: boolean, token?: string) => {
  try {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    if (saved) {
      const res = await fetch("/api/v1/jobs/saved", {
        method: "POST",
        headers,
        body: JSON.stringify({ jobId }),
      });
      if (res.ok) return;
    } else {
      const res = await fetch(`/api/v1/jobs/saved?jobId=${jobId}`, {
        method: "DELETE",
        headers,
      });
      if (res.ok) return;
    }
  } catch {
    // Fallback to client query
  }

  if (saved) {
    const { error } = await (supabase as any)
      .from("saved_jobs")
      .upsert(
        {
          user_id: userId,
          job_id: jobId,
          deleted_at: null,
        },
        { onConflict: "user_id,job_id" },
      );
    if (error) throw error;
    return;
  }
  const { error } = await (supabase as any)
    .from("saved_jobs")
    .update({ deleted_at: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("job_id", jobId);
  if (error) throw error;
};
