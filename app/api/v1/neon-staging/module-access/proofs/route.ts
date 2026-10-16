import { NextResponse } from "next/server";
import { getBackendMode } from "@/lib/server/backend-mode";
import { NeonAuthorizationError } from "@/lib/server/neon-authorization";
import { downloadNeonAccessProof, uploadNeonAccessProof, type AccessModule } from "@/lib/server/neon-module-access";
import { getAuthenticatedApplicationUser, requireSameOrigin } from "@/lib/server/neon-session";
import { MediaPolicyError } from "@/lib/server/media-policy";
import { NeonManagedMediaError } from "@/lib/server/neon-managed-media";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
const reply = (data: unknown, status = 200) => NextResponse.json(data, { status, headers: { "Cache-Control": "private, no-store" } });
const failure = (error: unknown) => error instanceof NeonAuthorizationError || error instanceof MediaPolicyError || error instanceof NeonManagedMediaError
  ? reply({ error: error.code, message: error.message }, error.status) : reply({ error: "PROOF_UNAVAILABLE" }, 503);

export async function POST(request: Request) {
  if (getBackendMode() !== "neon-staging") return new Response(null, { status: 404 });
  try {
    requireSameOrigin(request);
    const actor = await getAuthenticatedApplicationUser(request);
    const length = Number(request.headers.get("content-length"));
    if (!Number.isFinite(length) || length > 6 * 1024 * 1024) return reply({ error: "FILE_TOO_LARGE" }, 413);
    const form = await request.formData();
    const file = form.get("file"), draftId = form.get("draftId"), moduleKey = form.get("module");
    if (!(file instanceof File) || typeof draftId !== "string" || typeof moduleKey !== "string" ||
      file.size > 5 * 1024 * 1024 || [...form.keys()].some(key => !["file", "draftId", "module"].includes(key)))
      return reply({ error: "INVALID_PROOF" }, 400);
    return reply({ data: await uploadNeonAccessProof(actor, { draftId, module: moduleKey as AccessModule,
      fileName: file.name, contentType: file.type, bytes: new Uint8Array(await file.arrayBuffer()) }) }, 201);
  } catch (error) { return failure(error); }
}

export async function GET(request: Request) {
  if (getBackendMode() !== "neon-staging") return new Response(null, { status: 404 });
  try {
    const actor = await getAuthenticatedApplicationUser(request);
    const params = new URL(request.url).searchParams;
    return reply({ data: await downloadNeonAccessProof(actor, params.get("requestId") ?? "", params.get("module") as AccessModule) });
  } catch (error) { return failure(error); }
}
