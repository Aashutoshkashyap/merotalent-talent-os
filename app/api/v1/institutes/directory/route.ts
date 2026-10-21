import { NextResponse } from "next/server";
import { getBackendMode } from "@/lib/server/backend-mode";
import { queryRows } from "@/lib/server/db";
import { cleanInstituteFilterText, tokenizeInstituteSearch } from "@/lib/institutes/directory-search";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// This is the public directory contract, not a SELECT * over institutes.
// In particular, internal ownership and ingestion provenance never leave it.
const columns = [
  "id", "name", "short_name", "slug", "type", "institution_category", "affiliation", "level",
  "description", "logo_url", "cover_image_url", "gallery_urls", "youtube_url", "website",
  "chairperson_name", "chairperson_designation", "chairperson_message", "chairperson_image_url",
  "principal_name", "principal_designation", "principal_message", "principal_image_url",
  "location", "map_location", "contact_email", "contact_phone", "contact_info", "courses_offered",
  "salient_features", "scholarships", "admission_guidelines", "established_year", "total_seats",
  "available_seats", "admission_status", "admission_deadline", "applications_enabled", "payment_verified",
  "program_names", "search_tags", "search_document", "is_featured", "ranking", "status", "created_at", "updated_at",
] as const;
const select = columns.join(",");
const qualifiedSelect = columns.map((column) => `d.${column}`).join(",");
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const categories = {
  college: ["college", "colleges", "university", "universities", "campus"],
  school: ["school", "schools"],
  "plus-two": ["plus_two", "+2", "plus two", "plus-two", "higher secondary"],
} as const;
type Category = keyof typeof categories | "all";
type Sort = "recommended" | "name" | "newest";

const sortSql: Record<Sort, string> = {
  recommended: "is_featured DESC NULLS LAST, created_at DESC, name ASC",
  name: "name ASC",
  newest: "created_at DESC",
};
const aggregateSortSql: Record<Sort, string> = {
  recommended: "c.is_featured DESC NULLS LAST, c.created_at DESC, c.name ASC",
  name: "c.name ASC",
  newest: "c.created_at DESC",
};

function response(data: unknown, status = 200): Response {
  return NextResponse.json(data, {
    status,
    headers: { "Cache-Control": status === 200 ? "public, max-age=60, stale-while-revalidate=300" : "no-store" },
  });
}

export async function GET(request: Request): Promise<Response> {
  const params = new URL(request.url).searchParams;
  const identifier = params.get("identifier");
  if (identifier !== null && (!identifier || identifier.length > 200 || identifier.includes("..") ||
      /[\u0000-\u001f/\\?#]/u.test(identifier))) {
    return response({ error: "Invalid college identifier." }, 400);
  }

  const category = params.get("category") || "all";
  const sort = params.get("sort") || "recommended";
  const rawLimit = params.get("limit") || "20";
  if (!/^(?:[1-9]\d{0,2})$/.test(rawLimit) || Number(rawLimit) > 100 ||
      !["all", ...Object.keys(categories)].includes(category) || !Object.hasOwn(sortSql, sort)) {
    return response({ error: "Invalid directory filters." }, 400);
  }
  const limit = Number(rawLimit);
  const categoryValue = category as Category;
  const sortValue = sort as Sort;
  const tokens = tokenizeInstituteSearch(params.get("search") || "");
  const name = cleanInstituteFilterText(params.get("name") || "");
  const location = cleanInstituteFilterText(params.get("location") || "");
  const affiliation = cleanInstituteFilterText(params.get("affiliation") || "");
  const admission = params.get("admissionStatus") || "";
  if (admission.length > 40 || (identifier && [...params.keys()].some((key) => key !== "identifier"))) {
    return response({ error: "Invalid directory filters." }, 400);
  }

  try {
    if (getBackendMode() !== "legacy") {
      if (identifier) {
        const isId = uuid.test(identifier);
        const rows = await queryRows<Record<string, unknown>>(`
          SELECT ${qualifiedSelect} FROM public.institute_directory d
          WHERE ${isId ? "d.id = $1::uuid" : "d.slug = $1"} LIMIT 1`, [identifier]);
        return response({ data: rows[0] ?? null });
      }
      const categoryFilter = categoryValue === "all" ? null : [...categories[categoryValue]];
      const patterns = tokens.map((token) => `%${token.toLowerCase()}%`);
      const rows = await queryRows<{ data: Record<string, unknown>[]; positions: Record<string, unknown>[]; count: number }>(`
        WITH filtered AS (
          SELECT ${qualifiedSelect} FROM public.institute_directory d
          WHERE lower(d.search_document) LIKE ALL($1::text[])
            AND ($2::text[] IS NULL OR d.institution_category = ANY($2::text[]))
            AND ($3::text IS NULL OR d.location ILIKE $3)
            AND ($4::text IS NULL OR d.affiliation ILIKE $4)
            AND ($5::text IS NULL OR d.admission_status = $5)
            AND ($6::text IS NULL OR d.name ILIKE $6)
        ), positions AS (
          SELECT * FROM filtered WHERE admission_status = 'open' AND ranking IS NOT NULL
          ORDER BY ranking ASC, name ASC LIMIT 1000
        ), candidates AS (
          SELECT * FROM filtered ORDER BY ${sortSql[sortValue]}
          LIMIT ($7::int + ${sortValue === "recommended" ? "(SELECT count(*)::int FROM positions)" : "0"})
        )
        SELECT (SELECT count(*)::int FROM filtered) AS count,
          COALESCE((SELECT jsonb_agg(to_jsonb(c) ORDER BY ${aggregateSortSql[sortValue]}) FROM candidates c), '[]'::jsonb) AS data,
          COALESCE((SELECT jsonb_agg(to_jsonb(p) ORDER BY p.ranking ASC, p.name ASC) FROM positions p), '[]'::jsonb) AS positions`,
        [patterns, categoryFilter, location ? `%${location}%` : null,
          affiliation ? `%${affiliation}%` : null, admission || null,
          name ? `%${name}%` : null, limit]);
      return response({ data: rows[0]?.data ?? [], positions: sortValue === "recommended" ? rows[0]?.positions ?? [] : [], count: rows[0]?.count ?? 0 });
    }

    // Production compatibility remains on the existing public view until cutover.
    const { getAdminClient } = await import("@/lib/server/supabase");
    const client = getAdminClient();
    if (identifier) {
      const { data, error } = await client.from("institute_directory").select(select)
        .eq(uuid.test(identifier) ? "id" : "slug", identifier).maybeSingle();
      if (error) throw error;
      return response({ data: data ?? null });
    }
    const build = () => {
      let query = client.from("institute_directory").select(select, { count: "exact" });
      for (const token of tokens) query = query.ilike("search_document", `%${token}%`);
      if (categoryValue !== "all") query = query.in("institution_category", [...categories[categoryValue]]);
      if (location) query = query.ilike("location", `%${location}%`);
      if (affiliation) query = query.ilike("affiliation", `%${affiliation}%`);
      if (admission) query = query.eq("admission_status", admission);
      if (name) query = query.ilike("name", `%${name}%`);
      return query;
    };
    let listing = build();
    listing = sortValue === "name" ? listing.order("name", { ascending: true })
      : sortValue === "newest" ? listing.order("created_at", { ascending: false })
      : listing.order("is_featured", { ascending: false })
        .order("created_at", { ascending: false }).order("name", { ascending: true });
    let positions: Record<string, unknown>[] = [];
    if (sortValue === "recommended") {
      const positionResult = await build().eq("admission_status", "open").not("ranking", "is", null)
        .order("ranking", { ascending: true }).order("name", { ascending: true }).limit(1000);
      if (positionResult.error) throw positionResult.error;
      positions = (positionResult.data ?? []) as unknown as Record<string, unknown>[];
    }
    const { data, count, error } = await listing.range(0, sortValue === "recommended" ? limit + positions.length - 1 : limit - 1);
    if (error) throw error;
    return response({ data: data ?? [], positions, count: count ?? 0 });
  } catch (error) {
    console.error("[public directory] unavailable", error instanceof Error ? error.name : "unknown");
    return response({ error: "College directory is unavailable." }, 503);
  }
}
