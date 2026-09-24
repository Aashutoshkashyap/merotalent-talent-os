import { supabase } from "@/integrations/supabase/client";

/**
 * Server-backed favourites for signed-in students. Local storage remains only
 * as a short-lived offline fallback; the database is the durable source.
 */
export const loadSavedJobIds = async (userId: string): Promise<string[]> => {
  const { data, error } = await (supabase as any)
    .from("saved_jobs")
    .select("job_id")
    .eq("user_id", userId)
    .is("deleted_at", null);
  if (error) throw error;
  return (data ?? []).map((row: { job_id: string }) => row.job_id);
};

export const setSavedJob = async (userId: string, jobId: string, saved: boolean) => {
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
