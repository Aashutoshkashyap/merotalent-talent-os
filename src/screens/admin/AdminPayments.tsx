import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
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
import { Search, DollarSign, UserCheck, Calendar, Image as ImageIcon, Loader2, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { OperationsPage } from "./OperationsUI";
import { loadAdminProfiles } from "@/lib/admin/profile-hydration";

interface PaymentItem {
  id: string;
  user_id: string;
  payment_type: string;
  reference_id: string | null;
  amount: number;
  currency: string;
  status: string;
  gateway: string | null;
  gateway_transaction_id: string | null;
  screenshot_url?: string | null;
  voucher_pdf_url?: string | null;
  created_at: string;
  profiles?: { email: string | null; full_name: string | null };
}

export default function AdminPayments() {
  const { toast } = useToast();
  const [payments, setPayments] = useState<PaymentItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isLoading, setIsLoading] = useState(true);

  // Manual Enrollment Modal State
  const [isEnrollOpen, setIsEnrollOpen] = useState(false);
  const [enrollEmail, setEnrollEmail] = useState("");
  const [enrollModule, setEnrollModule] = useState("college_subscription");
  const [enrollAmount, setEnrollAmount] = useState("1499");
  const [enrollDays, setEnrollDays] = useState("30");
  const [enrollProofUrl, setEnrollProofUrl] = useState("");
  const [isEnrolling, setIsEnrolling] = useState(false);

  useEffect(() => {
    fetchPayments();
  }, []);

  const fetchPayments = async () => {
    setIsLoading(true);
    const { data, error } = await (supabase as any)
      .from("payments")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast({ variant: "destructive", title: "Unable to load payments", description: error.message });
      setPayments([]);
      setIsLoading(false);
      return;
    }
    try {
      const profiles = await loadAdminProfiles((data || []).map((payment: PaymentItem) => payment.user_id));
      setPayments((data || []).map((payment: PaymentItem) => ({ ...payment, profiles: profiles.get(payment.user_id) })) as PaymentItem[]);
    } catch (profileError) {
      toast({ variant: "destructive", title: "Unable to load payment profiles", description: profileError instanceof Error ? profileError.message : "Profile lookup failed." });
      setPayments((data || []) as PaymentItem[]);
    }
    setIsLoading(false);
  };

  const updatePaymentStatus = async (id: string, newStatus: string) => {
    const { error } = await (supabase as any).from("payments").update({ status: newStatus }).eq("id", id);
    if (!error) {
      toast({ title: `Payment status updated to ${newStatus}` });
      fetchPayments();
    } else {
      toast({ variant: "destructive", title: "Error", description: error.message });
    }
  };

  const handleManualEnroll = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!enrollEmail.trim()) {
      toast({ variant: "destructive", title: "Email required", description: "Enter target user email." });
      return;
    }

    setIsEnrolling(true);
    try {
      const { data: profileData } = await (supabase as any)
        .from("profiles")
        .select("user_id")
        .eq("email", enrollEmail.trim())
        .maybeSingle();

      const targetUserId = profileData?.user_id || "manual-grant-id";
      const days = parseInt(enrollDays) || 30;
      const expiryDate = new Date(Date.now() + days * 86400000).toISOString();

      await (supabase as any).from("payments").insert({
        user_id: targetUserId,
        payment_type: enrollModule,
        amount: parseFloat(enrollAmount) || 0,
        currency: "NPR",
        status: "success",
        gateway: "Manual Admin Grant",
        gateway_transaction_id: `MANUAL-${Date.now()}`,
        screenshot_url: enrollProofUrl.trim() || null,
      });

      await (supabase as any).from("subscriptions").insert({
        user_id: targetUserId,
        entity_type: enrollModule.includes("college") ? "college" : "user",
        status: "active",
        payment_status: "success",
        start_date: new Date().toISOString(),
        expiry_date: expiryDate,
      });

      toast({
        title: "Manual Enrollment Successful!",
        description: `Granted ${enrollModule.replace(/_/g, " ")} to ${enrollEmail} for ${days} days.`,
      });

      setIsEnrollOpen(false);
      setEnrollEmail("");
      setEnrollProofUrl("");
      fetchPayments();
    } catch (err: any) {
      toast({ variant: "destructive", title: "Enrollment Error", description: err?.message || "Failed to grant manual enrollment." });
    } finally {
      setIsEnrolling(false);
    }
  };

  const handleExtendSubscription = async (payment: PaymentItem) => {
    try {
      const extraDays = 30;
      const expiryDate = new Date(Date.now() + extraDays * 86400000).toISOString();

      await (supabase as any).from("subscriptions").upsert({
        user_id: payment.user_id,
        entity_type: payment.payment_type.includes("college") ? "college" : "user",
        status: "active",
        payment_status: "success",
        start_date: new Date().toISOString(),
        expiry_date: expiryDate,
      });

      toast({
        title: "Subscription Extended +30 Days!",
        description: `Extended subscription for ${payment.profiles?.email || payment.user_id}.`,
      });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Extension Error", description: err?.message });
    }
  };

  const filteredPayments = payments.filter((p) => {
    const matchesSearch =
      (p.profiles?.email || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.gateway_transaction_id || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.payment_type.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalSuccessAmount = payments
    .filter((p) => p.status === "success")
    .reduce((sum, p) => sum + (p.amount || 0), 0);

  return (
    <OperationsPage>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-[#0f172a]">Payments Audit & Manual Enrollment</h1>
          <p className="text-muted-foreground text-sm">
            Track revenue transactions, view payment screenshots, grant manual enrollments, and extend subscription dates.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button onClick={() => setIsEnrollOpen(true)} className="bg-[#071a3d] hover:bg-[#05132d] text-white font-bold rounded-xl text-xs">
            <UserCheck className="mr-2 h-4 w-4" />
            Manual Enrollment / Grant
          </Button>

          <div className="flex items-center gap-2 bg-[#f8fafc] px-4 py-2 rounded-xl border border-slate-200 shadow-2xs">
            <DollarSign className="w-5 h-5 text-emerald-600 shrink-0" />
            <div>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Total Revenue</p>
              <p className="text-sm font-black text-slate-900">NPR {totalSuccessAmount.toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by transaction ID, customer email, or service module..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-10 text-xs rounded-xl"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[160px] h-10 text-xs rounded-xl bg-white">
            <SelectValue placeholder="Status Filter" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="success">Successful</SelectItem>
            <SelectItem value="pending">Pending Review</SelectItem>
            <SelectItem value="failed">Failed / Refunded</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card className="border-border/50 rounded-2xl overflow-hidden shadow-2xs">
        <Table>
          <TableHeader className="bg-slate-50">
            <TableRow>
              <TableHead>Customer / User</TableHead>
              <TableHead>Service / Module</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Gateway & Reference</TableHead>
              <TableHead>Proof Docs</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredPayments.map((payment) => (
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
                </TableCell>
                <TableCell className="font-black text-sm text-slate-900">
                  {payment.currency} {payment.amount}
                </TableCell>
                <TableCell>
                  <span className="text-xs font-mono text-muted-foreground block truncate max-w-[140px]">
                    {payment.gateway_transaction_id || payment.gateway || "Direct Transfer"}
                  </span>
                </TableCell>
                <TableCell>
                  {payment.screenshot_url ? (
                    <a
                      href={payment.screenshot_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center text-xs font-bold text-[#0073e6] hover:underline"
                    >
                      <ImageIcon className="w-3.5 h-3.5 mr-1" />
                      View Image
                    </a>
                  ) : (
                    <span className="text-xs text-slate-400 font-semibold">—</span>
                  )}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                  {new Date(payment.created_at).toLocaleDateString()}
                </TableCell>
                <TableCell>
                  <Badge
                    className={`text-[10px] font-bold capitalize ${
                      payment.status === "success"
                        ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                        : payment.status === "pending"
                        ? "bg-amber-100 text-amber-800 border-amber-200"
                        : "bg-red-100 text-red-800 border-red-200"
                    }`}
                  >
                    {payment.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right whitespace-nowrap">
                  <div className="flex items-center justify-end gap-1.5">
                    <Select value={payment.status} onValueChange={(val) => updatePaymentStatus(payment.id, val)}>
                      <SelectTrigger className="w-[110px] h-7 text-[10px] font-bold rounded-lg bg-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="success">Success</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="failed">Failed</SelectItem>
                      </SelectContent>
                    </Select>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleExtendSubscription(payment)}
                      className="h-7 text-[10px] font-bold rounded-lg text-emerald-700 border-emerald-200 hover:bg-emerald-50"
                    >
                      <Calendar className="w-3 h-3 mr-1" />
                      +30 Days
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {filteredPayments.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-12 text-muted-foreground text-xs font-semibold">
                  {isLoading ? "Loading payment records..." : "No payment records found."}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={isEnrollOpen} onOpenChange={setIsEnrollOpen}>
        <DialogContent className="max-w-md rounded-3xl p-6">
          <form onSubmit={handleManualEnroll} className="space-y-4">
            <DialogHeader>
              <DialogTitle className="text-xl font-black text-slate-900">Manual Enrollment & Grant</DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Grant package access to a user manually upon receiving direct bank/eSewa transfer.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3">
              <div className="space-y-1">
                <Label className="text-xs font-bold text-slate-700">Target User Email *</Label>
                <Input
                  type="email"
                  placeholder="e.g. user@example.com"
                  value={enrollEmail}
                  onChange={(e) => setEnrollEmail(e.target.value)}
                  required
                  className="h-10 text-xs rounded-xl"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-bold text-slate-700">Module / Package Type *</Label>
                <Select value={enrollModule} onValueChange={setEnrollModule}>
                  <SelectTrigger className="h-10 text-xs rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="college_subscription">College Module Pass</SelectItem>
                    <SelectItem value="mentor_pass">1-on-1 Mentorship Pass</SelectItem>
                    <SelectItem value="job_fasttrack">Premium Job Fast-Track</SelectItem>
                    <SelectItem value="hackathon_pass">Hackathon & Event Pass</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-bold text-slate-700">Amount Paid (NPR)</Label>
                  <Input
                    type="number"
                    value={enrollAmount}
                    onChange={(e) => setEnrollAmount(e.target.value)}
                    className="h-10 text-xs rounded-xl"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-bold text-slate-700">Access Duration (Days)</Label>
                  <Input
                    type="number"
                    value={enrollDays}
                    onChange={(e) => setEnrollDays(e.target.value)}
                    className="h-10 text-xs rounded-xl"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-bold text-slate-700">Payment Proof Screenshot URL</Label>
                <Input
                  placeholder="https://... image link or reference receipt"
                  value={enrollProofUrl}
                  onChange={(e) => setEnrollProofUrl(e.target.value)}
                  className="h-10 text-xs rounded-xl"
                />
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setIsEnrollOpen(false)} className="rounded-xl text-xs">
                Cancel
              </Button>
              <Button type="submit" disabled={isEnrolling} className="rounded-xl bg-[#071a3d] hover:bg-[#05132d] text-white text-xs font-extrabold px-5">
                {isEnrolling ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Sparkles className="w-4 h-4 mr-2" />}
                Grant Subscription Access
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </OperationsPage>
  );
}
