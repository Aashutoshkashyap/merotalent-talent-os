import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowRight,
  BellRing,
  BookOpen,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleCheck,
  Clock3,
  GraduationCap,
  MessageSquareText,
  MoreHorizontal,
  Plus,
  ShieldCheck,
  Sparkles,
  Trophy,
  UserRoundCheck,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface AdminStats {
  users: number;
  competitions: number;
  institutions: number;
  companies: number;
  mentors: number;
  jobs: number;
  courses: number;
}

const emptyStats: AdminStats = {
  users: 0,
  competitions: 0,
  institutions: 0,
  companies: 0,
  mentors: 0,
  jobs: 0,
  courses: 0,
};

const cardMotion = {
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0 },
};

const MetricValue = ({
  value,
  isLoading,
}: {
  value: number;
  isLoading: boolean;
}) =>
  isLoading ? (
    <span className="inline-block h-7 w-10 animate-pulse rounded-lg bg-[#ecebf5]" />
  ) : (
    <>{value}</>
  );

const AdminDashboard = () => {
  const { profile } = useAuth();
  const [stats, setStats] = useState(emptyStats);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      const [users, competitions, institutions, companies, mentors, jobs, courses] =
        await Promise.all([
          supabase.from("profiles").select("id", { count: "exact", head: true }),
          supabase.from("competitions").select("id", { count: "exact", head: true }),
          supabase.from("institutions").select("id", { count: "exact", head: true }),
          supabase.from("companies").select("id", { count: "exact", head: true }),
          supabase.from("mentors").select("id", { count: "exact", head: true }),
          supabase.from("jobs").select("id", { count: "exact", head: true }),
          supabase.from("courses").select("id", { count: "exact", head: true }),
        ]);

      setStats({
        users: users.count || 0,
        competitions: competitions.count || 0,
        institutions: institutions.count || 0,
        companies: companies.count || 0,
        mentors: mentors.count || 0,
        jobs: jobs.count || 0,
        courses: courses.count || 0,
      });
      setIsLoading(false);
    };

    void fetchStats();
  }, []);

  const quickActions = [
    {
      label: "Stay organised",
      description: "Review people and permissions",
      icon: ShieldCheck,
      href: "/admin/users",
      tone: "bg-[#fff1e8] text-[#f97316]",
    },
    {
      label: "Sync programs",
      description: "Keep courses and mentors aligned",
      icon: BookOpen,
      href: "/admin/lms",
      tone: "bg-[#e7f7f1] text-[#378a70]",
    },
    {
      label: "Publish & share",
      description: "Launch a verified opportunity",
      icon: BriefcaseBusiness,
      href: "/admin/jobs",
      tone: "bg-[#fff1e8] text-[#f97316]",
    },
  ];

  const assignments = [
    {
      title: "Verify new partner accounts",
      meta: `${stats.institutions + stats.companies} organisations in review`,
      tag: "High",
      href: "/admin/institutions",
    },
    {
      title: "Review opportunity quality",
      meta: `${stats.jobs + stats.competitions} active opportunities`,
      tag: "Today",
      href: "/admin/jobs",
    },
  ];

  const tasks = [
    {
      title: "Approve talent profiles",
      subtitle: `${stats.users} people across every role`,
      progress: 82,
      icon: UserRoundCheck,
      href: "/admin/users",
    },
    {
      title: "Schedule mentor review",
      subtitle: `${stats.mentors} mentor profiles`,
      progress: 56,
      icon: GraduationCap,
      href: "/admin/mentors",
    },
    {
      title: "Publish learning updates",
      subtitle: `${stats.courses} courses in the workspace`,
      progress: 34,
      icon: BookOpen,
      href: "/admin/lms",
    },
  ];

  return (
    <div className="space-y-4 text-[#17162f]">
      <section className="grid gap-4 xl:grid-cols-[1.05fr_1.45fr]">
        <motion.div
          {...cardMotion}
          transition={{ duration: 0.35 }}
          className="rounded-[24px] border border-[#ecebf3] bg-white p-5 shadow-[0_16px_35px_rgba(52,48,99,0.05)] sm:p-6"
        >
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-[#f97316]">
            <span className="h-2 w-2 rounded-full bg-[#64c9aa]" />
            Live command centre
          </div>
          <h1 className="mt-4 text-balance font-display text-3xl font-bold leading-[1.06] tracking-[-0.035em] sm:text-[38px]">
            Hi, {profile?.full_name?.split(" ")[0] || "Admin"}.
            <span className="block text-[#6f6b89]">What are your plans today?</span>
          </h1>
          <p className="mt-4 max-w-md text-sm leading-6 text-[#888497]">
            One calm workspace for people, programs, partners and every opportunity across Merotalent.
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            <Button className="rounded-xl bg-[#f97316] shadow-lg shadow-[#f97316]/20 hover:bg-[#ea580c]" asChild>
              <Link to="/admin/jobs">
                <Plus className="h-4 w-4" />
                New opportunity
              </Link>
            </Button>
            <Button variant="outline" className="rounded-xl border-[#e2e0ec] bg-white" asChild>
              <Link to="/admin/users">View people</Link>
            </Button>
          </div>
        </motion.div>

        <div className="flex gap-3 overflow-x-auto pb-1 sm:grid sm:grid-cols-3 sm:overflow-visible sm:pb-0">
          {quickActions.map((action, index) => {
            const Icon = action.icon;
            return (
              <motion.div
                key={action.label}
                {...cardMotion}
                transition={{ duration: 0.35, delay: 0.06 * (index + 1) }}
                className="min-w-[220px] sm:min-w-0"
              >
                <Link
                  to={action.href}
                  className="group flex h-full min-h-[168px] flex-col rounded-[24px] border border-[#ecebf3] bg-white p-5 shadow-[0_16px_35px_rgba(52,48,99,0.05)] transition hover:-translate-y-1 hover:shadow-[0_20px_40px_rgba(52,48,99,0.10)]"
                >
                  <span className={`grid h-12 w-12 place-items-center rounded-[16px] ${action.tone}`}>
                    <Icon className="h-5 w-5" />
                  </span>
                  <h2 className="mt-auto pt-6 font-display text-base font-bold">{action.label}</h2>
                  <p className="mt-1 text-[11px] leading-4 text-[#9995a7]">{action.description}</p>
                  <ArrowRight className="mt-4 h-4 w-4 text-[#bebbc8] transition group-hover:translate-x-1 group-hover:text-[#f97316]" />
                </Link>
              </motion.div>
            );
          })}
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-12">
        <motion.article
          {...cardMotion}
          transition={{ duration: 0.35, delay: 0.12 }}
          className="rounded-[24px] border border-[#ecebf3] bg-white p-5 xl:col-span-4"
        >
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-bold">Notifications</h2>
            <button className="text-[10px] font-semibold text-[#9a96a8]">Clear</button>
          </div>

          <div className="mt-5 rounded-[18px] bg-[#f1f0fb] p-2">
            <div className="rounded-[16px] bg-white p-4 shadow-[0_10px_24px_rgba(50,46,91,0.09)]">
              <div className="flex items-start gap-3">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#fff1e8] text-[#f97316]">
                  <BellRing className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-xs font-bold">Upcoming review</p>
                    <MoreHorizontal className="h-4 w-4 text-[#aaa7b6]" />
                  </div>
                  <p className="mt-1 text-[10px] text-[#9995a6]">Partner onboarding · 45 min</p>
                  <div className="mt-3 flex items-center gap-4 text-[9px] font-semibold text-[#6a667b]">
                    <span className="flex items-center gap-1"><CalendarDays className="h-3 w-3" /> Today</span>
                    <span className="flex items-center gap-1"><Clock3 className="h-3 w-3" /> 11:00 AM</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-3 rounded-[18px] border border-[#efedf5] p-4">
            <div className="flex items-center gap-2">
              <MessageSquareText className="h-4 w-4 text-[#f97316]" />
              <p className="text-xs font-bold">Message · Platform quality</p>
              <MoreHorizontal className="ml-auto h-4 w-4 text-[#aaa7b6]" />
            </div>
            <p className="mt-2 rounded-lg bg-[#f5f4fb] px-3 py-2 text-[9px] text-[#aaa6b5]">
              The weekly operations summary is ready for review…
            </p>
          </div>
        </motion.article>

        <motion.article
          {...cardMotion}
          transition={{ duration: 0.35, delay: 0.16 }}
          className="rounded-[24px] border border-[#ecebf3] bg-white p-5 xl:col-span-4"
        >
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-bold">Assignments</h2>
            <Link to="/admin/jobs" className="text-[10px] font-semibold text-[#f97316]">Edit</Link>
          </div>

          <div className="mt-5 space-y-3">
            {assignments.map((assignment, index) => (
              <Link
                key={assignment.title}
                to={assignment.href}
                className="block rounded-[18px] border border-[#efedf5] p-4 transition hover:border-[#fed7aa] hover:bg-[#fafaff]"
              >
                <div className="flex items-center gap-2 text-[10px] font-semibold text-[#f97316]">
                  {index === 0 ? "Partner operations" : "Opportunity quality"}
                  <span className="h-1 w-1 rounded-full bg-[#64c9aa]" />
                </div>
                <div className="mt-2 flex items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold leading-5">{assignment.title}</p>
                    <p className="mt-1 text-[10px] text-[#9995a6]">{assignment.meta}</p>
                  </div>
                  <span className="rounded-full bg-[#fff1e8] px-2.5 py-1 text-[9px] font-bold text-[#f97316]">
                    {assignment.tag}
                  </span>
                </div>
              </Link>
            ))}
          </div>

          <Button variant="outline" className="mt-4 h-12 w-full rounded-[15px] border-dashed border-[#d9d6ed] bg-[#f8f7fd] text-xs" asChild>
            <Link to="/admin/jobs"><Plus className="h-4 w-4 text-[#f97316]" /> Add assignment</Link>
          </Button>
        </motion.article>

        <motion.article
          {...cardMotion}
          transition={{ duration: 0.35, delay: 0.2 }}
          className="rounded-[24px] border border-[#ecebf3] bg-white p-5 xl:col-span-4"
        >
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-display text-lg font-bold">July 2026</h2>
              <p className="mt-1 text-[10px] text-[#9995a6]">Platform operations</p>
            </div>
            <div className="flex gap-1">
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg"><ChevronLeft className="h-4 w-4" /></Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg"><ChevronRight className="h-4 w-4" /></Button>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-7 gap-1 text-center">
            {["M", "T", "W", "T", "F", "S", "S"].map((day, index) => (
              <span key={`${day}-${index}`} className="text-[9px] font-semibold text-[#aaa6b6]">{day}</span>
            ))}
            {[27, 28, 29, 30, 31, 1, 2].map((day) => (
              <span
                key={day}
                className={`mx-auto grid h-8 w-8 place-items-center rounded-full text-xs font-semibold ${
                  day === 29 ? "bg-[#f97316] text-white shadow-md shadow-[#f97316]/25" : "text-[#605c70]"
                }`}
              >
                {day}
              </span>
            ))}
          </div>

          <div className="my-5 border-t border-dashed border-[#d8d5e3]" />
          <div className="space-y-4">
            {[
              ["10:30–11:15 AM", "Team meeting", "Admin team", "bg-[#f97316]"],
              ["02:00–03:00 PM", "Partner review", "Verification queue", "bg-[#64c9aa]"],
            ].map(([time, title, detail, tone]) => (
              <div key={title} className="grid grid-cols-[92px_1fr] gap-3">
                <span className="text-[9px] font-bold text-[#595568]">{time}</span>
                <div className="relative border-l border-dashed border-[#d8d5e3] pl-4">
                  <span className={`absolute -left-1 top-1 h-2 w-2 rounded-full ${tone}`} />
                  <p className="text-xs font-bold">{title}</p>
                  <p className="mt-1 text-[9px] text-[#9995a6]">{detail}</p>
                </div>
              </div>
            ))}
          </div>
        </motion.article>
      </section>

      <section className="grid gap-4 xl:grid-cols-12">
        <motion.article
          {...cardMotion}
          transition={{ duration: 0.35, delay: 0.24 }}
          className="rounded-[24px] border border-[#ecebf3] bg-white p-5 sm:p-6 xl:col-span-7"
        >
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="font-display text-lg font-bold">Today’s tasks</h2>
            <div className="flex -space-x-2">
              {["A", "S", "R"].map((initial, index) => (
                <span
                  key={initial}
                  className={`grid h-7 w-7 place-items-center rounded-full border-2 border-white text-[8px] font-bold ${
                    ["bg-[#fff1e8] text-[#f97316]", "bg-[#e5f7f0] text-[#378a70]", "bg-[#ffedd5] text-[#c2410c]"][index]
                  }`}
                >
                  {initial}
                </span>
              ))}
            </div>
            <Link to="/admin/users" className="ml-auto text-[10px] font-semibold text-[#f97316]">View all</Link>
          </div>

          <div className="mt-5 space-y-2">
            {tasks.map((task) => {
              const Icon = task.icon;
              return (
                <Link
                  key={task.title}
                  to={task.href}
                  className="grid items-center gap-3 rounded-[16px] border border-transparent bg-[#fafafd] p-3 transition hover:border-[#fed7aa] hover:bg-[#f7f6ff] sm:grid-cols-[1.15fr_0.7fr_1fr_auto]"
                >
                  <span className="flex min-w-0 items-center gap-3">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#fff1e8] text-[#f97316]">
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-xs font-bold">{task.title}</span>
                      <span className="mt-1 block truncate text-[9px] text-[#9995a6]">{task.subtitle}</span>
                    </span>
                  </span>
                  <span className="hidden text-[10px] text-[#9995a6] sm:block">Today</span>
                  <span className="flex items-center gap-2">
                    <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#e8e6ef]">
                      <span className="block h-full rounded-full bg-[#f97316]" style={{ width: `${task.progress}%` }} />
                    </span>
                    <span className="w-8 text-right text-[9px] font-bold">{task.progress}%</span>
                  </span>
                  <MoreHorizontal className="hidden h-4 w-4 text-[#b0adba] sm:block" />
                </Link>
              );
            })}
          </div>
        </motion.article>

        <motion.article
          {...cardMotion}
          transition={{ duration: 0.35, delay: 0.28 }}
          className="relative overflow-hidden rounded-[24px] bg-[#f97316] p-5 text-white sm:p-6 xl:col-span-2"
        >
          <div className="relative z-10 flex h-full min-h-[250px] flex-col">
            <span className="grid h-11 w-11 place-items-center rounded-[15px] bg-white/15">
              <Sparkles className="h-5 w-5" />
            </span>
            <h2 className="mt-auto pt-8 font-display text-xl font-bold">Keep the signal strong.</h2>
            <p className="mt-2 text-[11px] leading-5 text-white/70">
              Verify people, partners and proof of skill.
            </p>
            <Button className="mt-5 rounded-xl bg-[#17162f] text-xs text-white hover:bg-[#262342]" asChild>
              <Link to="/admin/settings">Tune platform</Link>
            </Button>
          </div>
          <div className="absolute -bottom-16 -right-14 h-44 w-44 rounded-full border-[28px] border-white/10" />
        </motion.article>

        <div className="grid gap-4 xl:col-span-3">
          <motion.article
            {...cardMotion}
            transition={{ duration: 0.35, delay: 0.31 }}
            className="grid grid-cols-2 gap-3"
          >
            <div className="rounded-[22px] border border-[#ecebf3] bg-white p-4">
              <div className="flex items-center gap-2">
                <span className="grid h-9 w-9 place-items-center rounded-full bg-[#e7f7f1] text-[#378a70]">
                  <Users className="h-4 w-4" />
                </span>
                <span className="text-2xl font-bold"><MetricValue value={stats.users} isLoading={isLoading} /></span>
              </div>
              <p className="mt-3 text-[10px] font-bold uppercase tracking-[0.1em] text-[#39896f]">People</p>
              <p className="mt-1 text-[9px] text-[#9995a6]">Across all roles</p>
            </div>
            <div className="rounded-[22px] border border-[#ecebf3] bg-white p-4">
              <div className="flex items-center gap-2">
                <span className="grid h-9 w-9 place-items-center rounded-full bg-[#fff1e8] text-[#f97316]">
                  <Trophy className="h-4 w-4" />
                </span>
                <span className="text-2xl font-bold"><MetricValue value={stats.jobs + stats.competitions} isLoading={isLoading} /></span>
              </div>
              <p className="mt-3 text-[10px] font-bold uppercase tracking-[0.1em] text-[#f97316]">Live</p>
              <p className="mt-1 text-[9px] text-[#9995a6]">Opportunities</p>
            </div>
          </motion.article>

          <motion.article
            {...cardMotion}
            transition={{ duration: 0.35, delay: 0.34 }}
            className="rounded-[22px] border border-[#ecebf3] bg-white p-5"
          >
            <div className="flex items-center justify-between">
              <h2 className="font-display text-base font-bold">Board meeting</h2>
              <Link to="/admin/settings" className="text-[10px] font-semibold text-[#f97316]">Edit</Link>
            </div>
            <div className="mt-3 flex items-center gap-2 text-[9px] text-[#9995a6]">
              <span className="h-2 w-2 rounded-full bg-[#f97316]" />
              Today at 4:00 PM
            </div>
            <p className="mt-4 text-xs leading-5 text-[#625e72]">
              Platform priorities, partner quality and the next release.
            </p>
            <div className="mt-4 flex gap-2">
              <Button variant="outline" size="sm" className="h-9 flex-1 rounded-xl text-[10px]">Reschedule</Button>
              <Button size="sm" className="h-9 flex-1 rounded-xl bg-[#f97316] text-[10px] hover:bg-[#ea580c]">
                <CircleCheck className="h-3.5 w-3.5" /> Accept
              </Button>
            </div>
          </motion.article>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-3">
        {[
          [Check, "Database", "Connected", "bg-[#e7f7f1] text-[#378a70]"],
          [Building2, "Partners", stats.institutions + stats.companies, "bg-[#fff1e8] text-[#f97316]"],
          [Clock3, "Last refresh", "Just now", "bg-[#fff7ed] text-[#c2410c]"],
        ].map(([Icon, label, value, tone]) => {
          const StatusIcon = Icon as typeof Check;
          return (
            <div key={String(label)} className="flex items-center gap-3 rounded-[18px] border border-[#ecebf3] bg-white p-4">
              <span className={`grid h-9 w-9 place-items-center rounded-xl ${tone}`}>
                <StatusIcon className="h-4 w-4" />
              </span>
              <span>
                <span className="block text-xs font-bold">{label as string}</span>
                <span className="mt-0.5 block text-[10px] text-[#9995a6]">{value as string | number}</span>
              </span>
            </div>
          );
        })}
      </section>
    </div>
  );
};

export default AdminDashboard;
