/**
 * Public jobs discovery endpoint.
 * Supports searching, filtering (location, type, category), and pagination.
 * Mode-aware: uses Neon SQL in staging mode, Supabase in legacy mode.
 */
import { NextResponse } from "next/server";
import { getBackendMode } from "@/lib/server/backend-mode";
import { getAdminClient } from "@/lib/server/supabase";
import { NeonJobsRepository } from "@/lib/server/neon-jobs";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request): Promise<Response> {
  try {
    const url = new URL(request.url);
    const id = url.searchParams.get("id");
    const isStaging = getBackendMode() === "neon-staging";

    if (isStaging) {
      const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (id && !uuid.test(id)) return NextResponse.json({ error: "INVALID_JOB_ID" }, { status: 400 });
      const repo = new NeonJobsRepository();
      if (id) {
        const job = await repo.getPublicJob(id);
        return job
          ? NextResponse.json({ data: job }, { headers: { "Cache-Control": "public, max-age=30, stale-while-revalidate=120" } })
          : NextResponse.json({ error: "JOB_NOT_FOUND", message: "This job listing is no longer available." }, { status: 404 });
      }

      const search = url.searchParams.get("search") ?? undefined;
      const location = url.searchParams.get("location") ?? undefined;
      const jobType = url.searchParams.get("type") ?? undefined;
      const category = url.searchParams.get("category") ?? undefined;
      const limit = Number(url.searchParams.get("limit") ?? 50);
      const offset = Number(url.searchParams.get("offset") ?? 0);
      if (!Number.isInteger(limit) || limit < 1 || limit > 100 ||
          !Number.isInteger(offset) || offset < 0 || offset > 100000) {
        return NextResponse.json({ error: "INVALID_PAGINATION" }, { status: 400 });
      }

      const jobs = await repo.listPublicJobs({ search, location, jobType, category, limit, offset });
      return NextResponse.json({ data: jobs }, {
        headers: { "Cache-Control": "public, max-age=60, stale-while-revalidate=300" },
      });
    }

    // Legacy Supabase path
    const now = new Date().toISOString();
    const db = getAdminClient() as any;

    if (id) {
      const { data: job, error } = await db
        .from("jobs")
        .select("*, companies(name, logo_url)")
        .eq("id", id)
        .eq("status", "published")
        .eq("approval_status", "approved")
        .eq("is_active", true)
        .is("deleted_at", null)
        .or(`expires_at.is.null,expires_at.gt.${now}`)
        .maybeSingle();

      if (error || !job) {
        return NextResponse.json({ error: "JOB_NOT_FOUND", message: "This job listing is no longer available." }, { status: 404 });
      }
      return NextResponse.json({ data: job }, { headers: { "Cache-Control": "public, max-age=30, stale-while-revalidate=120" } });
    }

    const search = url.searchParams.get("search")?.trim();
    const location = url.searchParams.get("location")?.trim();
    const jobType = url.searchParams.get("type")?.trim();
    const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") || "50", 10)));
    const offset = Math.max(0, parseInt(url.searchParams.get("offset") || "0", 10));

    let query = db
      .from("jobs")
      .select("*, companies(name, logo_url)")
      .eq("status", "published")
      .eq("approval_status", "approved")
      .eq("is_active", true)
      .is("deleted_at", null)
      .or(`expires_at.is.null,expires_at.gt.${now}`)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (search) {
      query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`);
    }
    if (location) {
      query = query.ilike("location", `%${location}%`);
    }
    if (jobType && jobType !== "all") {
      query = query.eq("job_type", jobType);
    }

    const { data: jobs, error } = await query;
    if (error) {
      console.error("[jobs] Legacy fetch error:", error.message);
      return NextResponse.json({ data: [] });
    }

    return NextResponse.json({ data: jobs || [] }, {
      headers: { "Cache-Control": "public, max-age=60, stale-while-revalidate=300" },
    });
  } catch (err: any) {
    console.error("[jobs] Unexpected error:", err);
    return NextResponse.json({ data: [] });
  }
}
