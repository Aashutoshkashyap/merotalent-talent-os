import { useCallback, useEffect, useMemo, useState } from "react";
import { CheckCircle2, CreditCard, ExternalLink, Loader2, Receipt, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

type Plan = {
  id: string; name: string; description: string | null; price: number | string; currency: string;
  billing_interval: string | null; duration_days: number | null; module_scope: string[] | null;
  features: Record<string, boolean> | null; lead_access_mode: string | null;
};
type Scope = { id: string; module: string; entityType: string; entityId: string };
type Entitlement = { id: string; module_key: string; entity_type: string; entity_id: string; package_name: string | null; source: string; status: string; expires_at: string | null; features: Record<string, boolean> | null };
type Checkout = { id: string; package_id: string; provider_name: string; status: string; expires_at: string | null; created_at: string };
type Overview = { plans: Plan[]; scopes: Scope[]; entitlements: Entitlement[]; checkouts: Checkout[] };

const moduleLabel = (value: string) => ({ college: "College", jobs: "Jobs", mentor: "Mentorship", events: "Events" }[value] ?? value);
const formatDate = (value: string | null) => value ? new Intl.DateTimeFormat("en-NP", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kathmandu" }).format(new Date(value)) : "No expiry";
const featureLabel = (feature: string) => feature.replaceAll("_", " ").replaceAll(".", " · ");

function postToCheckout(checkoutUrl: string, fields: Record<string, string>) {
  const form = document.createElement("form");
  form.method = "POST";
  form.action = checkoutUrl;
  form.style.display = "none";
  Object.entries(fields).forEach(([name, value]) => {
    const input = document.createElement("input");
    input.type = "hidden"; input.name = name; input.value = value;
    form.appendChild(input);
  });
  document.body.appendChild(form);
  form.submit();
}

export default function Payments() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [overview, setOverview] = useState<Overview>({ plans: [], scopes: [], entitlements: [], checkouts: [] });
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [selectedScopeId, setSelectedScopeId] = useState("");

  const load = useCallback(async () => {
    const token = (await supabase.auth.getSession()).data.session?.access_token;
    if (!token) return;
    setLoading(true);
    try {
      const response = await fetch("/api/v1/payments/overview", { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error?.message || "Billing details could not be loaded.");
      setOverview(payload.data);
    } catch (error) {
      toast({ variant: "destructive", title: "Billing is unavailable", description: error instanceof Error ? error.message : "Please try again." });
    } finally { setLoading(false); }
  }, [toast]);

  useEffect(() => { if (user) void load(); }, [user, load]);
  useEffect(() => {
    const status = new URLSearchParams(window.location.search).get("payment");
    if (!status) return;
    const title = status === "successful" ? "Payment verified" : status === "pending" ? "Payment pending" : "Payment was not completed";
    toast({ variant: status === "successful" ? "default" : "destructive", title, description: status === "successful" ? "Your entitlement has been refreshed from verified server state." : "No access is activated until eSewa verification succeeds." });
    void load();
  }, [load, toast]);

  const compatibleScopes = useMemo(() => selectedPlan ? overview.scopes.filter((scope) => selectedPlan.module_scope?.includes(scope.module)) : [], [overview.scopes, selectedPlan]);
  const selectedScope = compatibleScopes.find((scope) => scope.id === selectedScopeId);
  const openPlan = (plan: Plan) => { setSelectedPlan(plan); setSelectedScopeId(overview.scopes.find((scope) => plan.module_scope?.includes(scope.module))?.id ?? ""); };

  const beginCheckout = async () => {
    if (!selectedPlan || !selectedScope) return;
    const token = (await supabase.auth.getSession()).data.session?.access_token;
    if (!token) return;
    setProcessing(true);
    try {
      const response = await fetch("/api/v1/payments/checkout", {
        method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ packageId: selectedPlan.id, entityType: selectedScope.entityType, entityId: selectedScope.entityId }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error?.message || "Checkout could not be created.");
      const checkout = payload.data as { checkoutUrl?: string; checkoutFields?: Record<string, string> };
      if (!checkout.checkoutUrl || !checkout.checkoutFields) throw new Error("eSewa did not return a secure checkout request.");
      postToCheckout(checkout.checkoutUrl, checkout.checkoutFields);
    } catch (error) {
      toast({ variant: "destructive", title: "Checkout was not started", description: error instanceof Error ? error.message : "No subscription was activated." });
      setProcessing(false);
    }
  };

  return <div className="space-y-8 pb-12 font-sans">
    <section className="flex flex-col gap-4 rounded-3xl border border-slate-200/80 bg-white p-6 shadow-2xs sm:flex-row sm:items-center sm:justify-between">
      <div><div className="mb-1 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#0073e6]"><CreditCard className="h-4 w-4" />Billing & subscriptions</div><h1 className="text-2xl font-black tracking-tight text-slate-900">Plans for your assigned modules</h1><p className="mt-1 text-sm font-medium text-slate-500">Checkout is signed by eSewa. Access changes only after verified provider status.</p></div>
      <Button variant="outline" onClick={() => void load()} disabled={loading}>{loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}Refresh status</Button>
    </section>

    <Card className="rounded-3xl border-slate-200/80 shadow-2xs"><CardHeader><CardTitle className="flex items-center gap-2 text-lg"><Receipt className="h-5 w-5 text-[#0073e6]" />Your effective module access</CardTitle><CardDescription>Manual grants, trials, and verified purchases are shown separately.</CardDescription></CardHeader><CardContent className="space-y-3">{loading ? <p className="text-sm text-slate-500">Loading your access…</p> : overview.entitlements.length ? overview.entitlements.map((entitlement) => <div key={entitlement.id} className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-bold text-slate-900">{entitlement.package_name || `${moduleLabel(entitlement.module_key)} access`}</p><p className="mt-1 text-xs text-slate-500">{moduleLabel(entitlement.module_key)} · {entitlement.source.replaceAll("_", " ")} · expires {formatDate(entitlement.expires_at)}</p></div><Badge className={entitlement.status === "active" && (!entitlement.expires_at || new Date(entitlement.expires_at).getTime() > Date.now()) ? "w-fit bg-emerald-100 text-emerald-700 hover:bg-emerald-100" : "w-fit bg-slate-200 text-slate-700 hover:bg-slate-200"}>{entitlement.status}</Badge></div>) : <p className="text-sm text-slate-500">You do not have an active, assigned paid module yet. Ask a Super Admin to grant a module and entity before purchasing.</p>}</CardContent></Card>

    <section className="space-y-4"><div><h2 className="text-lg font-black tracking-tight text-slate-900">Available service packages</h2><p className="text-sm text-slate-500">Only packages that match one of your assigned module entities can be purchased.</p></div><div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">{loading ? <p className="text-sm text-slate-500">Loading packages…</p> : overview.plans.map((plan) => { const available = overview.scopes.some((scope) => plan.module_scope?.includes(scope.module)); return <Card key={plan.id} className="flex flex-col rounded-3xl border-slate-200/80 shadow-2xs"><CardHeader><CardTitle className="text-xl font-black text-slate-900">{plan.name}</CardTitle><div className="mt-2 text-2xl font-black text-slate-900">{plan.currency} {Number(plan.price).toLocaleString("en-NP")}</div><CardDescription>{plan.description || `${plan.duration_days || 30}-day access`}</CardDescription></CardHeader><CardContent className="mt-auto space-y-4"><div className="space-y-2 border-t border-slate-100 pt-4">{Object.entries(plan.features || {}).filter(([, enabled]) => enabled).map(([feature]) => <p key={feature} className="flex items-center gap-2 text-xs font-semibold text-slate-700"><CheckCircle2 className="h-4 w-4 text-emerald-600" />{featureLabel(feature)}</p>)}</div><Button className="w-full bg-[#071a3d] text-white hover:bg-[#05132d]" disabled={!available} onClick={() => openPlan(plan)}>{available ? "Review & pay with eSewa" : "No matching assigned entity"}</Button></CardContent></Card>; })}</div></section>

    <Dialog open={Boolean(selectedPlan)} onOpenChange={(open) => { if (!open && !processing) setSelectedPlan(null); }}><DialogContent className="max-w-md rounded-3xl"><DialogHeader><DialogTitle>Checkout with eSewa</DialogTitle><DialogDescription>Payment is not considered successful until MeroTalent verifies the signed eSewa return and transaction status.</DialogDescription></DialogHeader><div className="space-y-4"><div className="rounded-2xl border border-blue-100 bg-blue-50 p-4"><p className="font-bold text-slate-900">{selectedPlan?.name}</p><p className="mt-1 text-sm text-slate-600">{selectedPlan?.currency} {Number(selectedPlan?.price || 0).toLocaleString("en-NP")}</p></div><div className="space-y-2"><Label htmlFor="checkout-entity">Apply this package to</Label><Select value={selectedScopeId} onValueChange={setSelectedScopeId}><SelectTrigger id="checkout-entity"><SelectValue placeholder="Select an assigned module entity" /></SelectTrigger><SelectContent>{compatibleScopes.map((scope) => <SelectItem key={scope.id} value={scope.id}>{moduleLabel(scope.module)} · {scope.entityType} · {scope.entityId.slice(0, 8)}</SelectItem>)}</SelectContent></Select></div><p className="flex gap-2 text-xs leading-relaxed text-slate-500"><ShieldCheck className="h-4 w-4 shrink-0 text-emerald-600" />The plan price, entity authorization, signed form and activation are verified server-side. Returning from eSewa alone cannot activate access.</p><Button className="w-full bg-[#0073e6] text-white hover:bg-[#0062c4]" disabled={!selectedScope || processing} onClick={() => void beginCheckout()}>{processing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ExternalLink className="mr-2 h-4 w-4" />}Continue securely to eSewa</Button></div></DialogContent></Dialog>
  </div>;
}
