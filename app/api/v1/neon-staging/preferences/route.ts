import { NextResponse } from "next/server";
import { z } from "zod";
import { DEFAULT_NOTIFICATION_PREFERENCES } from "@/lib/account/preferences";
import { getBackendMode } from "@/lib/server/backend-mode";
import { queryRows } from "@/lib/server/db";
import { NeonAuthorizationError } from "@/lib/server/neon-authorization";
import { getAuthenticatedApplicationUser, NeonSessionUnavailable, requireSameOrigin } from "@/lib/server/neon-session";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const noStore = { "cache-control": "private, no-store" };
const preferencesSchema = z.object({
  language: z.enum(["en", "ne"]),
  notification_preferences: z.object({
    email: z.boolean(), push: z.boolean(), competitions: z.boolean(),
    mentorship: z.boolean(), jobs: z.boolean(), marketing: z.boolean(),
  }).strict(),
}).strict();

function stagingOnly() {
  try { return getBackendMode() === "neon-staging"; } catch { return false; }
}

function failure(error: unknown) {
  if (error instanceof NeonAuthorizationError) return NextResponse.json({ error: error.code }, { status: error.status, headers: noStore });
  if (error instanceof NeonSessionUnavailable) return NextResponse.json({ error: "AUTH_UNAVAILABLE" }, { status: 503, headers: noStore });
  return NextResponse.json({ error: "PREFERENCES_UNAVAILABLE" }, { status: 503, headers: noStore });
}

export async function GET(request: Request) {
  if (!stagingOnly()) return new Response(null, { status: 404 });
  try {
    const actor = await getAuthenticatedApplicationUser(request);
    const rows = await queryRows<{ notification_preferences: unknown; language: string }>(`
      SELECT p.notification_preferences, p.language FROM public.user_preferences p
      JOIN public.neon_application_accounts a ON a.legacy_user_id=p.user_id AND a.status='active'
      JOIN public.neon_identity_links l ON l.application_account_id=a.id AND l.status='verified'
      WHERE p.user_id=$1::uuid AND l.neon_auth_user_id=$2::uuid LIMIT 1`,
      [actor.userId, actor.neonAuthUserId]);
    return NextResponse.json({ data: rows[0] ?? {
      notification_preferences: DEFAULT_NOTIFICATION_PREFERENCES, language: "en",
    } }, { headers: noStore });
  } catch (error) { return failure(error); }
}

export async function PUT(request: Request) {
  if (!stagingOnly()) return new Response(null, { status: 404 });
  try {
    requireSameOrigin(request);
    const actor = await getAuthenticatedApplicationUser(request);
    const parsed = preferencesSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: "INVALID_PREFERENCES" }, { status: 400, headers: noStore });
    const rows = await queryRows<{ notification_preferences: unknown; language: string }>(`
      INSERT INTO public.user_preferences (user_id, notification_preferences, theme, language)
      SELECT p.user_id, $3::jsonb, 'light', $4
      FROM public.profiles p
      JOIN public.neon_application_accounts a ON a.legacy_user_id=p.user_id AND a.status='active'
      JOIN public.neon_identity_links l ON l.application_account_id=a.id AND l.status='verified'
      WHERE p.user_id=$1::uuid AND l.neon_auth_user_id=$2::uuid
        AND p.account_status='active' AND p.deleted_at IS NULL
      ON CONFLICT (user_id) DO UPDATE SET
        notification_preferences=EXCLUDED.notification_preferences,
        language=EXCLUDED.language, theme='light', updated_at=now()
      RETURNING notification_preferences, language`,
      [actor.userId, actor.neonAuthUserId, JSON.stringify(parsed.data.notification_preferences), parsed.data.language]);
    return rows[0]
      ? NextResponse.json({ data: rows[0] }, { headers: noStore })
      : NextResponse.json({ error: "PROFILE_NOT_FOUND" }, { status: 404, headers: noStore });
  } catch (error) { return failure(error); }
}
