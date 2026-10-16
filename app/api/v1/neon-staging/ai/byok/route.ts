import { getAuthenticatedApplicationUser, requireSameOrigin } from "@/lib/server/neon-session";
import { getNeonAIStatus, parseAIScope, saveNeonAISecret } from "@/lib/server/neon-ai";
import { failure, readBody, reply, stagingOnly } from "../shared";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request): Promise<Response> {
  if (!stagingOnly()) return new Response(null, { status: 404 });
  try {
    const actor = await getAuthenticatedApplicationUser(request);
    const params = new URL(request.url).searchParams;
    const scope = parseAIScope({ module: params.get("module"), entityType: params.get("entity_type"), entityId: params.get("entity_id") });
    return reply({ data: await getNeonAIStatus(actor, scope) });
  } catch (error) { return failure(error); }
}

export async function PUT(request: Request): Promise<Response> {
  if (!stagingOnly()) return new Response(null, { status: 404 });
  try {
    requireSameOrigin(request);
    const actor = await getAuthenticatedApplicationUser(request);
    const value = await readBody(request);
    const scope = parseAIScope(value);
    return reply({ data: await saveNeonAISecret(actor, scope, value) });
  } catch (error) { return failure(error); }
}
