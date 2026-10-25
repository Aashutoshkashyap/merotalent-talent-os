import { isNeonClientRuntime } from "@/lib/backend-selection";
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { createAdminResource, deleteAdminResource, listAllAdminResource, updateAdminResource } from "@/lib/admin/admin-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Search, Pencil, Trash2, Loader2, Package as PackageIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { OperationsPage } from "./OperationsUI";
import { accessValidityLabel } from "@/lib/payments/access-plans";
import { paymentErrorMessage } from "@/lib/payments/browser-checkout";

interface PackageItem {
  id: string;
  code: string;
  name: string;
  description: string | null;
  audience: string | null;
  price: number;
  currency: string;
  billing_interval: string;
  features: Record<string, unknown> | null;
  lead_access_mode: "none" | "read_only" | "full";
  is_active: boolean;
  sort_order: number;
  package_kind: "free" | "paid" | "complimentary";
  module_scope: string[];
  is_default_free: boolean;
  duration_days: number | null;
  is_publicly_selectable: boolean;
  created_at: string;
}

const MODULE_OPTIONS = [
  { value: "student", label: "Student" },
  { value: "college", label: "College" },
  { value: "mentor", label: "Mentor" },
  { value: "jobs", label: "Jobs" },
  { value: "events", label: "Events" },
  { value: "partnered_courses", label: "Partnered courses" },
] as const;

const FEATURE_OPTIONS = [
  { value: "application_submit", label: "Submit applications" },
  { value: "college_applications", label: "College application leads" },
  { value: "mentor_bookings", label: "Mentor booking leads" },
  { value: "job_applications", label: "Job application leads" },
  { value: "event_registrations", label: "Event registration leads" },
  { value: "partnered_course_referrals", label: "Course referrals" },
  { value: "partnered_courses", label: "Partner course operations" },
] as const;

interface PackageFormData {
  code: string;
  name: string;
  description: string;
  audience: string;
  price: string;
  billing_interval: string;
  features: Record<string, unknown>;
  lead_access_mode: "none" | "read_only" | "full";
  is_active: boolean;
  package_kind: "free" | "paid" | "complimentary";
  module_scope: string[];
  is_default_free: boolean;
  duration_days: string;
  is_publicly_selectable: boolean;
}

const createEmptyForm = (): PackageFormData => ({
  code: "",
  name: "",
  description: "",
  audience: "institution",
  price: "0",
  billing_interval: "month",
  features: {},
  lead_access_mode: "full",
  is_active: true,
  package_kind: "paid",
  module_scope: [],
  is_default_free: false,
  duration_days: "",
  is_publicly_selectable: true,
});

export default function AdminPackages() {
  const { toast } = useToast();
  const [packages, setPackages] = useState<PackageItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingPackage, setEditingPackage] = useState<PackageItem | null>(null);
  const [configuringOffers, setConfiguringOffers] = useState(false);

  const [formData, setFormData] = useState<PackageFormData>(createEmptyForm);

  const fetchPackages = useCallback(async () => {
    if (isNeonClientRuntime()) {
      try {setPackages(await listAllAdminResource<PackageItem>("packages",{sort_by:"sort_order",sort_direction:"asc"}));}
      catch(error) {toast({variant:"destructive",title:"Unable to load packages",description:error instanceof Error ? error.message : "Try again shortly."});}
      finally {setIsLoading(false);}
      return;
    }
    const { data } = await (supabase as any)
      .from("packages")
      .select("*")
      .order("sort_order", { ascending: true });

    if (data) setPackages(data as PackageItem[]);
    setIsLoading(false);
  },[toast]);

  useEffect(()=>{void fetchPackages();},[fetchPackages]);

  const configureTestOffers = async () => {
    setConfiguringOffers(true);
    try {
      const response = await fetch("/api/v1/admin/temporary-access-offers", { method: "POST", credentials: "same-origin" });
      const payload = await response.json();
      if (!response.ok) throw new Error(paymentErrorMessage(payload, "Could not configure test offers."));
      toast({ title: "Temporary offers configured", description: `${payload.data.created} offers added. Existing plans and history were preserved. NPR 10 per module, 24 hours; approval still required.` });
      await fetchPackages();
    } catch (error) { toast({ variant: "destructive", title: "Configuration failed", description: error instanceof Error ? error.message : "Try again." }); }
    finally { setConfiguringOffers(false); }
  };

  const handleSubmit = async () => {
    if (!formData.code.trim() || !formData.name.trim()) {
      toast({ variant: "destructive", title: "Code and name are required" });
      return;
    }

    const price = Number(formData.price);
    const durationDays = formData.duration_days === "" ? null : Number(formData.duration_days);
    if (!Number.isFinite(price) || price < 0) {
      toast({ variant: "destructive", title: "Enter a valid non-negative price" });
      return;
    }
    if (durationDays !== null && (!Number.isInteger(durationDays) || durationDays < 1 || durationDays > 3650)) {
      toast({ variant: "destructive", title: "Duration must be between 1 and 3650 days" });
      return;
    }
    if (
      formData.is_default_free &&
      (formData.package_kind !== "free" || price !== 0 || durationDays === null ||
        formData.module_scope.length === 0 || formData.is_publicly_selectable)
    ) {
      toast({
        variant: "destructive",
        title: "Default free package is incomplete",
        description: "Use the Free kind, NPR 0, a duration and module, and keep it hidden from public selection.",
      });
      return;
    }

    setIsSubmitting(true);

    const moduleOrder = new Map(MODULE_OPTIONS.map((module, index) => [module.value, index]));

    const payload = {
      code: formData.code.toLowerCase().trim(),
      name: formData.name.trim(),
      description: formData.description || null,
      audience: formData.audience === "all" ? null : formData.audience,
      price,
      currency: "NPR",
      billing_interval: formData.billing_interval,
      features: formData.features,
      lead_access_mode: formData.lead_access_mode,
      is_active: formData.is_active,
      package_kind: formData.package_kind,
      module_scope: [...formData.module_scope].sort(
        (a, b) => (moduleOrder.get(a as typeof MODULE_OPTIONS[number]["value"]) ?? 0) -
          (moduleOrder.get(b as typeof MODULE_OPTIONS[number]["value"]) ?? 0),
      ),
      is_default_free: formData.is_default_free,
      duration_days: durationDays,
      is_publicly_selectable: formData.is_publicly_selectable,
    };

    let error;
    if (isNeonClientRuntime()) {
      try {if(editingPackage) await updateAdminResource("packages",editingPackage.id,payload); else await createAdminResource("packages",payload);}
      catch(cause) {error=cause instanceof Error ? cause : new Error("Unable to save package.");}
    } else if (editingPackage) {
      const res = await (supabase as any).from("packages").update(payload).eq("id", editingPackage.id);
      error = res.error;
    } else {
      const res = await (supabase as any).from("packages").insert(payload);
      error = res.error;
    }

    if (error) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } else {
      toast({ title: editingPackage ? "Package updated" : "Package created" });
      resetForm();
      fetchPackages();
    }
    setIsSubmitting(false);
  };

  const handleDelete = async (id: string) => {
    if (isNeonClientRuntime()) {
      try {await deleteAdminResource("packages",id);toast({title:"Package deleted"});void fetchPackages();}
      catch(error) {toast({variant:"destructive",title:"Unable to delete package",description:error instanceof Error ? error.message : "Try again shortly."});}
      return;
    }
    const { error } = await (supabase as any).from("packages").delete().eq("id", id);
    if (error) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } else {
      toast({ title: "Package deleted" });
      fetchPackages();
    }
  };

  const openEdit = (pkg: PackageItem) => {
    setEditingPackage(pkg);
    setFormData({
      code: pkg.code,
      name: pkg.name,
      description: pkg.description || "",
      audience: pkg.audience || "all",
      price: pkg.price ? pkg.price.toString() : "0",
      billing_interval: pkg.billing_interval || "month",
      features: pkg.features && typeof pkg.features === "object" ? { ...pkg.features } : {},
      lead_access_mode: pkg.lead_access_mode || "full",
      is_active: pkg.is_active ?? true,
      package_kind: pkg.package_kind || "paid",
      module_scope: Array.isArray(pkg.module_scope) ? pkg.module_scope : [],
      is_default_free: pkg.is_default_free ?? false,
      duration_days: pkg.duration_days?.toString() || "",
      is_publicly_selectable: pkg.is_publicly_selectable ?? true,
    });
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setFormData(createEmptyForm());
    setEditingPackage(null);
    setIsDialogOpen(false);
  };

  const filteredPackages = packages.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleModule = (module: string, enabled: boolean) => {
    setFormData((current) => ({
      ...current,
      module_scope: enabled
        ? [...new Set([...current.module_scope, module])]
        : current.module_scope.filter((item) => item !== module),
    }));
  };

  const toggleFeature = (feature: string, enabled: boolean) => {
    setFormData((current) => ({
      ...current,
      features: { ...current.features, [feature]: enabled },
    }));
  };

  return (
    <OperationsPage>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold">Subscription Packages</h1>
          <p className="text-muted-foreground">Configure module access plans. Payment never replaces Super Admin approval.</p>
          {isNeonClientRuntime() && <Button className="mt-3" variant="outline" disabled={configuringOffers} onClick={() => void configureTestOffers()}>
            {configuringOffers ? "Configuring…" : "Add temporary NPR 10 / 24-hour offers"}
          </Button>}
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => { if (!open) resetForm(); else setIsDialogOpen(open); }}>
          <DialogTrigger asChild>
            <Button variant="hero">
              <Plus className="w-4 h-4 mr-2" />
              Add Package
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingPackage ? "Edit Package" : "Create Subscription Package"}</DialogTitle>
              <DialogDescription>Configure pricing, module scope, entitlement behavior and visibility.</DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Code Identifier *</Label>
                  <Input
                    placeholder="e.g. college_pro"
                    value={formData.code}
                    disabled={!!editingPackage}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Package Name *</Label>
                  <Input
                    placeholder="e.g. College Pro Plan"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  placeholder="Plan description..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={2}
                />
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Audience Role</Label>
                  <Select value={formData.audience} onValueChange={(v) => setFormData({ ...formData, audience: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="institution">Colleges (Institution)</SelectItem>
                      <SelectItem value="mentor">Mentors</SelectItem>
                      <SelectItem value="company">Companies / Employers</SelectItem>
                      <SelectItem value="talent">Students / Talent</SelectItem>
                      <SelectItem value="all">Any matching role</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Package Kind</Label>
                  <Select
                    value={formData.package_kind}
                    onValueChange={(v: PackageFormData["package_kind"]) => setFormData({
                      ...formData,
                      package_kind: v,
                      is_default_free: v === "free" ? formData.is_default_free : false,
                    })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="free">Free</SelectItem>
                      <SelectItem value="paid">Paid</SelectItem>
                      <SelectItem value="complimentary">Complimentary</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Billing Cycle</Label>
                  <Select value={formData.billing_interval} onValueChange={(v) => setFormData({ ...formData, billing_interval: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="month">Monthly</SelectItem>
                      <SelectItem value="quarter">Quarterly</SelectItem>
                      <SelectItem value="year">Yearly</SelectItem>
                      <SelectItem value="one_time">One Time</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Lead Access</Label>
                  <Select
                    value={formData.lead_access_mode}
                    onValueChange={(v: PackageFormData["lead_access_mode"]) => setFormData({ ...formData, lead_access_mode: v })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      <SelectItem value="read_only">Read only</SelectItem>
                      <SelectItem value="full">Full access</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Price (NPR)</Label>
                  <Input
                    type="number"
                    min="0"
                    value={formData.price}
                    disabled={formData.is_default_free}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Duration (Days)</Label>
                  <Input
                    type="number"
                    min="1"
                    max="3650"
                    placeholder="Optional; required for default free"
                    value={formData.duration_days}
                    onChange={(e) => setFormData({ ...formData, duration_days: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Module Scope</Label>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2 rounded-lg border p-3">
                  {MODULE_OPTIONS.map((module) => (
                    <label key={module.value} className="flex items-center gap-2 text-sm cursor-pointer">
                      <Switch
                        checked={formData.module_scope.includes(module.value)}
                        onCheckedChange={(checked) => toggleModule(module.value, checked)}
                      />
                      {module.label}
                    </label>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Basic Features</Label>
                <div className="grid sm:grid-cols-2 gap-2 rounded-lg border p-3">
                  {FEATURE_OPTIONS.map((feature) => (
                    <label key={feature.value} className="flex items-center gap-2 text-sm cursor-pointer">
                      <Switch
                        checked={formData.features[feature.value] === true}
                        onCheckedChange={(checked) => toggleFeature(feature.value, checked)}
                      />
                      {feature.label}
                    </label>
                  ))}
                </div>
              </div>

              <div className="grid sm:grid-cols-3 gap-3 pt-2">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <Switch
                    checked={formData.is_active}
                    onCheckedChange={(v) => setFormData({ ...formData, is_active: v })}
                  />
                  Active package
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <Switch
                    checked={formData.is_publicly_selectable}
                    disabled={formData.is_default_free}
                    onCheckedChange={(v) => setFormData({ ...formData, is_publicly_selectable: v })}
                  />
                  Publicly selectable
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <Switch
                    checked={formData.is_default_free}
                    onCheckedChange={(v) => setFormData({
                      ...formData,
                      is_default_free: v,
                      package_kind: v ? "free" : formData.package_kind,
                      price: v ? "0" : formData.price,
                      is_publicly_selectable: v ? false : formData.is_publicly_selectable,
                    })}
                  />
                  Default free tier
                </label>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={resetForm}>Cancel</Button>
              <Button variant="hero" onClick={handleSubmit} disabled={isSubmitting}>
                {isSubmitting ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Saving...</> : (editingPackage ? "Update" : "Create")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search packages..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Code & Name</TableHead>
              <TableHead>Audience</TableHead>
              <TableHead>Kind & Scope</TableHead>
              <TableHead>Access</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredPackages.map((pkg) => (
              <TableRow key={pkg.id}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <PackageIcon className="w-4 h-4 text-primary" />
                    <div>
                      <p className="font-semibold">{pkg.name}</p>
                      <p className="text-xs text-muted-foreground font-mono">{pkg.code}</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="capitalize">{pkg.audience || "all"}</TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    <Badge variant={pkg.package_kind === "paid" ? "outline" : "secondary"} className="capitalize">
                      {pkg.package_kind}
                    </Badge>
                    {pkg.is_default_free && <Badge>Default</Badge>}
                  </div>
                  <p className="mt-1 max-w-[220px] text-xs text-muted-foreground">
                    {pkg.module_scope?.length ? pkg.module_scope.join(", ").replaceAll("_", " ") : "No module scope"}
                  </p>
                </TableCell>
                <TableCell>
                  <p className="capitalize">{pkg.lead_access_mode.replaceAll("_", " ")}</p>
                  <p className="text-xs text-muted-foreground">
                    {pkg.duration_days ? accessValidityLabel(pkg.duration_days) : pkg.billing_interval.replaceAll("_", " ")}
                  </p>
                </TableCell>
                <TableCell className="font-semibold">NPR {pkg.price}</TableCell>
                <TableCell>
                  <div className="flex flex-col items-start gap-1">
                    <Badge variant={pkg.is_active ? "default" : "secondary"}>
                      {pkg.is_active ? "Active" : "Disabled"}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {pkg.is_publicly_selectable ? "Public" : "Internal"}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(pkg)}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDelete(pkg.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {filteredPackages.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  {isLoading ? "Loading..." : "No packages found."}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </OperationsPage>
  );
}
