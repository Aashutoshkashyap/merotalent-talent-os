/**
 * User's competition registrations endpoint.
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
    if (getBackendMode() === "neon-staging") {
      const actor = await getAuthenticatedApplicationUser(request);
      const rows = await queryRows<{ competition_id: string }>(`
        SELECT competition_id
        FROM public.competition_registrations
        WHERE user_id = $1::uuid
          AND deleted_at IS NULL`, [actor.userId]);

      return jsonApiResponse({
        data: rows.map((r) => r.competition_id),
        error: null,
        meta: { requestId },
      });
    }

    const auth = await authenticateRequest(request);
    const db = getAdminClient() as any;
    const { data, error } = await db
      .from("competition_registrations")
      .select("competition_id")
      .eq("user_id", auth.user.id);

    if (error) throw error;

    return jsonApiResponse({
      data: (data || []).map((r: any) => r.competition_id),
      error: null,
      meta: { requestId },
    });
  } catch (err) {
    return jsonApiResponse({ data: [], error: null, meta: { requestId } });
  }
}

export async function POST(request: Request) {
  const requestId = crypto.randomUUID();
  try {
    const body = await request.json().catch(() => ({}));
    const competitionId = body.competitionId || body.competition_id;
    const teamName = body.teamName || body.team_name || null;

    if (!competitionId) {
      return jsonApiResponse(
        { data: null, error: { code: "INVALID_INPUT", message: "competition_id is required." }, meta: { requestId } },
        400
      );
    }

    if (getBackendMode() === "neon-staging") {
      const actor = await getAuthenticatedApplicationUser(request);
      const rows = await queryRows(`
        INSERT INTO public.competition_registrations (competition_id, user_id, team_name)
        VALUES ($1::uuid, $2::uuid, $3)
        ON CONFLICT DO NOTHING
        RETURNING id, competition_id, user_id, created_at`,
        [competitionId, actor.userId, teamName]
      );
      return jsonApiResponse({ data: rows[0] ?? { success: true }, error: null, meta: { requestId } }, 201);
    }

    const auth = await authenticateRequest(request);
    const db = getAdminClient() as any;
    const { data, error } = await db
      .from("competition_registrations")
      .insert({
        competition_id: competitionId,
        user_id: auth.user.id,
        team_name: teamName,
      })
      .select()
      .maybeSingle();

    if (error) throw error;

    return jsonApiResponse({ data: data || { success: true }, error: null, meta: { requestId } }, 201);
  } catch (err) {
    return jsonApiResponse(
      {
        data: null,
        error: {
          code: "REGISTRATION_FAILED",
          message: err instanceof Error ? err.message : "Failed to register for competition.",
        },
        meta: { requestId },
      },
      500
    );
  }
}
