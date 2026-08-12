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
  { id: "lms", label: "LMS & Learning Courses", desc: "Publish skill courses, quizzes, and learning materials" },
  { id: "companies", label: "Company Partners", desc: "Manage company brand profile and recruiter accounts" },
];

export default function RequestSubAdminAccess() {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

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
      navigate("/auth");
      return;
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

    const payload = {
      user_id: user.id,
      user_name: profile?.full_name || user.email?.split("@")[0] || "User",
      user_email: user.email || "",
      requested_modules: selectedModules,
      reason: `[Organization: ${organization || "N/A"}] ${reason}`,
      status: "pending",
    };

    const { error } = await (supabase as any).from("sub_admin_requests").insert(payload);

    if (error) {
      toast({ variant: "destructive", title: "Request failed", description: error.message });
    } else {
      setIsSubmitted(true);
      toast({ title: "Sub-Admin request submitted!" });
    }

    setIsSubmitting(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between">
      <Navbar />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-24 sm:py-28">
        <div className="mb-6 flex items-center justify-between">
          <Link to="/" className="inline-flex items-center text-xs font-semibold text-slate-600 hover:text-slate-900">
            <ArrowLeft className="mr-1.5 h-4 w-4" />
            Back to Home
          </Link>
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
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Your Name</Label>
                    <Input value={profile?.full_name || ""} disabled className="bg-slate-100" />
                  </div>
                  <div className="space-y-2">
                    <Label>Your Email</Label>
                    <Input value={user?.email || ""} disabled className="bg-slate-100" />
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
