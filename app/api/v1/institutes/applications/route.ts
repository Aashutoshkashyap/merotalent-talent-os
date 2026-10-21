/**
 * User's own college applications endpoint.
 * Mode-aware: uses Neon SQL in staging, Supabase in legacy.
 */
import { jsonApiResponse } from "@/lib/server/api-response";
import { getBackendMode } from "@/lib/server/backend-mode";
import { getAdminClient } from "@/lib/server/supabase";
import { queryRows } from "@/lib/server/db";
import { getAuthenticatedApplicationUser } from "@/lib/server/neon-session";
import { authenticateRequest } from "@/lib/server/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const requestId = crypto.randomUUID();
  try {
    if (getBackendMode() !== "legacy") {
      const actor = await getAuthenticatedApplicationUser(request);
      const rows = await queryRows<{ institute_id: string }>(`
        SELECT institute_id
        FROM public.college_applications
        WHERE applicant_id = $1::uuid
          AND deleted_at IS NULL`, [actor.userId]);

      return jsonApiResponse({
        data: rows.map((r) => r.institute_id),
        error: null,
        meta: { requestId },
      });
    }

    const auth = await authenticateRequest(request);
    const db = getAdminClient() as any;
    const { data, error } = await db
      .from("college_applications")
      .select("institute_id")
      .eq("applicant_id", auth.user.id);

    if (error) throw error;

    return jsonApiResponse({
      data: (data || []).map((r: any) => r.institute_id),
      error: null,
      meta: { requestId },
    });
  } catch (err) {
    return jsonApiResponse({ data: [], error: null, meta: { requestId } });
  }
}
