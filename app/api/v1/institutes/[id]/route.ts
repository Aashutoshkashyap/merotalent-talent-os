import { NextResponse } from "next/server";
import { getBackendMode } from "@/lib/server/backend-mode";
import { authenticateRequest, ApiAuthError } from "@/lib/server/auth";
import { NeonAuthorizationError } from "@/lib/server/neon-authorization";
import { NeonRepositories } from "@/lib/server/neon-repositories";
import { getAuthenticatedApplicationUser, NeonSessionUnavailable } from "@/lib/server/neon-session";
import { getAdminClient } from "@/lib/server/supabase";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  if (!uuid.test(id)) return NextResponse.json({ error: "Invalid institution ID." }, { status: 400 });

  try {
    const managed = new URL(request.url).searchParams.get("view") === "managed";
    if (getBackendMode() !== "legacy") {
      const repo = new NeonRepositories();
      const institute = managed
        ? await repo.getManagedInstitute(await getAuthenticatedApplicationUser(request), id)
        : await repo.getPublicInstitute(id);
      return institute
        ? NextResponse.json({ data: institute })
        : NextResponse.json({ error: "Institution not found." }, { status: 404 });
    }

    const client = managed ? (await authenticateRequest(request)).userClient : getAdminClient();
    let query = client
      .from("institutes")
      .select("id,name,description,location,status,logo_url,cover_image_url,updated_at")
      .eq("id", id)
      .is("deleted_at", null);
    if (!managed) query = query.eq("status", "approved");
    const { data, error } = await query.maybeSingle();
    if (error) throw error;
    return data
      ? NextResponse.json({ data })
      : NextResponse.json({ error: "Institution not found." }, { status: 404 });
  } catch (error) {
    if (error instanceof NeonAuthorizationError || error instanceof ApiAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (error instanceof NeonSessionUnavailable) {
      return NextResponse.json({ error: error.message }, { status: 503 });
    }
    // Never fall back to production Supabase after a staging failure.
    return NextResponse.json({ error: "Institution data is unavailable." }, { status: 503 });
  }
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  if (!uuid.test(id)) return NextResponse.json({ error: "Invalid institution ID." }, { status: 400 });
  let body: unknown;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  if (!body || typeof body !== "object" || Array.isArray(body) ||
      Object.keys(body).some((key) => key !== "description") ||
      typeof (body as { description?: unknown }).description !== "string" ||
      !(body as { description: string }).description.trim() ||
      (body as { description: string }).description.length > 10_000) {
    return NextResponse.json({ error: "A description of up to 10,000 characters is required." }, { status: 400 });
  }
  const description = (body as { description: string }).description.trim();
  try {
    if (getBackendMode() !== "legacy") {
      const actor = await getAuthenticatedApplicationUser(request);
      const updated = await new NeonRepositories().updateInstituteDescription(actor, id, description);
      return updated
        ? NextResponse.json({ data: updated })
        : NextResponse.json({ error: "Institution not found." }, { status: 404 });
    }
    const authenticated = await authenticateRequest(request);
    const { data, error } = await authenticated.userClient.from("institutes")
      .update({ description }).eq("id", id).is("deleted_at", null)
      .select("id,name,description,location,status,logo_url,cover_image_url,updated_at")
      .maybeSingle();
    if (error) throw error;
    if (data) return NextResponse.json({ data });
    const { data: existing, error: readError } = await getAdminClient().from("institutes")
      .select("id").eq("id", id).is("deleted_at", null).maybeSingle();
    if (readError) throw readError;
    return NextResponse.json({ error: existing ? "Access denied." : "Institution not found." },
      { status: existing ? 403 : 404 });
  } catch (error) {
    if (error instanceof NeonAuthorizationError || error instanceof ApiAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (error instanceof NeonSessionUnavailable) {
      return NextResponse.json({ error: error.message }, { status: 503 });
    }
    return NextResponse.json({ error: "Institution update is unavailable." }, { status: 503 });
  }
}
