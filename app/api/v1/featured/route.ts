/**
 * Public featured items endpoint.
 * Returns hydrated, entity-joined featured listings for the landing page carousel.
 * No authentication required.
 */
import { NextResponse } from "next/server";
import { getBackendMode } from "@/lib/server/backend-mode";
import { getAdminClient } from "@/lib/server/supabase";
import { queryRows } from "@/lib/server/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface FeaturedItemRow {
  id: string;
  entity_type: "college" | "mentor" | "course" | "job" | "event";
  entity_id: string;
  title: string | null;
  placement: string | null;
  priority: number | null;
}

interface CollegeRow {
  id: string; name: string; slug: string | null; type: string | null;
  description: string | null; logo_url: string | null; cover_image_url: string | null;
  location: string | null;
}
interface MentorRow {
  id: string; user_id: string; headline: string | null; description: string | null;
  expertise: string[] | null; profile_image_url: string | null; cover_image_url: string | null;
}
interface MentorProfileRow { user_id: string; full_name: string | null; avatar_url: string | null; bio: string | null; location: string | null; }
interface CourseRow {
  id: string; title: string; description: string | null; category: string | null;
  thumbnail_url: string | null; partner_name: string | null; redirect_url: string | null;
}
interface JobRow {
  id: string; title: string; description: string | null; location: string | null;
  job_type: string | null; company_name: string | null; company_logo_url: string | null;
}
interface EventRow {
  id: string; title: string; description: string | null; event_type: string | null;
  format: string | null; location: string | null; cover_image_url: string | null;
}

export async function GET(): Promise<Response> {
  try {
    const now = new Date().toISOString();
    const isStaging = getBackendMode() !== "legacy";

    // Fetch featured items list
    let featuredRows: FeaturedItemRow[] = [];

    if (isStaging) {
      featuredRows = await queryRows<FeaturedItemRow>(`
        SELECT id::text, entity_type, entity_id::text, title, placement, priority
        FROM public.featured_items
        WHERE is_active = true
          AND start_date <= $1::timestamptz
          AND (end_date IS NULL OR end_date >= $1::timestamptz)
          AND deleted_at IS NULL
        ORDER BY priority DESC NULLS LAST
        LIMIT 12`, [now]);

      // Also union featured flags from direct entity tables
      const [colleges, mentors, jobs, events] = await Promise.all([
        queryRows<{ id: string }>(`SELECT id::text FROM public.institutes WHERE is_featured = true AND status = 'approved' AND deleted_at IS NULL AND (featured_until IS NULL OR featured_until > $1::timestamptz) ORDER BY ranking ASC NULLS LAST LIMIT 8`, [now]),
        queryRows<{ id: string }>(`SELECT id::text FROM public.mentors WHERE is_featured = true AND approval_status = 'approved' AND is_available = true AND deleted_at IS NULL LIMIT 8`, []),
        queryRows<{ id: string }>(`SELECT id::text FROM public.jobs WHERE is_featured = true AND status = 'published' AND approval_status = 'approved' AND is_active = true AND deleted_at IS NULL AND (expires_at IS NULL OR expires_at > $1::timestamptz) LIMIT 8`, [now]),
        queryRows<{ id: string }>(`SELECT id::text FROM public.events WHERE is_featured = true AND status IN ('approved', 'published') AND approval_status = 'approved' AND is_active = true AND deleted_at IS NULL AND end_date > $1::timestamptz LIMIT 8`, [now]),
      ]);

      for (const [entityType, rows] of [
        ["college", colleges], ["mentor", mentors], ["job", jobs], ["event", events],
      ] as const) {
        for (const row of rows) {
          if (!featuredRows.some((f) => f.entity_type === entityType && f.entity_id === row.id)) {
            featuredRows.push({ id: `${entityType}:${row.id}`, entity_type: entityType, entity_id: row.id, title: null, placement: null, priority: 0 });
          }
        }
      }
    } else {
      const client = getAdminClient() as any;
      const { data, error } = await client
        .from("featured_items")
        .select("id, entity_type, entity_id, title, placement, priority")
        .eq("is_active", true)
        .lte("start_date", now)
        .or(`end_date.is.null,end_date.gte.${now}`)
        .is("deleted_at", null)
        .order("priority", { ascending: false })
        .limit(12);

      if (!error) featuredRows = data ?? [];

      // Add entity-table flags
      const [collegeFlags, mentorFlags, jobFlags, eventFlags] = await Promise.all([
        client.from("institutes").select("id").eq("status", "approved").is("deleted_at", null).eq("is_featured", true).or(`featured_until.is.null,featured_until.gt.${now}`).order("ranking", { ascending: true, nullsFirst: false }).limit(8),
        client.from("mentors").select("id").eq("is_featured", true).eq("approval_status", "approved").eq("is_available", true).is("deleted_at", null).limit(8),
        client.from("jobs").select("id").eq("is_featured", true).eq("status", "published").eq("approval_status", "approved").eq("is_active", true).is("deleted_at", null).or(`expires_at.is.null,expires_at.gt.${now}`).limit(8),
        client.from("events").select("id").eq("is_featured", true).in("status", ["approved", "published"]).eq("approval_status", "approved").eq("is_active", true).is("deleted_at", null).gt("end_date", now).limit(8),
      ]);

      for (const [entityType, result] of [
        ["college", collegeFlags], ["mentor", mentorFlags], ["job", jobFlags], ["event", eventFlags],
      ] as const) {
        if (result.error) continue;
        for (const row of result.data || []) {
          if (!featuredRows.some((f: FeaturedItemRow) => f.entity_type === entityType && f.entity_id === row.id)) {
            featuredRows.push({ id: `${entityType}:${row.id}`, entity_type: entityType, entity_id: row.id, title: null, placement: null, priority: 0 });
          }
        }
      }
    }

    if (featuredRows.length === 0) {
      return NextResponse.json({ data: [] }, {
        headers: { "Cache-Control": "public, max-age=30, stale-while-revalidate=120" },
      });
    }

    const idsFor = (entityType: string) => featuredRows.filter((f) => f.entity_type === entityType).map((f) => f.entity_id);
    const collegeIds = idsFor("college");
    const mentorIds = idsFor("mentor");
    const courseIds = idsFor("course");
    const jobIds = idsFor("job");
    const eventIds = idsFor("event");

    // Hydrate entity data
    let colleges: CollegeRow[] = [];
    let mentors: MentorRow[] = [];
    let mentorProfiles: MentorProfileRow[] = [];
    let courses: CourseRow[] = [];
    let jobs: JobRow[] = [];
    let events: EventRow[] = [];

    if (isStaging) {
      [colleges, mentors, courses, jobs, events] = await Promise.all([
        collegeIds.length ? queryRows<CollegeRow>(`SELECT id::text, name, slug, type, description, logo_url, cover_image_url, location FROM public.institutes WHERE id = ANY($1::uuid[]) AND status = 'approved' AND deleted_at IS NULL`, [collegeIds]) : Promise.resolve([]),
        mentorIds.length ? queryRows<MentorRow>(`SELECT m.id::text, m.user_id::text, m.headline, m.description, m.expertise, m.profile_image_url, m.cover_image_url FROM public.mentors m WHERE m.id = ANY($1::uuid[]) AND m.approval_status = 'approved' AND m.is_available = true AND m.deleted_at IS NULL`, [mentorIds]) : Promise.resolve([]),
        courseIds.length ? queryRows<CourseRow>(`SELECT id::text, title, description, category, thumbnail_url, partner_name, redirect_url FROM public.courses WHERE id = ANY($1::uuid[]) AND is_partnered = true AND is_published = true AND status = 'published' AND deleted_at IS NULL`, [courseIds]) : Promise.resolve([]),
        jobIds.length ? queryRows<JobRow>(`SELECT j.id::text, j.title, j.description, j.location, j.job_type, c.name AS company_name, c.logo_url AS company_logo_url FROM public.jobs j LEFT JOIN public.companies c ON c.id = j.company_id WHERE j.id = ANY($1::uuid[]) AND j.status = 'published' AND j.approval_status = 'approved' AND j.is_active = true AND j.deleted_at IS NULL AND (j.expires_at IS NULL OR j.expires_at > NOW())`, [jobIds]) : Promise.resolve([]),
        eventIds.length ? queryRows<EventRow>(`SELECT id::text, title, description, event_type, format, location, cover_image_url FROM public.events WHERE id = ANY($1::uuid[]) AND status IN ('approved', 'published') AND approval_status = 'approved' AND is_active = true AND deleted_at IS NULL AND end_date > NOW()`, [eventIds]) : Promise.resolve([]),
      ]);

      if (mentors.length > 0) {
        const userIds = mentors.map((m) => m.user_id);
        mentorProfiles = await queryRows<MentorProfileRow>(`SELECT user_id::text, full_name, avatar_url, bio, location FROM public.profiles WHERE user_id = ANY($1::uuid[]) AND deleted_at IS NULL`, [userIds]);
      }
    } else {
      const client = getAdminClient() as any;
      const emptyResult = { data: [], error: null };
      const [cR, mR, courseR, jR, eR] = await Promise.all([
        collegeIds.length ? client.from("institute_directory").select("id,name,slug,type,description,logo_url,cover_image_url,location").in("id", collegeIds) : emptyResult,
        mentorIds.length ? client.from("mentors").select("id,user_id,headline,description,expertise,profile_image_url,cover_image_url").in("id", mentorIds).eq("approval_status", "approved").eq("is_available", true).is("deleted_at", null) : emptyResult,
        courseIds.length ? client.from("courses").select("id,title,description,category,thumbnail_url,partner_name,redirect_url").in("id", courseIds).eq("is_partnered", true).eq("is_published", true).eq("status", "published").is("deleted_at", null) : emptyResult,
        jobIds.length ? client.from("jobs").select("id,title,description,location,job_type,companies(name,logo_url)").in("id", jobIds).eq("status", "published").eq("approval_status", "approved").eq("is_active", true).is("deleted_at", null).or(`expires_at.is.null,expires_at.gt.${now}`) : emptyResult,
        eventIds.length ? client.from("events").select("id,title,description,event_type,format,location,cover_image_url").in("id", eventIds).in("status", ["approved", "published"]).eq("approval_status", "approved").eq("is_active", true).is("deleted_at", null).gt("end_date", now) : emptyResult,
      ]);

      colleges = cR.data ?? [];
      mentors = mR.data ?? [];
      courses = courseR.data ?? [];
      events = eR.data ?? [];

      // Normalize Supabase joined company data
      jobs = (jR.data ?? []).map((j: any) => {
        const company = Array.isArray(j.companies) ? j.companies[0] : j.companies;
        return { ...j, company_name: company?.name ?? null, company_logo_url: company?.logo_url ?? null };
      });

      if (mentors.length > 0) {
        const userIds = mentors.map((m: MentorRow) => m.user_id);
        const { data: profiles } = await client.from("public_profile_directory").select("user_id,full_name,avatar_url,bio,location").in("user_id", userIds);
        mentorProfiles = profiles ?? [];
      }
    }

    const mentorProfileMap = new Map(mentorProfiles.map((p) => [p.user_id, p]));
    const collegeMap = new Map(colleges.map((c) => [`college:${c.id}`, c]));
    const mentorMap = new Map(mentors.map((m) => [`mentor:${m.id}`, m]));
    const courseMap = new Map(courses.map((c) => [`course:${c.id}`, c]));
    const jobMap = new Map(jobs.map((j) => [`job:${j.id}`, j]));
    const eventMap = new Map(events.map((e) => [`event:${e.id}`, e]));

    const hydratedItems = featuredRows.flatMap((item) => {
      const key = `${item.entity_type}:${item.entity_id}`;
      let entityData: { title: string; description: string | null; image: string | null; path: string; brand: string; label: string; actionLabel: string; externalHref?: string } | null = null;

      if (item.entity_type === "college") {
        const c = collegeMap.get(key);
        if (!c) return [];
        entityData = { title: c.name, description: c.description || c.location, image: c.cover_image_url || c.logo_url, path: `/institutes/${c.slug || c.id}`, brand: c.type || c.location || "College", label: "College", actionLabel: "Explore College" };
      } else if (item.entity_type === "mentor") {
        const m = mentorMap.get(key);
        if (!m) return [];
        const profile = mentorProfileMap.get(m.user_id);
        entityData = { title: profile?.full_name || m.headline || "Mentor", description: m.description || profile?.bio || (Array.isArray(m.expertise) ? m.expertise.join(", ") : null), image: m.cover_image_url || m.profile_image_url || profile?.avatar_url || null, path: `/mentorship/${m.id}`, brand: m.headline || profile?.location || "Mentor", label: "Mentor", actionLabel: "Book Mentor" };
      } else if (item.entity_type === "course") {
        const c = courseMap.get(key);
        if (!c || !c.redirect_url) return [];
        entityData = { title: c.title, description: c.description || c.category, image: c.thumbnail_url, path: `/courses/${c.id}`, externalHref: c.redirect_url, brand: c.partner_name || c.category || "Course", label: "Course", actionLabel: "View Course" };
      } else if (item.entity_type === "job") {
        const j = jobMap.get(key);
        if (!j) return [];
        entityData = { title: j.title, description: j.description || j.location, image: j.company_logo_url, path: `/jobs/${j.id}`, brand: j.company_name || j.location || "Job", label: j.job_type ? j.job_type.replace(/_/g, " ") : "Job", actionLabel: "Apply Now" };
      } else if (item.entity_type === "event") {
        const e = eventMap.get(key);
        if (!e) return [];
        entityData = { title: e.title, description: e.description || e.location, image: e.cover_image_url, path: `/events/${e.id}`, brand: e.location || e.format || "Event", label: e.event_type === "paid" ? "Paid event" : "Event", actionLabel: "Register Now" };
      }

      if (!entityData) return [];
      return [{ id: String(item.id), entityType: item.entity_type, entityId: item.entity_id, title: item.title?.trim() || entityData.title, ...entityData }];
    });

    return NextResponse.json({ data: hydratedItems.slice(0, 12) }, {
      headers: { "Cache-Control": "public, max-age=60, stale-while-revalidate=300" },
    });
  } catch (err) {
    console.error("[featured] Unexpected error:", err);
    if (getBackendMode() !== "legacy") {
      return NextResponse.json({ error: "FEATURED_UNAVAILABLE" }, { status: 503,
        headers: { "Cache-Control": "no-store" } });
    }
    return NextResponse.json({ data: [] });
  }
}
