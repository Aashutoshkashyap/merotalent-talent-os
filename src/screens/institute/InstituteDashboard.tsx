import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { Link, NavLink, useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import InstituteProfileEditor from "@/components/owner/InstituteProfileEditor";
import { CollegeClaimSearch, type ClaimCollegeOption } from "@/components/owner/CollegeClaimSearch";
import OwnerStatusActions from "@/components/owner/OwnerStatusActions";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  COLLEGE_APPLICATION_STATUSES,
  collegeApplicationStatusBadgeClass,
  collegeApplicationStatusLabel,
  type CollegeApplicationStatus,
} from "@/lib/institutes/college-application-status";
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
  Edit3,
  Sparkles,
  PlusCircle,
  Lock,
  Send,
  Loader2,
  ShieldCheck,
} from "lucide-react";

interface InstituteData {
  id: string;
  name: string;
  short_name: string | null;
  description: string | null;
  location: string | null;
  map_location: string | null;
  website: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  youtube_url: string | null;
  logo_url: string | null;
  cover_image_url?: string | null;
  type: string | null;
  is_verified: boolean | null;
  owner_user_id: string | null;
  courses_offered: unknown;
  total_seats: number | null;
  available_seats: number | null;
  admission_status: string | null;
  chairperson_name?: string | null;
  chairperson_designation?: string | null;
  chairperson_message?: string | null;
  principal_name?: string | null;
  principal_designation?: string | null;
  principal_message?: string | null;
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
  intake: string | null;
  phone: string | null;
}

type AppStatusTab = "all" | CollegeApplicationStatus;

const APP_STATUS_TABS: readonly AppStatusTab[] = [
  "all",
  ...COLLEGE_APPLICATION_STATUSES,
];

/**
 * Placeholder id used for an approved owner who is not yet linked to a real
 * institutes row. It is deliberately not a uuid, so any query that filters a
 * uuid column must be skipped while it is active — Postgres rejects a value
 * like this with "22P02 invalid input syntax for type uuid" and fails the whole
 * request, not just that filter.
 */
const UNCLAIMED_WORKSPACE_ID = "unclaimed-workspace";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const isUuid = (value: unknown): value is string =>
  typeof value === "string" && UUID_PATTERN.test(value);

/** Stands in for a query that was skipped because there is no institute row. */
const skippedQueryResult = { data: [], count: 0, error: null };

/** Statuses an institute owner can move an application into. */
const APP_ACTION_STATUSES = [
  "reviewing",
  "contacted",
  "accepted",
  "rejected",
] as const satisfies readonly CollegeApplicationStatus[];

const APP_ACTION_LABELS: Record<(typeof APP_ACTION_STATUSES)[number], string> = {
  reviewing: "Mark Reviewing",
  contacted: "Mark Followed Up",
  accepted: "Mark Admitted",
  rejected: "Reject",
};

const APP_ACTION_BUTTON_CLASSES: Record<(typeof APP_ACTION_STATUSES)[number], string> = {
  reviewing: "border-sky-200 text-sky-700 hover:bg-sky-50",
  contacted: "border-blue-200 text-blue-700 hover:bg-blue-50",
  accepted: "border-emerald-200 text-emerald-700 hover:bg-emerald-50",
  rejected: "border-red-200 text-red-700 hover:bg-red-50",
};

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
  const [managedInstitutes, setManagedInstitutes] = useState<InstituteData[]>([]);
  const [selectedInstituteId, setSelectedInstituteId] = useState<string | null>(null);
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
  const [profileEditorOpen, setProfileEditorOpen] = useState(false);

  // Access gating state
  const [accessStatus, setAccessStatus] = useState<"loading" | "approved" | "pending" | "rejected" | "suspended" | "none">("loading");
  const [requestOrg, setRequestOrg] = useState("");
  const [requestPhone, setRequestPhone] = useState("");
  const [requestReason, setRequestReason] = useState("");
  const [isSubmittingAccess, setIsSubmittingAccess] = useState(false);
  const [appStatusFilter, setAppStatusFilter] = useState<AppStatusTab>("all");
  const [updatingAppId, setUpdatingAppId] = useState<string | null>(null);

  // Claim or List College Modal State
  const [isClaimModalOpen, setIsClaimModalOpen] = useState(false);
  const [claimType, setClaimType] = useState<"claim" | "list_new">("claim");
  const [claimCollegeName, setClaimCollegeName] = useState("");
  const [selectedClaimCollege, setSelectedClaimCollege] = useState<ClaimCollegeOption | null>(null);
  const [claimPhone, setClaimPhone] = useState("");
  const [claimEmail, setClaimEmail] = useState("");
  const [claimNotes, setClaimNotes] = useState("");
  const [isSubmittingClaim, setIsSubmittingClaim] = useState(false);

  // Featured Listing Request State
  const [isFeaturedModalOpen, setIsFeaturedModalOpen] = useState(false);
  const [featuredPosition, setFeaturedPosition] = useState("home_featured");
  const [featuredNotes, setFeaturedNotes] = useState("");
  const [isSubmittingFeatured, setIsSubmittingFeatured] = useState(false);

  // Request Other Modules State
  const [isModuleModalOpen, setIsModuleModalOpen] = useState(false);
  const [targetModule, setTargetModule] = useState("company");
  const [moduleReason, setModuleReason] = useState("");
  const [isSubmittingModule, setIsSubmittingModule] = useState(false);

  const handleClaimSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setIsSubmittingClaim(true);
    try {
      let requestError: any = null;
      if (claimType === "claim") {
        if (!selectedClaimCollege || selectedClaimCollege.name !== claimCollegeName) {
          throw new Error("Choose a college from the matching directory list before submitting a claim.");
        }
        ({ error: requestError } = await (supabase as any).rpc("request_entity_scope", {
          p_module_key: "college",
          p_entity_type: "college",
          p_entity_id: selectedClaimCollege.id,
          p_request_kind: "claim",
          p_request_data: {},
          p_reason: `Claim request. Phone: ${claimPhone}. Email: ${claimEmail}. Notes: ${claimNotes}`,
        }));
      } else {
        ({ error: requestError } = await (supabase as any).rpc("request_entity_scope", {
          p_module_key: "college",
          p_entity_type: "college",
          p_entity_id: null,
          p_request_kind: "create",
          p_request_data: {
            name: claimCollegeName,
            phone: claimPhone,
            email: claimEmail,
            description: claimNotes,
          },
          p_reason: `Request to add a college to the directory. ${claimNotes}`,
        }));
      }
      if (requestError) throw requestError;
      toast({
        title: "Request Submitted to Super Admin!",
        description: `Your request to ${claimType === "claim" ? "claim" : "list"} ${claimCollegeName || "this college"} has been sent to Super Admin for approval.`,
      });
      setIsClaimModalOpen(false);
      setClaimCollegeName("");
      setSelectedClaimCollege(null);
      setClaimPhone("");
      setClaimEmail("");
      setClaimNotes("");
    } catch (err: any) {
      toast({ variant: "destructive", title: "Submission Error", description: err?.message || "Failed to submit request." });
    } finally {
      setIsSubmittingClaim(false);
    }
  };

  const handleFeaturedSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setIsSubmittingFeatured(true);
    try {
      const { error: requestError } = await (supabase as any).rpc("request_sub_admin_access", {
        p_requested_modules: ["college"],
        p_reason: `[FEATURED REQUEST] Position: ${featuredPosition}. Notes: ${featuredNotes || "Please review featured placement."}`,
        p_organization: institute?.name || null,
      });
      if (requestError) throw requestError;
      toast({
        title: "Featured Placement Requested!",
        description: "Super Admin has been notified to place your listing in the homepage featured section.",
      });
      setIsFeaturedModalOpen(false);
      setFeaturedNotes("");
    } catch (err: any) {
      toast({ variant: "destructive", title: "Submission Error", description: err?.message || "Failed to submit request." });
    } finally {
      setIsSubmittingFeatured(false);
    }
  };

  const handleModuleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setIsSubmittingModule(true);
    try {
      const { error: requestError } = await (supabase as any).rpc("request_sub_admin_access", {
        p_requested_modules: [targetModule],
        p_reason: `[MODULE ACCESS REQUEST] ${moduleReason}`,
        p_organization: institute?.name || null,
      });
      if (requestError) throw requestError;
      toast({
        title: "Module Request Sent!",
        description: `Super Admin has received your request for ${targetModule.toUpperCase()} module access.`,
      });
      setIsModuleModalOpen(false);
      setModuleReason("");
    } catch (err: any) {
      toast({ variant: "destructive", title: "Submission Error", description: err?.message || "Failed to submit request." });
    } finally {
      setIsSubmittingModule(false);
    }
  };

  const handleAccessRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setIsSubmittingAccess(true);
    try {
      const fullReason = [
        "[GRANT ACCESS REQUEST]",
        `Organization/College: ${requestOrg.trim() || "N/A"}`,
        `Contact Phone (Nepal): ${requestPhone.trim() || "N/A"}`,
        `Justification: ${requestReason.trim()}`,
      ].join("\n");

      const { error: requestError } = await (supabase as any).rpc("request_sub_admin_access", {
        p_requested_modules: ["college"],
        p_reason: fullReason,
        p_organization: requestOrg.trim() || null,
      });
      if (requestError) throw requestError;

      // No direct notification insert here: notifications requires a NOT NULL
      // recipient_id and only admins may insert, so this write could never
      // succeed from an institute owner. The sub_admin_requests row above is
      // the signal — AdminAccessRequests reads exactly that table.
      setAccessStatus("pending");
      toast({ title: "Access Request Submitted!", description: "Your request is now with the Super Admin. You'll get access once approved." });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Submission Error", description: err?.message || "Failed to submit request." });
    } finally {
      setIsSubmittingAccess(false);
    }
  };

  const fetchInstituteData = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    setFailedSources([]);
    const db = supabase as any;
    const failures = new Set<string>();

    // Phase 2 uses the Phase 1 capability/entity model. This avoids the old
    // one-row institute_admins lookup and supports a user assigned to several
    // colleges without exposing any unassigned institution.
    const [workspaceResult, capabilityResult, requestResult] = await Promise.all([
      db.rpc("get_my_college_workspaces"),
      db.rpc("has_active_module_capability", { p_user_id: user.id, p_module_key: "college" }),
      db.rpc("get_my_module_access_requests"),
    ]);
    if (workspaceResult.error) failures.add("college workspace");
    const workspaceRows = (workspaceResult.data || []) as any[];
    const workspaceInstitutes = workspaceRows.map((row) => ({
      ...row,
      is_verified: row.effectively_verified === true,
    })) as InstituteData[];
    setManagedInstitutes(workspaceInstitutes);

    const selected = workspaceInstitutes.find((item) => item.id === selectedInstituteId) || workspaceInstitutes[0];
    let instituteRecord = selected || null;
    let instituteAccess: InstituteAdminAccess | null = selected
      ? {
          can_edit_profile: workspaceRows.find((row) => row.id === selected.id)?.can_edit_profile === true,
          can_manage_courses: workspaceRows.find((row) => row.id === selected.id)?.subscription_active === true,
          can_post_notices: workspaceRows.find((row) => row.id === selected.id)?.subscription_active === true,
        }
      : null;

    if (!instituteRecord && capabilityResult.data !== true) {
      const requests = (requestResult.data || []) as Array<{ status: string; requested_modules: string[] }>;
      const latest = requests.find((request) => request.requested_modules?.includes("college"));
      setAccessStatus(latest?.status === "pending" ? "pending" : latest?.status === "rejected" ? "rejected" : "none");
      setIsLoading(false);
      return;
    }
    setAccessStatus("approved");

    // Approved capability with no entity assignment yet: show a non-persistent
    // claim/add workspace. It can never be used as a UUID database filter.
    if (!instituteRecord) {
      instituteRecord = {
        id: UNCLAIMED_WORKSPACE_ID,
        name: user?.user_metadata?.full_name ? `${user.user_metadata.full_name}'s College Workspace` : "College Module Workspace",
        short_name: "Workspace",
        description: "Unclaimed College Workspace. Click 'Claim / List College' to link your official college listing or submit a new listing request.",
        location: "Kathmandu, Nepal",
        map_location: null,
        website: "https://merotalent.com",
        contact_email: user?.email || "",
        contact_phone: null,
        youtube_url: null,
        logo_url: null,
        type: "College",
        is_verified: false,
        owner_user_id: user?.id || null,
        courses_offered: ["BSc CSIT", "BCA", "BIT", "BBA", "MBA"],
        total_seats: 120,
        available_seats: 45,
        admission_status: "Open",
      };
      instituteAccess = {
        can_edit_profile: false,
        can_manage_courses: false,
        can_post_notices: false,
      };
    }

    setInstitute(instituteRecord);
    setAccess(instituteAccess);

    // An unclaimed workspace has no institutes row, so its id is not a uuid.
    // Sending it to a uuid column fails the request with 22P02, which is why
    // these two queries are skipped rather than filtered.
    const hasPersistedInstitute = isUuid(instituteRecord.id);

    const [noticesResult, applicationsResult, subscriptionsResult] = await Promise.all([
      hasPersistedInstitute
        ? db
            .from("institute_notices")
            .select("id, title, notice_type, published_at", { count: "exact" })
            .eq("institute_id", instituteRecord.id)
            .order("published_at", { ascending: false })
            .limit(4)
        : Promise.resolve(skippedQueryResult),
      hasPersistedInstitute
        ? db
            .from("college_applications")
            .select("id, full_name, program_interest, intake, phone, status, submitted_at", { count: "exact" })
            .eq("institute_id", instituteRecord.id)
            .is("deleted_at", null)
            .order("submitted_at", { ascending: false })
        : Promise.resolve(skippedQueryResult),
      // Subscription state is returned with the scoped workspace record. A
      // browser query filtered to user_id would be wrong for an administrator
      // assigned to a college owned by another user.
      Promise.resolve({ data: [], error: null }),
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

    const scopedWorkspace = workspaceRows.find((row) => row.id === instituteRecord.id);
    if (scopedWorkspace) {
      subscriptionSummary = {
        packageName: scopedWorkspace.package_name ?? "No package",
        status: scopedWorkspace.subscription_status ?? "expired",
        paymentStatus: scopedWorkspace.payment_status ?? "pending",
        leadAccessMode: scopedWorkspace.lead_access_mode ?? "none",
        expiryDate: scopedWorkspace.expiry_date ?? null,
        active: scopedWorkspace.subscription_active === true,
      };
    } else if (subscriptionRecord) {
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
  }, [selectedInstituteId, toast, user]);

  const handleUpdateAppStatus = async (appId: string, newStatus: CollegeApplicationStatus) => {
    setUpdatingAppId(appId);
    try {
      // supabase-js resolves with an `error` field instead of throwing, so this
      // must be inspected explicitly or failed writes report success.
      const { error } = await (supabase as any)
        .from("college_applications")
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq("id", appId);
      if (error) throw error;
      toast({ title: "Status Updated", description: `Application marked as "${collegeApplicationStatusLabel(newStatus)}".` });
      void fetchInstituteData();
    } catch (err: any) {
      toast({ variant: "destructive", title: "Update Failed", description: err?.message || "Could not update status." });
    } finally {
      setUpdatingAppId(null);
    }
  };

  const location = useLocation();

  const scrollToHash = useCallback((hashStr?: string) => {
    const targetHash = hashStr || location.hash;
    if (targetHash) {
      const id = targetHash.replace("#", "");
      const element = document.getElementById(id);
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }
  }, [location.hash]);

  useEffect(() => {
    if (user) {
      void fetchInstituteData();
    }
  }, [fetchInstituteData, user]);

  useEffect(() => {
    if (location.hash && !isLoading) {
      setTimeout(() => {
        scrollToHash(location.hash);
      }, 150);
    }
  }, [location.hash, isLoading, scrollToHash]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#c2410c] border-t-transparent" />
      </div>
    );
  }

  // Access gating — show request/pending/rejected screens for unapproved users
  if (accessStatus !== "approved") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-orange-50 via-white to-amber-50 p-4">
        <Card className="max-w-lg w-full rounded-[26px] border-[#f0e3da] shadow-[0_24px_60px_rgba(79,48,30,0.12)]">
          <CardContent className="p-8">
            <div className="text-center mb-6">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#fff1e8] mx-auto mb-4">
                {accessStatus === "pending" ? (
                  <Loader2 className="h-8 w-8 text-[#c2410c] animate-spin" />
                ) : accessStatus === "rejected" || accessStatus === "suspended" ? (
                  <Lock className="h-8 w-8 text-red-500" />
                ) : (
                  <ShieldCheck className="h-8 w-8 text-[#c2410c]" />
                )}
              </div>

              {accessStatus === "pending" ? (
                <>
                  <h2 className="text-xl font-bold text-slate-900 mb-2">Access Request Pending</h2>
                  <p className="text-sm text-slate-600">
                    Your request to access the College/Institute Module is under review by the Super Admin.
                    You'll be notified once your access is approved.
                  </p>
                  <div className="mt-6">
                    <Button className="rounded-xl bg-[#c2410c] hover:bg-[#9a3412] text-white" onClick={() => navigate("/dashboard")}>
                      Back to Student Dashboard
                    </Button>
                  </div>
                </>
              ) : accessStatus === "rejected" ? (
                <>
                  <h2 className="text-xl font-bold text-slate-900 mb-2">Access Request Rejected</h2>
                  <p className="text-sm text-slate-600">
                    Your request for the College/Institute Module was rejected by the Super Admin.
                    You can contact support or resubmit with additional details.
                  </p>
                  <div className="mt-6 flex gap-3 justify-center">
                    <Button variant="outline" className="rounded-xl" onClick={() => navigate("/dashboard")}>
                      Back to Dashboard
                    </Button>
                    <Button className="rounded-xl bg-[#c2410c] hover:bg-[#9a3412] text-white" onClick={() => setAccessStatus("none")}>
                      Resubmit Request
                    </Button>
                  </div>
                </>
              ) : accessStatus === "suspended" ? (
                <>
                  <h2 className="text-xl font-bold text-slate-900 mb-2">Access Suspended</h2>
                  <p className="text-sm text-slate-600">
                    Your College/Institute Module access has been suspended by the Super Admin.
                    Please contact support for more information.
                  </p>
                  <div className="mt-6">
                    <Button className="rounded-xl bg-[#c2410c] hover:bg-[#9a3412] text-white" onClick={() => navigate("/dashboard")}>
                      Back to Student Dashboard
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <h2 className="text-xl font-bold text-slate-900 mb-2">Request College Module Access</h2>
                  <p className="text-sm text-slate-600">
                    To manage college listings, claim pages, view applicant data, and edit institute profiles,
                    you need Super Admin approval. Fill out the form below to request access.
                  </p>
                </>
              )}
            </div>

            {accessStatus === "none" && (
              <form onSubmit={handleAccessRequest} className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-slate-700">Organization / College Name *</Label>
                  <Input
                    placeholder="e.g. IOE Pulchowk Campus, Islington College"
                    value={requestOrg}
                    onChange={(e) => setRequestOrg(e.target.value)}
                    required
                    className="rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-slate-700">Contact Number (Nepal) *</Label>
                  <Input
                    placeholder="e.g. 9801010802"
                    value={requestPhone}
                    onChange={(e) => setRequestPhone(e.target.value)}
                    required
                    className="rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-slate-700">Justification & Role *</Label>
                  <Textarea
                    placeholder="Explain your role, why you need institute admin access, and which college you want to manage..."
                    rows={3}
                    value={requestReason}
                    onChange={(e) => setRequestReason(e.target.value)}
                    required
                    className="rounded-xl"
                  />
                </div>
                <div className="flex gap-3 pt-2">
                  <Button type="button" variant="outline" className="rounded-xl flex-1" onClick={() => navigate("/dashboard")}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSubmittingAccess} className="rounded-xl bg-[#c2410c] hover:bg-[#9a3412] text-white flex-1 font-bold">
                    {isSubmittingAccess ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
                    Submit Request
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  const activeInstitute = institute || {
    id: UNCLAIMED_WORKSPACE_ID,
    name: user?.user_metadata?.full_name ? `${user.user_metadata.full_name}'s College Workspace` : "College Module Workspace",
    short_name: "Workspace",
    description: "Unclaimed workspace",
    location: "Kathmandu, Nepal",
    map_location: null,
    website: "https://merotalent.com",
    contact_email: user?.email || "",
    contact_phone: null,
    youtube_url: null,
    logo_url: null,
    type: "College",
    is_verified: false,
    owner_user_id: user?.id || null,
    courses_offered: [],
    total_seats: 0,
    available_seats: 0,
    admission_status: "Open",
  };

  const navItems: Array<{
    path: string;
    icon: typeof LayoutDashboard;
    label: string;
    end?: boolean;
    disabled?: boolean;
    anchor?: boolean;
    action?: () => void;
  }> = [
    { path: "/institute", icon: LayoutDashboard, label: "Overview", end: true },
    { path: "/institute#applications", icon: Users, label: "Applications", anchor: true },
    { path: "/institute#subscription", icon: CreditCard, label: "Subscription", anchor: true },
    { path: "/dashboard/payments", icon: CreditCard, label: "Payments" },
    { path: "/institute/notices", icon: Bell, label: "Notices", disabled: !access?.can_post_notices },
    { path: `/institute/blogs?college=${activeInstitute.id}`, icon: FileText, label: "College blog", disabled: !access?.can_edit_profile },
    { path: "/institutes", icon: Building2, label: "Public listing" },
  ];
  const canAccessApplications = subscription.active && ["read_only", "full"].includes(subscription.leadAccessMode);
  const canEditOwnedProfile = access?.can_edit_profile === true;

  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-white text-[#17162e]">
      <div className="min-h-screen w-full overflow-x-hidden bg-white">
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
                {activeInstitute.logo_url ? (
                  <Image
                    src={activeInstitute.logo_url}
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
                  <h1 className="font-semibold">{activeInstitute.name}</h1>
                  <div className="flex items-center gap-2">
                    <Badge className={activeInstitute.is_verified ? "border-0 bg-[#dff5ec] text-[#28725a] hover:bg-[#dff5ec]" : "border-0 bg-[#fff1e8] text-[#c84f08] hover:bg-[#fff1e8]"}>
                      {activeInstitute.is_verified ? "Verified" : "Unclaimed / Pending"}
                    </Badge>
                    <span className="text-sm text-muted-foreground">{activeInstitute.type}</span>
                  </div>
                </div>
                {managedInstitutes.length > 1 && (
                  <Select value={activeInstitute.id} onValueChange={setSelectedInstituteId}>
                    <SelectTrigger className="ml-1 h-9 w-[220px] rounded-lg border-[#eadfd7] text-xs font-semibold"><SelectValue placeholder="Select college" /></SelectTrigger>
                    <SelectContent>
                      {managedInstitutes.map((managed) => <SelectItem key={managed.id} value={managed.id}>{managed.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>
            {canEditOwnedProfile && (
              <Button
                variant="outline"
                className="rounded-xl border-[#eadfd7] hover:border-[#fdba74] hover:bg-[#fff8f3]"
                onClick={() => setProfileEditorOpen(true)}
              >
                <Edit3 className="mr-2 h-4 w-4" />
                <span className="hidden sm:inline">Edit profile</span>
              </Button>
            )}
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
                        onClick={() => {
                          const hash = item.path.split("#")[1];
                          if (hash) {
                            setTimeout(() => scrollToHash(`#${hash}`), 50);
                          }
                        }}
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
                  <h2 className="mt-2 font-display text-2xl font-bold tracking-[-0.025em] sm:text-3xl">Good morning, {activeInstitute.name}</h2>
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
            {!subscription.active && isUuid(activeInstitute.id) && (
              <section role="alert" className="mb-4 flex flex-col gap-3 rounded-[22px] border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950 sm:flex-row sm:items-center sm:justify-between">
                <div><p className="font-extrabold">Your subscription/trial has expired. Renew to restore College Module access.</p><p className="mt-1 text-xs text-amber-800">Editing and applicant records stay locked until an approved renewal is active.</p></div>
                <Button asChild className="shrink-0 rounded-xl bg-[#c2410c] text-white hover:bg-[#9a3412]"><Link to="/dashboard/payments">View renewal options</Link></Button>
              </section>
            )}
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
                        {activeInstitute.admission_status || "Closed"}
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
                  <Button
                    variant="outline"
                    className="rounded-xl border-[#eadfd7] hover:border-[#fdba74] hover:bg-[#fff8f3] text-[#c2410c] font-bold"
                    onClick={() => setIsClaimModalOpen(true)}
                  >
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Claim / List College
                  </Button>
                  <Button
                    variant="outline"
                    className="rounded-xl border-[#eadfd7] hover:border-[#fdba74] hover:bg-[#fff8f3] text-[#c2410c] font-bold"
                    onClick={() => setIsFeaturedModalOpen(true)}
                  >
                    <Sparkles className="mr-2 h-4 w-4" />
                    Request Featured Placement
                  </Button>
                  <Button
                    variant="outline"
                    className="rounded-xl border-[#eadfd7] hover:border-[#fdba74] hover:bg-[#fff8f3] font-bold"
                    onClick={() => setIsModuleModalOpen(true)}
                  >
                    <ShieldCheck className="mr-2 h-4 w-4" />
                    Request Other Module Access
                  </Button>
                  {access?.can_post_notices && (
                    <Button asChild className="rounded-xl bg-[#c2410c] hover:bg-[#9a3412]">
                      <Link to="/institute/notices?new=1">
                        <Bell className="mr-2 h-4 w-4" />
                        Post Notice
                      </Link>
                    </Button>
                  )}
                  {canEditOwnedProfile && (
                    <Button variant="outline" className="rounded-xl border-[#eadfd7] hover:border-[#fdba74] hover:bg-[#fff8f3]" onClick={() => setProfileEditorOpen(true)}>
                      <Edit3 className="mr-2 h-4 w-4" />
                      Edit profile
                    </Button>
                  )}
                  {canEditOwnedProfile && (
                    <Button asChild variant="outline" className="rounded-xl border-[#eadfd7] hover:border-[#fdba74] hover:bg-[#fff8f3]">
                      <Link to={`/institute/blogs?college=${encodeURIComponent(activeInstitute.id)}`}><FileText className="mr-2 h-4 w-4" />Manage blog</Link>
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
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <CardTitle>Student Applications</CardTitle>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Applications submitted to <span className="font-semibold text-[#c2410c]">{activeInstitute.name}</span> only
                    </p>
                  </div>
                  <Badge variant="outline">{canAccessApplications ? `${stats.applications} total` : "Plan required"}</Badge>
                </div>
                {/* Status Filter Tabs */}
                {canAccessApplications && (
                  <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl mt-3 flex-wrap">
                    {APP_STATUS_TABS.map((tab) => {
                      const count = tab === "all"
                        ? recentApplications.length
                        : recentApplications.filter((a) => a.status === tab).length;
                      const label = tab === "all" ? "All" : collegeApplicationStatusLabel(tab);
                      return (
                        <button
                          key={tab}
                          onClick={() => setAppStatusFilter(tab)}
                          className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                            appStatusFilter === tab
                              ? "bg-white text-slate-900 shadow-xs"
                              : "text-slate-500 hover:text-slate-800"
                          }`}
                        >
                          {label} ({count})
                        </button>
                      );
                    })}
                  </div>
                )}
              </CardHeader>
              <CardContent>
                {!canAccessApplications ? (
                  <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                    <CreditCard className="mt-0.5 h-4 w-4 shrink-0" />
                    <p>An active package with lead access is required before applicant records can be viewed.</p>
                  </div>
                ) : (() => {
                  const filtered = appStatusFilter === "all"
                    ? recentApplications
                    : recentApplications.filter((a) => a.status === appStatusFilter);
                  return filtered.length === 0 ? (
                    <div className="py-8 text-center text-muted-foreground">
                      <Users className="mx-auto mb-3 h-10 w-10 opacity-50" />
                      <p>No {appStatusFilter === "all" ? "" : collegeApplicationStatusLabel(appStatusFilter).toLowerCase()} applications {appStatusFilter === "all" ? "received yet" : "found"}</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {filtered.map((application) => {
                        const isUpdating = updatingAppId === application.id;
                        const badgeClass = collegeApplicationStatusBadgeClass(application.status);
                        return (
                          <div key={application.id} className="rounded-xl border border-[#f0e3da] bg-[#fffdfb] p-4">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-bold text-slate-900 truncate">{application.full_name || "Anonymous Applicant"}</p>
                                <p className="mt-0.5 text-xs text-slate-600 truncate">
                                  {application.program_interest || "Program not specified"}
                                  {application.intake ? ` · ${application.intake}` : ""}
                                </p>
                                {application.phone && (
                                  <p className="mt-0.5 text-xs text-slate-500">📞 {application.phone}</p>
                                )}
                              </div>
                              <Badge className={`shrink-0 text-[10px] font-bold border ${badgeClass}`}>
                                {collegeApplicationStatusLabel(application.status)}
                              </Badge>
                            </div>
                            <p className="mt-2 text-[11px] text-muted-foreground">Submitted {formatDate(application.submitted_at)}</p>

                            {/* Status Update Actions */}
                            <div className="mt-3 flex flex-wrap gap-1.5 border-t border-[#f0e3da] pt-3">
                              {APP_ACTION_STATUSES.filter((status) => status !== application.status).map((status) => (
                                <Button
                                  key={status}
                                  variant="outline"
                                  size="sm"
                                  disabled={isUpdating}
                                  onClick={() => handleUpdateAppStatus(application.id, status)}
                                  className={`h-7 text-[10px] font-bold rounded-lg px-2.5 border ${APP_ACTION_BUTTON_CLASSES[status]}`}
                                >
                                  {APP_ACTION_LABELS[status]}
                                </Button>
                              ))}
                              {isUpdating && <Loader2 className="h-4 w-4 animate-spin text-[#c2410c] ml-1" />}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </CardContent>
            </Card>
            </div>
          </main>
        </div>
      </div>
      {/* Claim or List College Modal */}
      <Dialog open={isClaimModalOpen} onOpenChange={(open) => {
        setIsClaimModalOpen(open);
        if (!open) {
          setClaimType("claim");
          setClaimCollegeName("");
          setSelectedClaimCollege(null);
          setClaimPhone("");
          setClaimEmail("");
          setClaimNotes("");
        }
      }}>
        <DialogContent className="max-w-md rounded-3xl p-6">
          <form onSubmit={handleClaimSubmit} className="space-y-4">
            <DialogHeader>
              <DialogTitle className="text-xl font-black text-slate-900">
                Claim or List an Institution
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Fill out the claim or listing details. Super Admin will review and approve your request.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3">
              <div className="space-y-1">
                <Label className="text-xs font-bold text-slate-700">Action Type *</Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={claimType === "claim" ? "hero" : "outline"}
                    className="flex-1 text-xs font-bold rounded-xl"
                    onClick={() => { setClaimType("claim"); setClaimCollegeName(""); setSelectedClaimCollege(null); }}
                  >
                    Claim Existing
                  </Button>
                  <Button
                    type="button"
                    variant={claimType === "list_new" ? "hero" : "outline"}
                    className="flex-1 text-xs font-bold rounded-xl"
                    onClick={() => { setClaimType("list_new"); setClaimCollegeName(""); setSelectedClaimCollege(null); }}
                  >
                    List New College
                  </Button>
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="claim-college-search" className="text-xs font-bold text-slate-700">College / Institution Name *</Label>
                {claimType === "claim" ? (
                  <CollegeClaimSearch
                    value={claimCollegeName}
                    selected={selectedClaimCollege}
                    onChange={(value) => { setClaimCollegeName(value); setSelectedClaimCollege(null); }}
                    onSelect={(college) => { setClaimCollegeName(college.name); setSelectedClaimCollege(college); }}
                    disabled={isSubmittingClaim}
                  />
                ) : (
                  <Input
                    id="claim-college-search"
                    placeholder="Enter the new college name"
                    value={claimCollegeName}
                    onChange={(e) => setClaimCollegeName(e.target.value)}
                    className="h-10 rounded-xl text-sm"
                    required
                  />
                )}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs font-bold text-slate-700">Contact Phone (Nepal) *</Label>
                  <Input
                    placeholder="e.g. 9801010802"
                    value={claimPhone}
                    onChange={(e) => setClaimPhone(e.target.value)}
                    className="h-10 text-xs rounded-xl"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-bold text-slate-700">Official Email *</Label>
                  <Input
                    placeholder="e.g. info@college.edu.np"
                    value={claimEmail}
                    onChange={(e) => setClaimEmail(e.target.value)}
                    className="h-10 text-xs rounded-xl"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-bold text-slate-700">Notes / Authorization Proof</Label>
                <Input
                  placeholder="Additional information or website link..."
                  value={claimNotes}
                  onChange={(e) => setClaimNotes(e.target.value)}
                  className="h-10 text-xs rounded-xl"
                />
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setIsClaimModalOpen(false)} className="rounded-xl text-xs">
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmittingClaim || (claimType === "claim" && !selectedClaimCollege)} className="rounded-xl bg-[#c2410c] hover:bg-[#9a3412] text-white text-xs font-extrabold px-5">
                {isSubmittingClaim ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
                Submit Request
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Request Featured Section Modal */}
      <Dialog open={isFeaturedModalOpen} onOpenChange={setIsFeaturedModalOpen}>
        <DialogContent className="max-w-md rounded-3xl p-6">
          <form onSubmit={handleFeaturedSubmit} className="space-y-4">
            <DialogHeader>
              <DialogTitle className="text-xl font-black text-slate-900 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-[#c2410c]" />
                Request Featured Placement
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Request Super Admin to feature your college on the homepage or at top listing positions.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3">
              <div className="space-y-1">
                <Label className="text-xs font-bold text-slate-700">Placement Target *</Label>
                <select
                  value={featuredPosition}
                  onChange={(e) => setFeaturedPosition(e.target.value)}
                  className="w-full h-10 px-3 border border-slate-200 rounded-xl text-xs bg-white font-medium"
                >
                  <option value="home_featured">Homepage Featured Banner</option>
                  <option value="top_listing">Top Ranking Position in Colleges Directory</option>
                  <option value="both">Both Homepage & Top Ranking</option>
                </select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-bold text-slate-700">Special Notes or Campaign Period</Label>
                <Input
                  placeholder="e.g. Admission season promotion (June - August)"
                  value={featuredNotes}
                  onChange={(e) => setFeaturedNotes(e.target.value)}
                  className="h-10 text-xs rounded-xl"
                />
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setIsFeaturedModalOpen(false)} className="rounded-xl text-xs">
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmittingFeatured} className="rounded-xl bg-[#c2410c] hover:bg-[#9a3412] text-white text-xs font-extrabold px-5">
                {isSubmittingFeatured ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
                Submit Request
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Request Other Module Access Modal */}
      <Dialog open={isModuleModalOpen} onOpenChange={setIsModuleModalOpen}>
        <DialogContent className="max-w-md rounded-3xl p-6">
          <form onSubmit={handleModuleSubmit} className="space-y-4">
            <DialogHeader>
              <DialogTitle className="text-xl font-black text-slate-900 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-primary" />
                Request Other Module Access
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Request Super Admin for additional workspace modules (Company, Mentor, Admin).
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3">
              <div className="space-y-1">
                <Label className="text-xs font-bold text-slate-700">Target Module *</Label>
                <select
                  value={targetModule}
                  onChange={(e) => setTargetModule(e.target.value)}
                  className="w-full h-10 px-3 border border-slate-200 rounded-xl text-xs bg-white font-medium"
                >
                  <option value="company">Company / Employer Workspace</option>
                  <option value="mentor">Mentor Workspace</option>
                  <option value="admin">Sub-Admin Workspace</option>
                </select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-bold text-slate-700">Reason for Request *</Label>
                <Input
                  placeholder="Explain why you require this module..."
                  value={moduleReason}
                  onChange={(e) => setModuleReason(e.target.value)}
                  className="h-10 text-xs rounded-xl"
                  required
                />
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setIsModuleModalOpen(false)} className="rounded-xl text-xs">
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmittingModule} className="rounded-xl bg-[#0073e6] hover:bg-[#0062c4] text-white text-xs font-extrabold px-5">
                {isSubmittingModule ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
                Send Request
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {canEditOwnedProfile && user && (
        <InstituteProfileEditor
          open={profileEditorOpen}
          onOpenChange={setProfileEditorOpen}
          institute={activeInstitute}
          onSaved={() => void fetchInstituteData()}
        />
      )}
      </div>
    </div>
  );
};

export default InstituteDashboard;
