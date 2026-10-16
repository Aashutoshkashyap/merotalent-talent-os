import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Search,
  DollarSign,
  Image as ImageIcon,
  MoreHorizontal,
  FileText,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Loader2,
  ExternalLink,
  Upload,
  FileCheck,
  FileX,
  FileClock,
  ShieldCheck,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { OperationsPage } from "./OperationsUI";
import { loadAdminProfiles } from "@/lib/admin/profile-hydration";
import { listAdminResource } from "@/lib/admin/admin-client";
import { neonBillingRequest } from "@/lib/admin/neon-billing-client";

export interface PaymentProofItem {
  id: string;
  payment_id: string;
  uploaded_by_user_id: string;
  file_name: string;
  storage_path?: string;
  mime_type: string;
  file_size: number;
  proof_type: string;
  user_note: string;
  status: "pending" | "accepted" | "rejected";
  reviewed_by_user_id: string | null;
  reviewed_at: string | null;
  review_note: string | null;
  created_at: string;
}

export interface PaymentItem {
  id: string;
  user_id: string;
  payment_type: string;
  reference_id: string | null;
  parent_payment_id?: string | null;
  amount: number;
  currency: string;
  status: string;
  gateway: string | null;
  payment_method?: string | null;
  gateway_transaction_id: string | null;
  payout_status?: string | null;
  payout_amount?: number | null;
  commission_amount?: number | null;
  payout_reference?: string | null;
  payout_at?: string | null;
  reconciliation_status?: string | null;
  verified_by_user_id?: string | null;
  verification_note?: string | null;
  screenshot_url?: string | null;
  voucher_pdf_url?: string | null;
  metadata?: Record<string, any> | null;
  paid_at?: string | null;
  failed_at?: string | null;
  created_at: string;
  updated_at?: string;
  profiles?: { email: string | null; full_name: string | null };
}

export default function AdminPayments() {
  const staging = process.env.NEXT_PUBLIC_MEROTALENT_BACKEND_MODE === "neon-staging";
  const { toast } = useToast();
  const [payments, setPayments] = useState<PaymentItem[]>([]);
  const [proofsMap, setProofsMap] = useState<Map<string, PaymentProofItem[]>>(new Map());
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const serverSearch = staging ? searchQuery : "";
  const serverStatus = staging ? statusFilter : "all";
  const serverType = staging ? typeFilter : "all";
  const [isLoading, setIsLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);
  const [summary, setSummary] = useState<{ collected: number; pending_payouts: number; pending_proofs: number } | null>(null);

  // Selected payment for inspection modal
  const [selectedPayment, setSelectedPayment] = useState<PaymentItem | null>(null);

  // Reconcile modal state
  const [reconcileTarget, setReconcileTarget] = useState<PaymentItem | null>(null);
  const [reconcileStatus, setReconcileStatus] = useState<string>("success");
  const [reconciliationType, setReconciliationType] = useState<string>("reconciled");
  const [reconcileNote, setReconcileNote] = useState<string>("");
  const [isReconciling, setIsReconciling] = useState<boolean>(false);

  // Mentor Payout modal state
  const [payoutTarget, setPayoutTarget] = useState<PaymentItem | null>(null);
  const [payoutAmount, setPayoutAmount] = useState<number>(0);
  const [commissionAmount, setCommissionAmount] = useState<number>(0);
  const [payoutReference, setPayoutReference] = useState<string>("");
  const [payoutNote, setPayoutNote] = useState<string>("");
  const [isRecordingPayout, setIsRecordingPayout] = useState<boolean>(false);

  // Proof Review state
  const [reviewProofTarget, setReviewProofTarget] = useState<PaymentProofItem | null>(null);
  const [proofDecision, setProofDecision] = useState<"accepted" | "rejected">("accepted");
  const [proofReviewNote, setProofReviewNote] = useState<string>("");
  const [isReviewingProof, setIsReviewingProof] = useState<boolean>(false);
  const [signedDocUrls, setSignedDocUrls] = useState<Map<string, string>>(new Map());

  const fetchPayments = useCallback(async (offset = 0) => {
    setIsLoading(true);
    if (staging) {
      try {
        const params = new URLSearchParams({ offset: String(offset), search: serverSearch, status: serverStatus, type: serverType });
        const result = await neonBillingRequest<{ payments: PaymentItem[]; proofs: PaymentProofItem[];
          summary: { collected: number; pending_payouts: number; pending_proofs: number }; total: number; hasMore: boolean }>(
          `/api/v1/neon-staging/admin/payments?${params}`);
        setPayments(previous => offset ? [...previous, ...result.payments] : result.payments);
        setProofsMap(previous => {
          const map = offset ? new Map(previous) : new Map<string, PaymentProofItem[]>();
          for (const proof of result.proofs) map.set(proof.payment_id, [...(map.get(proof.payment_id) || []), proof]);
          return map;
        });
        setSummary(result.summary);
        setTotal(result.total);
        setHasMore(result.hasMore);
      } catch (error) {
        toast({ variant: "destructive", title: "Unable to load payments", description: error instanceof Error ? error.message : "Billing lookup failed." });
      } finally { setIsLoading(false); }
      return;
    }
    let data: any[] = [];
    try {
      data = await listAdminResource<PaymentItem>("payments");
    } catch {
      const { data: dbData, error } = await (supabase as any)
        .from("payments")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        toast({ variant: "destructive", title: "Unable to load payments", description: error.message });
        setPayments([]);
        setIsLoading(false);
        return;
      }
      data = dbData || [];
    }

    try {
      const [profiles, { data: proofsData }] = await Promise.all([
        loadAdminProfiles((data || []).map((payment: PaymentItem) => payment.user_id)),
        (supabase as any)
          .from("payment_proofs")
          .select("*")
          .order("created_at", { ascending: false }),
      ]);

      setPayments((data || []).map((payment: PaymentItem) => ({ ...payment, profiles: profiles.get(payment.user_id) })) as PaymentItem[]);

      if (proofsData) {
        const map = new Map<string, PaymentProofItem[]>();
        for (const proof of proofsData as PaymentProofItem[]) {
          const list = map.get(proof.payment_id) || [];
          list.push(proof);
          map.set(proof.payment_id, list);
        }
        setProofsMap(map);
      }
    } catch (profileError) {
      toast({ variant: "destructive", title: "Unable to load payment profiles", description: profileError instanceof Error ? profileError.message : "Profile lookup failed." });
      setPayments((data || []) as PaymentItem[]);
    }
    setIsLoading(false);
  }, [toast, staging, serverSearch, serverStatus, serverType]);

  useEffect(() => {
    const timer = setTimeout(() => void fetchPayments(), staging ? 250 : 0);
    return () => clearTimeout(timer);
  }, [fetchPayments, staging]);

  const handleOpenSignedDocument = async (proof: PaymentProofItem) => {
    if (staging) {
      try {
        const result = await neonBillingRequest<{ signedUrl: string }>(
          `/api/v1/neon-staging/payments/proofs?id=${encodeURIComponent(proof.id)}`);
        window.open(result.signedUrl, "_blank", "noopener,noreferrer");
      } catch (error) {
        toast({ variant: "destructive", title: "Document Preview Error", description: error instanceof Error ? error.message : "Failed to load proof." });
      }
      return;
    }
    if (signedDocUrls.has(proof.id)) {
      window.open(signedDocUrls.get(proof.id), "_blank");
      return;
    }
    try {
      const { data, error } = await supabase.storage
        .from("payment-proofs")
        .createSignedUrl(proof.storage_path!, 3600);
      if (error || !data?.signedUrl) throw error || new Error("Could not generate secure URL.");
      setSignedDocUrls((prev) => new Map(prev).set(proof.id, data.signedUrl));
      window.open(data.signedUrl, "_blank");
    } catch (err: any) {
      toast({ variant: "destructive", title: "Document Preview Error", description: err.message || "Failed to load proof." });
    }
  };

  const handleReviewProofSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewProofTarget) return;
    setIsReviewingProof(true);
    try {
      if (staging) await neonBillingRequest("/api/v1/neon-staging/admin/payments", { method: "PATCH",
        body: JSON.stringify({ action: "proof", id: reviewProofTarget.id, paymentId: reviewProofTarget.payment_id,
          status: proofDecision, note: proofReviewNote.trim() }) });
      else {
      const { error } = await (supabase as any).rpc("admin_review_payment_proof", {
        p_proof_id: reviewProofTarget.id,
        p_decision: proofDecision,
        p_review_note: proofReviewNote.trim() || null,
      });
      if (error) throw error;
      }

      toast({
        title: proofDecision === "accepted" ? "Payment Proof Accepted" : "Payment Proof Rejected",
        description: staging ? "Evidence review saved. Payment confirmation remains separate." : `Proof marked as ${proofDecision}. Underlying payment reconciled.`,
      });

      setReviewProofTarget(null);
      setProofReviewNote("");
      setSelectedPayment(null);
      void fetchPayments();
    } catch (err: any) {
      toast({ variant: "destructive", title: "Review failed", description: err.message || "Could not review payment proof." });
    } finally {
      setIsReviewingProof(false);
    }
  };

  const handleReconcileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reconcileTarget) return;
    setIsReconciling(true);
    try {
      if (staging) await neonBillingRequest("/api/v1/neon-staging/admin/payments", { method: "PATCH",
        body: JSON.stringify({ action: "reconcile", id: reconcileTarget.id, status: reconcileStatus,
          reconciliation: reconciliationType, note: reconcileNote.trim() }) });
      else {
      const { error } = await (supabase as any).rpc("admin_verify_and_reconcile_payment", {
        p_payment_id: reconcileTarget.id,
        p_status: reconcileStatus,
        p_note: reconcileNote.trim() || null,
        p_reconciliation_status: reconciliationType,
      });
      if (error) throw error;
      }
      toast({
        title: "Payment state updated",
        description: `Payment ${reconcileTarget.id.slice(0, 8)} updated to ${reconcileStatus} (${reconciliationType}).`,
      });
      setReconcileTarget(null);
      setReconcileNote("");
      void fetchPayments();
    } catch (err: any) {
      toast({ variant: "destructive", title: "Reconciliation failed", description: err.message || "Failed to update payment." });
    } finally {
      setIsReconciling(false);
    }
  };

  const handlePayoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payoutTarget) return;
    setIsRecordingPayout(true);
    try {
      if (staging) await neonBillingRequest("/api/v1/neon-staging/admin/payments", { method: "PATCH",
        body: JSON.stringify({ action: "payout", id: payoutTarget.id, amount: Number(payoutAmount),
          commission: Number(commissionAmount), reference: payoutReference.trim(), note: payoutNote.trim() }) });
      else {
      const { error } = await (supabase as any).rpc("admin_record_mentor_payout", {
        p_payment_id: payoutTarget.id,
        p_payout_amount: Number(payoutAmount),
        p_commission_amount: Number(commissionAmount),
        p_payout_reference: payoutReference.trim() || null,
        p_note: payoutNote.trim() || null,
      });
      if (error) throw error;
      }
      toast({
        title: "Mentor payout recorded",
        description: `Recorded external payout of ${payoutTarget.currency} ${payoutAmount}. This action does not transfer money.`,
      });
      setPayoutTarget(null);
      setPayoutReference("");
      setPayoutNote("");
      void fetchPayments();
    } catch (err: any) {
      toast({ variant: "destructive", title: "Payout recording failed", description: err.message || "Could not record payout." });
    } finally {
      setIsRecordingPayout(false);
    }
  };

  const openPayoutDialog = (payment: PaymentItem) => {
    setPayoutTarget(payment);
    const comm = payment.commission_amount ?? 0;
    const payable = payment.payout_amount || (Number(payment.amount) - Number(comm));
    setPayoutAmount(payable);
    setCommissionAmount(comm);
    setPayoutReference(payment.payout_reference || "");
    setPayoutNote("");
  };

  const openReconcileDialog = (payment: PaymentItem) => {
    setReconcileTarget(payment);
    setReconcileStatus(payment.status || "success");
    setReconciliationType(payment.reconciliation_status || "reconciled");
    setReconcileNote(payment.verification_note || "");
  };

  const openReviewProofDialog = (proof: PaymentProofItem, defaultDecision: "accepted" | "rejected" = "accepted") => {
    setReviewProofTarget(proof);
    setProofDecision(defaultDecision);
    setProofReviewNote(proof.review_note || "");
  };

  const filteredPayments = staging ? payments : payments.filter((p) => {
    const matchesSearch =
      (p.profiles?.email || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.profiles?.full_name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.gateway_transaction_id || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.payout_reference || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.payment_type.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || p.status === statusFilter;
    const matchesType = typeFilter === "all" || p.payment_type === typeFilter;
    return matchesSearch && matchesStatus && matchesType;
  });

  const totalSuccessAmount = summary?.collected ?? payments
    .filter((p) => p.status === "success" && p.payment_type !== "mentor_payout_settlement")
    .reduce((sum, p) => sum + (p.amount || 0), 0);

  const pendingPayoutCount = summary?.pending_payouts ?? payments.filter((p) => p.payout_status === "pending").length;
  const pendingProofCount = summary?.pending_proofs ?? Array.from(proofsMap.values()).flat().filter((p) => p.status === "pending").length;

  return (
    <OperationsPage>
      {/* Header & Metrics */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-[#0f172a]">Central Transaction Ledger</h1>
          <p className="text-muted-foreground text-sm">
            Unified financial records across Colleges, Mentors, Events, and Jobs. Payment state, verification, evidence proofs, and module entitlements remain separated.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-[#f8fafc] px-4 py-2 rounded-xl border border-slate-200 shadow-2xs">
            <DollarSign className="w-5 h-5 text-emerald-600 shrink-0" />
            <div>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Gross Collection</p>
              <p className="text-sm font-black text-slate-900">NPR {totalSuccessAmount.toLocaleString()}</p>
            </div>
          </div>
          {pendingProofCount > 0 && (
            <div className="flex items-center gap-2 bg-amber-50 px-4 py-2 rounded-xl border border-amber-200 shadow-2xs">
              <Upload className="w-5 h-5 text-amber-600 shrink-0" />
              <div>
                <p className="text-[10px] text-amber-700 font-bold uppercase tracking-wider">Pending Evidence</p>
                <p className="text-sm font-black text-amber-900">{pendingProofCount} To Review</p>
              </div>
            </div>
          )}
          {pendingPayoutCount > 0 && (
            <div className="flex items-center gap-2 bg-indigo-50 px-4 py-2 rounded-xl border border-indigo-200 shadow-2xs">
              <RotateCcw className="w-5 h-5 text-indigo-600 shrink-0" />
              <div>
                <p className="text-[10px] text-indigo-700 font-bold uppercase tracking-wider">Pending Payouts</p>
                <p className="text-sm font-black text-indigo-900">{pendingPayoutCount} Pending</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by transaction ID, customer, gateway reference, or module..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-10 text-xs rounded-xl"
          />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-full sm:w-[170px] h-10 text-xs rounded-xl bg-white">
            <SelectValue placeholder="Module / Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Modules</SelectItem>
            <SelectItem value="subscription">Subscriptions</SelectItem>
            <SelectItem value="module_subscription">Manual module subscriptions</SelectItem>
            <SelectItem value="module_access_request">College / Module Access</SelectItem>
            <SelectItem value="mentor_booking">Mentor Bookings</SelectItem>
            <SelectItem value="event_ticket">Event Tickets</SelectItem>
            <SelectItem value="mentor_payout_settlement">Mentor Payouts</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[150px] h-10 text-xs rounded-xl bg-white">
            <SelectValue placeholder="Status Filter" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="success">Successful</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
            <SelectItem value="expired">Expired</SelectItem>
            <SelectItem value="refunded">Refunded</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Main Financial Ledger Table */}
      <Card className="border-border/50 rounded-2xl overflow-hidden shadow-2xs">
        <Table>
          <TableHeader className="bg-slate-50">
            <TableRow>
              <TableHead>Customer / Payer</TableHead>
              <TableHead>Module & Purpose</TableHead>
              <TableHead>Gross Amount</TableHead>
              <TableHead>Gateway & Reference</TableHead>
              <TableHead>Evidence / Proof</TableHead>
              <TableHead>Reconciliation</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredPayments.map((payment) => {
              const proofs = proofsMap.get(payment.id) || [];
              const pendingProof = proofs.find((p) => p.status === "pending");
              const acceptedProof = proofs.find((p) => p.status === "accepted");

              return (
                <TableRow key={payment.id} className="hover:bg-slate-50/50">
                  <TableCell>
                    <div>
                      <p className="font-bold text-sm text-[#0f172a]">{payment.profiles?.full_name || "Customer"}</p>
                      <p className="text-xs text-muted-foreground font-mono">{payment.profiles?.email || payment.user_id}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize text-[10px] font-bold bg-slate-100">
                      {payment.payment_type.replace(/_/g, " ")}
                    </Badge>
                    {payment.parent_payment_id && (
                      <span className="block text-[10px] text-muted-foreground font-mono mt-0.5">
                        Linked to: {payment.parent_payment_id.slice(0, 8)}...
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="font-black text-sm text-slate-900">
                    {payment.currency} {payment.amount.toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <span className="text-xs font-mono text-muted-foreground block truncate max-w-[140px]" title={payment.gateway_transaction_id || payment.gateway || "Direct"}>
                      {payment.gateway_transaction_id || payment.gateway || "Direct Transfer"}
                    </span>
                  </TableCell>
                  <TableCell>
                    {pendingProof ? (
                      <Badge className="bg-amber-100 text-amber-800 border-amber-300 text-[10px] font-bold flex items-center gap-1 w-fit">
                        <FileClock className="w-3 h-3" /> Evidence Submitted
                      </Badge>
                    ) : acceptedProof ? (
                      <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-[10px] font-bold flex items-center gap-1 w-fit">
                        <FileCheck className="w-3 h-3" /> Evidence Accepted
                      </Badge>
                    ) : (
                      <span className="text-xs text-slate-400 font-semibold">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={`text-[10px] font-bold capitalize ${payment.reconciliation_status === "manual_review_required" || payment.reconciliation_status === "disputed"
                        ? "bg-amber-50 text-amber-800 border-amber-300"
                        : "bg-slate-50 text-slate-700 border-slate-200"
                        }`}
                    >
                      {payment.reconciliation_status || "reconciled"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      className={`text-[10px] font-bold capitalize ${payment.status === "success"
                        ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                        : payment.status === "pending"
                          ? "bg-amber-100 text-amber-800 border-amber-200"
                          : "bg-red-100 text-red-800 border-red-200"
                        }`}
                    >
                      {payment.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-52">
                        <DropdownMenuLabel className="text-xs">Transaction Actions</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => setSelectedPayment(payment)} className="text-xs font-semibold cursor-pointer">
                          <FileText className="w-3.5 h-3.5 mr-2 text-blue-600" />
                          View Full Details & Proofs
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => openReconcileDialog(payment)} className="text-xs font-semibold cursor-pointer">
                          <CheckCircle2 className="w-3.5 h-3.5 mr-2 text-emerald-600" />
                          Reconcile / Verify
                        </DropdownMenuItem>
                        {payment.payment_type === "mentor_booking" && payment.status === "success" && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => openPayoutDialog(payment)} className="text-xs font-semibold cursor-pointer text-indigo-600">
                              <DollarSign className="w-3.5 h-3.5 mr-2" />
                              Record Mentor Payout
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })}
            {filteredPayments.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-12 text-muted-foreground text-xs font-semibold">
                  {isLoading ? "Loading central transaction records..." : "No matching financial transactions found."}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
      {staging && <div className="flex items-center justify-between gap-3 text-sm text-muted-foreground">
        <span>{payments.length} of {total} transactions</span>
        {hasMore && <Button variant="outline" disabled={isLoading} onClick={() => void fetchPayments(payments.length)}>
          {isLoading ? "Loading…" : "Load more"}
        </Button>}
      </div>}

      {/* 10-Point Transaction Inspection & Evidence Review Modal */}
      <Dialog open={Boolean(selectedPayment)} onOpenChange={(open) => !open && setSelectedPayment(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <FileText className="w-5 h-5 text-indigo-600" />
              Transaction Details & Financial Chain
            </DialogTitle>
            <DialogDescription className="text-xs">
              Complete transaction audit record with separated identity, payment status, entitlement context, and uploaded exception evidence.
            </DialogDescription>
          </DialogHeader>

          {selectedPayment && (
            <div className="space-y-4 text-xs">
              {/* Financial Chain Header Banner */}
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Transaction ID</span>
                  <span className="font-mono font-bold text-slate-900">{selectedPayment.id}</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Created Date</span>
                  <span className="text-slate-800 font-semibold">{new Date(selectedPayment.created_at).toLocaleString()}</span>
                </div>
              </div>

              {/* 10-Point Matrix */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* 1. WHO */}
                <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-1">
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">1. Payer Identity</span>
                  <p className="font-bold text-slate-900">{selectedPayment.profiles?.full_name || "Customer"}</p>
                  <p className="text-slate-600">{selectedPayment.profiles?.email || "No email"}</p>
                  <p className="font-mono text-[10px] text-slate-400">User ID: {selectedPayment.user_id}</p>
                </div>

                {/* 2. WHAT & WHERE */}
                <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-1">
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">2. Module & Purpose</span>
                  <Badge variant="outline" className="capitalize font-bold bg-slate-100">
                    {selectedPayment.payment_type.replace(/_/g, " ")}
                  </Badge>
                  {selectedPayment.reference_id && (
                    <p className="text-[11px] text-slate-600 font-mono">Reference ID: {selectedPayment.reference_id}</p>
                  )}
                </div>

                {/* 3. HOW MUCH & SETTLEMENT */}
                <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-1">
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">3. Financial Breakdown</span>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-600">Gross Paid:</span>
                    <span className="font-black text-slate-900">{selectedPayment.currency} {selectedPayment.amount.toLocaleString()}</span>
                  </div>
                  {selectedPayment.commission_amount ? (
                    <div className="flex justify-between items-center text-slate-600">
                      <span>Platform Commission:</span>
                      <span className="font-semibold text-indigo-700">{selectedPayment.currency} {selectedPayment.commission_amount}</span>
                    </div>
                  ) : null}
                  {selectedPayment.payout_amount ? (
                    <div className="flex justify-between items-center text-slate-600">
                      <span>Mentor Payable / Payout:</span>
                      <span className="font-semibold text-emerald-700">{selectedPayment.currency} {selectedPayment.payout_amount}</span>
                    </div>
                  ) : null}
                </div>

                {/* 4. HOW & GATEWAY */}
                <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-1">
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">4. Gateway & Reference</span>
                  <p className="font-semibold text-slate-900">Provider: {selectedPayment.gateway || "Manual / Direct"}</p>
                  <p className="font-mono text-[11px] text-slate-600 truncate">Ref: {selectedPayment.gateway_transaction_id || "N/A"}</p>
                  {selectedPayment.payout_reference && (
                    <p className="font-mono text-[11px] text-indigo-600 truncate">Payout Ref: {selectedPayment.payout_reference}</p>
                  )}
                </div>
              </div>

              {/* Status & Reconciliation */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">5. Status & Reconciliation</span>
                <div className="flex flex-wrap gap-2">
                  <Badge className={`capitalize font-bold ${selectedPayment.status === "success" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>
                    Payment: {selectedPayment.status}
                  </Badge>
                  <Badge variant="outline" className="capitalize font-bold bg-white">
                    Reconciliation: {selectedPayment.reconciliation_status || "reconciled"}
                  </Badge>
                  {selectedPayment.payout_status && (
                    <Badge variant="outline" className="capitalize font-bold bg-white">
                      Payout: {selectedPayment.payout_status}
                    </Badge>
                  )}
                </div>
                {selectedPayment.verification_note && (
                  <p className="text-xs text-slate-700 bg-white p-2 rounded-lg border border-slate-200">
                    <span className="font-bold">Super Admin Note:</span> {selectedPayment.verification_note}
                  </p>
                )}
              </div>

              {/* Payment Evidence Section (Uploaded Proofs) */}
              <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider flex items-center gap-1.5">
                    <Upload className="w-3.5 h-3.5 text-amber-600" />
                    Payment Exception Evidence ({proofsMap.get(selectedPayment.id)?.length || 0})
                  </span>
                </div>

                {proofsMap.get(selectedPayment.id)?.length ? (
                  <div className="space-y-2.5">
                    {proofsMap.get(selectedPayment.id)!.map((proof) => (
                      <div key={proof.id} className="p-3 rounded-lg border border-slate-200 bg-slate-50 space-y-2">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="capitalize font-bold bg-white">
                              {proof.proof_type.replace(/_/g, " ")}
                            </Badge>
                            <span className="font-semibold text-slate-900">{proof.file_name}</span>
                            <span className="text-slate-400 text-[10px]">({Math.round(proof.file_size / 1024)} KB)</span>
                          </div>
                          <Badge className={`capitalize font-bold ${proof.status === "accepted" ? "bg-emerald-100 text-emerald-800" : proof.status === "rejected" ? "bg-red-100 text-red-800" : "bg-amber-100 text-amber-800"
                            }`}>
                            {proof.status}
                          </Badge>
                        </div>

                        <p className="text-xs text-slate-700 bg-white p-2 rounded border border-slate-200">
                          <strong className="text-slate-900">User Explanation:</strong> {proof.user_note}
                        </p>

                        {proof.review_note && (
                          <p className="text-xs text-slate-700 bg-amber-50/50 p-2 rounded border border-amber-200">
                            <strong className="text-amber-900">Admin Review Note:</strong> {proof.review_note}
                          </p>
                        )}

                        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => void handleOpenSignedDocument(proof)}
                            className="text-xs text-blue-700 font-semibold"
                          >
                            <ExternalLink className="w-3.5 h-3.5 mr-1" />
                            Open Secure Evidence Document
                          </Button>

                          {proof.status === "pending" && (
                            <div className="flex items-center gap-2">
                              <Button
                                type="button"
                                size="sm"
                                variant="destructive"
                                onClick={() => openReviewProofDialog(proof, "rejected")}
                                className="text-xs h-7"
                              >
                                Reject Proof
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                onClick={() => openReviewProofDialog(proof, "accepted")}
                                className="text-xs h-7 bg-emerald-600 hover:bg-emerald-700 text-white"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                                {staging ? "Accept Evidence" : "Accept & Reconcile"}
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-400 text-xs italic">No payment exception or proof document has been uploaded for this transaction.</p>
                )}
              </div>
            </div>
          )}

          <DialogFooter className="mt-4">
            <Button variant="outline" size="sm" onClick={() => setSelectedPayment(null)}>
              Close
            </Button>
            {selectedPayment && (
              <Button size="sm" onClick={() => { const p = selectedPayment; setSelectedPayment(null); openReconcileDialog(p); }}>
                Manual Reconcile
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Proof Review Modal (Accept & Reconcile / Reject) */}
      <Dialog open={Boolean(reviewProofTarget)} onOpenChange={(open) => !open && setReviewProofTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              {proofDecision === "accepted" ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-red-600" />
              )}
              {proofDecision === "accepted" ? (staging ? "Accept Payment Evidence" : "Accept Proof & Reconcile Payment") : "Reject Payment Proof"}
            </DialogTitle>
            <DialogDescription className="text-xs">
              {staging ? "Reviewing evidence does not confirm payment or activate access. Gateway settlement is verified separately." : proofDecision === "accepted"
                ? "Accepting this evidence authoritatively marks the underlying payment as success, updates reconciliation, and activates the entitled service."
                : "Rejecting this evidence keeps the transaction unverified/failed."}
            </DialogDescription>
          </DialogHeader>

          {reviewProofTarget && (
            <form onSubmit={handleReviewProofSubmit} className="space-y-4 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                <p className="font-semibold text-slate-800">File: {reviewProofTarget.file_name}</p>
                <p className="text-slate-600">User Note: {reviewProofTarget.user_note}</p>
              </div>

              <div>
                <Label className="text-xs font-semibold">Review Note / Audit Reason</Label>
                <Textarea
                  placeholder={proofDecision === "accepted" ? "e.g., Bank statement reference matches order NPR 1,000" : "e.g., Screenshot shows mismatched reference code"}
                  value={proofReviewNote}
                  onChange={(e) => setProofReviewNote(e.target.value)}
                  className="text-xs min-h-[70px] mt-1"
                  required
                  minLength={staging ? 8 : undefined}
                  maxLength={2000}
                />
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" size="sm" onClick={() => setReviewProofTarget(null)}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={isReviewingProof}
                  className={proofDecision === "accepted" ? "bg-emerald-600 hover:bg-emerald-700 text-white" : "bg-red-600 hover:bg-red-700 text-white"}
                >
                  {isReviewingProof ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : null}
                  {proofDecision === "accepted" ? (staging ? "Accept Evidence" : "Confirm & Reconcile") : "Confirm Rejection"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Super Admin Reconcile & Verify Modal */}
      <Dialog open={Boolean(reconcileTarget)} onOpenChange={(open) => !open && setReconcileTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              Reconcile & Verify Payment
            </DialogTitle>
            <DialogDescription className="text-xs">
              {staging ? "Gateway status changes require provider verification. Only pending manual module receipts may be confirmed or rejected here. Every reconciliation is audited." : "Manually confirm external settlement or update transaction reconciliation state. This action is permanently audited."}
            </DialogDescription>
          </DialogHeader>

          {reconcileTarget && (
            <form onSubmit={handleReconcileSubmit} className="space-y-4 text-xs">
              <div>
                <Label className="text-xs font-semibold">Payment Status</Label>
                <Select value={reconcileStatus} onValueChange={setReconcileStatus}
                  disabled={staging && !(reconcileTarget.gateway === "manual" && reconcileTarget.payment_type === "module_subscription" && reconcileTarget.status === "pending")}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="success">Success (Payment Received)</SelectItem>
                    <SelectItem value="pending">Pending (Awaiting Confirmation)</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                    <SelectItem value="expired">Expired</SelectItem>
                    <SelectItem value="refunded">Refunded</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs font-semibold">Reconciliation State</Label>
                <Select value={reconciliationType} onValueChange={setReconciliationType}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="reconciled">Reconciled (Settled & Verified)</SelectItem>
                    <SelectItem value="manual_review_required">Manual Review Required</SelectItem>
                    <SelectItem value="unresolved">Unresolved Discrepancy</SelectItem>
                    <SelectItem value="disputed">Disputed / Customer Dispute</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs font-semibold">Audit Note / Reason</Label>
                <Input
                  placeholder="e.g., Bank statement verified by Super Admin"
                  value={reconcileNote}
                  onChange={(e) => setReconcileNote(e.target.value)}
                  className="mt-1"
                  required={staging}
                  minLength={staging ? 8 : undefined}
                  maxLength={staging ? 1000 : undefined}
                />
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" size="sm" onClick={() => setReconcileTarget(null)}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={isReconciling}>
                  {isReconciling ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : null}
                  Save Reconciliation
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Record Mentor Payout Settlement Modal */}
      <Dialog open={Boolean(payoutTarget)} onOpenChange={(open) => !open && setPayoutTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-indigo-600" />
              Record Mentor Payout
            </DialogTitle>
            <DialogDescription className="text-xs">
              Record an external payout already made for booking transaction #{payoutTarget?.id.slice(0, 8)}. Saving this record does not transfer money.
            </DialogDescription>
          </DialogHeader>

          {payoutTarget && (
            <form onSubmit={handlePayoutSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-semibold">Payout Amount ({payoutTarget.currency})</Label>
                  <Input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={payoutAmount}
                    onChange={(e) => setPayoutAmount(Number(e.target.value))}
                    className="mt-1 font-bold"
                    required
                  />
                </div>
                <div>
                  <Label className="text-xs font-semibold">Commission ({payoutTarget.currency})</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={commissionAmount}
                    onChange={(e) => setCommissionAmount(Number(e.target.value))}
                    className="mt-1 font-bold"
                  />
                </div>
              </div>

              <div>
                <Label className="text-xs font-semibold">Bank / eSewa Payout Reference</Label>
                <Input
                  placeholder="e.g., Bank Transfer Ref #992014"
                  value={payoutReference}
                  onChange={(e) => setPayoutReference(e.target.value)}
                  className="mt-1 font-mono"
                  required
                />
              </div>

              <div>
                <Label className="text-xs font-semibold">Settlement Note</Label>
                <Input
                  placeholder="e.g., Paid via Nabil Bank to Mentor Account"
                  value={payoutNote}
                  onChange={(e) => setPayoutNote(e.target.value)}
                  className="mt-1"
                  required={staging}
                  minLength={staging ? 8 : undefined}
                  maxLength={2000}
                />
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" size="sm" onClick={() => setPayoutTarget(null)}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={isRecordingPayout}>
                  {isRecordingPayout ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : null}
                  Record Payout
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </OperationsPage>
  );
}
