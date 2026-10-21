import { isNeonClientRuntime } from "@/lib/backend-selection";
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Calendar, Loader2, Gift, Ban } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { OperationsPage } from "./OperationsUI";
import { loadAdminProfiles } from "@/lib/admin/profile-hydration";
import { neonBillingRequest } from "@/lib/admin/neon-billing-client";

interface SubscriptionItem {
  id: string;
  user_id: string;
  package_id: string;
  entity_type: string;
  entity_id: string | null;
  start_date: string;
  expiry_date: string;
  status: string;
  payment_status: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
  packages?: {
    name: string;
    code: string;
    package_kind: "free" | "paid" | "complimentary";
    is_default_free: boolean;
    module_scope: string[];
  };
  profiles?: { email: string | null; full_name: string | null };
}

const FREE_TIER_MODULES = [
  { value: "student", label: "Student" },
  { value: "college", label: "College" },
  { value: "mentor", label: "Mentor" },
  { value: "jobs", label: "Jobs" },
  { value: "events", label: "Events" },
  { value: "partnered_courses", label: "Partnered courses" },
] as const;

type FreeTierAction = "grant" | "revoke";

const createEmptyFreeTierForm = () => ({
  user_id: "",
  entity_type: "user",
  entity_id: "",
  module: "student",
  reason: "",
});

export default function AdminSubscriptions() {
  const staging = isNeonClientRuntime();
  const { toast } = useToast();
  const [subscriptions, setSubscriptions] = useState<SubscriptionItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const serverSearch = staging ? searchQuery : "";
  const [isLoading, setIsLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [isFreeTierDialogOpen, setIsFreeTierDialogOpen] = useState(false);
  const [freeTierAction, setFreeTierAction] = useState<FreeTierAction>("grant");
  const [isFreeTierSubmitting, setIsFreeTierSubmitting] = useState(false);
  const [freeTierForm, setFreeTierForm] = useState(createEmptyFreeTierForm);

  const fetchSubscriptions = useCallback(async (offset = 0) => {
    setIsLoading(true);
    if (staging) {
      try {
        const params = new URLSearchParams({ offset: String(offset), search: serverSearch });
        const result = await neonBillingRequest<{ subscriptions: SubscriptionItem[]; total: number; hasMore: boolean }>(
          `/api/v1/neon-staging/admin/subscriptions?${params}`);
        setSubscriptions(previous => offset ? [...previous, ...result.subscriptions] : result.subscriptions);
        setTotal(result.total);
        setHasMore(result.hasMore);
      } catch (error) {
        toast({ variant: "destructive", title: "Unable to load subscriptions", description: error instanceof Error ? error.message : "Subscription lookup failed." });
      } finally { setIsLoading(false); }
      return;
    }
    const { data, error } = await (supabase as any)
      .from("subscriptions")
      .select("*, packages(name, code, package_kind, is_default_free, module_scope)")
      .order("created_at", { ascending: false });

    if (error) {
      toast({ variant: "destructive", title: "Unable to load subscriptions", description: error.message });
      setSubscriptions([]);
      setIsLoading(false);
      return;
    }
    try {
      const profiles = await loadAdminProfiles((data || []).map((subscription: SubscriptionItem) => subscription.user_id));
      setSubscriptions((data || []).map((subscription: SubscriptionItem) => ({ ...subscription, profiles: profiles.get(subscription.user_id) })) as SubscriptionItem[]);
    } catch (profileError) {
      toast({ variant: "destructive", title: "Unable to load subscription profiles", description: profileError instanceof Error ? profileError.message : "Profile lookup failed." });
      setSubscriptions((data || []) as SubscriptionItem[]);
    }
    setIsLoading(false);
  }, [staging, serverSearch, toast]);

  useEffect(() => {
    const timer = setTimeout(() => void fetchSubscriptions(), staging ? 250 : 0);
    return () => clearTimeout(timer);
  }, [fetchSubscriptions, staging]);

  const openFreeTierDialog = (action: FreeTierAction, subscription?: SubscriptionItem) => {
    const metadataModule = typeof subscription?.metadata?.module === "string"
      ? subscription.metadata.module
      : "";
    const onlyScopedModule = subscription?.packages?.module_scope?.length === 1
      ? subscription.packages.module_scope[0]
      : "";

    setFreeTierAction(action);
    setFreeTierForm(subscription ? {
      user_id: subscription.user_id,
      entity_type: subscription.entity_type,
      entity_id: subscription.entity_id || "",
      module: metadataModule || onlyScopedModule,
      reason: "",
    } : createEmptyFreeTierForm());
    setIsFreeTierDialogOpen(true);
  };

  const handleFreeTierAction = async () => {
    const userId = freeTierForm.user_id.trim();
    const entityId = freeTierForm.entity_id.trim() || null;
    if (!userId || !freeTierForm.entity_type || !freeTierForm.module) {
      toast({ variant: "destructive", title: "User, entity type and module are required" });
      return;
    }
    if (freeTierForm.entity_type !== "user" && !entityId) {
      toast({
        variant: "destructive",
        title: "Entity UUID is required",
        description: "Only account-scoped user access may leave the entity UUID blank.",
      });
      return;
    }

    setIsFreeTierSubmitting(true);
    if (staging) {
      try {
        const result = await neonBillingRequest<{ package_code?: string; revoked_count?: number }>(
          "/api/v1/neon-staging/admin/subscriptions", { method: freeTierAction === "grant" ? "POST" : "DELETE",
            body: JSON.stringify({ userId, module: freeTierForm.module, entityType: freeTierForm.entity_type,
              entityId, reason: freeTierForm.reason.trim() }) });
        toast({ title: freeTierAction === "grant" ? "Free tier granted" : "Free tier revoked",
          description: freeTierAction === "grant" ? `Provisioned ${result.package_code || "the matching default package"}.`
            : `${result.revoked_count ?? 0} active subscription(s) revoked.` });
        setIsFreeTierDialogOpen(false);
        setFreeTierForm(createEmptyFreeTierForm());
        await fetchSubscriptions();
      } catch (error) {
        toast({ variant: "destructive", title: freeTierAction === "grant" ? "Free-tier grant failed" : "Free-tier revoke failed",
          description: error instanceof Error ? error.message : "Subscription update failed." });
      } finally { setIsFreeTierSubmitting(false); }
      return;
    }
    const rpcName = freeTierAction === "grant"
      ? "admin_provision_default_free_tier"
      : "admin_revoke_default_free_tier";
    const args: Record<string, string | null> = {
      p_user_id: userId,
      p_entity_type: freeTierForm.entity_type,
      p_entity_id: entityId,
      p_module: freeTierForm.module,
    };
    if (freeTierAction === "revoke") args.p_reason = freeTierForm.reason.trim() || null;

    const { data, error } = await (supabase as any).rpc(rpcName, args);
    if (error) {
      toast({
        variant: "destructive",
        title: freeTierAction === "grant" ? "Free-tier grant failed" : "Free-tier revoke failed",
        description: error.message,
      });
    } else {
      const result = data as { package_code?: string; revoked_count?: number } | null;
      toast({
        title: freeTierAction === "grant" ? "Free tier granted" : "Free tier revoked",
        description: freeTierAction === "grant"
          ? `Provisioned ${result?.package_code || "the matching default package"}.`
          : `${result?.revoked_count ?? 0} active subscription(s) revoked.`,
      });
      setIsFreeTierDialogOpen(false);
      setFreeTierForm(createEmptyFreeTierForm());
      await fetchSubscriptions();
    }
    setIsFreeTierSubmitting(false);
  };

  const filteredSubscriptions = staging ? subscriptions : subscriptions.filter((s) =>
    (s.profiles?.email || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
    (s.packages?.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.user_id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <OperationsPage>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold">Subscriptions Management</h1>
          <p className="text-muted-foreground">Monitor paid access and audited default free tiers</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => openFreeTierDialog("grant")}>
            <Gift className="w-4 h-4 mr-2" />
            Grant free tier
          </Button>
          <Button variant="outline" onClick={() => openFreeTierDialog("revoke")}>
            <Ban className="w-4 h-4 mr-2" />
            Revoke free tier
          </Button>
          <Dialog open={isFreeTierDialogOpen} onOpenChange={(open) => {
            setIsFreeTierDialogOpen(open);
            if (!open) setFreeTierForm(createEmptyFreeTierForm());
          }}>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>{freeTierAction === "grant" ? "Grant default free tier" : "Revoke default free tier"}</DialogTitle>
                <DialogDescription>
                  This audited action validates the account role, entity ownership and matching default package.
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label>User UUID *</Label>
                  <Input
                    placeholder="00000000-0000-0000-0000-000000000000"
                    value={freeTierForm.user_id}
                    onChange={(e) => setFreeTierForm({ ...freeTierForm, user_id: e.target.value })}
                  />
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Entity Type *</Label>
                    <Select
                      value={freeTierForm.entity_type}
                      onValueChange={(value) => setFreeTierForm({ ...freeTierForm, entity_type: value })}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="user">User account</SelectItem>
                        <SelectItem value="college">College</SelectItem>
                        <SelectItem value="mentor">Mentor</SelectItem>
                        <SelectItem value="company">Company</SelectItem>
                        <SelectItem value="organizer">Event organizer</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Module *</Label>
                    <Select
                      value={freeTierForm.module}
                      onValueChange={(value) => setFreeTierForm({ ...freeTierForm, module: value })}
                    >
                      <SelectTrigger><SelectValue placeholder="Choose module" /></SelectTrigger>
                      <SelectContent>
                        {FREE_TIER_MODULES.map((module) => (
                          <SelectItem key={module.value} value={module.value}>{module.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Entity UUID</Label>
                  <Input
                    placeholder="Leave blank only for account-scoped user access"
                    value={freeTierForm.entity_id}
                    onChange={(e) => setFreeTierForm({ ...freeTierForm, entity_id: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">
                    Colleges, mentors, companies and organizer events require their approved entity UUID.
                  </p>
                </div>
                {freeTierAction === "revoke" && (
                  <div className="space-y-2">
                    <Label>Revocation reason</Label>
                    <Input
                      placeholder="Optional audit note"
                      value={freeTierForm.reason}
                      onChange={(e) => setFreeTierForm({ ...freeTierForm, reason: e.target.value })}
                    />
                  </div>
                )}
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setIsFreeTierDialogOpen(false)}>Cancel</Button>
                <Button
                  variant={freeTierAction === "grant" ? "hero" : "destructive"}
                  onClick={handleFreeTierAction}
                  disabled={isFreeTierSubmitting}
                >
                  {isFreeTierSubmitting && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                  {freeTierAction === "grant" ? "Grant free tier" : "Revoke free tier"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

        </div>
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
              <TableHead className="text-right">Reconciliation</TableHead>
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
                  <div className="flex flex-wrap gap-1">
                    <Badge variant="outline">{sub.packages?.name || "Package"}</Badge>
                    {sub.packages?.is_default_free && <Badge variant="secondary">Default free</Badge>}
                  </div>
                </TableCell>
                <TableCell>
                  <p className="capitalize">{sub.entity_type}</p>
                  {sub.entity_id && (
                    <p className="max-w-[150px] truncate text-xs text-muted-foreground font-mono" title={sub.entity_id}>
                      {sub.entity_id}
                    </p>
                  )}
                </TableCell>
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
                  {sub.packages?.is_default_free && ["active", "trialing"].includes(sub.status) ? (
                    <Button variant="outline" size="sm" onClick={() => openFreeTierDialog("revoke", sub)}>
                      <Ban className="w-3.5 h-3.5 mr-1.5" />
                      Revoke free
                    </Button>
                  ) : (
                    <span className="text-xs text-muted-foreground">Provider/admin reconciliation required</span>
                  )}
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
      {staging && <div className="flex items-center justify-between gap-3 text-sm text-muted-foreground">
        <span>{subscriptions.length} of {total} subscriptions</span>
        {hasMore && <Button variant="outline" disabled={isLoading} onClick={() => void fetchSubscriptions(subscriptions.length)}>
          {isLoading ? "Loading…" : "Load more"}
        </Button>}
      </div>}
    </OperationsPage>
  );
}
