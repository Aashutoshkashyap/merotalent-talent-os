import { NextResponse } from "next/server";
import { getBackendMode } from "@/lib/server/backend-mode";
import { NeonAuthorizationError } from "@/lib/server/neon-authorization";
import { requireEntityAccess } from "@/lib/server/neon-authorization";
import { withTransaction } from "@/lib/server/db";
import { listManagedCollegeLeads } from "@/lib/server/neon-college-leads";
import { parseCollegeAdmissionInput, submitCollegeAdmission } from "@/lib/server/neon-college-admissions";
import { getAuthenticatedApplicationUser, NeonSessionUnavailable, requireSameOrigin } from "@/lib/server/neon-session";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function stagingOnly(): boolean {
  try { return getBackendMode() === "neon-staging"; }
  catch { return false; }
}

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  // This route cannot expose copied private leads from a production deployment.
  if (!stagingOnly()) return new Response(null, { status: 404 });
  const { id } = await context.params;
  if (!uuid.test(id)) return NextResponse.json({ error: "INVALID_INSTITUTE_ID" }, { status: 400 });
  try {
    const actor = await getAuthenticatedApplicationUser(request);
    const applications = await listManagedCollegeLeads(actor, id);
    return applications === null
      ? NextResponse.json({ error: "INSTITUTE_NOT_FOUND" }, { status: 404 })
      : NextResponse.json({ data: applications }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof NeonAuthorizationError) {
      return NextResponse.json({ error: error.code }, { status: error.status });
    }
    if (error instanceof NeonSessionUnavailable) {
      return NextResponse.json({ error: "AUTH_UNAVAILABLE" }, { status: 503 });
    }
    // Database details and private lead contents must not enter the response.
    return NextResponse.json({ error: "APPLICATIONS_UNAVAILABLE" }, { status: 503 });
  }
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!stagingOnly()) return new Response(null, { status: 404 });
  const origin = request.headers.get("origin");
  if (!origin || origin !== new URL(request.url).origin) {
    return NextResponse.json({ error: "CROSS_ORIGIN_WRITE_DENIED" }, { status: 403 });
  }
  const { id } = await context.params;
  if (!uuid.test(id)) return NextResponse.json({ error: "INVALID_INSTITUTE_ID" }, { status: 400 });
  const body: unknown = await request.json().catch(() => null);
  const input = parseCollegeAdmissionInput(body);
  if (!input) return NextResponse.json({ error: "INVALID_APPLICATION" }, { status: 400 });
  try {
    const actor = await getAuthenticatedApplicationUser(request);
    const application = await submitCollegeAdmission(actor, id, input);
    return application === null
      ? NextResponse.json({ error: "INSTITUTE_NOT_FOUND" }, { status: 404 })
      : NextResponse.json({ data: application }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof NeonAuthorizationError) {
      return NextResponse.json({ error: error.code }, { status: error.status });
    }
    if (error instanceof NeonSessionUnavailable) {
      return NextResponse.json({ error: "AUTH_UNAVAILABLE" }, { status: 503 });
    }
    return NextResponse.json({ error: "APPLICATION_SAVE_FAILED" }, { status: 503 });
  }
}

/** College-admin status change; never accepts applicant or college IDs from the body. */
export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!stagingOnly()) return new Response(null, { status: 404 });
  try {
    requireSameOrigin(request);
    const { id } = await context.params;
    if (!uuid.test(id)) return NextResponse.json({ error: "INVALID_INSTITUTE_ID" }, { status: 400 });
    const body: unknown = await request.json().catch(() => null);
    if (!body || typeof body !== "object" || Array.isArray(body) ||
        Object.keys(body).some(key => !["id", "status"].includes(key))) {
      return NextResponse.json({ error: "INVALID_APPLICATION" }, { status: 400 });
    }
    const input = body as { id?: unknown; status?: unknown };
    if (typeof input.id !== "string" || !uuid.test(input.id) ||
        !["reviewing", "contacted", "accepted", "rejected"].includes(String(input.status))) {
      return NextResponse.json({ error: "INVALID_STATUS" }, { status: 400 });
    }
    const actor = await getAuthenticatedApplicationUser(request);
    const saved = await withTransaction(async client => {
      await requireEntityAccess(actor, "college", "college", id, "college_applications", {
        query: async <T extends import("pg").QueryResultRow>(sql: string, params: readonly unknown[]) =>
          (await client.query<T>(sql, [...params])).rows,
      });
      const updated = await client.query<{ id: string; status: string }>(`
        UPDATE public.college_applications ca SET status=$3,updated_at=now()
        WHERE ca.id=$2::uuid AND ca.institute_id=$1::uuid AND ca.deleted_at IS NULL
          AND ((ca.status='submitted' AND $3 IN ('reviewing','contacted','accepted','rejected'))
            OR (ca.status='reviewing' AND $3 IN ('contacted','accepted','rejected'))
            OR (ca.status='contacted' AND $3 IN ('accepted','rejected')))
        RETURNING ca.id,ca.status`, [id, input.id, input.status]);
      if (!updated.rows[0]) throw new NeonAuthorizationError(409, "APPLICATION_NOT_EDITABLE", "Application is not editable for this college.");
      await client.query(`INSERT INTO public.audit_logs(actor_user_id,action,entity_type,entity_id,metadata)
        VALUES ($1::uuid,'update_college_application','college_application',$2::text,
          jsonb_build_object('college_id',$3::uuid,'status',$4::text))`,
      [actor.userId, input.id, id, input.status]);
      return updated.rows[0];
    });
    return NextResponse.json({ data: saved }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (cause) {
    if (cause instanceof NeonAuthorizationError) return NextResponse.json({ error: cause.code }, { status: cause.status });
    if (cause instanceof NeonSessionUnavailable) return NextResponse.json({ error: "AUTH_UNAVAILABLE" }, { status: 503 });
    return NextResponse.json({ error: "APPLICATION_UPDATE_FAILED" }, { status: 503 });
  }
}
