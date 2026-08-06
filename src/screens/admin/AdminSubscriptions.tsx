import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Search, ShieldCheck, Calendar, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { OperationsPage } from "./OperationsUI";

interface SubscriptionItem {
  id: string;
  user_id: string;
  package_id: string;
  entity_type: string;
  start_date: string;
  expiry_date: string;
  status: string;
  payment_status: string;
  created_at: string;
  packages?: { name: string; code: string };
  profiles?: { email: string; full_name: string };
}

export default function AdminSubscriptions() {
  const { toast } = useToast();
  const [subscriptions, setSubscriptions] = useState<SubscriptionItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [packages, setPackages] = useState<{ id: string; name: string }[]>([]);
  const [formData, setFormData] = useState({
    user_id: "",
    package_id: "",
    entity_type: "college",
    duration_months: "12",
  });

  useEffect(() => {
    fetchSubscriptions();
    fetchPackages();
  }, []);

  const fetchSubscriptions = async () => {
    const { data } = await (supabase as any)
      .from("subscriptions")
      .select("*, packages(name, code), profiles:user_id(email, full_name)")
      .order("created_at", { ascending: false });

    if (data) setSubscriptions(data as SubscriptionItem[]);
    setIsLoading(false);
  };

  const fetchPackages = async () => {
    const { data } = await (supabase as any).from("packages").select("id, name").eq("is_active", true);
    if (data) setPackages(data as any);
  };

  const handleGrantSubscription = async () => {
    if (!formData.user_id.trim() || !formData.package_id) {
      toast({ variant: "destructive", title: "User ID and Package are required" });
      return;
    }

    setIsSubmitting(true);

    const startDate = new Date();
    const expiryDate = new Date();
    expiryDate.setMonth(expiryDate.getMonth() + parseInt(formData.duration_months, 10));

    const payload = {
      user_id: formData.user_id.trim(),
      package_id: formData.package_id,
      entity_type: formData.entity_type,
      start_date: startDate.toISOString(),
      expiry_date: expiryDate.toISOString(),
      status: "active",
      payment_status: "success",
    };

    const { error } = await (supabase as any).from("subscriptions").insert(payload);

    if (error) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } else {
      toast({ title: "Subscription granted successfully" });
      setIsDialogOpen(false);
      fetchSubscriptions();
    }
    setIsSubmitting(false);
  };

  const updateStatus = async (id: string, newStatus: string) => {
    const { error } = await (supabase as any).from("subscriptions").update({ status: newStatus }).eq("id", id);
    if (!error) {
      toast({ title: `Subscription status set to ${newStatus}` });
      fetchSubscriptions();
    }
  };

  const filteredSubscriptions = subscriptions.filter((s) =>
    (s.profiles?.email || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
    (s.packages?.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.user_id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <OperationsPage>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold">Subscriptions Management</h1>
          <p className="text-muted-foreground">Monitor active subscriptions and grant access</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="hero">
              <Plus className="w-4 h-4 mr-2" />
              Grant Subscription
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Grant Subscription</DialogTitle>
              <DialogDescription>Manually assign an active subscription package</DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label>User UUID *</Label>
                <Input
                  placeholder="e.g. 00000000-0000-0000-0000-000000000000"
                  value={formData.user_id}
                  onChange={(e) => setFormData({ ...formData, user_id: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>Select Package *</Label>
                <Select value={formData.package_id} onValueChange={(v) => setFormData({ ...formData, package_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Choose Package" /></SelectTrigger>
                  <SelectContent>
                    {packages.map((pkg) => (
                      <SelectItem key={pkg.id} value={pkg.id}>{pkg.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Entity Type</Label>
                  <Select value={formData.entity_type} onValueChange={(v) => setFormData({ ...formData, entity_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="college">College / Institution</SelectItem>
                      <SelectItem value="mentor">Mentor</SelectItem>
                      <SelectItem value="company">Company</SelectItem>
                      <SelectItem value="user">User</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Duration (Months)</Label>
                  <Select value={formData.duration_months} onValueChange={(v) => setFormData({ ...formData, duration_months: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 Month</SelectItem>
                      <SelectItem value="3">3 Months</SelectItem>
                      <SelectItem value="6">6 Months</SelectItem>
                      <SelectItem value="12">12 Months</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
              <Button variant="hero" onClick={handleGrantSubscription} disabled={isSubmitting}>
                {isSubmitting ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Granting...</> : "Grant Access"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search by email or package..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User / Profile</TableHead>
              <TableHead>Package</TableHead>
              <TableHead>Entity</TableHead>
              <TableHead>Expiry Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredSubscriptions.map((sub) => (
              <TableRow key={sub.id}>
                <TableCell>
                  <div>
                    <p className="font-medium">{sub.profiles?.full_name || "User"}</p>
                    <p className="text-xs text-muted-foreground font-mono">{sub.profiles?.email || sub.user_id}</p>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{sub.packages?.name || "Package"}</Badge>
                </TableCell>
                <TableCell className="capitalize">{sub.entity_type}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Calendar className="w-3.5 h-3.5" />
                    {new Date(sub.expiry_date).toLocaleDateString()}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={sub.status === "active" ? "default" : "secondary"}>
                    {sub.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Select value={sub.status} onValueChange={(val) => updateStatus(sub.id, val)}>
                    <SelectTrigger className="w-[110px] h-8 text-xs ml-auto">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="past_due">Past Due</SelectItem>
                      <SelectItem value="expired">Expired</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>
              </TableRow>
            ))}
            {filteredSubscriptions.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  {isLoading ? "Loading..." : "No subscriptions found."}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </OperationsPage>
  );
}
