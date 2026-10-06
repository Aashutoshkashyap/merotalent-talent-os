import { authenticateAdminRequest } from "@/lib/server/auth";
import { adminApiErrorResponse, AdminRequestError } from "@/lib/admin/admin-route-utils";
import { getAdminClient } from "@/lib/server/supabase";
import { jsonApiResponse } from "@/lib/server/api-response";

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

/** Legacy write actions have moved to the audited People workflow. */
export async function POST(request: Request) {
  const requestId = crypto.randomUUID();
  try {
    await authenticateAdminRequest(request);
    throw new AdminRequestError(410, "ACCESS_ASSIGNMENT_MOVED", "Role and module assignment has moved to Super Admin > People.");
  } catch (error) {
    return adminApiErrorResponse(error, requestId, "update access matrix");
  }
}
