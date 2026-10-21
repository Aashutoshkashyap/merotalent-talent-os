/**
 * Public active advertisements endpoint.
 * Returns date-valid, is_active ads ordered by priority.
 * No authentication required. Safe for public CDN caching.
 */
import { NextResponse } from "next/server";
import { getBackendMode } from "@/lib/server/backend-mode";
import { getAdminClient } from "@/lib/server/supabase";
import { queryRows } from "@/lib/server/db";
import { publicObjectUrl } from "@/lib/server/application-storage";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface AdvertisementRow {
  id: string;
  title: string;
  image_url: string;
  destination_url: string | null;
  sponsor_name: string | null;
}

export async function GET(request?: Request): Promise<Response> {
  try {
    const now = new Date().toISOString();
    const placement = request ? new URL(request.url).searchParams.get("placement") || "homepage" : "homepage";
    if (!/^[a-z][a-z0-9_-]{0,79}$/.test(placement)) {
      return NextResponse.json({ data: [], error: "Invalid placement." }, { status: 400 });
    }

    let ads: AdvertisementRow[] = [];

    if (getBackendMode() !== "legacy") {
      ads = await queryRows<AdvertisementRow>(`
        SELECT id, title, image_url, destination_url, sponsor_name
        FROM public.advertisements
        WHERE is_active = true
          AND status IN ('active','scheduled')
          AND placement = $2
          AND start_date <= $1::timestamptz
          AND end_date >= $1::timestamptz
          AND deleted_at IS NULL
        ORDER BY priority DESC NULLS LAST
        LIMIT 4`, [now, placement]);
      const resolved = await Promise.all(ads.map(async ad => {
        if (/^https?:\/\//.test(ad.image_url)) return ad;
        try { return { ...ad, image_url: await publicObjectUrl("advertisement", ad.image_url) }; }
        catch { return null; }
      }));
      ads = resolved.filter((ad): ad is AdvertisementRow => !!ad);
    } else {
      const { data, error } = await (getAdminClient() as any)
        .from("advertisements")
        .select("id, title, image_url, destination_url, sponsor_name")
        .eq("is_active", true)
        .lte("start_date", now)
        .gte("end_date", now)
        .order("priority", { ascending: false })
        .limit(4);

      if (error) {
        console.error("[advertisements] Legacy fetch error:", error.message);
        return NextResponse.json({ data: [] });
      }
      ads = (data ?? []).filter((ad: AdvertisementRow) => Boolean(ad.image_url));
    }

    return NextResponse.json({ data: ads }, {
      headers: {
        "Cache-Control": "public, max-age=60, stale-while-revalidate=300",
      },
    });
  } catch (err) {
    console.error("[advertisements] Unexpected error:", err);
    return NextResponse.json({ data: [] });
  }
}
