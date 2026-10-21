import { NextResponse } from "next/server";
import { z } from "zod";
import { getBackendMode } from "@/lib/server/backend-mode";
import { queryRows, withTransaction } from "@/lib/server/db";
import { NeonAuthorizationError } from "@/lib/server/neon-authorization";
import { getAuthenticatedApplicationUser, NeonSessionUnavailable, requireSameOrigin } from "@/lib/server/neon-session";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
const headers = { "cache-control": "private, no-store" };
const uuid = z.string().uuid();
const createSchema = z.object({
  title: z.string().trim().min(1).max(160), message: z.string().trim().min(1).max(4000),
  type: z.enum(["info", "warning", "success", "alert"]),
  recipients: z.union([z.literal("admins"), z.literal("self"), z.string().regex(/^user:[0-9a-f-]{36}$/i)]),
}).strict();
const idSchema = z.object({ id: uuid }).strict();
const stage = () => { try { return getBackendMode() !== "legacy"; } catch { return false; } };
const reply = (body: unknown, status = 200) => NextResponse.json(body, { status, headers });
const failure = (error: unknown) => error instanceof NeonAuthorizationError
  ? reply({ error: error.code }, error.status)
  : reply({ error: error instanceof NeonSessionUnavailable ? "AUTH_UNAVAILABLE" : "ADMIN_NOTIFICATIONS_UNAVAILABLE" }, 503);

async function admin(request: Request) {
  const actor = await getAuthenticatedApplicationUser(request);
  if (!actor.platformAdmin) throw new NeonAuthorizationError(403, "ADMIN_REQUIRED", "Super Admin required.");
  return actor;
}

export async function GET(request: Request) {
  if (!stage()) return new Response(null, { status: 404 });
  try {
    await admin(request);
    const [notifications, members, profiles] = await Promise.all([
      queryRows(`SELECT * FROM public.notifications WHERE deleted_at IS NULL ORDER BY created_at DESC LIMIT 250`),
      queryRows(`SELECT DISTINCT p.user_id,p.email,p.full_name,p.updated_at FROM public.profiles p
        JOIN public.user_roles r ON r.user_id=p.user_id AND r.role::text IN ('admin','super_admin')
        WHERE p.account_status='active' AND p.deleted_at IS NULL ORDER BY p.full_name LIMIT 500`),
      queryRows(`SELECT DISTINCT p.user_id,p.email,p.full_name,p.updated_at FROM public.profiles p
        JOIN public.notifications n ON n.recipient_id=p.user_id
        WHERE n.deleted_at IS NULL ORDER BY p.user_id LIMIT 500`),
    ]);
    return reply({ data: { notifications, adminMembers: members, profiles } });
  } catch (error) { return failure(error); }
}

export async function POST(request: Request) {
  if (!stage()) return new Response(null, { status: 404 });
  try {
    requireSameOrigin(request);
    const actor = await admin(request);
    const parsed = createSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return reply({ error: "INVALID_NOTIFICATION" }, 400);
    const { title, message, type, recipients } = parsed.data;
    const recipientIds = recipients === "self" ? [actor.userId]
      : recipients === "admins"
        ? (await queryRows<{ user_id: string }>(`SELECT DISTINCT p.user_id FROM public.profiles p
            JOIN public.user_roles r ON r.user_id=p.user_id AND r.role::text IN ('admin','super_admin')
            WHERE p.account_status='active' AND p.deleted_at IS NULL`, [])).map(row => row.user_id)
        : [recipients.slice(5)];
    if (!recipientIds.length || recipientIds.length > 500 ||
        recipientIds.some(id => !uuid.safeParse(id).success)) return reply({ error: "RECIPIENT_NOT_FOUND" }, 404);
    const rows = await withTransaction(async client => {
      const eligible = await client.query<{ user_id: string }>(`SELECT user_id FROM public.profiles
        WHERE user_id=ANY($1::uuid[]) AND account_status='active' AND deleted_at IS NULL`, [recipientIds]);
      if (eligible.rows.length !== recipientIds.length) throw new NeonAuthorizationError(404, "RECIPIENT_NOT_FOUND", "Recipient unavailable.");
      return (await client.query(`INSERT INTO public.notifications
        (recipient_id,sender_id,title,message,type,category,is_read)
        SELECT unnest($1::uuid[]),$2::uuid,$3,$4,$5,'admin',false RETURNING id`,
      [recipientIds, actor.userId, title, message, type])).rows;
    });
    return reply({ data: { created: rows.length } }, 201);
  } catch (error) { return failure(error); }
}

export async function PATCH(request: Request) {
  if (!stage()) return new Response(null, { status: 404 });
  try {
    requireSameOrigin(request); await admin(request);
    const parsed = idSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return reply({ error: "INVALID_NOTIFICATION" }, 400);
    const rows = await queryRows<{ id: string }>(`UPDATE public.notifications SET is_read=true
      WHERE id=$1::uuid AND deleted_at IS NULL RETURNING id`, [parsed.data.id]);
    return rows[0] ? reply({ data: { updated: true } }) : reply({ error: "NOT_FOUND" }, 404);
  } catch (error) { return failure(error); }
}

export async function DELETE(request: Request) {
  if (!stage()) return new Response(null, { status: 404 });
  try {
    requireSameOrigin(request); await admin(request);
    const parsed = idSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return reply({ error: "INVALID_NOTIFICATION" }, 400);
    const rows = await queryRows<{ id: string }>(`UPDATE public.notifications SET deleted_at=now()
      WHERE id=$1::uuid AND deleted_at IS NULL RETURNING id`, [parsed.data.id]);
    return rows[0] ? reply({ data: { deleted: true } }) : reply({ error: "NOT_FOUND" }, 404);
  } catch (error) { return failure(error); }
}
