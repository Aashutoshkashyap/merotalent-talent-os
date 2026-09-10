import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, DollarSign, Image as ImageIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { OperationsPage } from "./OperationsUI";
import { loadAdminProfiles } from "@/lib/admin/profile-hydration";
import { listAdminResource } from "@/lib/admin/admin-client";

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

  useEffect(() => {
    fetchPayments();
  }, []);

  const fetchPayments = async () => {
    setIsLoading(true);
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
      const profiles = await loadAdminProfiles((data || []).map((payment: PaymentItem) => payment.user_id));
      setPayments((data || []).map((payment: PaymentItem) => ({ ...payment, profiles: profiles.get(payment.user_id) })) as PaymentItem[]);
    } catch (profileError) {
      toast({ variant: "destructive", title: "Unable to load payment profiles", description: profileError instanceof Error ? profileError.message : "Profile lookup failed." });
      setPayments((data || []) as PaymentItem[]);
    }
    setIsLoading(false);
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
          <h1 className="text-2xl font-display font-bold text-[#0f172a]">Payments audit</h1>
          <p className="text-muted-foreground text-sm">
            Review payment records and provider outcomes. Reconciliation stays pending until a trusted backend/provider confirmation is recorded.
          </p>
        </div>

        <div className="flex items-center gap-3">
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
              </TableRow>
            ))}
            {filteredPayments.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12 text-muted-foreground text-xs font-semibold">
                  {isLoading ? "Loading payment records..." : "No payment records found."}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </OperationsPage>
  );
}
