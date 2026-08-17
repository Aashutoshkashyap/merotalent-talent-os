"use client";

import { useEffect, useState } from "react";
import { ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Advertisement {
  id: string;
  title: string;
  image_url: string;
  destination_url: string | null;
  sponsor_name: string | null;
}

const safeExternalUrl = (value: string | null) => {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null;
  } catch {
    return null;
  }
};

export default function ActiveAdvertisements() {
  const [ads, setAds] = useState<Advertisement[]>([]);

  useEffect(() => {
    const loadAds = async () => {
      const now = new Date().toISOString();
      const { data, error } = await (supabase as any)
        .from("advertisements")
        .select("id, title, image_url, destination_url, sponsor_name")
        .eq("is_active", true)
        .lte("start_date", now)
        .gte("end_date", now)
        .order("priority", { ascending: false })
        .limit(4);
      if (!error) setAds((data || []).filter((item: Advertisement) => Boolean(item.image_url)));
    };
    void loadAds();
  }, []);

  if (ads.length === 0) return null;

  return (
    <section className="mx-auto grid w-full max-w-7xl gap-4 px-4 py-6 sm:px-8 md:grid-cols-2" aria-label="Sponsored listings">
      {ads.map((ad) => {
        const destinationUrl = safeExternalUrl(ad.destination_url);
        const content = (
          <div className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="aspect-[16/5] overflow-hidden bg-slate-100">
              <img src={ad.image_url} alt={ad.title} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]" />
            </div>
            <div className="flex items-center justify-between gap-4 px-4 py-3">
              <div className="min-w-0"><p className="truncate text-sm font-bold text-slate-800">{ad.title}</p><p className="text-xs text-slate-500">Sponsored{ad.sponsor_name ? ` by ${ad.sponsor_name}` : ""}</p></div>
              {destinationUrl ? <ExternalLink className="h-4 w-4 shrink-0 text-blue-600" /> : null}
            </div>
          </div>
        );
        return destinationUrl ? <a key={ad.id} href={destinationUrl} target="_blank" rel="noopener noreferrer sponsored">{content}</a> : <div key={ad.id}>{content}</div>;
      })}
    </section>
  );
}
