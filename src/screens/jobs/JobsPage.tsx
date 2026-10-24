"use client";
import { isNeonClientRuntime } from "@/lib/backend-selection";


import React, { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import PublicPageLayout from "@/components/landing/PublicPageLayout";
import { Briefcase, MapPin, ArrowRight } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import JobApplicationWizard from "@/components/jobs/JobApplicationWizard";
import DirectoryLoadError from "@/components/landing/DirectoryLoadError";

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
  requirements: string[];
  skills: string[];
  isRemote: boolean;
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
    requirements: Array.isArray(row.requirements) ? row.requirements.map(String) : [],
    skills: Array.isArray(row.skills) ? row.skills.map(String) : Array.isArray(row.skills_required) ? (row.skills_required as string[]).map(String) : [],
    isRemote: row.is_remote === true,
  };
}

export default function JobsPage() {
  const { user, session } = useAuth();
  const navigate = useNavigate();
  const [jobs, setJobs] = useState<JobItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState("All Jobs");
  const [searchParams, setSearchParams] = useSearchParams();
  const searchQuery = searchParams.get("q") || "";
  const setSearchQuery = (query: string) => setSearchParams((current) => {
    const next = new URLSearchParams(current);
    if (query) next.set("q", query); else next.delete("q");
    return next;
  }, { replace: true });
  const [sortBy, setSortBy] = useState("newest");
  const [workMode, setWorkMode] = useState("all");
  const [selectedJob, setSelectedJob] = useState<JobItem | null>(null);

  useEffect(() => {
    fetchJobs();
  }, []);

  const fetchJobs = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/v1/jobs");
      if (!res.ok) throw new Error("Failed to load jobs.");
      const json = await res.json();
      const raw = Array.isArray(json?.data) ? json.data : [];
      setJobs(raw.map(toDisplayItem));
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

  const filtered = (selectedCategory === "All Jobs"
      ? jobs
      : jobs.filter((j) =>
          j.category.toLowerCase().includes(selectedCategory.substring(0, 4).toLowerCase())
        ))
    .filter((job) => [job.title, job.company, job.location, job.description, ...job.skills].join(" ").toLowerCase().includes(searchQuery.toLowerCase()))
    .filter((job) => workMode === "all" || (workMode === "remote" ? job.isRemote : !job.isRemote))
    .sort((a, b) => sortBy === "salary" ? b.salary.localeCompare(a.salary, undefined, { numeric: true }) : 0);

  const openApplication = (job: JobItem) => {
    if (!session && !(isNeonClientRuntime() && user)) {
      navigate("/login", { state: { from: { pathname: "/jobs" } } });
      return;
    }
    setSelectedJob(job);
  };

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
          <select value={sortBy} onChange={(event) => setSortBy(event.target.value)} className="text-xs font-bold text-slate-500 bg-white border border-slate-200 rounded-lg px-2 py-1 outline-none">
            <option value="newest">Newest</option>
            <option value="salary">Salary range</option>
          </select>
        </div>
        <label className="sr-only" htmlFor="job-search">Search jobs</label>
        <div className="flex flex-col gap-3 sm:flex-row"><input id="job-search" value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Search roles, employers, skills, or location" className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-[#0073e6] focus:ring-2 focus:ring-blue-100" /><select aria-label="Filter jobs by work mode" value={workMode} onChange={(event) => setWorkMode(event.target.value)} className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-600 outline-none"><option value="all">All work modes</option><option value="remote">Remote</option><option value="onsite">On-site</option></select></div>

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
                <h3 className="text-sm font-extrabold text-slate-900 group-hover:text-[#0073e6] transition-colors leading-snug truncate"><Link to={`/jobs/${item.id}`}>{item.title}</Link></h3>
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
                <button
                  type="button"
                  aria-label={`Apply for ${item.title}`}
                  onClick={() => openApplication(item)}
                  className="w-7 h-7 rounded-full bg-slate-50 hover:bg-blue-50 flex items-center justify-center text-slate-400 hover:text-[#0073e6] border border-slate-100 transition-colors flex-shrink-0"
                >
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {!isLoading && loadError && <DirectoryLoadError message={loadError} onRetry={() => void fetchJobs()} />}
        {!isLoading && !loadError && filtered.length === 0 && (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-6 py-14 text-center">
            <Briefcase className="mx-auto mb-3 h-9 w-9 text-slate-400" />
            <p className="font-bold text-slate-700">No published jobs found</p>
            <p className="mt-1 text-xs text-slate-500">
              {loadError || "Approved jobs created in Admin will appear here automatically."}
            </p>
          </div>
        )}
        {selectedJob && (
          <JobApplicationWizard
            isOpen
            onClose={() => setSelectedJob(null)}
            job={selectedJob}
          />
        )}
      </div>
    </PublicPageLayout>
  );
}
