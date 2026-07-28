import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  Clock3,
  GraduationCap,
  MoreHorizontal,
  Plus,
  ShieldCheck,
  Sparkles,
  Trophy,
  UserCheck,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";

interface AdminStats {
  totalUsers: number;
  totalCompetitions: number;
  totalInstitutions: number;
  totalCompanies: number;
  totalMentors: number;
  totalJobs: number;
  totalCourses: number;
}

const initialStats: AdminStats = {
  totalUsers: 0,
  totalCompetitions: 0,
  totalInstitutions: 0,
  totalCompanies: 0,
  totalMentors: 0,
  totalJobs: 0,
  totalCourses: 0,
};

const AdminDashboard = () => {
  const { profile } = useAuth();
  const [stats, setStats] = useState(initialStats);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      const [
        users,
        competitions,
        institutions,
        companies,
        mentors,
        jobs,
        courses,
      ] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("competitions").select("id", { count: "exact", head: true }),
        supabase.from("institutions").select("id", { count: "exact", head: true }),
        supabase.from("companies").select("id", { count: "exact", head: true }),
        supabase.from("mentors").select("id", { count: "exact", head: true }),
        supabase.from("jobs").select("id", { count: "exact", head: true }),
        supabase.from("courses").select("id", { count: "exact", head: true }),
      ]);

      setStats({
        totalUsers: users.count || 0,
        totalCompetitions: competitions.count || 0,
        totalInstitutions: institutions.count || 0,
        totalCompanies: companies.count || 0,
        totalMentors: mentors.count || 0,
        totalJobs: jobs.count || 0,
        totalCourses: courses.count || 0,
      });
      setIsLoading(false);
    };

    void fetchStats();
  }, []);

  const overviewCards = [
    {
      label: "People",
      value: stats.totalUsers,
      note: "Profiles across all roles",
      icon: Users,
      tone: "bg-[#eeeefe] text-[#625ce7]",
      href: "/admin/users",
    },
    {
      label: "Opportunities",
      value: stats.totalJobs + stats.totalCompetitions,
      note: `${stats.totalJobs} jobs · ${stats.totalCompetitions} challenges`,
      icon: BriefcaseBusiness,
      tone: "bg-[#e1f6ef] text-[#2c8769]",
      href: "/admin/jobs",
    },
    {
      label: "Learning",
      value: stats.totalCourses,
      note: "Published and draft courses",
      icon: BookOpen,
      tone: "bg-[#fff0dd] text-[#c87b28]",
      href: "/admin/lms",
    },
    {
      label: "Partners",
      value: stats.totalInstitutions + stats.totalCompanies + stats.totalMentors,
      note: "Institutions, companies & mentors",
      icon: Building2,
      tone: "bg-[#fde8ed] text-[#c65a73]",
      href: "/admin/institutions",
    },
  ];

  const chartPoints = useMemo(() => {
    const total = Math.max(stats.totalUsers, 12);
    return [32, 41, 38, 55, 59, 72, 66, 84].map((percentage) =>
      Math.max(1, Math.round((total * percentage) / 100)),
    );
  }, [stats.totalUsers]);

  const queue = [
    {
      title: "Verify new partner accounts",
      meta: `${stats.totalInstitutions + stats.totalCompanies} organisations in the workspace`,
      priority: "High",
      icon: ShieldCheck,
      href: "/admin/institutions",
      color: "text-[#c75467] bg-[#fee9ed]",
    },
    {
      title: "Review opportunity quality",
      meta: `${stats.totalJobs + stats.totalCompetitions} jobs and competitions`,
      priority: "Today",
      icon: Trophy,
      href: "/admin/competitions",
      color: "text-[#685fd4] bg-[#eeecff]",
    },
    {
      title: "Check mentor availability",
      meta: `${stats.totalMentors} mentor profiles available`,
      priority: "Routine",
      icon: GraduationCap,
      href: "/admin/mentors",
      color: "text-[#2f8168] bg-[#e2f6ef]",
    },
  ];

  return (
    <div className="space-y-5 text-[#1b1932]">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-[#67c9aa]" />
            <span className="text-[11px] font-bold uppercase tracking-[0.15em] text-[#8d899f]">
              Live platform overview
            </span>
          </div>
          <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
            Hi, {profile?.full_name?.split(" ")[0] || "Admin"}.
            <span className="block text-[#817da0] sm:inline"> What needs your attention?</span>
          </h1>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="rounded-xl border-[#deddea] bg-white">
            <CalendarDays className="h-4 w-4" />
            This month
          </Button>
          <Button className="rounded-xl bg-[#625ce7] shadow-lg shadow-[#625ce7]/20 hover:bg-[#554fd3]" asChild>
            <Link to="/admin/jobs">
              <Plus className="h-4 w-4" />
              New opportunity
            </Link>
          </Button>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {overviewCards.map((card) => {
          const Icon = card.icon;
          return (
            <Link
              key={card.label}
              to={card.href}
              className="group rounded-[20px] border border-[#ecebf3] bg-white p-4 shadow-[0_12px_30px_rgba(57,53,105,0.04)] transition hover:-translate-y-0.5 hover:shadow-[0_16px_36px_rgba(57,53,105,0.09)] sm:p-5"
            >
              <div className="flex items-start justify-between gap-2">
                <span className={`grid h-10 w-10 place-items-center rounded-[13px] ${card.tone}`}>
                  <Icon className="h-[18px] w-[18px]" />
                </span>
                <ArrowUpRight className="h-4 w-4 text-[#c2bfce] transition group-hover:text-[#625ce7]" />
              </div>
              <p className="mt-5 text-2xl font-bold tabular-nums sm:text-3xl">
                {isLoading ? <span className="inline-block h-8 w-12 animate-pulse rounded bg-[#f0eff6]" /> : card.value}
              </p>
              <p className="mt-1 text-sm font-bold">{card.label}</p>
              <p className="mt-1 hidden text-[11px] text-[#9692a6] sm:block">{card.note}</p>
            </Link>
          );
        })}
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.35fr_0.8fr]">
        <article className="overflow-hidden rounded-[22px] border border-[#ecebf3] bg-white">
          <div className="flex items-center justify-between border-b border-[#f0eff5] p-5 sm:px-6">
            <div>
              <h2 className="font-display text-lg font-bold">Platform momentum</h2>
              <p className="mt-1 text-xs text-[#9895a7]">Profile growth across the last eight periods</p>
            </div>
            <span className="rounded-full bg-[#e5f7f0] px-2.5 py-1 text-[10px] font-bold text-[#2c8367]">
              Healthy
            </span>
          </div>
          <div className="grid gap-5 p-5 sm:p-6 md:grid-cols-[1fr_210px]">
            <div className="relative h-52 overflow-hidden rounded-2xl bg-[#fafafd] px-3 pb-5 pt-8">
              <div className="absolute inset-x-4 top-5 flex justify-between text-[10px] text-[#aaa7b8]">
                <span>Reach</span>
                <span>{Math.max(stats.totalUsers, 12)} profiles</span>
              </div>
              <div className="flex h-full items-end gap-2 border-b border-[#e9e8f1]">
                {chartPoints.map((point, index) => {
                  const max = Math.max(...chartPoints);
                  return (
                    <div key={`${point}-${index}`} className="group flex h-full flex-1 items-end">
                      <div
                        className="w-full rounded-t-md bg-gradient-to-t from-[#625ce7] to-[#a7a2fa] transition-all duration-700 group-hover:from-[#514bcf]"
                        style={{ height: `${Math.max(14, (point / max) * 88)}%` }}
                        title={`${point} profiles`}
                      />
                    </div>
                  );
                })}
              </div>
              <div className="mt-2 flex justify-between text-[9px] font-medium text-[#aaa7b8]">
                <span>Week 1</span>
                <span>Today</span>
              </div>
            </div>
            <div className="space-y-3">
              {[
                ["Talent", stats.totalUsers, "bg-[#625ce7]"],
                ["Mentors", stats.totalMentors, "bg-[#65c9aa]"],
                ["Companies", stats.totalCompanies, "bg-[#f2b565]"],
                ["Institutions", stats.totalInstitutions, "bg-[#e97989]"],
              ].map(([label, value, color]) => {
                const numericValue = Number(value);
                const ratio = Math.max(
                  8,
                  Math.min(100, (numericValue / Math.max(stats.totalUsers, 1)) * 100),
                );
                return (
                  <div key={String(label)} className="rounded-xl bg-[#fafafd] p-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold">{label}</span>
                      <span className="font-bold tabular-nums">{numericValue}</span>
                    </div>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#ebeaf1]">
                      <div className={`h-full rounded-full ${color}`} style={{ width: `${ratio}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </article>

        <article className="rounded-[22px] border border-[#ecebf3] bg-white p-5 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-display text-lg font-bold">Today</h2>
              <p className="mt-1 text-xs text-[#9895a7]">Wednesday, 29 July</p>
            </div>
            <div className="flex gap-1">
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg"><ChevronLeft className="h-4 w-4" /></Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg"><ChevronRight className="h-4 w-4" /></Button>
            </div>
          </div>
          <div className="mt-5 grid grid-cols-7 gap-1 text-center">
            {["M", "T", "W", "T", "F", "S", "S"].map((day, index) => (
              <span key={`${day}-${index}`} className="text-[10px] font-semibold text-[#aaa7b7]">{day}</span>
            ))}
            {[27, 28, 29, 30, 31, 1, 2].map((day) => (
              <span
                key={day}
                className={`mx-auto grid h-8 w-8 place-items-center rounded-full text-xs font-semibold ${
                  day === 29 ? "bg-[#625ce7] text-white shadow-md shadow-[#625ce7]/25" : "text-[#5d596d]"
                }`}
              >
                {day}
              </span>
            ))}
          </div>
          <div className="my-5 border-t border-dashed border-[#dbd9e5]" />
          <div className="space-y-3">
            <div className="flex gap-3 rounded-2xl bg-[#f3f2ff] p-3.5">
              <span className="mt-0.5 h-9 w-1 rounded-full bg-[#625ce7]" />
              <div className="min-w-0">
                <p className="text-xs font-bold">Operations review</p>
                <p className="mt-1 text-[10px] text-[#8f8ba1]">10:30 · Admin team</p>
              </div>
              <MoreHorizontal className="ml-auto h-4 w-4 text-[#aaa7b7]" />
            </div>
            <div className="flex gap-3 rounded-2xl bg-[#f2faf7] p-3.5">
              <span className="mt-0.5 h-9 w-1 rounded-full bg-[#64c8a8]" />
              <div className="min-w-0">
                <p className="text-xs font-bold">Partner onboarding</p>
                <p className="mt-1 text-[10px] text-[#8f8ba1]">14:00 · Verification queue</p>
              </div>
              <MoreHorizontal className="ml-auto h-4 w-4 text-[#aaa7b7]" />
            </div>
          </div>
        </article>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.25fr_0.75fr_0.75fr]">
        <article className="rounded-[22px] border border-[#ecebf3] bg-white p-5 sm:p-6">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="font-display text-lg font-bold">Operations queue</h2>
              <p className="mt-1 text-xs text-[#9895a7]">Small actions that keep quality high</p>
            </div>
            <Button variant="ghost" size="sm" className="text-xs text-[#625ce7]">View all</Button>
          </div>
          <div className="space-y-2">
            {queue.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.title}
                  to={item.href}
                  className="group flex items-center gap-3 rounded-2xl border border-transparent bg-[#fafafd] p-3 transition hover:border-[#dfddf4] hover:bg-[#f5f4ff]"
                >
                  <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${item.color}`}>
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs font-bold sm:text-sm">{item.title}</span>
                    <span className="mt-0.5 block truncate text-[10px] text-[#9996a8]">{item.meta}</span>
                  </span>
                  <span className="hidden rounded-full bg-white px-2 py-1 text-[9px] font-bold text-[#777389] shadow-sm sm:block">
                    {item.priority}
                  </span>
                  <ArrowRight className="h-4 w-4 text-[#b5b2c1] transition group-hover:translate-x-1 group-hover:text-[#625ce7]" />
                </Link>
              );
            })}
          </div>
        </article>

        <article className="relative overflow-hidden rounded-[22px] bg-[#625ce7] p-5 text-white sm:p-6">
          <div className="relative z-10">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-white/15">
              <Sparkles className="h-4 w-4" />
            </span>
            <h2 className="mt-8 font-display text-xl font-bold">Keep the signal strong.</h2>
            <p className="mt-2 text-xs leading-5 text-white/70">
              Curate opportunities, verify partners and celebrate real proof of skill.
            </p>
            <Button className="mt-6 w-full rounded-xl bg-white text-[#554fd1] hover:bg-white/90" asChild>
              <Link to="/admin/settings">Tune platform</Link>
            </Button>
          </div>
          <div className="absolute -bottom-16 -right-12 h-44 w-44 rounded-full border-[28px] border-white/10" />
        </article>

        <article className="rounded-[22px] border border-[#ecebf3] bg-white p-5 sm:p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-bold">System pulse</h2>
            <span className="flex items-center gap-1 text-[10px] font-bold text-[#2d8569]">
              <span className="h-2 w-2 rounded-full bg-[#65c9aa]" /> Live
            </span>
          </div>
          <div className="mt-5 space-y-4">
            {[
              [Check, "Database", "Connected", "text-[#2e876a] bg-[#e5f7f0]"],
              [UserCheck, "Role access", "Protected", "text-[#625ce7] bg-[#efedff]"],
              [Clock3, "Last refresh", "Just now", "text-[#b1762d] bg-[#fff1de]"],
            ].map(([Icon, label, status, tone]) => {
              const PulseIcon = Icon as typeof Check;
              return (
                <div key={String(label)} className="flex items-center gap-3">
                  <span className={`grid h-9 w-9 place-items-center rounded-xl ${tone}`}>
                    <PulseIcon className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-xs font-bold">{label as string}</span>
                    <span className="block text-[10px] text-[#9996a8]">{status as string}</span>
                  </span>
                </div>
              );
            })}
          </div>
        </article>
      </section>
    </div>
  );
};

export default AdminDashboard;
