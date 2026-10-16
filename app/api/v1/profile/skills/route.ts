/**
 * User skills and platform skills endpoint.
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
      const actor = await getAuthenticatedApplicationUser(request).catch(() => null);

      const [skills, userSkills] = await Promise.all([
        queryRows<{ id: string; name: string; category: string }>(`
          SELECT id, name, category FROM public.skills ORDER BY name ASC`),
        actor
          ? queryRows<{ skill_id: string }>(`
              SELECT skill_id FROM public.user_skills WHERE user_id = $1::uuid`, [actor.userId])
          : Promise.resolve([]),
      ]);

      return jsonApiResponse({
        data: {
          skills,
          userSkills: userSkills.map((s) => s.skill_id),
        },
        error: null,
        meta: { requestId },
      });
    }

    const db = getAdminClient() as any;
    const auth = await authenticateRequest(request).catch(() => null);

    const [skillsResult, userSkillsResult] = await Promise.all([
      db.from("skills").select("*"),
      auth ? db.from("user_skills").select("skill_id").eq("user_id", auth.user.id) : Promise.resolve({ data: [] }),
    ]);

    return jsonApiResponse({
      data: {
        skills: skillsResult.data || [],
        userSkills: (userSkillsResult.data || []).map((s: any) => s.skill_id),
      },
      error: null,
      meta: { requestId },
    });
  } catch (err) {
    return jsonApiResponse(
      {
        data: { skills: [], userSkills: [] },
        error: {
          code: "SKILLS_FETCH_FAILED",
          message: err instanceof Error ? err.message : "Failed to load skills.",
        },
        meta: { requestId },
      },
      500
    );
  }
}

export async function POST(request: Request) {
  const requestId = crypto.randomUUID();
  try {
    const body = await request.json().catch(() => ({}));
    const skillId = body.skillId || body.skill_id;
    const action = body.action || "add"; // "add" | "remove"

    if (!skillId) {
      return jsonApiResponse(
        { data: null, error: { code: "INVALID_INPUT", message: "skillId is required." }, meta: { requestId } },
        400
      );
    }

    if (getBackendMode() === "neon-staging") {
      const actor = await getAuthenticatedApplicationUser(request);

      if (action === "remove") {
        await queryRows(`
          DELETE FROM public.user_skills WHERE user_id = $1::uuid AND skill_id = $2::uuid`,
          [actor.userId, skillId]
        );
      } else {
        await queryRows(`
          INSERT INTO public.user_skills (user_id, skill_id)
          VALUES ($1::uuid, $2::uuid)
          ON CONFLICT DO NOTHING`,
          [actor.userId, skillId]
        );
      }

      return jsonApiResponse({ data: { success: true }, error: null, meta: { requestId } });
    }

    const auth = await authenticateRequest(request);
    const db = getAdminClient() as any;

    if (action === "remove") {
      await db.from("user_skills").delete().eq("user_id", auth.user.id).eq("skill_id", skillId);
    } else {
      await db.from("user_skills").insert({ user_id: auth.user.id, skill_id: skillId });
    }

    return jsonApiResponse({ data: { success: true }, error: null, meta: { requestId } });
  } catch (err) {
    return jsonApiResponse(
      {
        data: null,
        error: {
          code: "SKILL_UPDATE_FAILED",
          message: err instanceof Error ? err.message : "Failed to update skill.",
        },
        meta: { requestId },
      },
      500
    );
  }
}
