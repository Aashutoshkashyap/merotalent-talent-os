import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  CheckCircle2,
  CreditCard,
  ExternalLink,
  Loader2,
  Receipt,
  ShieldCheck,
  Wallet,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import DashboardPageHeader from "@/components/dashboard/DashboardPageHeader";
import {
  dashboardPrimaryButton,
  dashboardSurface,
  dashboardTabs,
} from "@/components/dashboard/dashboardStyles";

type Plan = {
  id: string; name: string; description: string | null; price: number | string; currency: string;
  billing_interval: string | null; duration_days: number | null; module_scope: string[] | null;
  features: Record<string, boolean> | null; lead_access_mode: string | null;
};
type Scope = { id: string; module: string; entityType: string; entityId: string };
type Entitlement = { id: string; module_key: string; entity_type: string; entity_id: string; package_name: string | null; source: string; status: string; expires_at: string | null; features: Record<string, boolean> | null };
type Checkout = { id: string; package_id: string; provider_name: string; status: string; expires_at: string | null; created_at: string };
type Overview = { plans: Plan[]; scopes: Scope[]; entitlements: Entitlement[]; checkouts: Checkout[] };

type Transaction = {
  id: string;
  payment_type: string;
  reference_id: string;
  amount: number;
  currency: string;
  status: string;
  gateway: string | null;
  gateway_transaction_id: string | null;
  paid_at: string | null;
  failed_at: string | null;
  created_at: string;
  // Joined context
  mentorName?: string;
  mentorId?: string;
  eventTitle?: string;
  eventId?: string;
};

const moduleLabel = (value: string) => ({ college: "College", jobs: "Jobs", mentor: "Mentorship", events: "Events" }[value] ?? value);
const formatDate = (value: string | null) => value ? new Intl.DateTimeFormat("en-NP", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kathmandu" }).format(new Date(value)) : "No expiry";
const featureLabel = (feature: string) => feature.replaceAll("_", " ").replaceAll(".", " · ");

const txnStatusColor = (status: string) => {
  switch (status) {
    case "success": return "bg-emerald-50 text-emerald-700 ring-emerald-200";
    case "failed": return "bg-red-50 text-red-700 ring-red-200";
    case "refunded": return "bg-blue-50 text-blue-700 ring-blue-200";
    default: return "bg-amber-50 text-amber-700 ring-amber-200";
  }
};

const txnTypeLabel = (type: string) => {
  switch (type) {
    case "mentor_booking": return "Mentor Session";
    case "subscription": return "Subscription";
    case "event_registration": return "Event Ticket";
    default: return type.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
  }
};

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
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [overview, setOverview] = useState<Overview>({ plans: [], scopes: [], entitlements: [], checkouts: [] });
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [txnLoading, setTxnLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [selectedScopeId, setSelectedScopeId] = useState("");

  // Determine if user is a student (no admin scopes/plans)
  const isStudentView = overview.scopes.length === 0 && overview.plans.length === 0;

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

  const loadTransactions = useCallback(async () => {
    if (!user) return;
    setTxnLoading(true);
    try {
      const { data: payments, error } = await (supabase as any)
        .from("payments")
        .select("id,payment_type,reference_id,amount,currency,status,gateway,gateway_transaction_id,paid_at,failed_at,created_at")
        .eq("user_id", user.id)
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      const rows = (payments || []) as Transaction[];

      // Enrich mentor booking transactions
      const mentorBookingIds = rows.filter((r) => r.payment_type === "mentor_booking").map((r) => r.reference_id);
      const mentorMap = new Map<string, { mentorName: string; mentorId: string }>();
      if (mentorBookingIds.length > 0) {
        const { data: bookings } = await (supabase as any)
          .from("mentor_bookings")
          .select("id,mentor_id")
          .in("id", mentorBookingIds);
        if (bookings && bookings.length > 0) {
          const mentorIds = [...new Set(bookings.map((b: any) => b.mentor_id))] as string[];
          const { data: mentors } = await (supabase as any).from("mentors").select("id,user_id").in("id", mentorIds);
          if (mentors && mentors.length > 0) {
            const userIds = mentors.map((m: any) => m.user_id).filter(Boolean);
            const { data: profiles } = await (supabase as any).from("public_profile_directory").select("user_id,full_name").in("user_id", userIds);
            const profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p.full_name]));
            const mentorDetailMap = new Map<string, { userId: string; name: string }>(mentors.map((m: any) => [m.id, { userId: m.user_id, name: (profileMap.get(m.user_id) as string) || "Mentor" }]));
            for (const booking of bookings) {
              const detail = mentorDetailMap.get(booking.mentor_id);
              if (detail) mentorMap.set(booking.id, { mentorName: detail.name, mentorId: booking.mentor_id });
            }
          }
        }
      }

      // Enrich event transactions
      const eventRefIds = rows.filter((r) => r.payment_type === "event_registration").map((r) => r.reference_id);
      const eventMap = new Map<string, { eventTitle: string; eventId: string }>();
      if (eventRefIds.length > 0) {
        const { data: registrations } = await (supabase as any)
          .from("event_registrations")
          .select("id,event_id")
          .in("id", eventRefIds);
        if (registrations && registrations.length > 0) {
          const eventIds = [...new Set(registrations.map((r: any) => r.event_id))] as string[];
          const { data: events } = await (supabase as any).from("events").select("id,title").in("id", eventIds);
          const eventDetailMap = new Map<string, string>((events || []).map((e: any) => [e.id, (e.title as string) || "Event"]));
          for (const reg of registrations) {
            const title = eventDetailMap.get(reg.event_id);
            if (title) eventMap.set(reg.id, { eventTitle: title, eventId: reg.event_id });
          }
        }
      }

      setTransactions(rows.map((r) => ({
        ...r,
        ...(mentorMap.get(r.reference_id) || {}),
        ...(eventMap.get(r.reference_id) || {}),
      })));
    } catch (error) {
      toast({ variant: "destructive", title: "Transactions unavailable", description: error instanceof Error ? error.message : "Please try again." });
    } finally { setTxnLoading(false); }
  }, [user, toast]);

  useEffect(() => { if (user) { void load(); void loadTransactions(); } }, [user, load, loadTransactions]);
  useEffect(() => {
    const status = new URLSearchParams(window.location.search).get("payment");
    if (!status) return;
    const title = status === "successful" ? "Payment verified" : status === "pending" ? "Payment pending" : "Payment was not completed";
    toast({ variant: status === "successful" ? "default" : "destructive", title, description: status === "successful" ? "Your entitlement has been refreshed from verified server state." : "No access is activated until eSewa verification succeeds." });
    void load();
    void loadTransactions();
  }, [load, loadTransactions, toast]);

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

  const totalPaid = transactions.filter((t) => t.status === "success").reduce((sum, t) => sum + Number(t.amount), 0);
  const mentorPayments = transactions.filter((t) => t.payment_type === "mentor_booking" && t.status === "success");
  const eventPayments = transactions.filter((t) => t.payment_type === "event_registration" && t.status === "success");

  return <div className="space-y-8 pb-12 font-sans">
    <DashboardPageHeader
      eyebrow="Track every transaction"
      title="Payments"
      description="View all your payment transactions done through MeroTalent."
      action={
        <Button variant="outline" onClick={() => { void load(); void loadTransactions(); }} disabled={loading || txnLoading}>
          {(loading || txnLoading) ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}Refresh
        </Button>
      }
    />

    {/* Quick stats */}
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {[
        { icon: Wallet, value: `NPR ${totalPaid.toLocaleString()}`, label: "Total paid", tone: "bg-emerald-100/60 text-emerald-700" },
        { icon: Receipt, value: transactions.length, label: "Transactions", tone: "bg-blue-100/60 text-blue-700" },
        { icon: CreditCard, value: mentorPayments.length, label: "Mentor sessions", tone: "bg-orange-100/60 text-orange-700" },
        { icon: CreditCard, value: eventPayments.length, label: "Event tickets", tone: "bg-violet-100/60 text-violet-700" },
      ].map((metric) => (
        <Card key={metric.label} className={dashboardSurface}>
          <CardContent className="p-4 text-center">
            <div className={`mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full ${metric.tone}`}><metric.icon className="h-5 w-5" /></div>
            <p className="text-2xl font-bold">{metric.value}</p>
            <p className="text-xs text-muted-foreground">{metric.label}</p>
          </CardContent>
        </Card>
      ))}
    </div>

    {/* Transaction history */}
    <Card className="rounded-3xl border-slate-200/80 shadow-2xs">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg"><Receipt className="h-5 w-5 text-[#0073e6]" />Transaction history</CardTitle>
        <CardDescription>All payments made through eSewa for mentor sessions, event tickets, and subscriptions.</CardDescription>
      </CardHeader>
      <CardContent>
        {txnLoading ? (
          <div className="flex min-h-40 items-center justify-center text-sm text-muted-foreground"><Loader2 className="mr-2 h-5 w-5 animate-spin" />Loading transactions…</div>
        ) : transactions.length === 0 ? (
          <div className="flex min-h-40 flex-col items-center justify-center text-center">
            <Wallet className="mb-3 h-10 w-10 text-muted-foreground/40" />
            <p className="font-semibold text-muted-foreground">No transactions yet</p>
            <p className="mt-1 text-sm text-muted-foreground/70">Your eSewa payment history will appear here after your first booking or event registration.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {transactions.map((txn) => (
              <div key={txn.id} className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50/50 p-4 transition-colors hover:bg-slate-50 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-bold text-slate-900">{txnTypeLabel(txn.payment_type)}</p>
                    <Badge variant="outline" className={`inline-flex items-center gap-1 text-xs ring-1 ${txnStatusColor(txn.status)}`}>
                      {txn.status === "success" ? <CheckCircle2 className="h-3 w-3" /> : txn.status === "failed" ? <XCircle className="h-3 w-3" /> : null}
                      {txn.status.charAt(0).toUpperCase() + txn.status.slice(1)}
                    </Badge>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                    {txn.mentorName && <span>Booked with <strong className="text-slate-700">{txn.mentorName}</strong></span>}
                    {txn.eventTitle && <span>Event: <strong className="text-slate-700">{txn.eventTitle}</strong></span>}
                    <span>{formatDate(txn.paid_at || txn.created_at)}</span>
                    {txn.gateway && <span>via {txn.gateway.charAt(0).toUpperCase() + txn.gateway.slice(1)}</span>}
                    {txn.gateway_transaction_id && <span className="font-mono text-[10px] text-slate-400">#{txn.gateway_transaction_id.slice(-8)}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-lg font-black text-slate-900">{txn.currency} {Number(txn.amount).toLocaleString()}</span>
                  {txn.mentorId && (
                    <Link to={`/mentorship/${txn.mentorId}`} className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-primary transition-colors hover:bg-primary/10">
                      <ArrowRight className="h-3 w-3" />View Mentor
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>

    {/* Module access (entitlements) — shown for all users */}
    <Card className="rounded-3xl border-slate-200/80 shadow-2xs"><CardHeader><CardTitle className="flex items-center gap-2 text-lg"><Receipt className="h-5 w-5 text-[#0073e6]" />Your effective module access</CardTitle><CardDescription>Manual grants, trials, and verified purchases are shown separately.</CardDescription></CardHeader><CardContent className="space-y-3">{loading ? <p className="text-sm text-slate-500">Loading your access…</p> : overview.entitlements.length ? overview.entitlements.map((entitlement) => <div key={entitlement.id} className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-bold text-slate-900">{entitlement.package_name || `${moduleLabel(entitlement.module_key)} access`}</p><p className="mt-1 text-xs text-slate-500">{moduleLabel(entitlement.module_key)} · {entitlement.source.replaceAll("_", " ")} · expires {formatDate(entitlement.expires_at)}</p></div><Badge className={entitlement.status === "active" && (!entitlement.expires_at || new Date(entitlement.expires_at).getTime() > Date.now()) ? "w-fit bg-emerald-100 text-emerald-700 hover:bg-emerald-100" : "w-fit bg-slate-200 text-slate-700 hover:bg-slate-200"}>{entitlement.status}</Badge></div>) : <p className="text-sm text-slate-500">You do not have an active, assigned paid module yet.</p>}</CardContent></Card>

    {/* Available packages — only show for admin/entity-scoped users, not students */}
    {!isStudentView && (
      <section className="space-y-4"><div><h2 className="text-lg font-black tracking-tight text-slate-900">Available service packages</h2><p className="text-sm text-slate-500">Only packages that match one of your assigned module entities can be purchased.</p></div><div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">{loading ? <p className="text-sm text-slate-500">Loading packages…</p> : overview.plans.map((plan) => { const available = overview.scopes.some((scope) => plan.module_scope?.includes(scope.module)); return <Card key={plan.id} className="flex flex-col rounded-3xl border-slate-200/80 shadow-2xs"><CardHeader><CardTitle className="text-xl font-black text-slate-900">{plan.name}</CardTitle><div className="mt-2 text-2xl font-black text-slate-900">{plan.currency} {Number(plan.price).toLocaleString("en-NP")}</div><CardDescription>{plan.description || `${plan.duration_days || 30}-day access`}</CardDescription></CardHeader><CardContent className="mt-auto space-y-4"><div className="space-y-2 border-t border-slate-100 pt-4">{Object.entries(plan.features || {}).filter(([, enabled]) => enabled).map(([feature]) => <p key={feature} className="flex items-center gap-2 text-xs font-semibold text-slate-700"><CheckCircle2 className="h-4 w-4 text-emerald-600" />{featureLabel(feature)}</p>)}</div><Button className="w-full bg-[#071a3d] text-white hover:bg-[#05132d]" disabled={!available} onClick={() => openPlan(plan)}>{available ? "Review & pay with eSewa" : "No matching assigned entity"}</Button></CardContent></Card>; })}</div></section>
    )}

    <Dialog open={Boolean(selectedPlan)} onOpenChange={(open) => { if (!open && !processing) setSelectedPlan(null); }}><DialogContent className="max-w-md rounded-3xl"><DialogHeader><DialogTitle>Checkout with eSewa</DialogTitle><DialogDescription>Payment is not considered successful until MeroTalent verifies the signed eSewa return and transaction status.</DialogDescription></DialogHeader><div className="space-y-4"><div className="rounded-2xl border border-blue-100 bg-blue-50 p-4"><p className="font-bold text-slate-900">{selectedPlan?.name}</p><p className="mt-1 text-sm text-slate-600">{selectedPlan?.currency} {Number(selectedPlan?.price || 0).toLocaleString("en-NP")}</p></div><div className="space-y-2"><Label htmlFor="checkout-entity">Apply this package to</Label><Select value={selectedScopeId} onValueChange={setSelectedScopeId}><SelectTrigger id="checkout-entity"><SelectValue placeholder="Select an assigned module entity" /></SelectTrigger><SelectContent>{compatibleScopes.map((scope) => <SelectItem key={scope.id} value={scope.id}>{moduleLabel(scope.module)} · {scope.entityType} · {scope.entityId.slice(0, 8)}</SelectItem>)}</SelectContent></Select></div><p className="flex gap-2 text-xs leading-relaxed text-slate-500"><ShieldCheck className="h-4 w-4 shrink-0 text-emerald-600" />The plan price, entity authorization, signed form and activation are verified server-side. Returning from eSewa alone cannot activate access.</p><Button className="w-full bg-[#0073e6] text-white hover:bg-[#0062c4]" disabled={!selectedScope || processing} onClick={() => void beginCheckout()}>{processing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ExternalLink className="mr-2 h-4 w-4" />}Continue securely to eSewa</Button></div></DialogContent></Dialog>
  </div>;
}
