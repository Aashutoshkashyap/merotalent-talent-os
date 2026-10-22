import { NextResponse } from "next/server";
import { getBackendMode } from "@/lib/server/backend-mode";
import { NeonAuthorizationError } from "@/lib/server/neon-authorization";
import { getAuthenticatedApplicationUser, NeonSessionUnavailable } from "@/lib/server/neon-session";
import { queryRows } from "@/lib/server/db";
import { requireSameOrigin } from "@/lib/server/neon-session";
import { z } from "zod";
import { publicObjectUrl } from "@/lib/server/application-storage";
import { assertMediaObjectPath } from "@/lib/server/media-policy";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const profilePatch = z.object({
  full_name: z.string().trim().min(1).max(120).optional(),
  phone: z.string().trim().min(5).max(40).nullable().optional(),
  bio: z.string().max(2000).nullable().optional(),
  location: z.string().max(250).nullable().optional(),
  linkedin_url: z.string().url().max(500).nullable().optional(),
  education: z.string().max(250).nullable().optional(),
  experience_level: z.string().max(50).nullable().optional(),
  education_history: z.array(z.record(z.any())).max(30).optional(),
  experience_history: z.array(z.record(z.any())).max(30).optional(),
  certifications: z.array(z.record(z.any())).max(30).optional(),
  skills: z.array(z.string().trim().min(1).max(80)).max(60).optional(),
  onboarding_completed: z.literal(true).optional(),
}).strict().refine((value) => JSON.stringify(value).length <= 30000);

const publicFields = `id, user_id, email, full_name, phone, bio, location, linkedin_url,
  education, experience_level, education_history, experience_history,
  certifications, skills, resume_url, avatar_url, onboarding_completed`;

function stagingOnly() {
  try { return getBackendMode() !== "legacy"; } catch { return false; }
}

function failure(error: unknown) {
  if (error instanceof NeonAuthorizationError) {
    return NextResponse.json({ error: error.code }, { status: error.status });
  }
  if (error instanceof NeonSessionUnavailable) {
    return NextResponse.json({ error: "AUTH_UNAVAILABLE" }, { status: 503 });
  }
  return NextResponse.json({ error: "PROFILE_UNAVAILABLE" }, { status: 503 });
}

export async function GET(request: Request) {
  if (!stagingOnly()) return new Response(null, { status: 404 });
  try {
    const actor = await getAuthenticatedApplicationUser(request);
    const rows = await queryRows<Record<string, unknown>>(
      `SELECT ${publicFields}, COALESCE((
         SELECT array_agg(DISTINCT mc.module_key)
         FROM public.user_module_capabilities umc
         JOIN public.module_capabilities mc ON mc.id=umc.capability_id
         WHERE umc.user_id=p.user_id AND umc.status='active' AND mc.is_active
           AND (umc.expires_at IS NULL OR umc.expires_at>now())
       ),ARRAY[]::text[]) AS effective_capabilities FROM public.profiles p
       WHERE p.user_id=$1::uuid AND p.account_status='active' AND p.deleted_at IS NULL
         AND EXISTS (
           SELECT 1 FROM public.neon_application_accounts a
           JOIN public.neon_identity_links l ON l.application_account_id=a.id
           WHERE a.legacy_user_id=p.user_id AND a.status='active'
             AND l.neon_auth_user_id=$2::uuid AND l.status='verified'
         ) LIMIT 1`,
      [actor.userId, actor.neonAuthUserId],
    );
    if (!rows[0]) return NextResponse.json({ error: "PROFILE_NOT_FOUND" }, { status: 404 });
    const { effective_capabilities: capabilities, ...profile } = rows[0];
    if (typeof profile.avatar_url === "string" && profile.avatar_url.includes("/profile_avatar/")) {
      try {
        assertMediaObjectPath({ module: "profile_avatar", resourceId: null, path: profile.avatar_url }, actor.userId);
        profile.avatar_url = await publicObjectUrl("profile_avatar", profile.avatar_url);
      } catch { profile.avatar_url = null; }
    }
    return NextResponse.json({ data: profile, access: {
      roles: actor.roles, permissions: actor.permissions,
      capabilities: Array.isArray(capabilities) ? capabilities : [],
    } }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return failure(error); }
}

export async function PATCH(request: Request) {
  if (!stagingOnly()) return new Response(null, { status: 404 });
  try {
    requireSameOrigin(request);
    const actor = await getAuthenticatedApplicationUser(request);
    const parsed = profilePatch.safeParse(await request.json().catch(() => null));
    if (!parsed.success || !Object.keys(parsed.data).length) {
      return NextResponse.json({ error: "INVALID_PROFILE" }, { status: 400 });
    }
    if (parsed.data.onboarding_completed && !parsed.data.full_name?.trim()) {
      return NextResponse.json({ error: "FULL_NAME_REQUIRED" }, { status: 400 });
    }
    const values: unknown[] = [actor.userId, actor.neonAuthUserId];
    const jsonFields = new Set(["education_history", "experience_history", "certifications"]);
    const assignments = Object.entries(parsed.data).map(([key, value]) => {
      values.push(jsonFields.has(key) ? JSON.stringify(value) : value);
      return `${key}=$${values.length}${jsonFields.has(key) ? "::jsonb" : key === "skills" ? "::text[]" : ""}`;
    });
    const rows = await queryRows<Record<string, unknown>>(
      `UPDATE public.profiles p SET ${assignments.join(", ")}, updated_at=now()
       WHERE p.user_id=$1::uuid AND p.account_status='active' AND p.deleted_at IS NULL
         AND EXISTS (
           SELECT 1 FROM public.neon_application_accounts a
           JOIN public.neon_identity_links l ON l.application_account_id=a.id
           WHERE a.legacy_user_id=p.user_id AND a.status='active'
             AND l.neon_auth_user_id=$2::uuid AND l.status='verified'
         ) RETURNING ${publicFields}`,
      values,
    );
    return rows[0] ? NextResponse.json({ data: rows[0] }) : NextResponse.json({ error: "PROFILE_NOT_FOUND" }, { status: 404 });
  } catch (error) { return failure(error); }
}
