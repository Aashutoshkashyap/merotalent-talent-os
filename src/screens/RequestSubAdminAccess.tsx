import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { ShieldAlert, Sparkles, ArrowLeft, Loader2, Send, Clock3, X } from "lucide-react";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import type { RequestProof } from "@/lib/server/neon-module-access";

const isNeonStaging = process.env.NEXT_PUBLIC_MEROTALENT_BACKEND_MODE === "neon-staging";
async function stagingRequest(url: string, init?: RequestInit) {
  const response = await fetch(url, { credentials: "same-origin", cache: "no-store", ...init });
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(payload?.message || payload?.error || "The request failed.");
  return payload.data;
}

interface ModuleOption {
  id: string;
  label: string;
  desc: string;
}

interface AccessRequestStatus {
  id: string;
  requested_modules: string[];
  assigned_capabilities: string[];
  organization: string | null;
  status: "pending" | "approved" | "rejected" | "cancelled";
  decision_note: string | null;
  decided_at: string | null;
  created_at: string;
  package_id: string | null;
  payment_id: string | null;
  payment_status: "not_started" | "pending" | "success" | "failed" | "cancelled" | "expired";
}

interface AccessPlan {
  id: string;
  name: string;
  price: number;
  currency: string;
  duration_days: number | null;
  module_scope: string[];
}

const canonicalModuleKey = (value: string) => ({ job: "jobs", event: "events", institution: "college", mentor: "mentor" }[value] || value);
const moduleWorkspacePath = (value: string) => ({
  college: "/institute",
  jobs: "/company",
  job: "/company",
  events: "/company",
  event: "/company",
  mentor: "/mentor",
}[canonicalModuleKey(value)] || "/dashboard");

const postToCheckout = (checkoutUrl: string, fields: Record<string, string>) => {
  const form = document.createElement("form");
  form.method = "POST";
  form.action = checkoutUrl;
  for (const [name, value] of Object.entries(fields)) {
    const input = document.createElement("input");
    input.type = "hidden";
    input.name = name;
    input.value = value;
    form.appendChild(input);
  }
  document.body.appendChild(form);
  form.submit();
};

const errorMessage = (error: unknown) => {
  if (error instanceof Error) return error.message;
  if (
    error &&
    typeof error === "object" &&
    "message" in error &&
    typeof error.message === "string"
  ) {
    return error.message;
  }
  return "The request could not be submitted.";
};

export default function RequestSubAdminAccess() {
  const { user, profile, session } = useAuth();
  const currentUserId = user?.id;
  const { toast } = useToast();
  const navigate = useNavigate();

  const [phone, setPhone] = useState(profile?.phone || "");
  const [collegesList, setCollegesList] = useState<{ id: string; name: string; location?: string }[]>([]);
  const [selectedCollege, setSelectedCollege] = useState<{ id: string; name: string } | null>(null);
  const [collegeSearchQuery, setCollegeSearchQuery] = useState("");
  const [proofDocs, setProofDocs] = useState<Record<string, string>>({});
  const [proofFiles, setProofFiles] = useState<Record<string, File>>({});
  const [uploadedProofs, setUploadedProofs] = useState<Record<string, RequestProof>>({});
  const [draftId, setDraftId] = useState(() => crypto.randomUUID());
  const [trustedProfile, setTrustedProfile] = useState<{ full_name: string; email: string; phone: string } | null>(null);
  const [moduleOptions, setModuleOptions] = useState<ModuleOption[]>([]);
  const [accessPlans, setAccessPlans] = useState<AccessPlan[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState("");
  const [isLoadingModules, setIsLoadingModules] = useState(true);
  const [selectedModules, setSelectedModules] = useState<string[]>([]);
  const [reason, setReason] = useState("");
  const [organization, setOrganization] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [accessRequests, setAccessRequests] = useState<AccessRequestStatus[]>([]);
  const [activeEntitlementModules, setActiveEntitlementModules] = useState<Set<string>>(new Set());
  const [isLoadingRequests, setIsLoadingRequests] = useState(Boolean(user));
  const [cancellingRequestId, setCancellingRequestId] = useState<string | null>(null);

  useEffect(() => {
    if (profile?.phone) setPhone(current => current || profile.phone || "");
  }, [profile?.phone]);

  useEffect(() => {
    if (isNeonStaging) return;
    let active = true;
    void (async () => {
      const { data } = await (supabase as any)
        .from("institutes")
        .select("id, name, location")
        .order("name");
      if (active && data) {
        setCollegesList(data.map((c: any) => ({ id: c.id, name: c.name, location: c.location })));
      }
    })();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (isNeonStaging) return;
    let active = true;
    void (async () => {
      const { data, error } = await (supabase as any)
        .from("packages")
        .select("id,name,price,currency,duration_days,module_scope")
        .eq("is_active", true)
        .eq("is_publicly_selectable", true)
        .eq("package_kind", "paid")
        .is("deleted_at", null)
        .order("price", { ascending: true });
      if (active && !error) setAccessPlans((data || []) as AccessPlan[]);
    })();
    return () => { active = false; };
  }, []);

  const compatiblePlans = accessPlans.filter((plan) => {
    const scopes = Array.isArray(plan.module_scope) ? plan.module_scope : [];
    return selectedModules.length > 0 && selectedModules.every((module) => scopes.includes(canonicalModuleKey(module)));
  });

  useEffect(() => {
    if (!compatiblePlans.some((plan) => plan.id === selectedPlanId)) {
      setSelectedPlanId(compatiblePlans[0]?.id || "");
    }
  }, [compatiblePlans, selectedPlanId]);

  const loadMyRequests = useCallback(async () => {
    if (!currentUserId) {
      setAccessRequests([]);
      setIsLoadingRequests(false);
      return;
    }
    setIsLoadingRequests(true);
    if (isNeonStaging) {
      try {
        const result = await stagingRequest("/api/v1/neon-staging/module-access");
        setAccessRequests(result.requests);
        const now = Date.now();
        setActiveEntitlementModules(new Set<string>(result.entitlements.filter((item: { status: string; start_at: string; expires_at: string | null }) =>
          item.status === "active" && new Date(item.start_at).getTime() <= now && (!item.expires_at || new Date(item.expires_at).getTime() > now))
          .map((item: { module_key: string }) => item.module_key)));
      } catch (error) {
        toast({ variant: "destructive", title: "Requests unavailable", description: errorMessage(error) });
      } finally { setIsLoadingRequests(false); }
      return;
    }
    const [{ data, error }, { data: entitlements, error: entitlementError }] = await Promise.all([
      (supabase as any).rpc("get_my_module_access_requests"),
      (supabase as any).rpc("get_my_module_entitlements"),
    ]);
    if (!error) setAccessRequests((data || []) as AccessRequestStatus[]);
    if (!entitlementError) {
      const now = Date.now();
      setActiveEntitlementModules(new Set((entitlements || [])
        .filter((item: any) => item.status === "active" && (!item.expires_at || new Date(item.expires_at).getTime() > now))
        .map((item: any) => canonicalModuleKey(String(item.module_key)))));
    }
    setIsLoadingRequests(false);
  }, [currentUserId, toast]);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        if (isNeonStaging) {
          if (!currentUserId) { if (active) setIsLoadingModules(false); return; }
          const result = await stagingRequest("/api/v1/neon-staging/module-access?catalog=true");
          if (active) {
            setModuleOptions(result.modules); setAccessPlans(result.plans); setCollegesList(result.colleges);
            setTrustedProfile(result.profile); setPhone(result.profile.phone || "");
          }
          return;
        }
        const { data, error } = await (supabase as any)
          .from("module_capabilities")
          .select("module_key,label,description")
          .eq("is_active", true)
          .eq("is_requestable", true)
          .order("label");
        if (active && !error && data && data.length > 0) {
          setModuleOptions((data || []).map((row: Record<string, unknown>) => ({
            id: String(row.module_key),
            label: String(row.label),
            desc: String(row.description || "Request permission to manage this module."),
          })));
        } else if (active) {
          setModuleOptions([
            { id: "college", label: "College / Institution Admin", desc: "Manage college profile, programs, brochures, and student applications" },
            { id: "job", label: "Job & Recruiter Admin", desc: "Post job openings, manage candidates, and company profile" },
            { id: "event", label: "Events & Competitions Admin", desc: "Create and manage events, hackathons, and registrations" },
            { id: "mentor", label: "Mentor Module", desc: "Manage mentorship profile, services, hourly rates, and booking requests" },
          ]);
        }
      } catch {
        if (active && !isNeonStaging) {
          setModuleOptions([
            { id: "college", label: "College / Institution Admin", desc: "Manage college profile, programs, brochures, and student applications" },
            { id: "job", label: "Job & Recruiter Admin", desc: "Post job openings, manage candidates, and company profile" },
            { id: "event", label: "Events & Competitions Admin", desc: "Create and manage events, hackathons, and registrations" },
            { id: "mentor", label: "Mentor Module", desc: "Manage mentorship profile, services, hourly rates, and booking requests" },
          ]);
        }
      } finally { if (active) setIsLoadingModules(false); }
    })();
    return () => { active = false; };
  }, [currentUserId]);

  useEffect(() => {
    void loadMyRequests();
  }, [loadMyRequests]);

  const toggleModule = (id: string) => {
    setSelectedModules((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast({ variant: "destructive", title: "Authentication required", description: "Please sign in to submit a request." });
      navigate("/login");
      return;
    }

    // Soft Nepal Phone validation check
    const isNepalPhone = /^(?:98|97)\d{8}$/.test(phone.trim());
    if (phone.trim() && !isNepalPhone) {
      toast({
        title: "Phone Format Warning",
        description: "Standard Nepal mobile numbers start with 98 or 97 and have 10 digits. Submitting anyway...",
      });
    }

    if (selectedModules.length === 0) {
      toast({ variant: "destructive", title: "Select modules", description: "Please select at least one module to manage." });
      return;
    }

    if (!reason.trim()) {
      toast({ variant: "destructive", title: "Reason required", description: "Please state your request reason." });
      return;
    }
    if (!selectedPlanId) {
      toast({ variant: "destructive", title: "Choose a plan", description: "Select the Super Admin configured plan that covers these modules." });
      return;
    }
    if (!isNeonStaging && !session?.access_token) {
      toast({ variant: "destructive", title: "Session expired", description: "Sign in again before continuing to eSewa." });
      return;
    }

    setIsSubmitting(true);

    try {
      if (isNeonStaging) {
        const existing = accessRequests.find(request => request.status === "pending");
        let requestId = existing?.id;
        if (!requestId) {
          if (selectedModules.includes("college") && !selectedCollege) throw new Error("Select an existing college first.");
          const proofs = { ...uploadedProofs };
          for (const moduleKey of selectedModules) {
            if (proofs[moduleKey]) continue;
            const file = proofFiles[moduleKey];
            if (!file) throw new Error("Upload supporting documents for every selected module.");
            const form = new FormData(); form.set("file", file); form.set("module", moduleKey); form.set("draftId", draftId);
            proofs[moduleKey] = await stagingRequest("/api/v1/neon-staging/module-access/proofs", { method: "POST", body: form });
            setUploadedProofs(previous => ({ ...previous, [moduleKey]: proofs[moduleKey] }));
          }
          const saved = await stagingRequest("/api/v1/neon-staging/module-access", { method: "POST",
            headers: { "Content-Type": "application/json" }, body: JSON.stringify({ draftId,
              modules: selectedModules, packageId: selectedPlanId, collegeId: selectedModules.includes("college") ? selectedCollege?.id : undefined,
              reason: reason.trim(), organization: organization.trim(),
              proofs: Object.fromEntries(selectedModules.map(module => [module, proofs[module]])) }) });
          requestId = saved.id;
        } else if (existing && (existing.package_id !== selectedPlanId ||
            [...existing.requested_modules].sort().join() !== [...selectedModules].sort().join())) {
          throw new Error("Complete or cancel your pending request before selecting another plan or module.");
        }
        await loadMyRequests();
        const checkout = await stagingRequest("/api/v1/neon-staging/payments/checkout", { method: "POST",
          headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind: "module_access_request", targetId: requestId, packageId: selectedPlanId }) });
        toast({ title: "Request saved", description: "Opening eSewa to complete the required payment…" });
        postToCheckout(checkout.checkoutUrl, checkout.checkoutFields);
        return;
      }
      const proofsSummary = Object.entries(proofDocs)
        .map(([mod, doc]) => `${mod}: ${doc}`)
        .join(", ");

      const fullReason = [
        `Contact Phone (Nepal): ${phone.trim() || profile?.phone || "N/A"}`,
        proofsSummary ? `Attached Proofs: ${proofsSummary}` : "",
        selectedCollege ? `Target College: ${selectedCollege.name} (ID: ${selectedCollege.id})` : "",
        `Justification: ${reason.trim()}`,
      ].filter(Boolean).join("\n");

      const { data: requestData, error: rpcError } = await (supabase as any).rpc(
        "request_sub_admin_access",
        {
          p_requested_modules: selectedModules,
          p_reason: fullReason,
          p_organization: organization.trim() || selectedCollege?.name || null,
        },
      );
      if (rpcError) throw rpcError;
      const requestId = typeof requestData?.id === "string" ? requestData.id : "";
      if (!requestId) throw new Error("The access request was saved without a payable reference. Refresh and try again.");

      const checkoutResponse = await fetch("/api/v1/payments/checkout", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ accessRequestId: requestId, packageId: selectedPlanId }),
      });
      const checkoutPayload = await checkoutResponse.json().catch(() => null);
      if (!checkoutResponse.ok || !checkoutPayload?.data?.checkoutUrl || !checkoutPayload?.data?.checkoutFields) {
        throw new Error(checkoutPayload?.error?.message || "The request was saved, but eSewa checkout could not be started. Try Continue to Pay again.");
      }

      // Log activity
      const { logUserActivity } = await import("@/lib/activityLogger");
      logUserActivity({
        id: `subadmin-req-${Date.now()}`,
        kind: "college",
        title: "Sub-Admin Access Request",
        detail: `${selectedModules.length} modules requested · ${organization.trim() || selectedCollege?.name || "Independent"}`,
        status: "applied",
        occurredAt: new Date().toISOString(),
        href: "/request-access",
      });

      await loadMyRequests();
      toast({ title: "Request saved", description: "Opening eSewa to complete the required payment…" });
      postToCheckout(checkoutPayload.data.checkoutUrl, checkoutPayload.data.checkoutFields);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Request failed",
        description: errorMessage(error),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const cancelRequest = async (requestId: string) => {
    setCancellingRequestId(requestId);
    if (isNeonStaging) {
      try {
        await stagingRequest("/api/v1/neon-staging/module-access", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ requestId }) });
        setDraftId(crypto.randomUUID()); setUploadedProofs({}); await loadMyRequests(); toast({ title: "Request cancelled" });
      } catch (error) { toast({ variant: "destructive", title: "Could not cancel request", description: errorMessage(error) }); }
      finally { setCancellingRequestId(null); }
      return;
    }
    const { error } = await (supabase as any).rpc("cancel_module_access_request", {
      p_request_id: requestId,
    });
    if (error) {
      toast({ variant: "destructive", title: "Could not cancel request", description: errorMessage(error) });
    } else {
      await loadMyRequests();
      toast({ title: "Request cancelled" });
    }
    setCancellingRequestId(null);
  };

  const continueRequestPayment = async (request: AccessRequestStatus) => {
    if (!request.package_id) return;
    setIsSubmitting(true);
    try {
      const checkout = await stagingRequest("/api/v1/neon-staging/payments/checkout", { method: "POST",
        headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind: "module_access_request", targetId: request.id, packageId: request.package_id }) });
      postToCheckout(checkout.checkoutUrl, checkout.checkoutFields);
    } catch (error) { toast({ variant: "destructive", title: "Payment could not be started", description: errorMessage(error) }); }
    finally { setIsSubmitting(false); }
  };

  const requestStatusClasses: Record<AccessRequestStatus["status"], string> = {
    pending: "bg-amber-50 text-amber-800 border-amber-200",
    approved: "bg-emerald-50 text-emerald-800 border-emerald-200",
    rejected: "bg-rose-50 text-rose-800 border-rose-200",
    cancelled: "bg-slate-100 text-slate-600 border-slate-200",
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between">
      <Navbar />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-24 sm:py-28">
        <div className="mb-6 flex items-center justify-between">
          <Link to="/" className="inline-flex items-center text-xs font-bold text-slate-600 hover:text-slate-900 bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-3xs">
            <ArrowLeft className="mr-1.5 h-4 w-4" />
            Back to Home
          </Link>

          {user && (
            <Link to="/dashboard" className="inline-flex items-center gap-1.5 text-xs font-extrabold text-white bg-[#071a3d] hover:bg-[#05132d] px-4 py-1.5 rounded-lg shadow-sm">
              <Sparkles className="h-3.5 w-3.5 text-amber-400" />
              Back to Dashboard
            </Link>
          )}
        </div>

        <Card className="border-slate-200 shadow-xl bg-white overflow-hidden">
            <CardHeader className="bg-[#071a3d] text-white p-6 sm:p-8">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-400 mb-1">
                <ShieldAlert className="h-4 w-4" />
                Sub-Admin Authorization Request
              </div>
              <CardTitle className="text-2xl font-bold">Request Module Management Access</CardTitle>
              <CardDescription className="text-slate-300 text-sm mt-1">
                Academic partners, institution reps, recruiters, and mentors can request sub-admin access to manage specific platform modules.
              </CardDescription>
            </CardHeader>

            <CardContent className="p-6 sm:p-8 space-y-6">
              {user && (
                <section aria-label="Your access requests" className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
                  <div className="flex items-start gap-3">
                    <Clock3 className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-slate-900">Your request status</p>
                      {isLoadingRequests ? (
                        <p className="mt-1 text-xs text-slate-500">Checking your requests…</p>
                      ) : accessRequests.length === 0 ? (
                        <p className="mt-1 text-xs text-slate-500">No module-management requests yet.</p>
                      ) : (
                        <div className="mt-3 space-y-2">
                          {accessRequests.slice(0, 3).map((request) => (
                            <div key={request.id} className="rounded-lg border border-slate-200 bg-white p-3 text-xs">
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <p className="font-semibold text-slate-800">{request.requested_modules.join(", ")}</p>
                                <span className={`rounded-full border px-2 py-0.5 font-bold capitalize ${requestStatusClasses[request.status]}`}>{request.status}</span>
                              </div>
                              {request.organization && <p className="mt-1 text-slate-500">{request.organization}</p>}
                              <p className="mt-1 font-semibold text-slate-600">Payment: {request.payment_status?.replaceAll("_", " ") || "not started"}</p>
                              {request.decision_note && <p className="mt-1 text-slate-600">{request.decision_note}</p>}
                              {request.status === "approved" && request.assigned_capabilities?.length > 0 && (
                                <div className="mt-1 space-y-1.5">
                                  <p className="text-emerald-700">Granted: {request.assigned_capabilities.join(", ")}. Your module access is approved!</p>
                                  <div className="flex flex-wrap gap-2 pt-1">
                                    {request.requested_modules.every((module) => activeEntitlementModules.has(canonicalModuleKey(module))) ? (
                                      [...new Set(request.requested_modules.map(canonicalModuleKey))].map((module) => (
                                        <Button key={module} asChild size="sm" className="h-7 px-2.5 text-xs bg-[#071a3d] text-white hover:bg-[#05132d]">
                                          <Link to={moduleWorkspacePath(module)}>Open {module.replaceAll("_", " ")} workspace</Link>
                                        </Button>
                                      ))
                                    ) : (
                                      <Button asChild size="sm" className="h-7 px-2.5 text-xs bg-[#071a3d] text-white hover:bg-[#05132d]">
                                        <Link to="/dashboard/payments">View Plans &amp; Pay</Link>
                                      </Button>
                                    )}
                                  </div>
                                </div>
                              )}
                              {request.status === "pending" && request.payment_status !== "success" && (
                                <div className="flex flex-wrap gap-2">
                                {isNeonStaging && request.package_id && (
                                  <Button type="button" size="sm" className="mt-1 h-7 px-2 text-xs" disabled={isSubmitting}
                                    onClick={() => void continueRequestPayment(request)}>Continue to Pay</Button>
                                )}
                                <Button type="button" variant="ghost" size="sm" className="mt-1 h-7 px-2 text-xs text-slate-600 hover:text-rose-700" disabled={cancellingRequestId === request.id} onClick={() => void cancelRequest(request.id)}>
                                  {cancellingRequestId === request.id ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <X className="mr-1 h-3 w-3" />} Cancel request
                                </Button>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </section>
              )}
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid sm:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Your Name</Label>
                    <Input value={trustedProfile?.full_name || profile?.full_name || ""} disabled className="bg-slate-100" />
                  </div>
                  <div className="space-y-2">
                    <Label>Your Email</Label>
                    <Input value={trustedProfile?.email || user?.email || ""} disabled className="bg-slate-100" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-slate-700">Contact Number (Nepal) *</Label>
                    <Input
                      placeholder="e.g. 9801010802"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      required
                      disabled={isNeonStaging}
                    />
                  </div>
                </div>

                {/* Module Selection */}
                <div className="space-y-3">
                  <Label className="text-sm font-semibold text-slate-900">
                    Select Modules You Want to Manage *
                  </Label>
                  <div className="grid sm:grid-cols-2 gap-3">
                    {isLoadingModules ? (
                      <p className="col-span-full text-sm text-muted-foreground">Loading available modules…</p>
                    ) : moduleOptions.map((mod) => {
                      const isChecked = selectedModules.includes(mod.id);
                      return (
                        <div
                          key={mod.id}
                          onClick={() => toggleModule(mod.id)}
                          className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-start gap-3 ${
                            isChecked
                              ? "border-[#071a3d] bg-slate-50 ring-1 ring-[#071a3d]"
                              : "border-slate-200 hover:border-slate-300 bg-white"
                          }`}
                        >
                          <Checkbox checked={isChecked} className="mt-0.5" />
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-bold text-slate-900">{mod.label}</p>
                            <p className="text-[11px] text-slate-500 line-clamp-1">{mod.desc}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {selectedModules.length > 0 && (
                  <div className="space-y-3 rounded-xl border border-amber-200 bg-amber-50/50 p-4">
                    <Label className="text-sm font-semibold text-slate-900">Choose access plan *</Label>
                    {compatiblePlans.length === 0 ? (
                      <p role="alert" className="text-xs font-semibold text-amber-900">No public paid plan currently covers every selected module. Select a different module combination or ask Super Admin to configure a matching plan.</p>
                    ) : (
                      <div className="grid gap-2 sm:grid-cols-2">
                        {compatiblePlans.map((plan) => (
                          <button
                            key={plan.id}
                            type="button"
                            onClick={() => setSelectedPlanId(plan.id)}
                            className={`rounded-xl border p-3 text-left transition ${selectedPlanId === plan.id ? "border-[#071a3d] bg-white ring-1 ring-[#071a3d]" : "border-amber-200 bg-white/70 hover:border-amber-300"}`}
                          >
                            <span className="block text-sm font-bold text-slate-900">{plan.name}</span>
                            <span className="mt-1 block text-xs text-slate-600">{plan.currency} {Number(plan.price).toLocaleString()} · {plan.duration_days || 30} days</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Searchable College Dropdown (Only if College Module Selected) */}
                {selectedModules.includes("college") && (
                  <div className="space-y-2 rounded-xl border border-blue-200 bg-blue-50/50 p-4">
                    <Label className="text-xs font-bold text-blue-900">Select College / Institution to Manage *</Label>
                    <Input
                      placeholder="Type college name to search (e.g. Pulchowk, Kathmandu University...)"
                      value={collegeSearchQuery}
                      onChange={(e) => setCollegeSearchQuery(e.target.value)}
                      className="bg-white border-blue-200"
                    />
                    {collegesList.length > 0 && (
                      <div className="max-h-40 overflow-y-auto rounded-lg border border-slate-200 bg-white p-1 shadow-sm">
                        {collegesList
                          .filter((c) => !collegeSearchQuery || c.name.toLowerCase().includes(collegeSearchQuery.toLowerCase()))
                          .slice(0, 8)
                          .map((college) => (
                            <button
                              key={college.id}
                              type="button"
                              onClick={() => {
                                setSelectedCollege(college);
                                setOrganization(college.name);
                              }}
                              className={`w-full text-left px-3 py-2 rounded-md text-xs transition-colors ${
                                selectedCollege?.id === college.id
                                  ? "bg-blue-600 text-white font-bold"
                                  : "hover:bg-slate-100 text-slate-800"
                              }`}
                            >
                              <p className="font-medium">{college.name}</p>
                              {college.location && <p className="text-[10px] opacity-80">{college.location}</p>}
                            </button>
                          ))}
                      </div>
                    )}
                    {selectedCollege && (
                      <p className="text-xs text-blue-700 font-semibold">
                        Selected: {selectedCollege.name}
                      </p>
                    )}
                  </div>
                )}

                {/* Proof Documents Section based on Selected Modules */}
                {selectedModules.length > 0 && (
                  <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <Label className="text-xs font-bold uppercase tracking-wider text-slate-800">
                      Required Proof Documents for Selected Modules *
                    </Label>
                    <div className="space-y-3">
                      {selectedModules.includes("college") && (
                        <div className="space-y-1">
                          <Label className="text-xs text-slate-700">College Recommendation Letter *</Label>
                          <Input
                            type="file"
                            accept=".pdf,.png,.jpg,.jpeg"
                            onChange={(e) => { const file = e.target.files?.[0]; if (file) { setProofDocs(prev => ({ ...prev, college: file.name })); setProofFiles(prev => ({ ...prev, college: file })); setUploadedProofs(prev => { const next = { ...prev }; delete next.college; return next; }); } }}
                            className="bg-white text-xs"
                          />
                        </div>
                      )}
                      {(selectedModules.includes("event") || selectedModules.includes("events")) && (
                        <div className="space-y-1">
                          <Label className="text-xs text-slate-700">Event Proposal Document *</Label>
                          <Input
                            type="file"
                            accept=".pdf,.doc,.docx"
                            onChange={(e) => { const file = e.target.files?.[0]; if (file) { setProofDocs(prev => ({ ...prev, event: file.name })); setProofFiles(prev => ({ ...prev, events: file })); setUploadedProofs(prev => { const next = { ...prev }; delete next.events; return next; }); } }}
                            className="bg-white text-xs"
                          />
                        </div>
                      )}
                      {selectedModules.includes("mentor") && (
                        <div className="space-y-1">
                          <Label className="text-xs text-slate-700">CV / Resume *</Label>
                          <Input
                            type="file"
                            accept=".pdf,.doc,.docx"
                            onChange={(e) => { const file = e.target.files?.[0]; if (file) { setProofDocs(prev => ({ ...prev, mentor: file.name })); setProofFiles(prev => ({ ...prev, mentor: file })); setUploadedProofs(prev => { const next = { ...prev }; delete next.mentor; return next; }); } }}
                            className="bg-white text-xs"
                          />
                        </div>
                      )}
                      {(selectedModules.includes("job") || selectedModules.includes("jobs")) && (
                        <div className="space-y-1">
                          <Label className="text-xs text-slate-700">Company Recommendation Letter *</Label>
                          <Input
                            type="file"
                            accept=".pdf,.png,.jpg,.jpeg"
                            onChange={(e) => { const file = e.target.files?.[0]; if (file) { setProofDocs(prev => ({ ...prev, job: file.name })); setProofFiles(prev => ({ ...prev, jobs: file })); setUploadedProofs(prev => { const next = { ...prev }; delete next.jobs; return next; }); } }}
                            className="bg-white text-xs"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Organization / Company Name *</Label>
                  <Input
                    placeholder="e.g. IOE Pulchowk Campus, Leapfrog Tech, or Self"
                    value={organization}
                    onChange={(e) => setOrganization(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label>Justification & Qualifications *</Label>
                  <Textarea
                    placeholder="Explain your official role, why you require sub-admin access, and how you will manage this content..."
                    rows={4}
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    required
                  />
                </div>

                <div className="pt-2 border-t flex flex-col sm:flex-row items-center justify-between gap-4">
                  <p className="text-xs text-slate-500">
                    Once submitted, module access will be reviewed & activated after eSewa fee settlement.
                  </p>
                  <Button type="submit" className="w-full sm:w-auto bg-[#071a3d] text-white hover:bg-[#05132d] px-8" disabled={isSubmitting}>
                    {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                    {isSubmitting ? "Preparing eSewa…" : "Submit & Continue to Pay"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
      </main>

      <Footer />
    </div>
  );
}
