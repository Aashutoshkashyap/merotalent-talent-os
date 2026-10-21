import { isNeonClientRuntime } from "@/lib/backend-selection";
import { useCallback, useEffect, useState, useRef } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowRight,
  BellRing,
  BookOpen,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
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
  ExternalLink,
  MapPin,
  Star,
  Layers,
  ArrowUpRight,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { getCachedOrFetch, invalidateCache } from "@/lib/cache/data-cache";

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

const calendarViews = [
  { label: "June 2026", days: [22, 23, 24, 25, 26, 27, 28] },
  { label: "July 2026", days: [27, 28, 29, 30, 31, 1, 2] },
  { label: "August 2026", days: [3, 4, 5, 6, 7, 8, 9] },
];

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

/* ------------------------------------------------------------------ */
/* Carousel Component with Horizontal Scroll                          */
/* ------------------------------------------------------------------ */

interface CarouselProps<T> {
  title: string;
  subtitle: string;
  viewMoreLink: string;
  viewMoreLabel: string;
  icon: any;
  items: T[];
  isLoading: boolean;
  emptyMessage: string;
  renderCard: (item: T, index: number) => React.ReactNode;
}

function ModuleCarouselSection<T>({
  title,
  subtitle,
  viewMoreLink,
  viewMoreLabel,
  icon: Icon,
  items,
  isLoading,
  emptyMessage,
  renderCard,
}: CarouselProps<T>) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: "left" | "right") => {
    if (scrollRef.current) {
      const scrollAmount = direction === "left" ? -320 : 320;
      scrollRef.current.scrollBy({ left: scrollAmount, behavior: "smooth" });
    }
  };

  return (
    <motion.section
      {...cardMotion}
      transition={{ duration: 0.35 }}
      className="rounded-[24px] border border-[#e2e8f0] bg-[#f8fafc] p-4 sm:p-6 shadow-[0_10px_28px_rgba(0,0,0,0.03)] space-y-4"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#071a3d] text-white shadow-md shadow-[#071a3d]/20">
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-display text-lg font-bold text-[#0f172a]">{title}</h2>
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Scroll Controls */}
          <div className="flex items-center gap-1 mr-2">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 rounded-lg bg-white border-[#cbd5e1] hover:bg-[#f1f5f9]"
              onClick={() => scroll("left")}
              disabled={items.length === 0}
              aria-label="Scroll left"
            >
              <ChevronLeft className="h-4 w-4 text-[#071a3d]" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 rounded-lg bg-white border-[#cbd5e1] hover:bg-[#f1f5f9]"
              onClick={() => scroll("right")}
              disabled={items.length === 0}
              aria-label="Scroll right"
            >
              <ChevronRight className="h-4 w-4 text-[#071a3d]" />
            </Button>
          </div>

          {/* View More CTA Button (Midnight Blue) */}
          <Button
            variant="hero"
            size="sm"
            className="bg-[#071a3d] text-white hover:bg-[#05132d] rounded-xl text-xs font-semibold px-4"
            asChild
          >
            <Link to={viewMoreLink}>
              {viewMoreLabel}
              <ArrowUpRight className="ml-1.5 h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
      </div>

      {/* Horizontal Scroll Track */}
      <div
        ref={scrollRef}
        className="flex gap-4 overflow-x-auto pb-3 pt-1 scrollbar-thin scrollbar-thumb-slate-300 scroll-smooth snap-x"
        style={{ scrollbarWidth: "thin" }}
      >
        {isLoading ? (
          Array.from({ length: 3 }).map((_, index) => (
            <div
              key={`loading-${index}`}
              className="h-[132px] w-[280px] shrink-0 animate-pulse snap-start rounded-2xl border border-[#e2e8f0] bg-white sm:w-[320px]"
              aria-hidden="true"
            />
          ))
        ) : items.length > 0 ? (
          items.map((item, index) => (
            <div key={index} className="w-[280px] sm:w-[320px] shrink-0 snap-start">
              {renderCard(item, index)}
            </div>
          ))
        ) : (
          <div className="flex min-h-[132px] w-full items-center justify-center rounded-2xl border border-dashed border-[#cbd5e1] bg-white px-5 text-center">
            <p className="text-sm font-medium text-[#64748b]">{emptyMessage}</p>
          </div>
        )}
      </div>
    </motion.section>
  );
}

/* ------------------------------------------------------------------ */
/* Main Admin Dashboard                                                */
/* ------------------------------------------------------------------ */

const AdminDashboard = () => {
  const { profile,user } = useAuth();
  const dashboardCacheKey=`admin:dashboard:data:${process.env.NEXT_PUBLIC_MEROTALENT_BACKEND_MODE || "legacy"}:${user?.id || "anonymous"}`;
  const [stats, setStats] = useState(emptyStats);
  const [isLoading, setIsLoading] = useState(true);
  const [dataLoadState, setDataLoadState] = useState<"loading" | "ready" | "partial" | "error">("loading");
  const [notificationsCleared, setNotificationsCleared] = useState(false);
  const [calendarIndex, setCalendarIndex] = useState(1);
  const [meetingStatus, setMeetingStatus] = useState<"pending" | "reschedule" | "accepted">("pending");
  const activeCalendar = calendarViews[calendarIndex];

  // Recent live records for each carousel.
  const [usersList, setUsersList] = useState<any[]>([]);
  const [jobsList, setJobsList] = useState<any[]>([]);
  const [institutionsList, setInstitutionsList] = useState<any[]>([]);
  const [competitionsList, setCompetitionsList] = useState<any[]>([]);
  const [coursesList, setCoursesList] = useState<any[]>([]);
  const [mentorsList, setMentorsList] = useState<any[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);

  const fetchLiveData = useCallback(async (forceRefresh: boolean = false) => {
    if (forceRefresh) {
      setIsSyncing(true);
      invalidateCache(dashboardCacheKey);
    } else {
      setIsLoading(true);
    }
    setDataLoadState("loading");

    try {
      const payload = await getCachedOrFetch(
        dashboardCacheKey,
        async () => {
          if(isNeonClientRuntime()) {
            const response=await fetch("/api/v1/neon-staging/admin/dashboard",{credentials:"same-origin",cache:"no-store"});
            const result=await response.json();
            if(!response.ok)throw new Error(result.error || "Dashboard unavailable.");
            return result.data;
          }
          const [
            usersRes,
            competitionsRes,
            institutionsRes,
            companiesRes,
            mentorsRes,
            jobsRes,
            coursesRes,
            instituteVerificationRes,
          ] = await Promise.all([
            supabase.from("profiles").select("*", { count: "exact" }).order("created_at", { ascending: false }).limit(10),
            supabase.from("competitions").select("*", { count: "exact" }).order("created_at", { ascending: false }).limit(10),
            supabase.from("institutes").select("*", { count: "exact" }).order("created_at", { ascending: false }).limit(10),
            supabase.from("companies").select("id", { count: "exact", head: true }),
            supabase.from("mentors").select("*", { count: "exact" }).order("created_at", { ascending: false }).limit(10),
            supabase.from("jobs").select("*", { count: "exact" }).order("created_at", { ascending: false }).limit(10),
            (supabase as any)
              .from("courses")
              .select("*", { count: "exact" })
              .eq("is_partnered", true)
              .is("deleted_at", null)
              .order("display_order", { ascending: true })
              .limit(10),
            supabase.from("institute_directory").select("id, payment_verified"),
          ]);

          const usersData = usersRes.data ?? [];
          const jobsData = jobsRes.data ?? [];
          const institutesData = institutionsRes.data ?? [];
          const mentorsData = mentorsRes.data ?? [];
          const coursesData = coursesRes.data ?? [];
          const competitionsData = competitionsRes.data ?? [];

          const mentorUserIds = mentorsData
            .map((mentor: any) => mentor.user_id)
            .filter((userId: unknown): userId is string => typeof userId === "string");
          const mentorProfilesRes = mentorUserIds.length > 0
            ? await (supabase as any)
              .from("profiles")
              .select("user_id,full_name,avatar_url")
              .in("user_id", mentorUserIds)
            : { data: [], error: null };
          const mentorProfileByUserId = new Map<string, any>(
            (mentorProfilesRes.data ?? []).map((profile: any) => [profile.user_id, profile]),
          );
          const formattedMentors = mentorsData.map((mentor: any) => {
            const profile = mentorProfileByUserId.get(mentor.user_id);
            return {
              ...mentor,
              full_name: profile?.full_name ?? null,
              avatar_url: profile?.avatar_url ?? mentor.profile_image_url ?? null,
              years_experience: mentor.years_experience == null ? null : Number(mentor.years_experience),
              rating: mentor.rating == null ? null : Number(mentor.rating),
              hourly_rate: mentor.hourly_rate == null ? null : Number(mentor.hourly_rate),
            };
          });

          const calculatedStats: AdminStats = {
            users: usersRes.count ?? 0,
            competitions: competitionsRes.count ?? 0,
            institutions: institutionsRes.count ?? 0,
            companies: companiesRes.count ?? 0,
            mentors: mentorsRes.count ?? 0,
            jobs: jobsRes.count ?? 0,
            courses: coursesRes.count ?? 0,
          };

          const paymentByInstitute = new Map(
            (instituteVerificationRes.data ?? []).map((institute) => [
              institute.id,
              institute.payment_verified === true,
            ]),
          );

          const formattedInstitutions = institutesData.map((institute) => ({
            ...institute,
            payment_verified: paymentByInstitute.get(institute.id) ?? false,
          }));

          const results = [
            usersRes,
            competitionsRes,
            institutionsRes,
            companiesRes,
            mentorsRes,
            jobsRes,
            coursesRes,
            instituteVerificationRes,
            mentorProfilesRes,
          ];
          const failedRequests = results.filter((result) => result.error).length;

          return {
            stats: calculatedStats,
            usersList: usersData,
            jobsList: jobsData,
            institutionsList: formattedInstitutions,
            competitionsList: competitionsData,
            coursesList: coursesData,
            mentorsList: formattedMentors,
            dataLoadState:
              failedRequests === 0
                ? "ready"
                : failedRequests === results.length
                  ? "error"
                  : "partial",
          };
        },
        3 * 60 * 1000,
        forceRefresh
      );

      setStats(payload.stats);
      setUsersList(payload.usersList);
      setJobsList(payload.jobsList);
      setInstitutionsList(payload.institutionsList);
      setCompetitionsList(payload.competitionsList);
      setCoursesList(payload.coursesList);
      setMentorsList(payload.mentorsList);
      setDataLoadState(payload.dataLoadState as any);
      setLastSyncedAt(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
    } catch {
      setDataLoadState("error");
    } finally {
      setIsLoading(false);
      setIsSyncing(false);
    }
  },[dashboardCacheKey]);

  useEffect(() => {
    void fetchLiveData(false);
  }, [fetchLiveData]);

  const quickActions = [
    {
      label: "User Management",
      description: "Review people and roles across workspace",
      icon: ShieldCheck,
      href: "/admin/users",
      tone: "bg-[#071a3d]/10 text-[#071a3d]",
    },
    {
      label: "Partner Courses",
      description: "Manage approved listings and redirect links",
      icon: BookOpen,
      href: "/admin/lms",
      tone: "bg-[#0f766e]/10 text-[#0f766e]",
    },
    {
      label: "Job Postings",
      description: "Review and publish job opportunities",
      icon: BriefcaseBusiness,
      href: "/admin/jobs",
      tone: "bg-[#071a3d]/10 text-[#071a3d]",
    },
  ];

  const assignments = [
    {
      title: "Verify new partner accounts",
      meta: `${stats.institutions + stats.companies} organisations in review`,
      tag: "High Priority",
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
      title: "Review partner courses",
      subtitle: `${stats.courses} directory listings`,
      progress: 34,
      icon: BookOpen,
      href: "/admin/lms",
    },
  ];

  return (
    <div className="space-y-6 text-[#0f172a] max-w-[1700px] w-full mx-auto px-2 sm:px-4 lg:px-6 bg-white py-2">
      {/* Hero Welcome Section */}
      <section className="grid gap-4 xl:grid-cols-[1.05fr_1.45fr]">
        <motion.div
          {...cardMotion}
          transition={{ duration: 0.35 }}
          className="rounded-[24px] border border-[#e2e8f0] bg-[#f8fafc] p-5 shadow-[0_12px_30px_rgba(0,0,0,0.04)] sm:p-6 flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-[#071a3d]">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                Live Command Centre
              </div>
              <div className="flex items-center gap-2">
                {lastSyncedAt && (
                  <span className="text-[11px] text-[#64748b] font-medium hidden sm:inline">
                    Synced {lastSyncedAt}
                  </span>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => fetchLiveData(true)}
                  disabled={isSyncing}
                  className="h-8 rounded-lg border-[#cbd5e1] bg-white text-xs font-bold text-[#071a3d] hover:bg-[#f1f5f9] flex items-center gap-1.5 shadow-sm"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? "animate-spin text-[#0073e6]" : ""}`} />
                  <span>{isSyncing ? "Pulling..." : "Pull / Sync"}</span>
                </Button>
              </div>
            </div>
            <h1 className="mt-4 text-balance font-display text-3xl font-bold leading-[1.06] tracking-[-0.035em] sm:text-[42px] text-[#0f172a]">
              Hi, {profile?.full_name?.split(" ")[0] || "Admin"}.
              <span className="block text-[#475569]">What are your plans today?</span>
            </h1>
            <p className="mt-4 max-w-md text-sm leading-6 text-[#64748b]">
              One calm workspace for people, programs, partners and every opportunity across MeroTalent.
            </p>
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button className="rounded-xl bg-[#071a3d] text-white shadow-lg shadow-[#071a3d]/20 hover:bg-[#05132d]" asChild>
              <Link to="/admin/jobs">
                <Plus className="h-4 w-4 mr-1" />
                New Opportunity
              </Link>
            </Button>
            <Button variant="outline" className="rounded-xl border-[#cbd5e1] bg-white text-[#071a3d] hover:bg-[#f1f5f9]" asChild>
              <Link to="/admin/users">View People</Link>
            </Button>
            <Button variant="outline" className="rounded-xl border-[#cbd5e1] bg-white text-[#071a3d] hover:bg-[#f1f5f9]" asChild>
              <Link to="/admin/access-requests">Access requests</Link>
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
                  className="group flex h-full min-h-[168px] flex-col rounded-[24px] border border-[#e2e8f0] bg-[#f8fafc] p-5 shadow-[0_10px_28px_rgba(0,0,0,0.03)] transition hover:-translate-y-1 hover:border-[#071a3d]/40 hover:bg-white hover:shadow-[0_16px_35px_rgba(0,0,0,0.06)]"
                >
                  <span className={`grid h-12 w-12 place-items-center rounded-[16px] ${action.tone}`}>
                    <Icon className="h-5 w-5" />
                  </span>
                  <h2 className="mt-auto pt-6 font-display text-base font-bold text-[#0f172a]">{action.label}</h2>
                  <p className="mt-1 text-xs leading-5 text-[#64748b]">{action.description}</p>
                  <ArrowRight className="mt-4 h-4 w-4 text-[#94a3b8] transition group-hover:translate-x-1 group-hover:text-[#071a3d]" />
                </Link>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* 6 MODULE CAROUSELS                                                 */}
      {/* ------------------------------------------------------------------ */}

      {/* 1. USERS & TALENT CAROUSEL */}
      <ModuleCarouselSection
        title="Talent & Members Directory"
        subtitle="Recent registered students, mentors, and administrators"
        viewMoreLink="/admin/users"
        viewMoreLabel="View More Users"
        icon={Users}
        items={usersList}
        isLoading={isLoading}
        emptyMessage="No user records are available yet."
        renderCard={(user: any) => (
          <div className="h-full rounded-2xl border border-[#e2e8f0] bg-white p-4 shadow-sm hover:border-[#071a3d]/40 transition space-y-3">
            <div className="flex items-center gap-3">
              <Avatar>
                <AvatarFallback className="bg-[#071a3d] text-white font-bold">
                  {(user.full_name || user.email || "U").charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-sm truncate text-[#0f172a]">{user.full_name || "User Profile"}</p>
                <p className="text-xs text-muted-foreground truncate">{user.email || "User Account"}</p>
              </div>
            </div>
            <div className="flex items-center justify-between text-xs pt-1 border-t">
              <Badge variant="outline" className="capitalize text-[10px] bg-[#f1f5f9]">
                {user.role || "student"}
              </Badge>
              <span className="text-muted-foreground text-[11px]">
                {user.location || "Nepal"}
              </span>
            </div>
          </div>
        )}
      />

      {/* 2. ACTIVE JOBS CAROUSEL */}
      <ModuleCarouselSection
        title="Active Job Listings"
        subtitle="Current employment and internship opportunities"
        viewMoreLink="/admin/jobs"
        viewMoreLabel="View More Jobs"
        icon={BriefcaseBusiness}
        items={jobsList}
        isLoading={isLoading}
        emptyMessage="No job records are available yet."
        renderCard={(job: any) => (
          <div className="h-full rounded-2xl border border-[#e2e8f0] bg-white p-4 shadow-sm hover:border-[#071a3d]/40 transition space-y-3 flex flex-col justify-between">
            <div>
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-semibold text-sm text-[#0f172a] line-clamp-1">{job.title}</h3>
                <Badge className="bg-[#071a3d]/10 text-[#071a3d] border-0 text-[10px] shrink-0 capitalize">
                  {job.job_type || "full-time"}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                <MapPin className="h-3 w-3 shrink-0" />
                {job.location || "Kathmandu, Nepal"}
              </p>
            </div>
            <div className="pt-2 border-t flex items-center justify-between text-xs">
              <span className="font-semibold text-[#0f766e]">
                {job.salary_max ? `NPR ${job.salary_max.toLocaleString()}` : "Market Competitive"}
              </span>
              <span className="text-[11px] text-muted-foreground">{job.experience_level || "Entry"}</span>
            </div>
          </div>
        )}
      />

      {/* 3. INSTITUTIONS DIRECTORY CAROUSEL */}
      <ModuleCarouselSection
        title="Institutions Directory"
        subtitle="Colleges, universities, and academic partners"
        viewMoreLink="/admin/institutions"
        viewMoreLabel="View More Institutions"
        icon={Building2}
        items={institutionsList}
        isLoading={isLoading}
        emptyMessage="No institute records are available yet."
        renderCard={(inst: any) => (
          <div className="h-full rounded-2xl border border-[#e2e8f0] bg-white p-4 shadow-sm hover:border-[#071a3d]/40 transition space-y-3 flex flex-col justify-between">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-xl bg-[#f1f5f9] text-[#071a3d] font-bold grid place-items-center shrink-0 border overflow-hidden">
                {inst.logo_url ? (
                  <img src={inst.logo_url} alt="Logo" className="h-full w-full object-cover" />
                ) : (
                  <Building2 className="h-5 w-5" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold text-sm text-[#0f172a] truncate">{inst.name}</h3>
                <p className="text-xs text-muted-foreground truncate">{inst.type || "Engineering & Tech"}</p>
              </div>
            </div>
            <div className="pt-2 border-t flex items-center justify-between text-xs">
              <span className="text-muted-foreground text-[11px] truncate">{inst.location || "Nepal"}</span>
              <Badge
                variant="outline"
                className={
                  inst.payment_verified
                    ? "text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200"
                    : "text-[10px] bg-amber-50 text-amber-700 border-amber-200"
                }
              >
                {inst.payment_verified ? "Verified" : "Pending"}
              </Badge>
            </div>
          </div>
        )}
      />

      {/* 4. COMPETITIONS & HACKATHONS CAROUSEL */}
      <ModuleCarouselSection
        title="Competitions & Hackathons"
        subtitle="National challenges and student competitions"
        viewMoreLink="/admin/competitions"
        viewMoreLabel="View More Competitions"
        icon={Trophy}
        items={competitionsList}
        isLoading={isLoading}
        emptyMessage="No competition records are available yet."
        renderCard={(comp: any) => (
          <div className="h-full rounded-2xl border border-[#e2e8f0] bg-white p-4 shadow-sm hover:border-[#071a3d]/40 transition space-y-3 flex flex-col justify-between">
            <div>
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-semibold text-sm text-[#0f172a] line-clamp-1">{comp.title}</h3>
                <Badge className="bg-amber-100 text-amber-800 border-0 text-[10px] shrink-0 capitalize">
                  {comp.type || "hackathon"}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                {comp.description || "Compete with top talent across Nepal and win cash prizes & certificates."}
              </p>
            </div>
            <div className="pt-2 border-t flex items-center justify-between text-xs">
              <span className="font-bold text-[#071a3d]">
                {comp.prize_pool || "Prize Pool Pool"}
              </span>
              <span className="text-[11px] text-muted-foreground capitalize">{comp.format || "Online"}</span>
            </div>
          </div>
        )}
      />

      {/* 5. PARTNER COURSE DIRECTORY */}
      <ModuleCarouselSection
        title="Partner Course Directory"
        subtitle="Approved course listings that redirect to learn.merotalent.com"
        viewMoreLink="/admin/lms"
        viewMoreLabel="Manage Partner Courses"
        icon={BookOpen}
        items={coursesList}
        isLoading={isLoading}
        emptyMessage="No course records are available yet."
        renderCard={(course: any) => (
          <div className="h-full rounded-2xl border border-[#e2e8f0] bg-white p-4 shadow-sm hover:border-[#071a3d]/40 transition space-y-3 flex flex-col justify-between">
            <div>
              <h3 className="font-semibold text-sm text-[#0f172a] line-clamp-1">{course.title}</h3>
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                {course.description || "Approved partner course listing."}
              </p>
            </div>
            <div className="pt-2 border-t flex items-center justify-between text-xs">
              <Badge variant="outline" className="text-[10px] bg-[#f1f5f9]">
                {course.category || "Course"}
              </Badge>
              <span className="font-semibold text-[#071a3d]">
                {course.partner_name || "Partner listing"}
              </span>
            </div>
          </div>
        )}
      />

      {/* 6. MENTORS DIRECTORY CAROUSEL */}
      <ModuleCarouselSection
        title="Mentors Directory"
        subtitle="Expert advisors available for 1-on-1 sessions"
        viewMoreLink="/admin/mentors"
        viewMoreLabel="View More Mentors"
        icon={GraduationCap}
        items={mentorsList}
        isLoading={isLoading}
        emptyMessage="No mentor records are available yet."
        renderCard={(mentor: any) => (
          <div className="h-full rounded-2xl border border-[#e2e8f0] bg-white p-4 shadow-sm hover:border-[#071a3d]/40 transition space-y-3 flex flex-col justify-between">
            <div className="flex items-center gap-3">
              <Avatar>
                {mentor.avatar_url && (
                  <AvatarImage src={mentor.avatar_url} alt={mentor.full_name || "Mentor profile"} />
                )}
                <AvatarFallback className="bg-emerald-700 text-white font-bold">
                  {(mentor.full_name || "?").charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold text-sm text-[#0f172a] truncate">{mentor.full_name || "Name unavailable"}</h3>
                <p className="text-xs text-muted-foreground truncate">
                  {mentor.years_experience == null
                    ? "Experience not provided"
                    : `${mentor.years_experience} ${mentor.years_experience === 1 ? "year" : "years"} experience`}
                </p>
              </div>
            </div>
            <div className="pt-2 border-t flex items-center justify-between text-xs">
              <span className="flex items-center gap-1 font-semibold">
                <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                {mentor.rating == null ? "Not rated" : mentor.rating.toLocaleString()}
              </span>
              <span className="font-bold text-[#071a3d]">
                {mentor.hourly_rate == null
                  ? "Rate not provided"
                  : `NPR ${mentor.hourly_rate.toLocaleString()}/hr`}
              </span>
            </div>
          </div>
        )}
      />

      {/* System Status Footer */}
      <section className="grid gap-3 sm:grid-cols-3 pt-2">
        {[
          [
            CircleCheck,
            "Data source",
            dataLoadState === "loading"
              ? `Loading ${isNeonClientRuntime() ? "Neon" : "Supabase"} records`
              : dataLoadState === "ready"
                ? `${isNeonClientRuntime() ? "Neon" : "Supabase"} records loaded`
                : dataLoadState === "partial"
                  ? "Some records unavailable"
                  : "Records unavailable",
            dataLoadState === "ready"
              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
              : "bg-amber-50 text-amber-700 border-amber-200",
          ],
          [Building2, "Total Partners", stats.institutions + stats.companies, "bg-[#071a3d]/10 text-[#071a3d]"],
          [Clock3, "Refresh mode", "Loaded on page visit", "bg-sky-50 text-sky-700 border-sky-200"],
        ].map(([Icon, label, value, tone]) => {
          const StatusIcon = Icon as typeof CircleCheck;
          return (
            <div key={String(label)} className="flex items-center gap-3 rounded-[18px] border border-[#e2e8f0] bg-[#f8fafc] p-4">
              <span className={`grid h-9 w-9 place-items-center rounded-xl border ${tone}`}>
                <StatusIcon className="h-4 w-4" />
              </span>
              <span>
                <span className="block text-xs font-bold text-[#0f172a]">{label as string}</span>
                <span className="mt-0.5 block text-xs text-[#64748b]">{value as string | number}</span>
              </span>
            </div>
          );
        })}
      </section>
    </div>
  );
};

export default AdminDashboard;
