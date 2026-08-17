"use client";

import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import PublicPageLayout from "@/components/landing/PublicPageLayout";
import { Trophy, Clock, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface CompetitionItem {
  id: string;
  title: string;
  category: string;
  timeRead: string;
  description: string;
  organizer: string;
  date: string;
  avatarText: string;
  bgGradient: string;
  imageIcon: string;
}

/* ── visual config per competition type ── */
const TYPE_CONFIG: Record<string, { icon: string; gradient: string }> = {
  robotics:  { icon: "🤖", gradient: "from-purple-950 via-slate-900 to-indigo-900" },
  hackathon: { icon: "💻", gradient: "from-emerald-800 via-teal-900 to-cyan-950" },
  game_jam:  { icon: "🎮", gradient: "from-red-800 via-rose-900 to-orange-950" },
  olympiad:  { icon: "💡", gradient: "from-indigo-900 via-purple-900 to-pink-900" },
  default:   { icon: "🏆", gradient: "from-slate-800 via-gray-900 to-slate-900" },
};

/* ── map a database row to the UI model ── */
function toDisplayItem(row: Record<string, unknown>): CompetitionItem {
  const t = String(row.type ?? "default").toLowerCase();
  const cfg = TYPE_CONFIG[t] ?? TYPE_CONFIG.default;
  const title = String(row.title ?? "");
  const avatarText = title
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
  const startDate = row.start_date ? new Date(String(row.start_date)) : null;
  const dateStr = startDate
    ? startDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    : "";

  return {
    id: String(row.id),
    title,
    category: t.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()),
    timeRead: String(row.prize_pool ?? ""),
    description: String(row.description ?? ""),
    organizer: String(row.organizer_type ?? "MeroTalent partner").replace(/_/g, " "),
    date: dateStr,
    avatarText,
    bgGradient: cfg.gradient,
    imageIcon: cfg.icon,
  };
}

export default function CompetitionsPage() {
  const [competitions, setCompetitions] = useState<CompetitionItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState("All Events");

  useEffect(() => {
    fetchCompetitions();
  }, []);

  const fetchCompetitions = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from("competitions")
        .select("*")
        .in("status", ["upcoming", "ongoing"])
        .order("start_date", { ascending: true });

      if (error) throw error;
      setCompetitions((data || []).map(toDisplayItem));
      setLoadError(null);
    } catch (error) {
      setCompetitions([]);
      setLoadError(error instanceof Error ? error.message : "Competitions could not be loaded.");
    } finally {
      setIsLoading(false);
    }
  };

  /* ── derive categories from loaded data ── */
  const categoryMap = new Map<string, number>();
  competitions.forEach((c) => {
    categoryMap.set(c.category, (categoryMap.get(c.category) ?? 0) + 1);
  });
  const categories = [
    { label: "All Events", count: String(competitions.length) },
    ...Array.from(categoryMap.entries()).map(([label, count]) => ({
      label,
      count: String(count),
    })),
  ];

  const filtered =
    selectedCategory === "All Events"
      ? competitions
      : competitions.filter((c) =>
          c.category.toLowerCase().includes(selectedCategory.substring(0, 4).toLowerCase())
        );

  return (
    <PublicPageLayout activeNavId="events">
      <div className="max-w-6xl mx-auto w-full px-6 sm:px-8 py-12 flex flex-col gap-10">
        {/* Page title */}
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            Events & Competitions
          </h1>
          <p className="text-sm text-slate-500 font-medium max-w-lg leading-relaxed">
            Latest academic events, coding hackathons, and design contests in Nepal.
          </p>
        </div>

        {/* Categories */}
        <div className="flex flex-col gap-3">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Top categories</span>
          <div className="flex flex-wrap gap-2.5">
            {categories.map((c) => (
              <button
                key={c.label}
                onClick={() => setSelectedCategory(c.label)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full border text-xs font-extrabold transition-all ${
                  selectedCategory === c.label
                    ? "bg-[#0073e6] border-[#0073e6] text-white"
                    : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"
                }`}
              >
                <Trophy className={`w-3.5 h-3.5 ${selectedCategory === c.label ? "text-white" : "text-slate-400"}`} />
                <span className="whitespace-nowrap">{c.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Listing header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <span className="text-base font-black text-slate-800">
            {isLoading ? "Loading…" : `Latest Challenges (${filtered.length})`}
          </span>
          <select className="text-xs font-bold text-slate-500 bg-white border border-slate-200 rounded-lg px-2 py-1 outline-none">
            <option>Newest</option>
            <option>Deadline</option>
          </select>
        </div>

        {/* Cards grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filtered.map((item) => (
            <div
              key={item.id}
              className="group flex flex-col rounded-2xl bg-white border border-slate-200/80 shadow-sm hover:shadow-md transition-all overflow-hidden"
            >
              {/* Image header */}
              <div className={`relative h-40 bg-gradient-to-br ${item.bgGradient} flex items-center justify-center overflow-hidden`}>
                <span className="text-4xl select-none group-hover:scale-110 transition-transform duration-300">{item.imageIcon}</span>
                <span className="absolute top-3 left-3 text-[9px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-white/25 backdrop-blur-sm text-white">
                  {item.category}
                </span>
              </div>

              {/* Content */}
              <div className="p-5 flex flex-col gap-2 flex-1 min-w-0">
                <div className="flex items-center gap-1 text-[11px] text-[#0073e6] font-bold">
                  <Clock className="w-3 h-3 flex-shrink-0" />
                  <span className="truncate">{item.timeRead}</span>
                </div>
                <h3 className="text-sm font-extrabold text-slate-900 group-hover:text-[#0073e6] transition-colors leading-snug line-clamp-2">
                  {item.title}
                </h3>
                <p className="text-xs text-slate-500 font-medium leading-relaxed line-clamp-2">
                  {item.description}
                </p>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-7 h-7 rounded-full bg-blue-50 flex items-center justify-center text-[9px] font-black text-[#0073e6] flex-shrink-0">
                    {item.avatarText}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-[11px] font-bold text-slate-700 truncate">{item.organizer}</span>
                    <span className="text-[10px] text-slate-400 font-semibold">{item.date}</span>
                  </div>
                </div>
                <Link to="/login" className="w-7 h-7 rounded-full bg-slate-50 hover:bg-blue-50 flex items-center justify-center text-slate-400 hover:text-[#0073e6] border border-slate-100 transition-colors flex-shrink-0">
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>

        {!isLoading && filtered.length === 0 && (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-6 py-14 text-center">
            <Trophy className="mx-auto mb-3 h-9 w-9 text-slate-400" />
            <p className="font-bold text-slate-700">No published competitions found</p>
            <p className="mt-1 text-xs text-slate-500">
              {loadError || "Published competitions created in Admin will appear here automatically."}
            </p>
          </div>
        )}
      </div>
    </PublicPageLayout>
  );
}
