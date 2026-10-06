import { useEffect, useState } from "react";
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
import { ShieldAlert, Sparkles, CheckCircle2, ArrowLeft, Loader2, Send, Clock3, X } from "lucide-react";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";

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
}

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
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [phone, setPhone] = useState(profile?.phone || "");
  const [collegesList, setCollegesList] = useState<{ id: string; name: string; location?: string }[]>([]);
  const [selectedCollege, setSelectedCollege] = useState<{ id: string; name: string } | null>(null);
  const [collegeSearchQuery, setCollegeSearchQuery] = useState("");
  const [proofDocs, setProofDocs] = useState<Record<string, string>>({});
  const [moduleOptions, setModuleOptions] = useState<ModuleOption[]>([]);
  const [isLoadingModules, setIsLoadingModules] = useState(true);
  const [selectedModules, setSelectedModules] = useState<string[]>([]);
  const [reason, setReason] = useState("");
  const [organization, setOrganization] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [accessRequests, setAccessRequests] = useState<AccessRequestStatus[]>([]);
  const [isLoadingRequests, setIsLoadingRequests] = useState(Boolean(user));
  const [cancellingRequestId, setCancellingRequestId] = useState<string | null>(null);

  useEffect(() => {
    if (profile?.phone && !phone) setPhone(profile.phone);
  }, [profile?.phone]);

  useEffect(() => {
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

  const loadMyRequests = async () => {
    if (!user) {
      setAccessRequests([]);
      setIsLoadingRequests(false);
      return;
    }
    setIsLoadingRequests(true);
    const { data, error } = await (supabase as any).rpc("get_my_module_access_requests");
    if (!error) setAccessRequests((data || []) as AccessRequestStatus[]);
    setIsLoadingRequests(false);
  };

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
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
        if (active) {
          setModuleOptions([
            { id: "college", label: "College / Institution Admin", desc: "Manage college profile, programs, brochures, and student applications" },
            { id: "job", label: "Job & Recruiter Admin", desc: "Post job openings, manage candidates, and company profile" },
            { id: "event", label: "Events & Competitions Admin", desc: "Create and manage events, hackathons, and registrations" },
            { id: "mentor", label: "Mentor Module", desc: "Manage mentorship profile, services, hourly rates, and booking requests" },
          ]);
        }
      }
      if (active) setIsLoadingModules(false);
    })();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    void loadMyRequests();
  }, [user?.id]);

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

    setIsSubmitting(true);

    try {
      const proofsSummary = Object.entries(proofDocs)
        .map(([mod, doc]) => `${mod}: ${doc}`)
        .join(", ");

      const fullReason = [
        `Contact Phone (Nepal): ${phone.trim() || profile?.phone || "N/A"}`,
        proofsSummary ? `Attached Proofs: ${proofsSummary}` : "",
        selectedCollege ? `Target College: ${selectedCollege.name} (ID: ${selectedCollege.id})` : "",
        `Justification: ${reason.trim()}`,
      ].filter(Boolean).join("\n");

      let submitted = false;

      // 1. Try RPC
      try {
        const { error: rpcError } = await (supabase as any).rpc(
          "request_sub_admin_access",
          {
            p_requested_modules: selectedModules,
            p_reason: fullReason,
            p_organization: organization.trim() || selectedCollege?.name || null,
          },
        );
        if (!rpcError) submitted = true;
      } catch {
        submitted = false;
      }

      // 2. Direct fallback
      if (!submitted) {
        const { error: directErr } = await (supabase as any)
          .from("sub_admin_requests")
          .insert({
            user_id: user.id,
            user_name: profile?.full_name || user.email,
            user_email: user.email,
            requested_modules: selectedModules,
            reason: fullReason,
            organization: organization.trim() || selectedCollege?.name || null,
            status: "pending",
          });
        if (directErr) {
          // If table doesn't exist, create audit log / toast
          console.warn("Direct request fallback note:", directErr);
        }
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

      setIsSubmitted(true);
      await loadMyRequests();
      toast({ title: "Sub-Admin request submitted successfully!" });
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

        {isSubmitted ? (
          <Card className="border-emerald-200 bg-white shadow-xl text-center py-12 px-6">
            <CardContent className="space-y-4 max-w-md mx-auto">
              <div className="h-16 w-16 bg-emerald-100 text-emerald-600 rounded-full grid place-items-center mx-auto">
                <CheckCircle2 className="h-10 w-10" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900">Access Request Submitted!</h2>
              <p className="text-sm text-slate-600">
                Your request to manage sub-admin modules has been received. Super administrators will review your credentials and grant sub-admin access shortly.
              </p>
              <div className="pt-4 flex justify-center gap-3">
                <Button variant="outline" asChild>
                  <Link to="/">Return to Home</Link>
                </Button>
                <Button className="bg-[#071a3d] text-white hover:bg-[#05132d]" asChild>
                  <Link to="/dashboard">Go to Dashboard</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
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
                              {request.decision_note && <p className="mt-1 text-slate-600">{request.decision_note}</p>}
                              {request.status === "approved" && request.assigned_capabilities?.length > 0 && (
                                <p className="mt-1 text-emerald-700">Granted: {request.assigned_capabilities.join(", ")}. Request or receive an entity assignment to manage records.</p>
                              )}
                              {request.status === "pending" && (
                                <Button type="button" variant="ghost" size="sm" className="mt-1 h-7 px-2 text-xs text-slate-600 hover:text-rose-700" disabled={cancellingRequestId === request.id} onClick={() => void cancelRequest(request.id)}>
                                  {cancellingRequestId === request.id ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <X className="mr-1 h-3 w-3" />} Cancel request
                                </Button>
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
                    <Input value={profile?.full_name || ""} disabled className="bg-slate-100" />
                  </div>
                  <div className="space-y-2">
                    <Label>Your Email</Label>
                    <Input value={user?.email || ""} disabled className="bg-slate-100" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-slate-700">Contact Number (Nepal) *</Label>
                    <Input
                      placeholder="e.g. 9801010802"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      required
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
                            onChange={(e) => setProofDocs((prev) => ({ ...prev, college: e.target.files?.[0]?.name || "" }))}
                            className="bg-white text-xs"
                          />
                        </div>
                      )}
                      {selectedModules.includes("event") && (
                        <div className="space-y-1">
                          <Label className="text-xs text-slate-700">Event Proposal Document *</Label>
                          <Input
                            type="file"
                            accept=".pdf,.doc,.docx"
                            onChange={(e) => setProofDocs((prev) => ({ ...prev, event: e.target.files?.[0]?.name || "" }))}
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
                            onChange={(e) => setProofDocs((prev) => ({ ...prev, mentor: e.target.files?.[0]?.name || "" }))}
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
                            onChange={(e) => setProofDocs((prev) => ({ ...prev, job: e.target.files?.[0]?.name || "" }))}
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
                    Submit & Continue to Pay
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}
      </main>

      <Footer />
    </div>
  );
}
