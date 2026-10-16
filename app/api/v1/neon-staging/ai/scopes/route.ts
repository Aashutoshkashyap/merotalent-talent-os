import { getAuthenticatedApplicationUser } from "@/lib/server/neon-session";
import { queryRows } from "@/lib/server/db";
import { failure, reply, stagingOnly } from "../shared";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request): Promise<Response> {
  if (!stagingOnly()) return new Response(null, { status: 404 });
  try {
    const actor = await getAuthenticatedApplicationUser(request);
    const rows = await queryRows<{ id: string; module: string; entityType: string; entityId: string }>(`
      SELECT ea.id,mc.module_key AS module,ea.entity_type AS "entityType",ea.entity_id AS "entityId"
      FROM public.entity_admin_assignments ea
      JOIN public.user_module_capabilities umc ON umc.id=ea.user_capability_id
      JOIN public.module_capabilities mc ON mc.id=umc.capability_id
      WHERE ea.user_id=$1::uuid AND ea.status='active' AND umc.status='active'
        AND mc.is_active AND (umc.expires_at IS NULL OR umc.expires_at>now())
        AND ((mc.module_key='jobs' AND ea.entity_type IN ('company','job'))
          OR (mc.module_key='mentor' AND ea.entity_type='mentor')
          OR (mc.module_key='events' AND ea.entity_type='event'))
      ORDER BY mc.module_key,ea.entity_type,ea.entity_id LIMIT 200`, [actor.userId]);
    return reply({ data: rows });
  } catch (error) { return failure(error); }
}
