import { isNeonClientRuntime } from "@/lib/backend-selection";
import { paymentErrorMessage, postSignedCheckoutForm, requireAvailableNeonPayment } from "@/lib/payments/browser-checkout";
import type { PaymentAvailability } from "@/lib/payments/payment-availability";
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
  Upload,
  AlertCircle,
  FileCheck,
  FileX,
  FileClock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import DashboardPageHeader from "@/components/dashboard/DashboardPageHeader";
import {
  dashboardSurface,
} from "@/components/dashboard/dashboardStyles";

type Plan = {
  id: string; name: string; description: string | null; price: number | string; currency: string;
  billing_interval: string | null; duration_days: number | null; module_scope: string[] | null;
  features: Record<string, boolean> | null; lead_access_mode: string | null;
};
type Scope = { id: string; module: string; entityType: string; entityId: string };
type Entitlement = { id: string; module_key: string; entity_type: string; entity_id: string; package_name: string | null; source: string; status: string; expires_at: string | null; features: Record<string, boolean> | null };
type Checkout = { id: string; package_id: string; provider_name: string; status: string; expires_at: string | null; created_at: string };
type CollegeRequest = { id: string; status: string; payment_status: string; entity_id: string | null; college_name: string; request_kind: string };
type Overview = { plans: Plan[]; scopes: Scope[]; entitlements: Entitlement[]; checkouts: Checkout[];
  collegeRequests?: CollegeRequest[]; payments?: Transaction[]; paymentsAvailable?:boolean;
  paymentAvailability?: PaymentAvailability };

type PaymentProofRecord = {
  id: string;
  payment_id: string;
  file_name: string;
  storage_path: string;
  proof_type: string;
  user_note: string;
  status: "pending" | "accepted" | "rejected";
  review_note: string | null;
  created_at: string;
};

type Transaction = {
  id: string;
  payment_type: string;
  reference_id: string;
  amount: number;
  currency: string;
  status: string;
  reconciliation_status?: string;
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
const moduleWorkspacePath = (value: string) => ({ college: "/institute", jobs: "/company", events: "/event-admin", mentor: "/mentor" }[value] ?? "/dashboard");
const formatDate = (value: string | null) => value ? new Intl.DateTimeFormat("en-NP", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kathmandu" }).format(new Date(value)) : "No expiry";
const featureLabel = (feature: string) => feature.replaceAll("_", " ").replaceAll(".", " · ");
const isNeonStaging = isNeonClientRuntime();

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
    case "event_ticket":
    case "event_registration": return "Event Ticket";
    default: return type.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
  }
};

function postToCheckout(checkoutUrl: string, fields: Record<string, string>) {
  postSignedCheckoutForm({ checkoutUrl, checkoutFields: fields });
}

export default function Payments() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [overview, setOverview] = useState<Overview>({ plans: [], scopes: [], entitlements: [], checkouts: [] });
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [proofs, setProofs] = useState<Map<string, PaymentProofRecord>>(new Map());
  const [loading, setLoading] = useState(true);
  const [txnLoading, setTxnLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [checkingPayment, setCheckingPayment] = useState<string | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [selectedScopeId, setSelectedScopeId] = useState("");
  const [requestPlanIds, setRequestPlanIds] = useState<Record<string, string>>({});

  // Exception / Payment Proof Modal State
  const [proofTxn, setProofTxn] = useState<Transaction | null>(null);
  const [proofType, setProofType] = useState<string>("screenshot");
  const [proofNote, setProofNote] = useState<string>("");
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [isSubmittingProof, setIsSubmittingProof] = useState<boolean>(false);

  // Determine if user is a student (no admin scopes/plans)
  const isStudentView = overview.scopes.length === 0 && !(overview.collegeRequests?.some(row => row.status === "pending" || row.status === "approved"));

  const load = useCallback(async () => {
    const token = isNeonStaging ? null : (await supabase.auth.getSession()).data.session?.access_token;
    if (!isNeonStaging && !token) return;
    setLoading(true);
    try {
      const response = await fetch("/api/v1/payments/overview", {
        headers: token ? { Authorization: `Bearer ${token}` } : {}, credentials: "same-origin", cache: "no-store",
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error?.message || "Billing details could not be loaded.");
      setOverview(payload.data);
      if (isNeonStaging) {
        setTransactions(payload.data.payments || []);
        const proofResponse = await fetch("/api/v1/neon-staging/payments/proofs", {
          credentials: "same-origin", cache: "no-store",
        });
        const proofBody = await proofResponse.json();
        if (!proofResponse.ok) throw new Error(proofBody.error || "Payment proofs could not load.");
        const proofMap = new Map<string, PaymentProofRecord>();
        for (const proof of proofBody.data as PaymentProofRecord[]) proofMap.set(proof.payment_id, proof);
        setProofs(proofMap);
      }
    } catch (error) {
      toast({ variant: "destructive", title: "Billing is unavailable", description: error instanceof Error ? error.message : "Please try again." });
    } finally { setLoading(false); }
  }, [toast]);

  const recheckPayment = async (reference: string) => {
    setCheckingPayment(reference);
    try {
      const response = await fetch(`/api/v1/neon-staging/payments/${encodeURIComponent(reference)}/verify`, {
        method: "POST", credentials: "same-origin", cache: "no-store",
      });
      const payload = await response.json();
      if (!response.ok) throw new Error("eSewa verification is temporarily unavailable. Your payment has not been marked successful. Please retry later.");
      const result = payload.data;
      toast({ title: result.manualReview ? "Payment needs review" : result.status === "successful" ? "Payment verified" : "Payment status checked",
        description: result.manualReview ? "Provider evidence was recorded for administrator review; no additional access was granted."
          : result.status === "pending" ? "eSewa has not confirmed settlement yet. No paid access was activated."
          : `Verified status: ${result.status}.` });
      await load();
    } catch (error) {
      toast({ variant: "destructive", title: "Payment check unavailable", description: error instanceof Error ? error.message : "Please retry later." });
    } finally { setCheckingPayment(null); }
  };

  const loadTransactions = useCallback(async () => {
    if (isNeonStaging) { setTxnLoading(false); return; }
    if (!user) return;
    setTxnLoading(true);
    try {
      const [{ data: payments, error }, { data: userProofs, error: proofsError }] = await Promise.all([
        (supabase as any)
          .from("payments")
          .select("id,payment_type,reference_id,amount,currency,status,reconciliation_status,gateway,gateway_transaction_id,paid_at,failed_at,created_at")
          .eq("user_id", user.id)
          .is("deleted_at", null)
          .order("created_at", { ascending: false })
          .limit(50),
        (supabase as any)
          .from("payment_proofs")
          .select("id,payment_id,file_name,storage_path,proof_type,user_note,status,review_note,created_at")
          .eq("uploaded_by_user_id", user.id)
      ]);

      if (error) throw error;
      const rows = (payments || []) as Transaction[];

      if (!proofsError && userProofs) {
        const proofMap = new Map<string, PaymentProofRecord>();
        for (const p of userProofs as PaymentProofRecord[]) {
          proofMap.set(p.payment_id, p);
        }
        setProofs(proofMap);
      }

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
      const eventRefIds = rows.filter((r) => ["event_ticket", "event_registration"].includes(r.payment_type)).map((r) => r.reference_id);
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
        mentorName: mentorMap.get(r.reference_id)?.mentorName,
        mentorId: mentorMap.get(r.reference_id)?.mentorId,
        eventTitle: eventMap.get(r.reference_id)?.eventTitle,
        eventId: eventMap.get(r.reference_id)?.eventId,
      })));
    } catch (err: any) {
      toast({ variant: "destructive", title: "Unable to load transactions", description: err.message || "Failed to fetch." });
    } finally {
      setTxnLoading(false);
    }
  }, [user, toast]);

  useEffect(() => {
    void load();
    void loadTransactions();
  }, [load, loadTransactions]);

  const handleProofSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!proofTxn || !user) return;
    if (!proofFile) {
      toast({ variant: "destructive", title: "File required", description: "Select a payment screenshot or voucher document." });
      return;
    }
    if (proofNote.trim().length < 5) {
      toast({ variant: "destructive", title: "Note required", description: "Please explain the payment issue (at least 5 characters)." });
      return;
    }

    setIsSubmittingProof(true);
    try {
      if (isNeonStaging) {
        const form = new FormData();
        form.set("paymentId", proofTxn.id);
        form.set("file", proofFile);
        form.set("proofType", proofType);
        form.set("note", proofNote.trim());
        const response = await fetch("/api/v1/neon-staging/payments/proofs", {
          method: "POST", credentials: "same-origin", body: form,
        });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || "Payment proof was not saved.");
        toast({ title: "Payment evidence submitted", description: "Super Admin review does not itself confirm payment." });
        setProofTxn(null); setProofFile(null); setProofNote("");
        void load();
        return;
      }
      const fileExt = proofFile.name.split(".").pop()?.toLowerCase() || "png";
      const cleanFileName = proofFile.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const storagePath = `${user.id}/${Date.now()}_${cleanFileName}`;

      // Upload file to secure private storage bucket
      const { error: uploadError } = await supabase.storage
        .from("payment-proofs")
        .upload(storagePath, proofFile, { cacheControl: "3600", upsert: false });

      if (uploadError) throw uploadError;

      // Register proof and update reconciliation state
      const { data, error: rpcError } = await (supabase as any).rpc("submit_payment_proof", {
        p_payment_id: proofTxn.id,
        p_file_name: proofFile.name,
        p_storage_path: storagePath,
        p_mime_type: proofFile.type || `image/${fileExt}`,
        p_file_size: proofFile.size,
        p_proof_type: proofType,
        p_user_note: proofNote.trim(),
      });

      if (rpcError) throw rpcError;

      toast({
        title: "Payment Evidence Submitted",
        description: "Your payment proof has been sent for Super Admin review. You will be notified once verified.",
      });

      setProofTxn(null);
      setProofFile(null);
      setProofNote("");
      void loadTransactions();
    } catch (err: any) {
      toast({ variant: "destructive", title: "Upload Failed", description: err.message || "Could not submit payment proof." });
    } finally {
      setIsSubmittingProof(false);
    }
  };

  const activeEntitlementKeys = useMemo(() => new Set(overview.entitlements
    .filter((entitlement) => entitlement.status === "active" && (!entitlement.expires_at || new Date(entitlement.expires_at).getTime() > Date.now()))
    .map((entitlement) => `${entitlement.module_key}:${entitlement.entity_type}:${entitlement.entity_id}`)), [overview.entitlements]);
  const isScopeActive = useCallback((scope: Scope) => activeEntitlementKeys.has(`${scope.module}:${scope.entityType}:${scope.entityId}`), [activeEntitlementKeys]);
  const compatibleScopes = useMemo(() => selectedPlan ? overview.scopes.filter((scope) => selectedPlan.module_scope?.includes(scope.module) && (isNeonStaging || !isScopeActive(scope))) : [], [isScopeActive, overview.scopes, selectedPlan]);
  const selectedScope = compatibleScopes.find((scope) => scope.id === selectedScopeId);
  const openPlan = (plan: Plan) => { setSelectedPlan(plan); setSelectedScopeId(overview.scopes.find((scope) => plan.module_scope?.includes(scope.module) && (isNeonStaging || !isScopeActive(scope)))?.id ?? ""); };

  const beginCheckout = async () => {
    if (!selectedPlan || !selectedScope) return;
    if (isNeonStaging) {
      setProcessing(true);
      try{
        await requireAvailableNeonPayment();
        const response=await fetch('/api/v1/neon-staging/payments/checkout',{method:'POST',credentials:'same-origin',
          headers:{'Content-Type':'application/json'},body:JSON.stringify({kind:'assigned_scope',targetId:selectedScope.id,packageId:selectedPlan.id,renewal:true})});
        const payload=await response.json();if(!response.ok)throw new Error(paymentErrorMessage(payload,'Renewal checkout is unavailable.'));
        const checkout=payload.data;
        if(!checkout?.checkoutUrl||!checkout.checkoutFields)throw new Error('Secure checkout is unavailable.');
        postToCheckout(checkout.checkoutUrl,checkout.checkoutFields);
      }catch(error){toast({variant:'destructive',title:'Checkout was not started',description:error instanceof Error?error.message:'No access was activated.'});}
      finally{setProcessing(false);}
      return;
    }
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

  const beginCollegeRequestCheckout = async (request: CollegeRequest) => {
    const planId = requestPlanIds[request.id];
    if (!planId) return;
    setProcessing(true);
    try {
      await requireAvailableNeonPayment();
      const response = await fetch("/api/v1/neon-staging/payments/checkout", {
        method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "college_scope_request", targetId: request.id, packageId: planId,
          renewal: request.status === "approved" && request.payment_status === "success" }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(paymentErrorMessage(payload, "Checkout could not be created."));
      const checkout = payload.data as { checkoutUrl?: string; checkoutFields?: Record<string, string> };
      if (!checkout.checkoutUrl || !checkout.checkoutFields) throw new Error("eSewa checkout is unavailable.");
      postToCheckout(checkout.checkoutUrl, checkout.checkoutFields);
    } catch (cause) {
      toast({ variant: "destructive", title: "Checkout was not started",
        description: cause instanceof Error ? cause.message : "No access was activated." });
      setProcessing(false);
    }
  };

  const totalPaid = transactions.filter((t) => t.status === "success").reduce((sum, t) => sum + Number(t.amount), 0);
  const mentorPayments = transactions.filter((t) => t.payment_type === "mentor_booking" && t.status === "success");
  const eventPayments = transactions.filter((t) => ["event_ticket", "event_registration"].includes(t.payment_type) && t.status === "success");

  return (
    <div className="space-y-8 pb-12 font-sans">
      <DashboardPageHeader
        eyebrow="Track every transaction"
        title="Payments & Financial History"
        description="View all your payment transactions done through MeroTalent. If an automated settlement failed, you can submit payment proof for manual reconciliation."
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
              {transactions.map((txn) => {
                const proof = proofs.get(txn.id);
                return (
                  <div key={txn.id} className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50/50 p-4 transition-colors hover:bg-slate-50 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-bold text-slate-900">{txnTypeLabel(txn.payment_type)}</p>
                        <Badge variant="outline" className={`inline-flex items-center gap-1 text-xs ring-1 ${txnStatusColor(txn.status)}`}>
                          {txn.status === "success" ? <CheckCircle2 className="h-3 w-3" /> : txn.status === "failed" ? <XCircle className="h-3 w-3" /> : null}
                          {txn.status.charAt(0).toUpperCase() + txn.status.slice(1)}
                        </Badge>
                        {proof && (
                          <Badge
                            variant="secondary"
                            className={`inline-flex items-center gap-1 text-[11px] font-semibold ${
                              proof.status === "accepted"
                                ? "bg-emerald-100 text-emerald-800"
                                : proof.status === "rejected"
                                ? "bg-red-100 text-red-800"
                                : "bg-amber-100 text-amber-800"
                            }`}
                          >
                            {proof.status === "accepted" ? <FileCheck className="h-3 w-3" /> : proof.status === "rejected" ? <FileX className="h-3 w-3" /> : <FileClock className="h-3 w-3" />}
                            Evidence: {proof.status.charAt(0).toUpperCase() + proof.status.slice(1)}
                          </Badge>
                        )}
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                        {txn.mentorName && <span>Booked with <strong className="text-slate-700">{txn.mentorName}</strong></span>}
                        {txn.eventTitle && <span>Event: <strong className="text-slate-700">{txn.eventTitle}</strong></span>}
                        <span>{formatDate(txn.paid_at || txn.created_at)}</span>
                        {txn.gateway && <span>via {txn.gateway.charAt(0).toUpperCase() + txn.gateway.slice(1)}</span>}
                        {txn.gateway_transaction_id && <span className="font-mono text-[10px] text-slate-400">#{txn.gateway_transaction_id.slice(-8)}</span>}
                      </div>
                      {proof?.review_note && (
                        <p className="mt-1 text-xs text-slate-600 bg-white p-2 rounded-lg border border-slate-200">
                          <strong className="text-slate-800">Admin Review Note:</strong> {proof.review_note}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="text-lg font-black text-slate-900">{txn.currency} {Number(txn.amount).toLocaleString()}</span>
                      {isNeonStaging && txn.gateway === "esewa" && txn.status === "pending" && (
                        <Button variant="outline" size="sm" disabled={checkingPayment !== null}
                          onClick={() => void recheckPayment(txn.id)}>
                          {checkingPayment === txn.id && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                          Check eSewa status
                        </Button>
                      )}
                      {txn.status !== "success" && !proof && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setProofTxn(txn)}
                          className="text-xs font-semibold border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100"
                        >
                          <Upload className="h-3.5 w-3.5 mr-1 text-amber-700" />
                          Submit Payment Proof
                        </Button>
                      )}
                      {proof?.status === "rejected" && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setProofTxn(txn)}
                          className="text-xs font-semibold border-red-300 bg-red-50 text-red-900 hover:bg-red-100"
                        >
                          <Upload className="h-3.5 w-3.5 mr-1 text-red-700" />
                          Re-submit Evidence
                        </Button>
                      )}
                      {txn.mentorId && (
                        <Link to={`/mentorship/${txn.mentorId}`} className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-primary transition-colors hover:bg-primary/10">
                          <ArrowRight className="h-3 w-3" />View Mentor
                        </Link>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {isNeonStaging&&overview.paymentsAvailable===false&&<div role="status" className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-950">{overview.paymentAvailability?.message || 'Online payments are temporarily unavailable. Existing access, free services and transaction history remain available.'}</div>}
      {/* Module access (entitlements) — shown for all users */}
      {isNeonStaging && !!overview.collegeRequests?.length && (
        <Card className="rounded-3xl border-slate-200/80 shadow-2xs">
          <CardHeader><CardTitle>College access requests</CardTitle>
            <CardDescription>Payment alone does not grant access. Super Admin approval and verified eSewa settlement are both required.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {overview.collegeRequests.map(request => (
              <div key={request.id} className="rounded-2xl border border-slate-200 p-4">
                <p className="font-semibold text-slate-900">{request.college_name}</p>
                <p className="mt-1 text-xs text-slate-500">{request.request_kind === "claim" ? "Claim" : "Add College"} · Review: {request.status} · Payment: {request.payment_status}</p>
                {["pending", "approved"].includes(request.status) && (
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <Select value={requestPlanIds[request.id] || ""} onValueChange={value => setRequestPlanIds(current => ({ ...current, [request.id]: value }))}>
                      <SelectTrigger className="max-w-xs"><SelectValue placeholder="Choose a College plan" /></SelectTrigger>
                      <SelectContent>{overview.plans.filter(plan => plan.module_scope?.includes("college") && Number(plan.price) > 0).map(plan =>
                        <SelectItem key={plan.id} value={plan.id}>{plan.name} · {plan.currency} {Number(plan.price).toLocaleString("en-NP")}</SelectItem>)}</SelectContent>
                    </Select>
                    <Button disabled={!requestPlanIds[request.id] || processing} onClick={() => void beginCollegeRequestCheckout(request)}>
                      {processing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}{request.payment_status === "success" ? "Renew with eSewa" : "Continue to eSewa"}
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}
      <Card className="rounded-3xl border-slate-200/80 shadow-2xs">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg"><Receipt className="h-5 w-5 text-[#0073e6]" />Your effective module access</CardTitle>
          <CardDescription>Manual grants, trials, and verified purchases are shown separately.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading ? (
            <p className="text-sm text-slate-500">Loading your access…</p>
          ) : overview.entitlements.length ? (
            overview.entitlements.map((entitlement) => (
              <div key={entitlement.id} className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-bold text-slate-900">{entitlement.package_name || `${moduleLabel(entitlement.module_key)} access`}</p>
                  <p className="mt-1 text-xs text-slate-500">{moduleLabel(entitlement.module_key)} · {entitlement.source.replaceAll("_", " ")} · expires {formatDate(entitlement.expires_at)}</p>
                </div>
                <Badge className={entitlement.status === "active" && (!entitlement.expires_at || new Date(entitlement.expires_at).getTime() > Date.now()) ? "w-fit bg-emerald-100 text-emerald-700 hover:bg-emerald-100" : "w-fit bg-slate-200 text-slate-700 hover:bg-slate-200"}>
                  {entitlement.status}
                </Badge>
              </div>
            ))
          ) : (
            <p className="text-sm text-slate-500">You do not have an active, assigned paid module yet.</p>
          )}
        </CardContent>
      </Card>

      {/* Available packages — only show for admin/entity-scoped users, not students */}
      {!isStudentView && !isNeonStaging && (
        <section className="space-y-4">
          <div>
            <h2 className="text-lg font-black tracking-tight text-slate-900">Available service packages</h2>
            <p className="text-sm text-slate-500">Only packages that match one of your assigned module entities can be purchased.</p>
          </div>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
            {loading ? (
              <p className="text-sm text-slate-500">Loading packages…</p>
            ) : overview.plans.map((plan) => {
              const matchingScopes = overview.scopes.filter((scope) => plan.module_scope?.includes(scope.module));
              const available = matchingScopes.some((scope) => !isScopeActive(scope));
              const activeOnly = matchingScopes.length > 0 && !available;
              const workspaceModule = matchingScopes[0]?.module || plan.module_scope?.[0] || "";
              return (
                <Card key={plan.id} className="flex flex-col rounded-3xl border-slate-200/80 shadow-2xs">
                  <CardHeader>
                    <CardTitle className="text-xl font-black text-slate-900">{plan.name}</CardTitle>
                    <div className="mt-2 text-2xl font-black text-slate-900">{plan.currency} {Number(plan.price).toLocaleString("en-NP")}</div>
                    <CardDescription>{plan.description || `${plan.duration_days || 30}-day access`}</CardDescription>
                  </CardHeader>
                  <CardContent className="mt-auto space-y-4">
                    <div className="space-y-2 border-t border-slate-100 pt-4">
                      {Object.entries(plan.features || {}).filter(([, enabled]) => enabled).map(([feature]) => (
                        <p key={feature} className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                          <CheckCircle2 className="h-4 w-4 text-emerald-600" />{featureLabel(feature)}
                        </p>
                      ))}
                    </div>
                    {activeOnly ? (
                      <div className="space-y-2">
                      <Button asChild className="w-full bg-emerald-700 text-white hover:bg-emerald-800">
                        <Link to={moduleWorkspacePath(workspaceModule)}>Active — open workspace</Link>
                      </Button>
                      {isNeonStaging && <Button className="w-full" variant="outline" onClick={()=>openPlan(plan)}>Review renewal</Button>}
                      </div>
                    ) : (
                      <Button className="w-full bg-[#071a3d] text-white hover:bg-[#05132d]" disabled={!available} onClick={() => openPlan(plan)}>
                        {available ? "Review & pay with eSewa" : "No matching assigned entity"}
                      </Button>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>
      )}

      {/* Checkout Dialog */}
      <Dialog open={Boolean(selectedPlan)} onOpenChange={(open) => { if (!open && !processing) setSelectedPlan(null); }}>
        <DialogContent className="max-w-md rounded-3xl">
          <DialogHeader>
            <DialogTitle>Checkout with eSewa</DialogTitle>
            <DialogDescription>Payment is not considered successful until MeroTalent verifies the signed eSewa return and transaction status.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4">
              <p className="font-bold text-slate-900">{selectedPlan?.name}</p>
              <p className="mt-1 text-sm text-slate-600">{selectedPlan?.currency} {Number(selectedPlan?.price || 0).toLocaleString("en-NP")}</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="checkout-entity">Apply this package to</Label>
              <Select value={selectedScopeId} onValueChange={setSelectedScopeId}>
                <SelectTrigger id="checkout-entity"><SelectValue placeholder="Select an assigned module entity" /></SelectTrigger>
                <SelectContent>
                  {compatibleScopes.map((scope) => (
                    <SelectItem key={scope.id} value={scope.id}>{moduleLabel(scope.module)} · {scope.entityType} · {scope.entityId.slice(0, 8)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <p className="flex gap-2 text-xs leading-relaxed text-slate-500">
              <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-600" />The plan price, entity authorization, signed form and activation are verified server-side. Returning from eSewa alone cannot activate access. No access is activated until eSewa verification succeeds.
            </p>
            <Button className="w-full bg-[#0073e6] text-white hover:bg-[#0062c4]" disabled={!selectedScope || processing} onClick={() => void beginCheckout()}>
              {processing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ExternalLink className="mr-2 h-4 w-4" />}Continue securely to eSewa
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Payment Proof / Exception Submission Modal */}
      <Dialog open={Boolean(proofTxn)} onOpenChange={(open) => { if (!open && !isSubmittingProof) setProofTxn(null); }}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold">
              <Upload className="h-5 w-5 text-amber-600" />
              Submit Payment Proof & Report Exception
            </DialogTitle>
            <DialogDescription className="text-xs">
              If your payment was deducted but access was not activated, upload your bank voucher or payment screenshot for Super Admin reconciliation.
            </DialogDescription>
          </DialogHeader>

          {proofTxn && (
            <form onSubmit={handleProofSubmit} className="space-y-4 text-xs">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-1">
                <div className="flex justify-between font-semibold text-slate-700">
                  <span>Transaction:</span>
                  <span className="font-mono">{proofTxn.id.slice(0, 8)}...</span>
                </div>
                <div className="flex justify-between font-semibold text-slate-700">
                  <span>Amount:</span>
                  <span className="font-black text-slate-900">{proofTxn.currency} {Number(proofTxn.amount).toLocaleString()}</span>
                </div>
                <div className="flex justify-between font-semibold text-slate-700">
                  <span>Purpose:</span>
                  <span className="capitalize">{txnTypeLabel(proofTxn.payment_type)}</span>
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Proof Type</Label>
                <Select value={proofType} onValueChange={setProofType}>
                  <SelectTrigger className="text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="screenshot">eSewa App Screenshot</SelectItem>
                    <SelectItem value="bank_voucher">Bank Deposit / Transfer Voucher</SelectItem>
                    <SelectItem value="statement">Account Statement Snippet</SelectItem>
                    <SelectItem value="receipt">Official Payment Receipt</SelectItem>
                    <SelectItem value="other">Other Supporting Document</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Attach Document (PNG, JPG, PDF - max 5MB)</Label>
                <Input
                  type="file"
                  accept="image/png,image/jpeg,image/webp,application/pdf"
                  onChange={(e) => setProofFile(e.target.files?.[0] || null)}
                  className="text-xs"
                  required
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Explanation / Issue Note</Label>
                <Textarea
                  placeholder="Describe what happened (e.g. eSewa deducted NPR 1,000 with transaction code #ABC, but booking remained pending)."
                  value={proofNote}
                  onChange={(e) => setProofNote(e.target.value)}
                  className="text-xs min-h-[80px]"
                  required
                />
              </div>

              <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-2.5 flex items-start gap-2 text-amber-900">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-amber-700" />
                <p className="text-[11px] leading-tight">
                  Uploading payment proof does not automatically activate access. Super Admin must review and reconcile the transaction.
                </p>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" size="sm" onClick={() => setProofTxn(null)} disabled={isSubmittingProof}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={isSubmittingProof} className="bg-amber-600 hover:bg-amber-700 text-white font-semibold">
                  {isSubmittingProof ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : null}
                  Submit for Review
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
