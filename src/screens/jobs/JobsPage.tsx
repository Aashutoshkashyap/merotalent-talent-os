"use client";

import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import PublicPageLayout from "@/components/landing/PublicPageLayout";
import { Briefcase, MapPin, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface JobItem {
  id: string;
  title: string;
  category: string;
  salary: string;
  description: string;
  company: string;
  location: string;
  avatarText: string;
  logoBg: string;
}

/* ── colour rotation for company logos ── */
const LOGO_COLORS = [
  "bg-emerald-600 text-white",
  "bg-amber-500 text-slate-900",
  "bg-cyan-600 text-white",
  "bg-slate-900 text-blue-400",
  "bg-violet-600 text-white",
  "bg-rose-600 text-white",
];

/* ── map a DB/seed row to the UI model ── */
function toDisplayItem(row: Record<string, unknown>, idx: number): JobItem {
  const title = String(row.title ?? "");
  const companyName =
    (row.companies as Record<string, unknown>)?.name ??
    row.company_name ??
    "";
  const avatarText = String(companyName)
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase() || title.substring(0, 2).toUpperCase();

  const salaryMin = Number(row.salary_min ?? 0);
  const salaryMax = Number(row.salary_max ?? 0);
  let salary = "";
  if (salaryMin && salaryMax) {
    salary = `NPR ${(salaryMin / 1000).toFixed(0)}K – ${(salaryMax / 1000).toFixed(0)}K / Month`;
  } else if (salaryMax) {
    salary = `Up to NPR ${(salaryMax / 1000).toFixed(0)}K / Month`;
  }

  return {
    id: String(row.id),
    title,
    category: String(
      row.job_type ?? row.experience_level ?? "General"
    )
      .replace(/_/g, " ")
      .replace(/\b\w/g, (l) => l.toUpperCase()),
    salary,
    description: String(row.description ?? ""),
    company: String(companyName),
    location: String(row.location ?? "Nepal"),
    avatarText,
    logoBg: LOGO_COLORS[idx % LOGO_COLORS.length],
  };
}

export default function JobsPage() {
  const [jobs, setJobs] = useState<JobItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState("All Jobs");

  useEffect(() => {
    fetchJobs();
  }, []);

  const fetchJobs = async () => {
    try {
      const now = new Date().toISOString();
      const { data, error } = await (supabase as any)
        .from("jobs")
        .select("*, companies(name)")
        .eq("status", "published")
        .eq("approval_status", "approved")
        .eq("is_active", true)
        .is("deleted_at", null)
        .or(`expires_at.is.null,expires_at.gt.${now}`)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setJobs((data || []).map(toDisplayItem));
      setLoadError(null);
    } catch (error) {
      setJobs([]);
      setLoadError(error instanceof Error ? error.message : "Jobs could not be loaded.");
    } finally {
      setIsLoading(false);
    }
  };

  /* ── derive categories from loaded data ── */
  const categoryMap = new Map<string, number>();
  jobs.forEach((j) => {
    categoryMap.set(j.category, (categoryMap.get(j.category) ?? 0) + 1);
  });
  const categories = [
    { label: "All Jobs", count: String(jobs.length) },
    ...Array.from(categoryMap.entries()).map(([label, count]) => ({
      label,
      count: String(count),
    })),
  ];

  const filtered =
    selectedCategory === "All Jobs"
      ? jobs
      : jobs.filter((j) =>
          j.category.toLowerCase().includes(selectedCategory.substring(0, 4).toLowerCase())
        );

  return (
    <PublicPageLayout activeNavId="jobs">
      <div className="max-w-6xl mx-auto w-full px-6 sm:px-8 py-12 flex flex-col gap-10">
        {/* Page title */}
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            Job Board & Careers
          </h1>
          <p className="text-sm text-slate-500 font-medium max-w-lg leading-relaxed">
            Open engineering and technical vacancies at top companies in Nepal.
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
                <Briefcase className={`w-3.5 h-3.5 ${selectedCategory === c.label ? "text-white" : "text-slate-400"}`} />
                <span className="whitespace-nowrap">{c.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Listing header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <span className="text-base font-black text-slate-800">
            {isLoading ? "Loading…" : `Open Positions (${filtered.length})`}
          </span>
          <select className="text-xs font-bold text-slate-500 bg-white border border-slate-200 rounded-lg px-2 py-1 outline-none">
            <option>Newest</option>
            <option>Salary Range</option>
          </select>
        </div>

        {/* Cards grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filtered.map((item) => (
            <div
              key={item.id}
              className="group flex flex-col rounded-2xl bg-white border border-slate-200/80 shadow-sm hover:shadow-md transition-all overflow-hidden"
            >
              {/* Logo header */}
              <div className="relative h-36 bg-slate-50 border-b border-slate-100 flex items-center justify-center">
                <div className={`w-14 h-14 rounded-xl flex items-center justify-center font-black text-sm shadow-sm ${item.logoBg}`}>
                  {item.avatarText}
                </div>
                <span className="absolute top-3 left-3 text-[9px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-slate-200/60 text-slate-700 border border-slate-200/40 truncate max-w-[140px]">
                  {item.category}
                </span>
              </div>

              {/* Content */}
              <div className="p-5 flex flex-col gap-2 flex-1 min-w-0">
                <div className="flex items-center gap-1 text-[11px] text-[#0073e6] font-bold">
                  <MapPin className="w-3 h-3 flex-shrink-0" />
                  <span className="truncate">{item.location}</span>
                </div>
                <h3 className="text-sm font-extrabold text-slate-900 group-hover:text-[#0073e6] transition-colors leading-snug truncate">
                  {item.title}
                </h3>
                <p className="text-xs text-slate-500 font-medium leading-relaxed line-clamp-2">
                  {item.description}
                </p>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-[9px] font-black text-slate-600 border border-slate-200 flex-shrink-0">
                    {item.avatarText}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-[11px] font-bold text-slate-700 truncate">{item.company}</span>
                    <span className="text-[10px] text-slate-400 font-semibold truncate">{item.salary}</span>
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
            <Briefcase className="mx-auto mb-3 h-9 w-9 text-slate-400" />
            <p className="font-bold text-slate-700">No published jobs found</p>
            <p className="mt-1 text-xs text-slate-500">
              {loadError || "Approved jobs created in Admin will appear here automatically."}
            </p>
          </div>
        )}
      </div>
    </PublicPageLayout>
  );
}
