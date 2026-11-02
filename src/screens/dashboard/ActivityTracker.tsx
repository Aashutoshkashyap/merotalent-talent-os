import { useState, useMemo, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Activity,
  Bookmark,
  Briefcase,
  Eye,
  CheckCircle2,
  Search,
  Filter,
  GraduationCap,
  Calendar,
  Users,
  ExternalLink,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useStudentActivity } from "@/hooks/useStudentActivity";
import { getLoggedActivities } from "@/lib/activityLogger";
import { dashboardFilterGroup } from "@/components/dashboard/dashboardStyles";

type Tab = "applied" | "bookmarked" | "viewed";

import { useAuth } from "@/contexts/AuthContext";

export default function ActivityTracker() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>("applied");
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");

  const { jobApplications, collegeApplications, eventRegistrations, mentorBookings } =
    useStudentActivity();

  const [loggedLogs, setLoggedLogs] = useState<ReturnType<typeof getLoggedActivities>>(() => getLoggedActivities(user?.id));

  useEffect(() => {
    setLoggedLogs(getLoggedActivities(user?.id));
    const handleUpdate = () => {
      setLoggedLogs(getLoggedActivities(user?.id));
    };
    window.addEventListener("merotalent-activity-updated", handleUpdate);
    window.addEventListener("storage", handleUpdate);
    return () => {
      window.removeEventListener("merotalent-activity-updated", handleUpdate);
      window.removeEventListener("storage", handleUpdate);
    };
  }, [user?.id]);

  // Aggregate Applied items
  const appliedItems = useMemo(() => {
    const map = new Map<string, any>();

    collegeApplications.forEach((c) => {
      map.set(`college-${c.id}`, {
        id: `college-${c.id}`,
        title: c.instituteName,
        subtitle: c.programInterest || "College Admission Application",
        type: "College Application",
        date: c.updatedAt,
        status: c.status,
        href: "/dashboard/colleges",
        icon: GraduationCap,
        color: "bg-blue-100 text-blue-700",
      });
    });

    jobApplications.forEach((j) => {
      map.set(`job-${j.id}`, {
        id: `job-${j.id}`,
        title: j.jobTitle,
        subtitle: j.companyName,
        type: "Job Application",
        date: j.updatedAt,
        status: j.status,
        href: "/dashboard/jobs",
        icon: Briefcase,
        color: "bg-purple-100 text-purple-700",
      });
    });

    eventRegistrations.forEach((e) => {
      map.set(`event-${e.id}`, {
        id: `event-${e.id}`,
        title: e.eventTitle,
        subtitle: `${e.ticketQuantity} tickets`,
        type: "Event Registration",
        date: e.registeredAt,
        status: e.status,
        href: "/events",
        icon: Calendar,
        color: "bg-emerald-100 text-emerald-700",
      });
    });

    mentorBookings.forEach((m) => {
      map.set(`mentor-${m.id}`, {
        id: `mentor-${m.id}`,
        title: m.topic || m.serviceTitle || "Mentor Session",
        subtitle: `with ${m.mentorName}`,
        type: "Mentor Booking",
        date: m.createdAt,
        status: m.status,
        href: "/dashboard/sessions",
        icon: Users,
        color: "bg-amber-100 text-amber-700",
      });
    });

    loggedLogs
      .filter((l) => l.status === "applied" || l.status === "booked")
      .forEach((l) => {
        if (!map.has(l.id)) {
          const isCollege = l.kind === "college";
          map.set(l.id, {
            id: l.id,
            title: l.title,
            subtitle: l.detail || (isCollege ? "College Application" : "Application Submitted"),
            type: isCollege ? "College Application" : `${l.kind.toUpperCase()} Submission`,
            date: l.occurredAt,
            status: l.status,
            href: l.href || (isCollege ? "/dashboard/colleges" : "/dashboard"),
            icon: isCollege ? GraduationCap : CheckCircle2,
            color: isCollege ? "bg-blue-100 text-blue-700" : "bg-emerald-100 text-emerald-700",
          });
        }
      });

    return Array.from(map.values()).sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }, [jobApplications, collegeApplications, eventRegistrations, mentorBookings, loggedLogs]);

  // Bookmarked Items
  const bookmarkedItems = useMemo(() => {
    return loggedLogs
      .filter((l) => l.status === "bookmarked")
      .map((l) => ({
        id: l.id,
        title: l.title,
        subtitle: l.detail,
        type: `Bookmarked ${l.kind.toUpperCase()}`,
        date: l.occurredAt,
        status: "Bookmarked",
        href: l.href,
        icon: Bookmark,
        color: "bg-amber-100 text-amber-700",
      }));
  }, [loggedLogs]);

  // Viewed Items
  const viewedItems = useMemo(() => {
    return loggedLogs
      .filter((l) => l.status === "viewed")
      .map((l) => ({
        id: l.id,
        title: l.title,
        subtitle: l.detail,
        type: `Viewed ${l.kind.toUpperCase()}`,
        date: l.occurredAt,
        status: "Viewed",
        href: l.href,
        icon: Eye,
        color: "bg-slate-100 text-slate-700",
      }));
  }, [loggedLogs]);

  const currentItems = activeTab === "applied" ? appliedItems : activeTab === "bookmarked" ? bookmarkedItems : viewedItems;

  const filtered = currentItems.filter((item) => {
    const matchesSearch =
      item.title.toLowerCase().includes(search.toLowerCase()) ||
      item.subtitle.toLowerCase().includes(search.toLowerCase());
    const matchesCategory =
      categoryFilter === "all" || item.type.toLowerCase().includes(categoryFilter.toLowerCase());
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6 pb-12 font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-2xs">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-[#0073e6] uppercase tracking-wider mb-1">
            <Activity className="w-4 h-4" />
            Activity Tracker & History
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">My Platform Activity</h1>
          <p className="text-xs sm:text-sm text-slate-500 font-semibold">
            Track everything you've applied for, bookmarked, or viewed across MeroTalent.
          </p>
        </div>

        {/* Tab Selector */}
        <div role="group" aria-label="Activity history filters" className={`${dashboardFilterGroup} gap-1 bg-slate-100 p-1.5 rounded-2xl`}>
          <button
            aria-pressed={activeTab === "applied"}
            onClick={() => setActiveTab("applied")}
            className={`px-4 py-2 text-xs font-black rounded-xl transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === "applied" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-900"
            }`}
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            Applied ({appliedItems.length})
          </button>
          <button
            aria-pressed={activeTab === "bookmarked"}
            onClick={() => setActiveTab("bookmarked")}
            className={`px-4 py-2 text-xs font-black rounded-xl transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === "bookmarked" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-900"
            }`}
          >
            <Bookmark className="w-4 h-4 text-amber-500" />
            Bookmarked ({bookmarkedItems.length})
          </button>
          <button
            aria-pressed={activeTab === "viewed"}
            onClick={() => setActiveTab("viewed")}
            className={`px-4 py-2 text-xs font-black rounded-xl transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === "viewed" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-900"
            }`}
          >
            <Eye className="w-4 h-4 text-blue-500" />
            Viewed ({viewedItems.length})
          </button>
        </div>
      </div>

      {/* Filter Controls */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder={`Search in ${activeTab}...`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 h-10 rounded-xl text-xs bg-white"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="h-10 text-xs rounded-xl bg-white border border-slate-200 px-3 font-semibold text-slate-700 outline-none"
          >
            <option value="all">All Categories</option>
            <option value="job">Jobs</option>
            <option value="college">Colleges</option>
            <option value="event">Events & Hackathons</option>
            <option value="mentor">Mentors</option>
          </select>
        </div>
      </div>

      {/* Items List */}
      <div className="space-y-3">
        {filtered.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.id}
              className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs hover:border-slate-300 transition-all flex items-center justify-between gap-4"
            >
              <div className="flex items-center gap-4 min-w-0">
                <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${item.color}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      {item.type}
                    </span>
                    <Badge variant="outline" className="text-[10px] font-extrabold capitalize">
                      {item.status}
                    </Badge>
                  </div>
                  <h3 className="text-sm font-black text-slate-900 truncate mt-0.5">{item.title}</h3>
                  <p className="text-xs text-slate-500 truncate mt-0.5">{item.subtitle}</p>
                </div>
              </div>

              <Button variant="ghost" size="sm" asChild className="rounded-xl text-xs font-bold shrink-0">
                <Link to={item.href}>
                  View Details
                  <ExternalLink className="w-3.5 h-3.5 ml-1.5" />
                </Link>
              </Button>
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="bg-white p-12 text-center rounded-3xl border border-slate-200/80">
            <Activity className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-800">No records found</h3>
            <p className="text-xs text-slate-500 mt-1">Try clearing search or changing filters.</p>
          </div>
        )}
      </div>
    </div>
  );
}
