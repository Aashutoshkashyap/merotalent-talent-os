import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, CreditCard, DollarSign, ArrowUpRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { OperationsPage } from "./OperationsUI";
import { SEED_PAYMENTS } from "@/lib/admin/admin-seed-fallbacks";

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
  created_at: string;
  profiles?: { email: string; full_name: string };
}

export default function AdminPayments() {
  const { toast } = useToast();
  const [payments, setPayments] = useState<PaymentItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchPayments();
  }, []);

  const fetchPayments = async () => {
    const { data } = await (supabase as any)
      .from("payments")
      .select("*, profiles:user_id(email, full_name)")
      .order("created_at", { ascending: false });

    if (data && data.length > 0) {
      setPayments(data as PaymentItem[]);
    } else {
      setPayments(SEED_PAYMENTS as unknown as PaymentItem[]);
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

  const filteredPayments = payments.filter((p) =>
    (p.profiles?.email || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.gateway_transaction_id || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.payment_type.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalSuccessAmount = payments
    .filter((p) => p.status === "success")
    .reduce((sum, p) => sum + (p.amount || 0), 0);

  return (
    <OperationsPage>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold">Payments Audit & Management</h1>
          <p className="text-muted-foreground">Track college subscriptions, mentor bookings, and ticket transactions</p>
        </div>
        <div className="flex items-center gap-3 bg-muted/60 px-4 py-2 rounded-xl border">
          <DollarSign className="w-5 h-5 text-green-600" />
          <div>
            <p className="text-xs text-muted-foreground font-semibold">Total Revenue Collected</p>
            <p className="text-base font-bold text-slate-900">NPR {totalSuccessAmount.toLocaleString()}</p>
          </div>
        </div>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search by transaction ID, email, or type..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User / Customer</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Gateway ID</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredPayments.map((payment) => (
              <TableRow key={payment.id}>
                <TableCell>
                  <div>
                    <p className="font-medium">{payment.profiles?.full_name || "User"}</p>
                    <p className="text-xs text-muted-foreground font-mono">{payment.profiles?.email || payment.user_id}</p>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="capitalize">{payment.payment_type.replace(/_/g, " ")}</Badge>
                </TableCell>
                <TableCell className="font-bold">
                  {payment.currency} {payment.amount}
                </TableCell>
                <TableCell>
                  <span className="text-xs font-mono text-muted-foreground">
                    {payment.gateway_transaction_id || payment.gateway || "Direct"}
                  </span>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {new Date(payment.created_at).toLocaleString()}
                </TableCell>
                <TableCell>
                  <Badge
                    variant={
                      payment.status === "success"
                        ? "default"
                        : payment.status === "pending"
                        ? "secondary"
                        : "destructive"
                    }
                  >
                    {payment.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Select value={payment.status} onValueChange={(val) => updatePaymentStatus(payment.id, val)}>
                    <SelectTrigger className="w-[110px] h-8 text-xs ml-auto">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="success">Success</SelectItem>
                      <SelectItem value="failed">Failed</SelectItem>
                      <SelectItem value="refunded">Refunded</SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>
              </TableRow>
            ))}
            {filteredPayments.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  {isLoading ? "Loading payments..." : "No payments found."}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </OperationsPage>
  );
}
