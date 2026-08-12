import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  AlertCircle,
  Building2,
  Bell,
  BookOpen,
  LayoutDashboard,
  Users,
  FileText,
  Calendar,
  ChevronLeft,
  CreditCard,
} from "lucide-react";

interface InstituteData {
  id: string;
  name: string;
  description: string | null;
  location: string | null;
  logo_url: string | null;
  type: string | null;
  is_verified: boolean | null;
  owner_user_id: string | null;
  courses_offered: unknown;
  total_seats: number | null;
  available_seats: number | null;
  admission_status: string | null;
}

interface InstituteAdminAccess {
  can_edit_profile: boolean;
  can_manage_courses: boolean;
  can_post_notices: boolean;
}

interface NoticePreview {
  id: string;
  title: string;
  notice_type: string | null;
  published_at: string;
}

interface ApplicationPreview {
  id: string;
  full_name: string;
  program_interest: string | null;
  status: string;
  submitted_at: string;
}

interface SubscriptionSummary {
  packageName: string;
  status: string;
  paymentStatus: string;
  leadAccessMode: string;
  expiryDate: string | null;
  active: boolean;
}

const emptySubscription: SubscriptionSummary = {
  packageName: "No package",
  status: "inactive",
  paymentStatus: "pending",
  leadAccessMode: "none",
  expiryDate: null,
  active: false,
};

const formatDate = (value: string | null | undefined) => {
  if (!value) return "Date not set";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date not set";
  return new Intl.DateTimeFormat("en-NP", {
    dateStyle: "medium",
    timeZone: "Asia/Kathmandu",
  }).format(date);
};

const prettify = (value: string | null | undefined) =>
  value ? value.replaceAll("_", " ") : "pending";

const countCourses = (value: unknown) => {
  if (Array.isArray(value)) return value.length;
  if (!value || typeof value !== "object") return 0;
  const programs = (value as { programs?: unknown }).programs;
  return Array.isArray(programs) ? programs.length : 0;
};

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

const InstituteDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [institute, setInstitute] = useState<InstituteData | null>(null);
  const [access, setAccess] = useState<InstituteAdminAccess | null>(null);
  const [stats, setStats] = useState({
    notices: 0,
    courses: 0,
    applications: 0,
  });
  const [recentNotices, setRecentNotices] = useState<NoticePreview[]>([]);
  const [recentApplications, setRecentApplications] = useState<ApplicationPreview[]>([]);
  const [subscription, setSubscription] = useState<SubscriptionSummary>(emptySubscription);
  const [failedSources, setFailedSources] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchInstituteData = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    setFailedSources([]);
    const db = supabase as any;
    const failures = new Set<string>();

    const adminResult = await db
      .from("institute_admins")
      .select("*, institutes(*)")
      .eq("user_id", user.id)
      .maybeSingle();

    if (adminResult.error) failures.add("institute access");

    let instituteRecord = adminResult.data?.institutes as InstituteData | null;
    let instituteAccess: InstituteAdminAccess | null = adminResult.data
      ? {
          can_edit_profile: adminResult.data.can_edit_profile === true,
          can_manage_courses: adminResult.data.can_manage_courses === true,
          can_post_notices: adminResult.data.can_post_notices === true,
        }
      : null;

    if (!instituteRecord) {
      const ownerResult = await db
        .from("institutes")
        .select("*")
        .eq("owner_user_id", user.id)
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (ownerResult.error) failures.add("owned institute profile");
      instituteRecord = ownerResult.data as InstituteData | null;
      if (instituteRecord) {
        instituteAccess = {
          can_edit_profile: true,
          can_manage_courses: true,
          can_post_notices: true,
        };
      }
    }

    if (!instituteRecord) {
      setInstitute(null);
      setAccess(null);
      setFailedSources([...failures]);
      setIsLoading(false);
      if (failures.size === 0) {
        toast({
          variant: "destructive",
          title: "No institute assigned",
          description: "This account does not own or administer an institute profile.",
        });
      }
      return;
    }

    setInstitute(instituteRecord);
    setAccess(instituteAccess);

    const [noticesResult, applicationsResult, subscriptionsResult] = await Promise.all([
      db
        .from("institute_notices")
        .select("id, title, notice_type, published_at", { count: "exact" })
        .eq("institute_id", instituteRecord.id)
        .order("published_at", { ascending: false })
        .limit(4),
      db
        .from("college_applications")
        .select("id, full_name, program_interest, status, submitted_at", { count: "exact" })
        .eq("institute_id", instituteRecord.id)
        .is("deleted_at", null)
        .order("submitted_at", { ascending: false })
        .limit(5),
      db
        .from("subscriptions")
        .select("id, package_id, entity_type, entity_id, start_date, expiry_date, status, payment_status")
        .eq("user_id", user.id)
        .is("deleted_at", null)
        .order("expiry_date", { ascending: false }),
    ]);

    if (noticesResult.error) failures.add("notices");
    if (applicationsResult.error) failures.add("college applications");
    if (subscriptionsResult.error) failures.add("subscription");

    const subscriptions = subscriptionsResult.data ?? [];
    const entitySubscriptions = subscriptions.filter(
      (item: any) => item.entity_type === "college" && item.entity_id === instituteRecord.id,
    );
    const userSubscriptions = subscriptions.filter((item: any) => item.entity_type === "user");
    const subscriptionCandidates = [...entitySubscriptions, ...userSubscriptions];
    const subscriptionRecord =
      subscriptionCandidates.find(isSubscriptionActive) ?? subscriptionCandidates[0];
    let subscriptionSummary = emptySubscription;

    if (subscriptionRecord) {
      const packageResult = await db
        .from("packages")
        .select("name, lead_access_mode")
        .eq("id", subscriptionRecord.package_id)
        .maybeSingle();

      if (packageResult.error) failures.add("package details");
      subscriptionSummary = {
        packageName: packageResult.data?.name ?? "Assigned package",
        status: subscriptionRecord.status,
        paymentStatus: subscriptionRecord.payment_status,
        leadAccessMode: packageResult.data?.lead_access_mode ?? "none",
        expiryDate: subscriptionRecord.expiry_date,
        active: isSubscriptionActive(subscriptionRecord),
      };
    }

    setRecentNotices((noticesResult.data ?? []) as NoticePreview[]);
    setRecentApplications((applicationsResult.data ?? []) as ApplicationPreview[]);
    setSubscription(subscriptionSummary);
    setStats({
      notices: noticesResult.count ?? 0,
      courses: countCourses(instituteRecord.courses_offered),
      applications: applicationsResult.count ?? 0,
    });
    setFailedSources([...failures]);
    setIsLoading(false);
  }, [toast, user]);

  useEffect(() => {
    if (user) {
      void fetchInstituteData();
    }
  }, [fetchInstituteData, user]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#c2410c] border-t-transparent" />
      </div>
    );
  }

  if (!institute) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white p-4">
        <Card className="max-w-md rounded-[26px] border-[#f0e3da] shadow-[0_24px_60px_rgba(79,48,30,0.12)]">
          <CardContent className="p-6 text-center">
            <Building2 className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-xl font-semibold mb-2">No Institute Access</h2>
            <p className="text-muted-foreground mb-4">
              {failedSources.length > 0
                ? `Institute access could not be loaded under the current policy (${failedSources.join(", ")}).`
                : "You don't have access to manage any institute. Please contact the admin."}
            </p>
            <Button className="rounded-xl bg-[#c2410c] hover:bg-[#9a3412]" onClick={() => navigate("/dashboard")}>Go to Dashboard</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const navItems: Array<{
    path: string;
    icon: typeof LayoutDashboard;
    label: string;
    end?: boolean;
    disabled?: boolean;
    anchor?: boolean;
  }> = [
    { path: "/institute", icon: LayoutDashboard, label: "Overview", end: true },
    { path: "/institute#applications", icon: Users, label: "Applications", anchor: true },
    { path: "/institute#subscription", icon: CreditCard, label: "Subscription", anchor: true },
    { path: "/institute/notices", icon: Bell, label: "Notices", disabled: !access?.can_post_notices },
    { path: "/institutes", icon: Building2, label: "Public listing" },
    { path: "/courses", icon: BookOpen, label: "Course catalog" },
  ];
  const canAccessApplications = subscription.active && subscription.leadAccessMode !== "none";

  return (
    <div className="min-h-screen w-full overflow-hidden bg-white text-[#17162e]">
      <div className="min-h-screen w-full overflow-hidden bg-white">
      {/* Header */}
      <header className="border-b border-[#f0e3da] bg-white/90 backdrop-blur">
        <div className="mx-auto px-4 py-4 sm:px-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                className="rounded-xl hover:bg-[#fff1e8] hover:text-[#c2410c]"
                onClick={() => navigate("/dashboard")}
                aria-label="Back to dashboard"
              >
                <ChevronLeft className="w-5 h-5" />
              </Button>
              <div className="flex items-center gap-3">
                {institute.logo_url ? (
                  <Image
                    src={institute.logo_url}
                    alt=""
                    width={40}
                    height={40}
                    unoptimized
                    className="h-10 w-10 rounded-lg object-cover"
                  />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#fff1e8]">
                    <Building2 className="h-5 w-5 text-[#c2410c]" />
                  </div>
                )}
                <div>
                  <h1 className="font-semibold">{institute.name}</h1>
                  <div className="flex items-center gap-2">
                    <Badge className={institute.is_verified ? "border-0 bg-[#dff5ec] text-[#28725a] hover:bg-[#dff5ec]" : "border-0 bg-[#fff1e8] text-[#c84f08] hover:bg-[#fff1e8]"}>
                      {institute.is_verified ? "Verified" : "Pending"}
                    </Badge>
                    <span className="text-sm text-muted-foreground">{institute.type}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto px-4 py-5 sm:px-6 lg:py-7">
        <div className="flex flex-col gap-5 lg:flex-row">
          {/* Sidebar */}
          <aside className="w-full lg:w-64 flex-shrink-0">
            <Card className="rounded-[22px] border-[#f0e3da] bg-white shadow-[0_14px_38px_rgba(79,48,30,0.06)]">
              <CardContent className="p-2.5">
                <nav className="space-y-1">
                  {navItems.map((item) =>
                    item.anchor ? (
                      <Link
                        key={item.path}
                        to={item.path}
                        className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-[#746a64] transition-colors hover:bg-[#fff1e8] hover:text-[#c84f08]"
                      >
                        <item.icon className="h-5 w-5" />
                        <span>{item.label}</span>
                      </Link>
                    ) : item.disabled ? (
                      <span
                        key={item.path}
                        aria-disabled="true"
                        className="flex cursor-not-allowed items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-[#746a64] opacity-50"
                        title="You do not have permission to post notices"
                      >
                        <item.icon className="h-5 w-5" />
                        <span>{item.label}</span>
                      </span>
                    ) : (
                      <NavLink
                        key={item.path}
                        to={item.path}
                        end={item.end}
                        className={({ isActive }) =>
                          `flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-colors ${
                            isActive
                              ? "bg-[#c2410c] text-white shadow-[0_8px_20px_rgba(249,115,22,0.22)]"
                              : "text-[#746a64] hover:bg-[#fff1e8] hover:text-[#c84f08]"
                          }`
                        }
                      >
                        <item.icon className="h-5 w-5" />
                        <span>{item.label}</span>
                      </NavLink>
                    ),
                  )}
                </nav>
              </CardContent>
            </Card>
          </aside>

          {/* Main Content */}
          <main className="min-w-0 flex-1">
            {failedSources.length > 0 && (
              <div role="alert" className="mb-4 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <p>
                  Some institute data is unavailable under the current access policy: {failedSources.join(", ")}.
                </p>
              </div>
            )}
            <section className="mb-4 overflow-hidden rounded-[24px] border border-[#f0e3da] bg-white p-5 shadow-[0_14px_38px_rgba(79,48,30,0.06)] sm:p-6">
              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#c2410c]">Institution workspace</p>
                  <h2 className="mt-2 font-display text-2xl font-bold tracking-[-0.025em] sm:text-3xl">Good morning, {institute.name}</h2>
                  <p className="mt-2 max-w-2xl text-sm text-[#81766f]">Keep admissions, learning resources and student announcements moving from one calm control room.</p>
                </div>
                <Badge className={subscription.active ? "w-fit border-0 bg-[#dff5ec] px-3 py-1.5 text-[#28725a] hover:bg-[#dff5ec]" : "w-fit border-0 bg-[#fff1e8] px-3 py-1.5 text-[#c84f08] hover:bg-[#fff1e8]"}>
                  {subscription.packageName} · {subscription.active ? "Active" : prettify(subscription.status)}
                </Badge>
              </div>
            </section>

            <section id="subscription" className="mb-4 scroll-mt-20 rounded-[22px] border border-[#f0e3da] bg-[#fffdfb] p-4 shadow-[0_12px_32px_rgba(79,48,30,0.05)]">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-[14px] bg-[#fff1e8]">
                    <CreditCard className="h-5 w-5 text-[#c2410c]" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{subscription.packageName}</p>
                    <p className="text-xs text-muted-foreground">
                      {subscription.expiryDate
                        ? `${prettify(subscription.status)} · expires ${formatDate(subscription.expiryDate)}`
                        : "No subscription is assigned to this institute workspace."}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <Badge variant="outline" className="capitalize">Payment: {prettify(subscription.paymentStatus)}</Badge>
                  <Badge variant="outline" className="capitalize">Lead access: {prettify(subscription.leadAccessMode)}</Badge>
                </div>
              </div>
            </section>
            {/* Overview Stats */}
            <div className="mb-4 grid grid-cols-2 gap-3 xl:grid-cols-4">
              <Card className="rounded-[22px] border-[#f0e3da] shadow-[0_12px_32px_rgba(79,48,30,0.06)]">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-[14px] bg-[#fff1e8]">
                      <Bell className="h-5 w-5 text-[#c2410c]" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{stats.notices}</p>
                      <p className="text-sm text-muted-foreground">Notices</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="rounded-[22px] border-[#f0e3da] shadow-[0_12px_32px_rgba(79,48,30,0.06)]">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-[14px] bg-[#dff5ec]">
                      <Users className="h-5 w-5 text-[#28725a]" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{canAccessApplications ? stats.applications : "—"}</p>
                      <p className="text-sm text-muted-foreground">
                        {canAccessApplications ? "Applications" : "Applications locked"}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="rounded-[22px] border-[#f0e3da] shadow-[0_12px_32px_rgba(79,48,30,0.06)]">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-[14px] bg-[#fff1e8]">
                      <BookOpen className="h-5 w-5 text-[#c2410c]" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{stats.courses}</p>
                      <p className="text-sm text-muted-foreground">Courses</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="rounded-[22px] border-[#f0e3da] shadow-[0_12px_32px_rgba(79,48,30,0.06)]">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-[14px] bg-[#fff1e8]">
                      <Calendar className="h-5 w-5 text-[#c2410c]" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold capitalize">
                        {institute.admission_status || "Closed"}
                      </p>
                      <p className="text-sm text-muted-foreground">Admission</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Quick Actions */}
            <div className="grid gap-4 xl:grid-cols-[0.8fr_1.2fr]">
            <Card className="rounded-[24px] border-[#f0e3da] shadow-[0_14px_38px_rgba(79,48,30,0.06)]">
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-3">
                  {access?.can_post_notices && (
                    <Button asChild className="rounded-xl bg-[#c2410c] hover:bg-[#9a3412]">
                      <Link to="/institute/notices?new=1">
                        <Bell className="mr-2 h-4 w-4" />
                        Post Notice
                      </Link>
                    </Button>
                  )}
                  <Button asChild variant="outline" className="rounded-xl border-[#eadfd7] hover:border-[#fdba74] hover:bg-[#fff8f3]">
                    <Link to="/institute#applications">
                      <Users className="mr-2 h-4 w-4" />
                      View applications
                    </Link>
                  </Button>
                  <Button asChild variant="outline" className="rounded-xl border-[#eadfd7] hover:border-[#fdba74] hover:bg-[#fff8f3]">
                    <Link to="/institute#subscription">
                      <CreditCard className="mr-2 h-4 w-4" />
                      View subscription
                    </Link>
                  </Button>
                  <Button asChild variant="outline" className="rounded-xl border-[#eadfd7] hover:border-[#fdba74] hover:bg-[#fff8f3]">
                    <Link to="/institutes">
                      <Building2 className="mr-2 h-4 w-4" />
                      View public listing
                    </Link>
                  </Button>
                  <Button asChild variant="outline" className="rounded-xl border-[#eadfd7] hover:border-[#fdba74] hover:bg-[#fff8f3]">
                    <Link to="/courses">
                      <BookOpen className="mr-2 h-4 w-4" />
                      Browse course catalog
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Recent Notices Preview */}
            <Card className="rounded-[24px] border-[#f0e3da] shadow-[0_14px_38px_rgba(79,48,30,0.06)]">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Recent Notices</CardTitle>
                  <Button asChild variant="ghost" size="sm">
                    <Link to="/institute/notices">View All</Link>
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {recentNotices.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <FileText className="w-10 h-10 mx-auto mb-3 opacity-50" />
                    <p>No notices posted yet</p>
                    {access?.can_post_notices && (
                      <Button asChild variant="link">
                        <Link to="/institute/notices?new=1">Post your first notice</Link>
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {recentNotices.map((notice) => (
                      <Link
                        key={notice.id}
                        to="/institute/notices"
                        className="flex items-start justify-between gap-3 rounded-xl bg-[#fff8f3] p-3 transition-colors hover:bg-[#fff1e8]"
                      >
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-semibold">{notice.title}</span>
                          <span className="mt-1 block text-xs capitalize text-muted-foreground">
                            {prettify(notice.notice_type)} · {formatDate(notice.published_at)}
                          </span>
                        </span>
                        <Bell className="mt-0.5 h-4 w-4 shrink-0 text-[#c2410c]" />
                      </Link>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card id="applications" className="scroll-mt-20 rounded-[24px] border-[#f0e3da] shadow-[0_14px_38px_rgba(79,48,30,0.06)] xl:col-span-2">
              <CardHeader>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <CardTitle>Recent Applications</CardTitle>
                    <p className="mt-1 text-sm text-muted-foreground">Latest student applications for this institute</p>
                  </div>
                  <Badge variant="outline">{canAccessApplications ? `${stats.applications} total` : "Plan required"}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                {!canAccessApplications ? (
                  <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                    <CreditCard className="mt-0.5 h-4 w-4 shrink-0" />
                    <p>An active package with lead access is required before applicant records can be viewed.</p>
                  </div>
                ) : recentApplications.length === 0 ? (
                  <div className="py-8 text-center text-muted-foreground">
                    <Users className="mx-auto mb-3 h-10 w-10 opacity-50" />
                    <p>No applications received yet</p>
                  </div>
                ) : (
                  <div className="grid gap-2 sm:grid-cols-2">
                    {recentApplications.map((application) => (
                      <div key={application.id} className="rounded-xl border border-[#f0e3da] bg-[#fffdfb] p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold">{application.full_name}</p>
                            <p className="mt-1 truncate text-xs text-muted-foreground">
                              {application.program_interest || "Program not specified"}
                            </p>
                          </div>
                          <Badge variant="outline" className="shrink-0 capitalize text-[10px]">
                            {prettify(application.status)}
                          </Badge>
                        </div>
                        <p className="mt-2 text-xs text-muted-foreground">Submitted {formatDate(application.submitted_at)}</p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
            </div>
          </main>
        </div>
      </div>
      </div>
    </div>
  );
};

export default InstituteDashboard;
