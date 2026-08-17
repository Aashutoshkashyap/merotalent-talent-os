"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Bell,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  Clock3,
  GraduationCap,
  Loader2,
  RefreshCw,
  Sparkles,
  Target,
  Users,
} from "lucide-react";
import { Link } from "react-router-dom";

import { useAuth } from "@/contexts/AuthContext";
import { useStudentActivity } from "@/hooks/useStudentActivity";
import { Button } from "@/components/ui/button";

const surface =
  "rounded-[24px] border border-[#f0e2d7] bg-white shadow-[0_18px_55px_rgba(69,42,21,0.065)]";

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.055 } },
};

const rise = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.38, ease: "easeOut" as const } },
};

const formatDate = (value: string | null, options?: Intl.DateTimeFormatOptions) => {
  if (!value) return "Date unavailable";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date unavailable";
  return new Intl.DateTimeFormat("en-NP", options || {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
};

const formatStatus = (value: string) =>
  value.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());

type ActivityKind = "college" | "job" | "event" | "mentor";

interface ActivityItem {
  id: string;
  kind: ActivityKind;
  title: string;
  detail: string;
  status: string;
  occurredAt: string;
  scheduledAt?: string | null;
  href: string;
}

const activityIcon = {
  college: GraduationCap,
  job: BriefcaseBusiness,
  event: CalendarDays,
  mentor: Users,
} as const;

const activityTone = {
  college: "bg-blue-50 text-blue-700",
  job: "bg-[#f3ecff] text-[#7758b5]",
  event: "bg-[#e8faf4] text-[#30987c]",
  mentor: "bg-[#fff0e4] text-[#c2410c]",
} as const;

const Dashboard = () => {
  const { profile } = useAuth();
  const {
    collegeApplications,
    error,
    eventRegistrations,
    isLoading,
    jobApplications,
    mentorBookings,
    refresh,
  } = useStudentActivity();
  const firstName = profile?.full_name?.split(" ")[0] || "Talent";
  const now = useMemo(() => new Date(), []);

  const activities = useMemo<ActivityItem[]>(() => {
    const rows: ActivityItem[] = [
      ...collegeApplications.map((application) => ({
        id: `college-${application.id}`,
        kind: "college" as const,
        title: application.instituteName,
        detail: application.programInterest || "College application",
        status: application.status,
        occurredAt: application.updatedAt,
        href: "/institutes",
      })),
      ...jobApplications.map((application) => ({
        id: `job-${application.id}`,
        kind: "job" as const,
        title: application.jobTitle,
        detail: application.companyName,
        status: application.status,
        occurredAt: application.updatedAt,
        href: "/dashboard/jobs",
      })),
      ...eventRegistrations.map((registration) => ({
        id: `event-${registration.id}`,
        kind: "event" as const,
        title: registration.eventTitle,
        detail: `${registration.ticketQuantity} ${registration.ticketQuantity === 1 ? "ticket" : "tickets"}`,
        status: registration.status,
        occurredAt: registration.registeredAt,
        scheduledAt: registration.eventStart,
        href: "/events",
      })),
      ...mentorBookings.map((booking) => ({
        id: `mentor-${booking.id}`,
        kind: "mentor" as const,
        title: booking.topic || booking.serviceTitle || "Mentor session",
        detail: `with ${booking.mentorName}`,
        status: booking.status,
        occurredAt: booking.createdAt,
        scheduledAt: booking.scheduledStart,
        href: "/dashboard/sessions",
      })),
    ];
    return rows.sort(
      (left, right) => new Date(right.occurredAt).getTime() - new Date(left.occurredAt).getTime(),
    );
  }, [collegeApplications, eventRegistrations, jobApplications, mentorBookings]);

  const upcoming = useMemo(
    () => activities
      .filter((item) => {
        if (!item.scheduledAt) return false;
        const scheduled = new Date(item.scheduledAt).getTime();
        return Number.isFinite(scheduled) && scheduled >= now.getTime() && !["cancelled", "declined"].includes(item.status);
      })
      .sort((left, right) => new Date(left.scheduledAt!).getTime() - new Date(right.scheduledAt!).getTime()),
    [activities, now],
  );

  const nextBooking = mentorBookings
    .filter((booking) => new Date(booking.scheduledStart).getTime() >= now.getTime() && ["pending", "confirmed"].includes(booking.status))
    .sort((left, right) => new Date(left.scheduledStart).getTime() - new Date(right.scheduledStart).getTime())[0];
  const uniqueMentors = new Set(mentorBookings.map((booking) => booking.mentorId)).size;
  const weekAhead = upcoming.filter((item) => {
    const scheduled = new Date(item.scheduledAt!).getTime();
    return scheduled <= now.getTime() + 7 * 86_400_000;
  });
  const profileFields = [
    profile?.full_name,
    profile?.phone,
    profile?.bio,
    profile?.location,
    profile?.education,
    profile?.resume_url,
  ];
  const profileCompletion = Math.round(
    (profileFields.filter((value) => typeof value === "string" && value.trim().length > 0).length / profileFields.length) * 100,
  );

  if (isLoading) {
    return (
      <div className={`${surface} flex min-h-72 items-center justify-center text-sm font-semibold text-[#77717f]`}>
        <Loader2 className="mr-2 h-5 w-5 animate-spin text-[#c2410c]" />
        Loading your activity…
      </div>
    );
  }

  if (error) {
    return (
      <div className={`${surface} flex min-h-72 flex-col items-center justify-center p-8 text-center`}>
        <Bell className="h-9 w-9 text-red-500" />
        <h1 className="mt-4 text-xl font-black text-[#19172b]">Your dashboard could not be loaded</h1>
        <p className="mt-2 max-w-lg text-sm text-[#77717f]">{error}</p>
        <Button onClick={() => void refresh()} variant="outline" className="mt-5 rounded-xl">
          <RefreshCw className="mr-2 h-4 w-4" />Retry
        </Button>
      </div>
    );
  }

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-4 pb-3 sm:space-y-5">
      <motion.section variants={rise} className="grid gap-4 xl:grid-cols-12">
        <div className={`${surface} relative overflow-hidden p-5 sm:p-6 xl:col-span-9`}>
          <div className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-[#fff0e5]" />
          <div className="pointer-events-none absolute right-8 top-7 hidden h-28 w-28 rotate-6 rounded-[30px] border border-[#ffd9bd] bg-[#fff8f2] sm:block">
            <div className="absolute left-5 top-7 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#c2410c] text-white shadow-[0_12px_28px_rgba(249,115,22,0.25)]">
              <Target className="h-6 w-6" />
            </div>
          </div>
          <div className="relative max-w-2xl">
            <div className="mb-5 flex flex-wrap items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-[#9c949e]">
              <span className="rounded-full bg-[#fff0e5] px-3 py-1.5 text-[#c2410c]">
                {new Intl.DateTimeFormat("en-NP", { weekday: "long" }).format(now)}
              </span>
              <span>{formatDate(now.toISOString(), { day: "numeric", month: "long", year: "numeric" })}</span>
            </div>
            <h1 className="max-w-3xl text-[2.25rem] font-black leading-[1.04] tracking-[-0.055em] text-[#19172b] sm:text-[3rem]">
              Hi, {firstName}.
              <br />
              Your activity is <span className="text-[#c2410c]">in one place.</span>
            </h1>
            <p className="mt-3 max-w-lg text-sm leading-6 text-[#77717f]">
              Track submitted applications, event registrations, and mentor bookings from live platform records.
            </p>
            <div className="mt-5 flex flex-wrap gap-2.5">
              <Button asChild className="h-10 rounded-xl bg-[#c2410c] px-4 text-xs text-white hover:bg-[#9a3412]">
                <Link to="/dashboard/jobs">Explore jobs <ArrowRight className="h-4 w-4" /></Link>
              </Button>
              <Button asChild variant="outline" className="h-10 rounded-xl border-[#eadbd0] bg-white px-4 text-xs">
                <Link to="/dashboard/profile">Complete profile</Link>
              </Button>
            </div>
          </div>
        </div>

        <div className={`${surface} relative overflow-hidden !bg-[#19172b] p-5 text-white xl:col-span-3`}>
          <div className="absolute -right-8 -top-8 h-28 w-28 rounded-full bg-[#c2410c]" />
          <div className="relative flex h-full min-h-56 flex-col">
            <div className="flex items-start justify-between">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10"><Users className="h-5 w-5 text-[#68c9ad]" /></div>
              <Sparkles className="h-5 w-5 text-[#ffd7b9]" />
            </div>
            <p className="mt-8 text-xl font-black leading-tight tracking-[-0.04em]">Your mentor schedule.</p>
            <p className="mt-2 text-xs leading-5 text-white/60">
              {nextBooking ? `Next session ${formatDate(nextBooking.scheduledStart, { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}.` : "No upcoming mentor session is booked."}
            </p>
            <div className="mt-auto flex items-end justify-between border-t border-white/10 pt-4">
              <div><span className="text-2xl font-black">{uniqueMentors}</span><span className="ml-1.5 text-xs text-white/55">mentors booked</span></div>
              <Link to="/dashboard/mentors" className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-[#19172b]" aria-label="View mentors"><ArrowRight className="h-4 w-4" /></Link>
            </div>
          </div>
        </div>
      </motion.section>

      <motion.section variants={rise} className="grid gap-4 lg:grid-cols-3">
        <div className={`${surface} overflow-hidden`}>
          <div className="flex items-center justify-between px-5 pb-3 pt-5">
            <div><p className="text-base font-black">Recent activity</p><p className="text-xs text-[#9a939c]">Your latest submissions</p></div>
            <span className="text-xs font-bold text-[#9a939c]">{activities.length} total</span>
          </div>
          <div className="space-y-2.5 px-3 pb-3">
            {activities.slice(0, 3).map((item) => {
              const Icon = activityIcon[item.kind];
              return (
                <Link key={item.id} to={item.href} className="flex items-center gap-3 rounded-[17px] bg-[#f8f4f0] p-3 hover:bg-[#fff9f4]">
                  <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${activityTone[item.kind]}`}><Icon className="h-4 w-4" /></div>
                  <div className="min-w-0 flex-1"><p className="truncate text-xs font-extrabold">{item.title}</p><p className="mt-0.5 truncate text-xs text-[#9b949c]">{formatStatus(item.status)} · {formatDate(item.occurredAt)}</p></div>
                </Link>
              );
            })}
            {activities.length === 0 && <p className="rounded-[17px] bg-[#f8f4f0] p-5 text-center text-xs text-[#8e8791]">No applications, registrations, or bookings yet.</p>}
          </div>
        </div>

        <div className={`${surface} flex flex-col p-5`}>
          <div><p className="text-base font-black">Next scheduled item</p><p className="text-xs text-[#9a939c]">Your nearest confirmed plan</p></div>
          <div className="my-4 h-px bg-[#f1e5dc]" />
          {upcoming[0] ? (
            <div className="flex flex-1 flex-col">
              <div className="flex items-center gap-2 text-xs font-bold text-[#c2410c]"><span>{formatStatus(upcoming[0].kind)}</span><span>•</span><span className="text-[#6f6976]">{formatStatus(upcoming[0].status)}</span></div>
              <p className="mt-2 text-lg font-black leading-snug">{upcoming[0].title}</p>
              <p className="mt-2 text-sm text-[#77717f]">{upcoming[0].detail}</p>
              <p className="mt-4 rounded-xl bg-[#e5f8f1] px-3 py-2 text-xs font-bold text-[#287f69]">
                {formatDate(upcoming[0].scheduledAt || null, { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}
              </p>
              <Link to={upcoming[0].href} className="mt-auto pt-4 text-xs font-black text-[#c2410c]">View details →</Link>
            </div>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center py-6 text-center"><CalendarDays className="h-8 w-8 text-[#c9c1c6]" /><p className="mt-3 text-sm font-bold">Nothing upcoming</p><p className="mt-1 text-xs text-[#9a939c]">Book a mentor or register for an event.</p></div>
          )}
        </div>

        <div className={`${surface} p-5`}>
          <div className="flex items-start justify-between"><div><p className="text-base font-black">Next 7 days</p><p className="text-xs text-[#9a939c]">Events and mentor sessions</p></div><span className="rounded-xl bg-[#fff1e5] px-2.5 py-1.5 text-xs font-black text-[#c2410c]">{weekAhead.length}</span></div>
          <div className="my-4 border-t border-dashed border-[#dcd0c7]" />
          <div className="space-y-3">
            {weekAhead.slice(0, 3).map((item) => (
              <Link key={item.id} to={item.href} className="flex items-start gap-3">
                <span className={`mt-1 h-2.5 w-2.5 rounded-full ${item.kind === "mentor" ? "bg-[#c2410c]" : "bg-[#68c9ad]"}`} />
                <div className="min-w-0 flex-1"><p className="truncate text-xs font-extrabold">{item.title}</p><p className="mt-0.5 text-xs text-[#9b949d]">{formatDate(item.scheduledAt || null, { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}</p></div>
              </Link>
            ))}
            {weekAhead.length === 0 && <p className="py-6 text-center text-xs text-[#9a939c]">No scheduled activity this week.</p>}
          </div>
        </div>
      </motion.section>

      <motion.section variants={rise} className="grid gap-4 xl:grid-cols-12">
        <div className={`${surface} p-4 sm:p-5 xl:col-span-7`}>
          <div className="flex items-center justify-between gap-3"><div><p className="text-base font-black">Application and booking history</p><p className="text-xs text-[#9a939c]">Latest status recorded by each module</p></div><span className="text-xs font-bold text-[#9a939c]">{activities.length} records</span></div>
          <div className="mt-4 space-y-2">
            {activities.slice(0, 6).map((item) => {
              const Icon = activityIcon[item.kind];
              return (
                <Link key={item.id} to={item.href} className="grid items-center gap-3 rounded-[17px] bg-[#fbf8f5] p-3 hover:bg-white sm:grid-cols-[auto_minmax(0,1fr)_auto]">
                  <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${activityTone[item.kind]}`}><Icon className="h-4 w-4" /></div>
                  <div className="min-w-0"><p className="truncate text-xs font-extrabold">{item.title}</p><p className="mt-0.5 truncate text-xs text-[#9c959d]">{item.detail} · {formatDate(item.occurredAt)}</p></div>
                  <span className="rounded-full border border-[#e7d9cf] bg-white px-2.5 py-1 text-xs font-bold text-[#6f6976]">{formatStatus(item.status)}</span>
                </Link>
              );
            })}
            {activities.length === 0 && <div className="rounded-[17px] bg-[#fbf8f5] p-8 text-center text-sm text-[#8e8791]">Your submitted activity will appear here.</div>}
          </div>
        </div>

        <div className="relative overflow-hidden rounded-[24px] bg-[#c2410c] p-5 text-white shadow-[0_20px_44px_rgba(249,115,22,0.23)] xl:col-span-2">
          <div className="relative flex h-full min-h-56 flex-col"><div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/15"><GraduationCap className="h-5 w-5" /></div><p className="mt-5 text-xl font-black leading-tight">Explore partner courses.</p><p className="mt-2 text-xs leading-5 text-white/75">Compare published partner listings before continuing to the learning platform.</p><Link to="/courses" className="mt-auto flex items-center justify-between rounded-2xl bg-[#19172b] px-3.5 py-3 text-xs font-bold">Browse courses <ArrowRight className="h-4 w-4" /></Link></div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:col-span-3 xl:grid-cols-1">
          <div className={`${surface} p-4`}><p className="text-xs font-bold uppercase tracking-[0.14em] text-[#a098a3]">Profile completion</p><p className="mt-2 text-3xl font-black text-[#19172b]">{profileCompletion}%</p><div className="mt-3 h-2 overflow-hidden rounded-full bg-[#eee7e1]"><div className="h-full rounded-full bg-[#68c9ad]" style={{ width: `${profileCompletion}%` }} /></div><Link to="/dashboard/profile" className="mt-3 block text-xs font-black text-[#c2410c]">Review profile →</Link></div>
          <div className={`${surface} p-4`}><p className="text-sm font-black">Next mentor session</p>{nextBooking ? <><p className="mt-1 text-xs text-[#9a939c]">{formatDate(nextBooking.scheduledStart, { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}</p><p className="mt-3 text-xs leading-5 text-[#746e79]">{nextBooking.topic || nextBooking.serviceTitle || "Mentor session"} with {nextBooking.mentorName}.</p><Link to="/dashboard/sessions" className="mt-3 block text-xs font-black text-[#c2410c]">View booking →</Link></> : <p className="mt-3 text-xs leading-5 text-[#746e79]">No upcoming mentor booking.</p>}</div>
        </div>
      </motion.section>

      <motion.section variants={rise} className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { icon: Building2, value: collegeApplications.length, label: "College applications", href: "/institutes", color: "bg-blue-50 text-blue-700" },
          { icon: BriefcaseBusiness, value: jobApplications.length, label: "Job applications", href: "/dashboard/jobs", color: "bg-[#f3ecff] text-[#7758b5]" },
          { icon: CalendarDays, value: eventRegistrations.length, label: "Event registrations", href: "/events", color: "bg-[#e8faf4] text-[#30987c]" },
          { icon: Clock3, value: mentorBookings.length, label: "Mentor sessions", href: "/dashboard/sessions", color: "bg-[#fff0e4] text-[#c2410c]" },
        ].map((stat) => (
          <Link key={stat.label} to={stat.href} className={`${surface} group flex items-center gap-3 p-3.5 transition-transform hover:-translate-y-1`}><div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${stat.color}`}><stat.icon className="h-4 w-4" /></div><div className="min-w-0"><p className="text-lg font-black leading-none">{stat.value}</p><p className="mt-1 truncate text-xs font-semibold text-[#98919a]">{stat.label}</p></div></Link>
        ))}
      </motion.section>
    </motion.div>
  );
};

export default Dashboard;
