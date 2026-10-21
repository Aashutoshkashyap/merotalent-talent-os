/**
 * User's competition registrations endpoint.
 * Mode-aware: uses Neon SQL in staging, Supabase in legacy.
 */
import { jsonApiResponse } from "@/lib/server/api-response";
import { getBackendMode } from "@/lib/server/backend-mode";
import { getAdminClient } from "@/lib/server/supabase";
import { getAuthenticatedApplicationUser } from "@/lib/server/neon-session";
import { authenticateRequest } from "@/lib/server/auth";
import { requireSameOrigin, NeonSessionUnavailable } from "@/lib/server/neon-session";
import { NeonAuthorizationError } from "@/lib/server/neon-authorization";
import { listMyCompetitionIds, registerNeonCompetition } from "@/lib/server/neon-competitions";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const requestId = crypto.randomUUID();
  try {
    if (getBackendMode() !== "legacy") {
      const actor = await getAuthenticatedApplicationUser(request);
      return jsonApiResponse({
        data: await listMyCompetitionIds(actor),
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
    if (getBackendMode() !== "legacy") {
      const status = err instanceof NeonAuthorizationError ? err.status
        : err instanceof NeonSessionUnavailable ? 503 : 503;
      const code = err instanceof NeonAuthorizationError ? err.code : "REGISTRATIONS_UNAVAILABLE";
      return jsonApiResponse({ data: null, error: { code, message: "Registrations could not be loaded." },
        meta: { requestId } }, status);
    }
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

    if (getBackendMode() !== "legacy") {
      requireSameOrigin(request);
      const actor = await getAuthenticatedApplicationUser(request);
      const result = await registerNeonCompetition(actor, { competitionId, teamName });
      return jsonApiResponse({ data: result, error: null, meta: { requestId } }, result.alreadyRegistered ? 200 : 201);
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
    if (getBackendMode() !== "legacy" && (err instanceof NeonAuthorizationError ||
        err instanceof NeonSessionUnavailable)) {
      return jsonApiResponse({ data: null, error: {
        code: err instanceof NeonAuthorizationError ? err.code : "AUTH_UNAVAILABLE",
        message: err.message,
      }, meta: { requestId } }, err instanceof NeonAuthorizationError ? err.status : 503);
    }
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
