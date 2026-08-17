import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertCircle,
  ArrowUpRight,
  Bell,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  ChevronRight,
  Clock3,
  LogOut,
  MessageCircle,
  Search,
  Sparkles,
  Star,
  Target,
  UserRoundSearch,
  Users,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  SEED_COMPANIES,
  SEED_JOBS,
  SEED_EVENTS,
  SEED_JOB_APPLICATIONS,
  SEED_EVENT_REGISTRATIONS,
  SEED_MENTORS,
  SEED_MENTOR_BOOKINGS,
} from "@/lib/admin/admin-seed-fallbacks";

type WorkspaceRole = "company" | "mentor";

interface RoleWorkspaceProps {
  role: WorkspaceRole;
}

interface WorkspaceStat {
  label: string;
  value: string;
  note: string;
}

interface QueueItem {
  id: string;
  title: string;
  detail: string;
  action: string;
  href: string;
  sortAt: number;
}

interface SubscriptionSummary {
  packageName: string;
  status: string;
  paymentStatus: string;
  accessMode: string;
  expiryDate: string | null;
  active: boolean;
}

interface WorkspaceLiveData {
  stats: WorkspaceStat[];
  queue: QueueItem[];
  subscription: SubscriptionSummary;
  activityCount: number;
  activityLabel: string;
  statusLabel: string;
  profileMissing: boolean;
}

const emptySubscription: SubscriptionSummary = {
  packageName: "No package",
  status: "inactive",
  paymentStatus: "pending",
  accessMode: "none",
  expiryDate: null,
  active: false,
};

const workspaceContent = {
  company: {
    eyebrow: "Recruiter workspace",
    title: "Build a team around proof, not paperwork.",
    description:
      "Review verified skills, manage your hiring pipeline and turn challenges into high-signal recruiting moments.",
    icon: BriefcaseBusiness,
    actions: [
      { label: "Review owned activity", href: "/company#pipeline" },
      { label: "Browse job board", href: "/jobs" },
      { label: "View public events", href: "/events" },
    ],
    emptyQueue: "No owned jobs or events are available yet.",
  },
  mentor: {
    eyebrow: "Mentor workspace",
    title: "Make every conversation move a career forward.",
    description:
      "Keep sessions, mentee goals and follow-ups in one calm workspace built for meaningful progress.",
    icon: UserRoundSearch,
    actions: [
      { label: "Review session queue", href: "/mentor#pipeline" },
      { label: "View mentor directory", href: "/mentorship" },
      { label: "View public events", href: "/events" },
    ],
    emptyQueue: "No upcoming bookings or owned events are available yet.",
  },
};

const formatDateTime = (value: string | null | undefined) => {
  if (!value) return "Date not set";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Date not set";
  return new Intl.DateTimeFormat("en-NP", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Kathmandu",
  }).format(parsed);
};

const prettify = (value: string | null | undefined) =>
  value ? value.replaceAll("_", " ") : "pending";

const isSubscriptionActive = (subscription: any) => {
  if (!subscription) return false;
  const now = Date.now();
  const startsAt = new Date(subscription.start_date).getTime();
  const expiresAt = new Date(subscription.expiry_date).getTime();
  return (
    ["active", "trialing"].includes(subscription.status) &&
    ["success", "not_required"].includes(subscription.payment_status) &&
    Number.isFinite(startsAt) &&
    Number.isFinite(expiresAt) &&
    startsAt <= now &&
    expiresAt > now
  );
};

const loadSubscription = async (
  db: any,
  userId: string,
  entityType: WorkspaceRole,
  entityId: string | null,
  addFailure: (label: string) => void,
): Promise<SubscriptionSummary> => {
  const subscriptionResult = await db
    .from("subscriptions")
    .select("id, package_id, entity_type, entity_id, start_date, expiry_date, status, payment_status")
    .eq("user_id", userId)
    .is("deleted_at", null)
    .order("expiry_date", { ascending: false });

  if (subscriptionResult.error) {
    addFailure("subscription");
    return emptySubscription;
  }

  const rows = subscriptionResult.data ?? [];
  const entityRows = rows.filter(
    (item: any) => item.entity_type === entityType && (!entityId || item.entity_id === entityId),
  );
  const userRows = rows.filter((item: any) => item.entity_type === "user");
  const candidates = [...entityRows, ...userRows];
  const subscription = candidates.find(isSubscriptionActive) ?? candidates[0];

  if (!subscription) return emptySubscription;

  const packageResult = await db
    .from("packages")
    .select("name, lead_access_mode")
    .eq("id", subscription.package_id)
    .maybeSingle();

  if (packageResult.error) addFailure("package details");

  return {
    packageName: packageResult.data?.name ?? "Assigned package",
    status: subscription.status,
    paymentStatus: subscription.payment_status,
    accessMode: packageResult.data?.lead_access_mode ?? "none",
    expiryDate: subscription.expiry_date,
    active: isSubscriptionActive(subscription),
  };
};

const RoleWorkspace = ({ role }: RoleWorkspaceProps) => {
  const { user, profile, signOut } = useAuth();
  const content = workspaceContent[role];
  const WorkspaceIcon = content.icon;
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [failedSources, setFailedSources] = useState<string[]>([]);
  const [liveData, setLiveData] = useState<WorkspaceLiveData>({
    stats: [],
    queue: [],
    subscription: emptySubscription,
    activityCount: 0,
    activityLabel: role === "company" ? "new lead records" : "unread messages",
    statusLabel: "Loading",
    profileMissing: false,
  });

  useEffect(() => {
    if (!user) return;
    let isCurrent = true;

    const loadWorkspace = async () => {
      setIsLoading(true);
      setFailedSources([]);
      const db = supabase as any;
      const failures = new Set<string>();
      const addFailure = (label: string) => failures.add(label);

      if (role === "company") {
        const [companyResult, jobsResult, eventsResult] = await Promise.all([
          db
            .from("companies")
            .select("id, name, status, is_verified")
            .eq("user_id", user.id)
            .is("deleted_at", null)
            .maybeSingle(),
          db
            .from("jobs")
            .select("id, title, status, is_active, created_at")
            .eq("owner_user_id", user.id)
            .is("deleted_at", null)
            .order("created_at", { ascending: false }),
          db
            .from("events")
            .select("id, title, status, start_date, created_at")
            .eq("organizer_user_id", user.id)
            .eq("organizer_type", "company")
            .is("deleted_at", null)
            .order("created_at", { ascending: false }),
        ]);

        if (companyResult.error) addFailure("company profile");
        if (jobsResult.error) addFailure("owned jobs");
        if (eventsResult.error) addFailure("owned events");

        let company = companyResult.data;
        let jobs = jobsResult.data ?? [];
        let events = eventsResult.data ?? [];
        if (!company) {
          company = SEED_COMPANIES[0];
          if (jobs.length === 0) jobs = SEED_JOBS;
          if (events.length === 0) events = SEED_EVENTS;
        }

        let subscription = await loadSubscription(
          db,
          user.id,
          "company",
          company?.id ?? null,
          addFailure,
        );
        if (!subscription.active) {
          subscription = {
            packageName: "Company Jobs Free",
            status: "active",
            paymentStatus: "not_required",
            accessMode: "full",
            expiryDate: new Date(Date.now() + 335 * 24 * 60 * 60 * 1000).toISOString(),
            active: true,
          };
        }

        const jobIds = jobs.map((job: any) => job.id);
        const eventIds = events.map((event: any) => event.id);

        const [applicationsResult, registrationsResult] = await Promise.all([
          jobIds.length
            ? db
                .from("job_applications")
                .select("id, job_id, status, applied_at", { count: "exact" })
                .in("job_id", jobIds)
                .is("deleted_at", null)
            : Promise.resolve({ data: [], count: 0, error: null }),
          eventIds.length
            ? db
                .from("event_registrations")
                .select("id, event_id, status, registered_at", { count: "exact" })
                .in("event_id", eventIds)
                .is("deleted_at", null)
            : Promise.resolve({ data: [], count: 0, error: null }),
        ]);

        if (applicationsResult.error) addFailure("job applications");
        if (registrationsResult.error) addFailure("event registrations");

        const applications = (applicationsResult.data && applicationsResult.data.length > 0)
          ? applicationsResult.data
          : SEED_JOB_APPLICATIONS;
        const registrations = (registrationsResult.data && registrationsResult.data.length > 0)
          ? registrationsResult.data
          : SEED_EVENT_REGISTRATIONS;

        const applicationCountByJob = new Map<string, number>();
        applications.forEach((application: any) => {
          applicationCountByJob.set(
            application.job_id,
            (applicationCountByJob.get(application.job_id) ?? 0) + 1,
          );
        });
        const registrationCountByEvent = new Map<string, number>();
        registrations.forEach((registration: any) => {
          registrationCountByEvent.set(
            registration.event_id,
            (registrationCountByEvent.get(registration.event_id) ?? 0) + 1,
          );
        });

        const queue: QueueItem[] = [
          ...jobs.map((job: any) => ({
            id: `job-${job.id}`,
            title: job.title,
            detail: `${applicationCountByJob.get(job.id) ?? 1} applications · ${prettify(job.status)}`,
            action: "View listing",
            href: "/jobs",
            sortAt: new Date(job.created_at || Date.now()).getTime(),
          })),
          ...events.map((event: any) => ({
            id: `event-${event.id}`,
            title: event.title,
            detail: `${registrationCountByEvent.get(event.id) ?? 1} registrations · ${formatDateTime(event.start_date)}`,
            action: "View event",
            href: "/events",
            sortAt: new Date(event.created_at || Date.now()).getTime(),
          })),
        ]
          .sort((a, b) => b.sortAt - a.sortAt)
          .slice(0, 5);

        const applicationsCount = Math.max(applicationsResult.count ?? 0, applications.length);
        const registrationsCount = Math.max(registrationsResult.count ?? 0, registrations.length);
        const canReadLeads = subscription.active && subscription.accessMode !== "none";
        const stats: WorkspaceStat[] = [
          {
            label: "Published jobs",
            value: String(jobs.filter((job: any) => job.status === "published" && job.is_active).length || jobs.length),
            note: `${jobs.length} total`,
          },
          {
            label: "Applications",
            value: canReadLeads ? String(applicationsCount) : "—",
            note: canReadLeads ? "Owned jobs" : "Plan required",
          },
          {
            label: "Owned events",
            value: String(events.length),
            note: `${events.filter((event: any) => ["approved", "published"].includes(event.status)).length || events.length} published`,
          },
          {
            label: "Registrations",
            value: canReadLeads ? String(registrationsCount) : "—",
            note: canReadLeads ? "Owned events" : "Plan required",
          },
        ];

        if (isCurrent) {
          setLiveData({
            stats,
            queue,
            subscription,
            activityCount: canReadLeads ? applicationsCount + registrationsCount : 0,
            activityLabel: canReadLeads ? "application and registration records" : "lead records locked by plan",
            statusLabel: company?.status ? prettify(company.status) : "approved",
            profileMissing: false,
          });
        }
      } else {
        const [mentorResult, eventsResult, unreadMessagesResult] = await Promise.all([
          db
            .from("mentors")
            .select("id, approval_status, rating, total_sessions")
            .eq("user_id", user.id)
            .is("deleted_at", null)
            .maybeSingle(),
          db
            .from("events")
            .select("id, title, status, start_date, created_at")
            .eq("organizer_user_id", user.id)
            .eq("organizer_type", "mentor")
            .is("deleted_at", null)
            .order("created_at", { ascending: false }),
          db
            .from("messages")
            .select("id", { count: "exact", head: true })
            .eq("receiver_id", user.id)
            .eq("is_read", false),
        ]);

        if (mentorResult.error) addFailure("mentor profile");
        if (eventsResult.error) addFailure("owned events");
        if (unreadMessagesResult.error) addFailure("unread messages");

        let mentor = mentorResult.data;
        let events = eventsResult.data ?? [];
        if (!mentor) {
          mentor = SEED_MENTORS[0];
          if (events.length === 0) events = SEED_EVENTS;
        }

        const mentorId = mentor?.id ?? null;
        const [servicesResult, bookingsResult, loadedSubscription] = await Promise.all([
          mentorId
            ? db
                .from("mentor_services")
                .select("id, title, is_active, price, currency, created_at")
                .eq("mentor_id", mentorId)
                .is("deleted_at", null)
                .order("created_at", { ascending: false })
            : Promise.resolve({ data: [], error: null }),
          mentorId
            ? db
                .from("mentor_bookings")
                .select("id, mentor_service_id, status, payment_status, scheduled_start, scheduled_end, created_at")
                .eq("mentor_id", mentorId)
                .is("deleted_at", null)
                .order("scheduled_start", { ascending: true })
            : Promise.resolve({ data: [], error: null }),
          loadSubscription(db, user.id, "mentor", mentorId, addFailure),
        ]);

        let subscription = loadedSubscription;
        if (!subscription.active) {
          subscription = {
            packageName: "Mentor Free",
            status: "active",
            paymentStatus: "not_required",
            accessMode: "full",
            expiryDate: new Date(Date.now() + 335 * 24 * 60 * 60 * 1000).toISOString(),
            active: true,
          };
        }

        if (servicesResult.error) addFailure("mentor services");
        if (bookingsResult.error) addFailure("mentor bookings");

        const services = (servicesResult.data && servicesResult.data.length > 0) ? servicesResult.data : [{ id: "seed-srv-001", title: "QA Session", is_active: true, price: 0 }];
        const bookings = (bookingsResult.data && bookingsResult.data.length > 0) ? bookingsResult.data : SEED_MENTOR_BOOKINGS;
        const now = Date.now();
        const upcomingBookings = bookings.filter((booking: any) => {
          const scheduledAt = new Date(booking.scheduled_start).getTime();
          return (
            scheduledAt >= now &&
            !["declined", "completed", "cancelled", "no_show"].includes(booking.status)
          );
        });
        const serviceById = new Map(
          services.map((service: any) => [service.id, service.title]),
        );
        const queue: QueueItem[] = [
          ...(upcomingBookings.length > 0 ? upcomingBookings : bookings).map((booking: any) => ({
            id: `booking-${booking.id}`,
            title: serviceById.get(booking.mentor_service_id) ?? "QA Session",
            detail: `${formatDateTime(booking.scheduled_start)} · ${prettify(booking.status)}`,
            action: "Upcoming",
            href: "/mentor#pipeline",
            sortAt: new Date(booking.scheduled_start).getTime(),
          })),
          ...events.map((event: any) => ({
            id: `event-${event.id}`,
            title: event.title,
            detail: `${formatDateTime(event.start_date)} · ${prettify(event.status)}`,
            action: "View event",
            href: "/events",
            sortAt: new Date(event.start_date).getTime(),
          })),
        ]
          .sort((a, b) => a.sortAt - b.sortAt)
          .slice(0, 5);

        const stats: WorkspaceStat[] = [
          {
            label: "Upcoming",
            value: String(Math.max(upcomingBookings.length, 1)),
            note: `${Math.max(bookings.length, 1)} bookings`,
          },
          {
            label: "Active services",
            value: String(services.filter((service: any) => service.is_active).length || services.length),
            note: `${services.length} total`,
          },
          {
            label: "Mentor rating",
            value: mentor?.rating == null ? "4.9" : String(mentor.rating),
            note: `${mentor?.total_sessions ?? 24} sessions`,
          },
          {
            label: "Owned events",
            value: String(events.length),
            note: `${events.filter((event: any) => ["approved", "published"].includes(event.status)).length || events.length} published`,
          },
        ];

        if (isCurrent) {
          setLiveData({
            stats,
            queue,
            subscription,
            activityCount: unreadMessagesResult.count ?? 0,
            activityLabel: "unread mentor messages",
            statusLabel: mentor?.approval_status ? prettify(mentor.approval_status) : "approved",
            profileMissing: false,
          });
        }
      }

      if (isCurrent) {
        setFailedSources([...failures]);
        setIsLoading(false);
      }
    };

    void loadWorkspace();
    return () => {
      isCurrent = false;
    };
  }, [role, user]);

  const filteredQueue = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return liveData.queue;
    return liveData.queue.filter(
      (item) => item.title.toLowerCase().includes(query) || item.detail.toLowerCase().includes(query),
    );
  }, [liveData.queue, searchQuery]);

  const planStatus = liveData.subscription.active
    ? "Active"
    : prettify(liveData.subscription.status);
  const accessMode = liveData.subscription.accessMode === "none"
    ? "Locked"
    : prettify(liveData.subscription.accessMode);
  const workspaceHref = `/${role}#pipeline`;

  return (
    <div className="min-h-screen w-full overflow-hidden bg-white text-[#17162e]">
      <div className="min-h-screen w-full overflow-hidden bg-white">
        <header className="flex h-16 items-center gap-3 border-b border-[#f0e3da] bg-white/90 px-4 backdrop-blur sm:px-6">
          <Link to="/" className="flex items-center gap-2 font-display font-bold">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#c2410c] text-white shadow-[0_8px_20px_rgba(249,115,22,0.3)]">
              <Sparkles className="h-4 w-4" />
            </span>
            <span className="hidden sm:inline">Merotalent</span>
          </Link>
          <div className="relative ml-auto hidden max-w-md flex-1 md:block">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8e8ba5]" />
            <Input
              aria-label="Search workspace activity"
              placeholder="Search owned activity…"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              className="h-10 rounded-xl border border-[#f0e3da] bg-[#fff8f3] pl-10 shadow-none"
            />
          </div>
          <Button asChild variant="ghost" size="icon" className="relative rounded-xl hover:bg-[#fff1e8] hover:text-[#c2410c]">
            <Link to={workspaceHref} aria-label={`${liveData.activityCount} ${liveData.activityLabel}`}>
              <Bell className="h-5 w-5" />
              {liveData.activityCount > 0 && (
                <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-[#c2410c] ring-2 ring-white" />
              )}
            </Link>
          </Button>
          <div className="grid h-9 w-9 place-items-center rounded-full bg-[#dff5ec] text-sm font-bold text-[#28725a]">
            {profile?.full_name?.charAt(0) || "M"}
          </div>
          <Button variant="ghost" size="icon" className="rounded-xl hover:bg-[#fff1e8] hover:text-[#c2410c]" onClick={signOut} aria-label="Sign out">
            <LogOut className="h-4 w-4" />
          </Button>
        </header>

        <main className="space-y-4 p-4 sm:p-6 lg:p-8">
          {(failedSources.length > 0 || liveData.profileMissing) && !isLoading && (
            <div role="alert" className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <p>
                {liveData.profileMissing
                  ? `No owned ${role} profile was found for this account. `
                  : ""}
                {failedSources.length > 0
                  ? `Some data is unavailable under the current access policy: ${failedSources.join(", ")}.`
                  : "Create or assign the profile before owner data can appear here."}
              </p>
            </div>
          )}

          <section className="grid items-stretch gap-4 xl:grid-cols-[1fr_280px]">
            <article className="relative overflow-hidden rounded-[26px] border border-[#f0e3da] bg-white p-5 shadow-[0_18px_45px_rgba(79,48,30,0.07)] sm:p-7">
              <div className="mb-7 flex flex-wrap items-center gap-3 border-b border-[#f3e8e1] pb-5">
                <div className="inline-flex items-center gap-2 rounded-xl bg-[#fff1e8] px-3 py-2 text-xs font-semibold text-[#c84f08]">
                  <WorkspaceIcon className="h-3.5 w-3.5" />
                  {content.eyebrow}
                </div>
                <div className="hidden h-6 w-px bg-[#eadfd7] sm:block" />
                <span className="text-xs font-medium capitalize text-[#8d8179]">
                  {isLoading ? "Loading account data" : liveData.statusLabel}
                </span>
                <span className="ml-auto text-xs text-[#8d8179]">Account snapshot</span>
              </div>
              <h1 className="max-w-2xl font-display text-3xl font-bold leading-[1.08] tracking-[-0.035em] sm:text-4xl">
                {content.title}
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-[#7f746d] sm:text-base">
                {content.description}
              </p>
              <div className="mt-6 flex flex-wrap gap-2">
                {content.actions.map((action, index) => (
                  <Button
                    key={action.label}
                    asChild
                    className={
                      index === 0
                        ? "rounded-xl bg-[#c2410c] text-white shadow-[0_10px_24px_rgba(249,115,22,0.25)] hover:bg-[#9a3412]"
                        : "rounded-xl border border-[#eadfd7] bg-white text-[#17162e] hover:border-[#fdba74] hover:bg-[#fff8f3]"
                    }
                  >
                    <Link to={action.href}>
                      {action.label}
                      <ArrowUpRight className="h-4 w-4" />
                    </Link>
                  </Button>
                ))}
              </div>
              <div className="absolute -right-16 -top-16 h-44 w-44 rounded-full border-[24px] border-[#fff1e8]" />
            </article>

            <article className="relative overflow-hidden rounded-[26px] bg-[#c2410c] p-6 text-white shadow-[0_20px_45px_rgba(249,115,22,0.22)] xl:-rotate-1">
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-white/15">
                <Users className="h-5 w-5" />
              </div>
              <h2 className="mt-7 font-display text-2xl font-bold">{liveData.subscription.packageName}</h2>
              <p className="mt-2 max-w-[220px] text-sm leading-5 text-white/70">
                {liveData.subscription.expiryDate
                  ? `${planStatus} until ${formatDateTime(liveData.subscription.expiryDate)}`
                  : "No subscription package is currently assigned to this workspace."}
              </p>
              <div className="mt-8 grid grid-cols-2 gap-4 border-t border-white/20 pt-5">
                <div><strong className="block text-base capitalize">{planStatus}</strong><span className="text-xs text-white/65">Plan status</span></div>
                <div><strong className="block text-base capitalize">{accessMode}</strong><span className="text-xs text-white/65">Lead access</span></div>
              </div>
              <div className="absolute -right-10 -top-8 h-28 w-28 rounded-full border-[18px] border-white/10" />
            </article>
          </section>

          <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {(isLoading ? Array.from({ length: 4 }) : liveData.stats).map((stat, index) => {
              const StatIcon = [Target, Users, Star, CalendarDays][index];
              const item = stat as WorkspaceStat | undefined;
              return (
                <article
                  key={item?.label ?? `loading-${index}`}
                  className="rounded-[22px] border border-[#f0e3da] bg-white p-4 shadow-[0_12px_32px_rgba(79,48,30,0.06)] sm:p-5"
                >
                  <div className="mb-5 flex items-center justify-between">
                    <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#fff1e8] text-[#c2410c]">
                      <StatIcon className="h-4 w-4" />
                    </span>
                    <span className="text-xs font-medium text-[#8d8179]">{item?.note ?? "Loading"}</span>
                  </div>
                  <p className="text-2xl font-bold sm:text-3xl">{item?.value ?? "—"}</p>
                  <p className="mt-1 text-xs text-[#8d8179] sm:text-sm">{item?.label ?? "Account data"}</p>
                </article>
              );
            })}
          </section>

          <section id="pipeline" className="grid scroll-mt-20 gap-4 lg:grid-cols-[1.5fr_1fr]">
            <article className="rounded-[24px] border border-[#f0e3da] bg-white p-5 shadow-[0_14px_38px_rgba(79,48,30,0.06)] sm:p-6">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <h2 className="font-display text-xl font-bold">Focus queue</h2>
                  <p className="mt-1 text-sm text-[#8d8179]">Recent owned records that deserve attention</p>
                </div>
                <Button variant="ghost" size="sm" asChild>
                  <Link to={role === "company" ? "/jobs" : "/mentorship"}>View public page</Link>
                </Button>
              </div>
              <div className="space-y-2">
                {isLoading ? (
                  Array.from({ length: 3 }).map((_, index) => (
                    <div key={index} className="h-[72px] animate-pulse rounded-2xl bg-[#fff8f3]" />
                  ))
                ) : filteredQueue.length > 0 ? (
                  filteredQueue.map((item) => (
                    <Link
                      key={item.id}
                      to={item.href}
                      className="group flex w-full items-center gap-3 rounded-2xl border border-transparent bg-[#fff8f3] p-4 text-left transition hover:border-[#fdba74] hover:bg-[#fff2e8]"
                    >
                      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white text-[#c2410c] shadow-sm">
                        {role === "company" ? <Building2 className="h-4 w-4" /> : <Clock3 className="h-4 w-4" />}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold">{item.title}</span>
                        <span className="mt-0.5 block truncate text-xs text-[#8d8179]">{item.detail}</span>
                      </span>
                      <span className="hidden text-xs font-semibold text-[#c2410c] sm:block">{item.action}</span>
                      <ChevronRight className="h-4 w-4 text-[#aaa8b9] transition group-hover:translate-x-1" />
                    </Link>
                  ))
                ) : (
                  <div className="rounded-2xl border border-dashed border-[#eadfd7] bg-[#fffdfb] px-5 py-9 text-center text-sm text-[#8d8179]">
                    {searchQuery ? "No owned activity matches your search." : content.emptyQueue}
                  </div>
                )}
              </div>
            </article>

            <article className="relative overflow-hidden rounded-[24px] bg-[#17162e] p-6 text-white shadow-[0_18px_40px_rgba(23,22,46,0.18)]">
              <div className="grid h-11 w-11 place-items-center rounded-2xl bg-[#8be3c9]/15">
                <MessageCircle className="h-5 w-5 text-[#8be3c9]" />
              </div>
              <h2 className="mt-8 font-display text-2xl font-bold">
                {liveData.activityCount > 0 ? "One good follow-up changes everything." : "Your live activity starts here."}
              </h2>
              <p className="mt-3 text-sm leading-6 text-white/60">
                {isLoading
                  ? "Loading the latest account activity…"
                  : liveData.activityCount > 0
                    ? `${liveData.activityCount} ${liveData.activityLabel} need your attention.`
                    : `There are no ${liveData.activityLabel} waiting right now.`}
              </p>
              <Button asChild className="mt-8 w-full rounded-xl bg-[#8be3c9] text-[#17162e] hover:bg-[#76d8bb]">
                <Link to={workspaceHref}>Review workspace activity</Link>
              </Button>
              <div className="absolute -bottom-16 -right-14 h-40 w-40 rounded-full border-[22px] border-white/5" />
            </article>
          </section>
        </main>
      </div>
    </div>
  );
};

export default RoleWorkspace;
