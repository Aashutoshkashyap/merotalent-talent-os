import { authenticateAdminRequest } from "@/lib/server/auth";
import { adminApiErrorResponse, AdminRequestError, readAdminJsonBody } from "@/lib/admin/admin-route-utils";
import { getAdminClient } from "@/lib/server/supabase";
import { jsonApiResponse } from "@/lib/server/api-response";

const isUuid = (v: unknown): v is string =>
  typeof v === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);

const VALID_ROLES = ["admin", "talent", "institution", "company", "mentor", "instructor"] as const;
type AppRole = typeof VALID_ROLES[number];

/** GET /api/v1/admin/access-matrix
 *  Returns profiles, user_roles, institute_admins, and institutes
 *  so the Access Matrix UI can render without additional client-side fetches.
 */
export async function GET(request: Request) {
  const requestId = crypto.randomUUID();
  try {
    await authenticateAdminRequest(request);
    const db = getAdminClient() as any;

    const [profiles, roles, instituteAdmins, institutes] = await Promise.all([
      db.from("profiles")
        .select("user_id,email,full_name,account_status,created_at")
        .order("created_at", { ascending: false })
        .limit(500),
      db.from("user_roles").select("user_id,role,created_at,id"),
      db.from("institute_admins").select("id,user_id,institute_id,can_edit_profile,can_manage_courses,can_post_notices,created_at"),
      db.from("institutes").select("id,name").order("name"),
    ]);

    for (const result of [profiles, roles, instituteAdmins]) {
      if (result.error) throw result.error;
    }
    // institutes may not exist in all environments; treat as non-fatal
    const institutesData = institutes.error ? [] : (institutes.data ?? []);

    return jsonApiResponse({
      data: {
        users: profiles.data ?? [],
        roles: roles.data ?? [],
        instituteAdmins: instituteAdmins.data ?? [],
        institutes: institutesData,
      },
      error: null,
      meta: { requestId },
    });
  } catch (error) {
    return adminApiErrorResponse(error, requestId, "load access matrix");
  }
}

/** POST /api/v1/admin/access-matrix
 *  Supported actions:
 *   - grant_role      { userId, role }
 *   - revoke_role     { userId, role }
 *   - grant_ia        { userId, instituteId, canEditProfile, canManageCourses, canPostNotices }
 *   - revoke_ia       { iaId }
 */
export async function POST(request: Request) {
  const requestId = crypto.randomUUID();
  try {
    const context = await authenticateAdminRequest(request);
    const body = await readAdminJsonBody(request);
    if (!body || typeof body !== "object" || Array.isArray(body))
      throw new AdminRequestError(400, "INVALID_BODY", "Request body must be a JSON object.");

    const value = body as Record<string, unknown>;
    const db = getAdminClient() as any;
    const actorId = context.user.id;

    // ── grant_role ──────────────────────────────────────────────────
    if (value.action === "grant_role") {
      if (!isUuid(value.userId)) throw new AdminRequestError(422, "INVALID_USER_ID", "Provide a valid user UUID.");
      if (!VALID_ROLES.includes(value.role as AppRole))
        throw new AdminRequestError(422, "INVALID_ROLE", `Role must be one of: ${VALID_ROLES.join(", ")}.`);

      const { error } = await db.from("user_roles").upsert(
        { user_id: value.userId, role: value.role },
        { onConflict: "user_id,role" },
      );
      if (error) throw error;

      await db.from("audit_logs").insert({
        actor_user_id: actorId,
        action: "ROLE_GRANTED",
        entity_type: "user",
        entity_id: value.userId,
        metadata: { role: value.role },
      }).maybeSingle();

      return jsonApiResponse({ data: { updated: true }, error: null, meta: { requestId } });
    }

    // ── revoke_role ─────────────────────────────────────────────────
    if (value.action === "revoke_role") {
      if (!isUuid(value.userId)) throw new AdminRequestError(422, "INVALID_USER_ID", "Provide a valid user UUID.");
      if (!VALID_ROLES.includes(value.role as AppRole))
        throw new AdminRequestError(422, "INVALID_ROLE", `Role must be one of: ${VALID_ROLES.join(", ")}.`);

      const { error } = await db.from("user_roles").delete().match({ user_id: value.userId, role: value.role });
      if (error) throw error;

      await db.from("audit_logs").insert({
        actor_user_id: actorId,
        action: "ROLE_REVOKED",
        entity_type: "user",
        entity_id: value.userId,
        metadata: { role: value.role },
      }).maybeSingle();

      return jsonApiResponse({ data: { updated: true }, error: null, meta: { requestId } });
    }

    // ── grant_ia ────────────────────────────────────────────────────
    if (value.action === "grant_ia") {
      if (!isUuid(value.userId)) throw new AdminRequestError(422, "INVALID_USER_ID", "Provide a valid user UUID.");
      if (!isUuid(value.instituteId)) throw new AdminRequestError(422, "INVALID_INSTITUTE_ID", "Provide a valid institute UUID.");

      const { error } = await db.from("institute_admins").upsert({
        user_id: value.userId,
        institute_id: value.instituteId,
        can_edit_profile: value.canEditProfile === true,
        can_manage_courses: value.canManageCourses === true,
        can_post_notices: value.canPostNotices === true,
      }, { onConflict: "user_id,institute_id" });
      if (error) throw error;

      return jsonApiResponse({ data: { updated: true }, error: null, meta: { requestId } });
    }

    // ── revoke_ia ───────────────────────────────────────────────────
    if (value.action === "revoke_ia") {
      if (!isUuid(value.iaId)) throw new AdminRequestError(422, "INVALID_IA_ID", "Provide a valid institute admin record UUID.");

      const { error } = await db.from("institute_admins").delete().eq("id", value.iaId);
      if (error) throw error;

      return jsonApiResponse({ data: { updated: true }, error: null, meta: { requestId } });
    }

    throw new AdminRequestError(422, "INVALID_ACTION", "Unsupported access matrix action.");
  } catch (error) {
    return adminApiErrorResponse(error, requestId, "update access matrix");
  }
}
