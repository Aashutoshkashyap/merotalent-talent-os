import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
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

interface PackageItem {
  id: string;
  code: string;
  name: string;
  description: string | null;
  audience: string | null;
  price: number;
  currency: string;
  billing_interval: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
}

export default function AdminPackages() {
  const { toast } = useToast();
  const [packages, setPackages] = useState<PackageItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingPackage, setEditingPackage] = useState<PackageItem | null>(null);

  const [formData, setFormData] = useState({
    code: "",
    name: "",
    description: "",
    audience: "institution",
    price: "0",
    billing_interval: "month",
    is_active: true,
  });

  useEffect(() => {
    fetchPackages();
  }, []);

  const fetchPackages = async () => {
    const { data } = await (supabase as any)
      .from("packages")
      .select("*")
      .order("sort_order", { ascending: true });

    if (data) setPackages(data as PackageItem[]);
    setIsLoading(false);
  };

  const handleSubmit = async () => {
    if (!formData.code.trim() || !formData.name.trim()) {
      toast({ variant: "destructive", title: "Code and name are required" });
      return;
    }

    setIsSubmitting(true);

    const payload = {
      code: formData.code.toLowerCase().trim(),
      name: formData.name.trim(),
      description: formData.description || null,
      audience: formData.audience,
      price: parseFloat(formData.price || "0"),
      currency: "NPR",
      billing_interval: formData.billing_interval,
      is_active: formData.is_active,
    };

    let error;
    if (editingPackage) {
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
      audience: pkg.audience || "institution",
      price: pkg.price ? pkg.price.toString() : "0",
      billing_interval: pkg.billing_interval || "month",
      is_active: pkg.is_active ?? true,
    });
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      code: "",
      name: "",
      description: "",
      audience: "institution",
      price: "0",
      billing_interval: "month",
      is_active: true,
    });
    setEditingPackage(null);
    setIsDialogOpen(false);
  };

  const filteredPackages = packages.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <OperationsPage>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold">Subscription Packages</h1>
          <p className="text-muted-foreground">Configure college & mentor subscription plans</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => { if (!open) resetForm(); else setIsDialogOpen(open); }}>
          <DialogTrigger asChild>
            <Button variant="hero">
              <Plus className="w-4 h-4 mr-2" />
              Add Package
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{editingPackage ? "Edit Package" : "Create Subscription Package"}</DialogTitle>
              <DialogDescription>Set up pricing and features</DialogDescription>
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
                    </SelectContent>
                  </Select>
                </div>
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
              </div>

              <div className="space-y-2">
                <Label>Price (NPR)</Label>
                <Input
                  type="number"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <Switch
                  checked={formData.is_active}
                  onCheckedChange={(v) => setFormData({ ...formData, is_active: v })}
                />
                <Label>Active Package</Label>
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
              <TableHead>Billing</TableHead>
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
                <TableCell className="capitalize">{pkg.billing_interval}</TableCell>
                <TableCell className="font-semibold">NPR {pkg.price}</TableCell>
                <TableCell>
                  <Badge variant={pkg.is_active ? "default" : "secondary"}>
                    {pkg.is_active ? "Active" : "Disabled"}
                  </Badge>
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
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
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
