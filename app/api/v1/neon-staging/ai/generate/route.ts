import { getAuthenticatedApplicationUser, requireSameOrigin } from "@/lib/server/neon-session";
import { generateNeonAIDraft, generateNeonAdminAIDraft, parseAIScope } from "@/lib/server/neon-ai";
import { failure, readBody, reply, stagingOnly } from "../shared";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request): Promise<Response> {
  if (!stagingOnly()) return new Response(null, { status: 404 });
  try {
    requireSameOrigin(request);
    const actor = await getAuthenticatedApplicationUser(request);
    const value = await readBody(request);
    if(value.adminDraft === true) return reply({data:await generateNeonAdminAIDraft(actor,value)});
    const scope = parseAIScope(value);
    return reply({ data: await generateNeonAIDraft(actor, scope, value) });
  } catch (error) { return failure(error); }
}
