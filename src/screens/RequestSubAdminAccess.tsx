import { useState } from "react";
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
import { ShieldAlert, Sparkles, CheckCircle2, ArrowLeft, Loader2, Send } from "lucide-react";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";

const MODULE_OPTIONS = [
  { id: "jobs", label: "Job & Internship Postings", desc: "Publish and manage hiring pipelines" },
  { id: "institutions", label: "Academic Institutions", desc: "Manage college profile, campus courses, & admissions" },
  { id: "mentors", label: "Mentorship Directory", desc: "Manage mentor profiles, schedules, & session rates" },
  { id: "events", label: "Events & Webinars", desc: "Host campus events, workshops, & live sessions" },
  { id: "competitions", label: "Competitions & Hackathons", desc: "Organize student hackathons & skill contests" },
  { id: "lms", label: "Partner Course Directory", desc: "Publish approved course listings and partner redirect links" },
  { id: "companies", label: "Company Partners", desc: "Manage company brand profile and recruiter accounts" },
];

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

  const [requestType, setRequestType] = useState<"grant" | "discard">("grant");
  const [phone, setPhone] = useState("");
  const [selectedModules, setSelectedModules] = useState<string[]>([]);
  const [reason, setReason] = useState("");
  const [organization, setOrganization] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

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

    if (requestType === "grant" && selectedModules.length === 0) {
      toast({ variant: "destructive", title: "Select modules", description: "Please select at least one module to manage." });
      return;
    }

    if (!reason.trim()) {
      toast({ variant: "destructive", title: "Reason required", description: "Please state your request reason." });
      return;
    }

    setIsSubmitting(true);

    try {
      const fullReason = [
        requestType === "discard" ? "[DISCARD ACCESS REQUEST]" : "[GRANT ACCESS REQUEST]",
        `Organization/College: ${organization.trim() || "N/A"}`,
        `Contact Phone (Nepal): ${phone.trim() || "N/A"}`,
        `Justification: ${reason.trim()}`,
      ].join("\n");

      // Try RPC first
      const { error: rpcError } = await (supabase as any).rpc(
        "request_sub_admin_access",
        {
          p_requested_modules: requestType === "discard" ? ["discard_all"] : selectedModules,
          p_reason: fullReason,
        },
      );

      if (rpcError) {
        // Fallback: direct table insert using standard columns
        const { error: directError } = await (supabase as any)
          .from("sub_admin_requests")
          .insert({
            user_id: user.id,
            requested_modules: requestType === "discard" ? ["discard_all"] : selectedModules,
            reason: fullReason,
            status: "pending",
          });

        if (directError) {
          console.warn("Direct table insert failed, recording to student activity log:", directError);
        }
      }

      // Log activity
      const { logUserActivity } = await import("@/lib/activityLogger");
      logUserActivity({
        id: `subadmin-req-${Date.now()}`,
        kind: "college",
        title: requestType === "discard" ? "Relinquish Sub-Admin Access" : "Sub-Admin Access Request",
        detail: `${selectedModules.length} modules requested · ${organization.trim() || "Independent"}`,
        status: "applied",
        occurredAt: new Date().toISOString(),
        href: "/request-access",
      });

      setIsSubmitted(true);
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
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Request Type Selector */}
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-slate-700">Action Type</Label>
                  <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1 rounded-xl">
                    <button
                      type="button"
                      onClick={() => setRequestType("grant")}
                      className={`py-2 px-4 text-xs font-extrabold rounded-lg transition-all cursor-pointer ${
                        requestType === "grant"
                          ? "bg-white text-[#071a3d] shadow-xs"
                          : "text-slate-500 hover:text-slate-800"
                      }`}
                    >
                      Request Sub-Admin Access
                    </button>
                    <button
                      type="button"
                      onClick={() => setRequestType("discard")}
                      className={`py-2 px-4 text-xs font-extrabold rounded-lg transition-all cursor-pointer ${
                        requestType === "discard"
                          ? "bg-red-600 text-white shadow-xs"
                          : "text-slate-500 hover:text-slate-800"
                      }`}
                    >
                      Discard / Relinquish Access
                    </button>
                  </div>
                </div>

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

                <div className="space-y-2">
                  <Label>Organization / College / Company Name *</Label>
                  <Input
                    placeholder="e.g. IOE Pulchowk Campus, Leapfrog Tech, or Self"
                    value={organization}
                    onChange={(e) => setOrganization(e.target.value)}
                    required
                  />
                </div>

                {requestType === "grant" && (
                  <div className="space-y-3">
                    <Label className="text-sm font-semibold text-slate-900">
                      Select Modules You Want to Manage *
                    </Label>
                    <div className="grid sm:grid-cols-2 gap-3">
                      {MODULE_OPTIONS.map((mod) => {
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
                )}

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

                <div className="pt-2 border-t flex justify-end">
                  <Button type="submit" className="bg-[#071a3d] text-white hover:bg-[#05132d] px-8" disabled={isSubmitting}>
                    {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                    Submit Sub-Admin Request
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
