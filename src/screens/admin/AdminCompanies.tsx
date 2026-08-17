import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  Search, 
  Building2, 
  MapPin, 
  Users, 
  CheckCircle, 
  XCircle,
  Eye,
  Pencil,
  Trash2,
  Plus,
  Globe,
  Loader2,
  Sparkles
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { OperationsPage } from "./OperationsUI";
import { generateCompanyDetails } from "@/lib/ai/ai-generator";
import { SignedMediaUploader, type SignedMediaAsset } from "@/components/media/SignedMediaUploader";

interface Company {
  id: string;
  user_id: string;
  name: string;
  industry: string | null;
  description: string | null;
  logo_url: string | null;
  website: string | null;
  size: "1-10" | "11-50" | "51-200" | "201-500" | "500+" | null;
  location: string | null;
  is_verified: boolean;
  created_at: string;
}

const AdminCompanies = () => {
  const { toast } = useToast();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [availableUsers, setAvailableUsers] = useState<{ id: string; email: string; full_name: string | null }[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);

  const [formData, setFormData] = useState({
    user_id: "",
    name: "",
    industry: "",
    description: "",
    logo_url: "",
    website: "",
    size: "11-50",
    location: "",
    is_verified: false,
  });

  useEffect(() => {
    fetchCompanies();
    fetchAvailableUsers();
  }, []);

  const fetchCompanies = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from("companies")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast({ variant: "destructive", title: "Unable to load companies", description: error.message });
    }
    setCompanies((data || []) as Company[]);
    setIsLoading(false);
  };

  const fetchAvailableUsers = async () => {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, email, full_name")
      .limit(100);
    
    if (profiles) {
      setAvailableUsers(profiles.map(p => ({
        id: p.user_id,
        email: p.email || "",
        full_name: p.full_name,
      })));
    }
  };

  const handleAIGenerate = async () => {
    if (!formData.name.trim()) {
      toast({
        variant: "destructive",
        title: "Company name required",
        description: "Please type the company name first before generating with AI.",
      });
      return;
    }

    setIsAiGenerating(true);
    try {
      const aiResult = await generateCompanyDetails(formData.name, formData.industry || "Technology");
      setFormData(current => ({
        ...current,
        description: current.description || aiResult.bio,
        industry: current.industry || aiResult.industry,
      }));
      toast({
        title: "AI Generation Complete!",
        description: "Company bio and industry generated.",
      });
    } catch {
      toast({
        variant: "destructive",
        title: "AI Generation failed",
      });
    } finally {
      setIsAiGenerating(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.user_id || !formData.name.trim()) {
      toast({ variant: "destructive", title: "User selection and company name are required" });
      return;
    }

    setIsSubmitting(true);
    const payload = {
      user_id: formData.user_id,
      name: formData.name,
      industry: formData.industry || null,
      description: formData.description || null,
      logo_url: formData.logo_url || null,
      website: formData.website || null,
      size: formData.size as Company["size"],
      location: formData.location || null,
      is_verified: formData.is_verified,
    };

    let error;
    if (editingCompany) {
      const result = await supabase.from("companies").update(payload).eq("id", editingCompany.id);
      error = result.error;
    } else {
      const result = await supabase.from("companies").insert(payload);
      error = result.error;
    }

    if (error) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } else {
      toast({ title: editingCompany ? "Company updated!" : "Company added!" });
      resetForm();
      fetchCompanies();
    }
    setIsSubmitting(false);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to permanently delete this company profile?")) return;
    const { error } = await supabase.from("companies").delete().eq("id", id);
    if (error) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } else {
      toast({ title: "Company deleted" });
      fetchCompanies();
    }
  };

  const toggleVerification = async (company: Company) => {
    const { error } = await supabase
      .from("companies")
      .update({ is_verified: !company.is_verified })
      .eq("id", company.id);

    if (!error) {
      toast({ title: company.is_verified ? "Verification revoked" : "Company verified" });
      fetchCompanies();
    }
  };

  const openEdit = (company: Company) => {
    setEditingCompany(company);
    setFormData({
      user_id: company.user_id,
      name: company.name,
      industry: company.industry || "",
      description: company.description || "",
      logo_url: company.logo_url || "",
      website: company.website || "",
      size: company.size || "11-50",
      location: company.location || "",
      is_verified: company.is_verified,
    });
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      user_id: "",
      name: "",
      industry: "",
      description: "",
      logo_url: "",
      website: "",
      size: "11-50",
      location: "",
      is_verified: false,
    });
    setEditingCompany(null);
    setIsDialogOpen(false);
  };

  const filteredCompanies = companies.filter(
    (c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.industry && c.industry.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (c.location && c.location.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const stats = [
    { label: "Total Companies", value: companies.length, icon: Building2, color: "text-primary" },
    { label: "Verified Partners", value: companies.filter(c => c.is_verified).length, icon: CheckCircle, color: "text-success" },
    { label: "Corporate size 50+", value: companies.filter(c => c.size === "51-200" || c.size === "201-500" || c.size === "500+").length, icon: Users, color: "text-accent" },
  ];

  return (
    <OperationsPage>
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold">Companies Directory</h1>
          <p className="text-muted-foreground">Manage corporate partners and employer accounts</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => { if (!open) resetForm(); else setIsDialogOpen(open); }}>
          <DialogTrigger asChild>
            <Button variant="hero">
              <Plus className="w-4 h-4 mr-2" />
              Add Company Account
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingCompany ? "Edit Company" : "Add Company"}</DialogTitle>
              <DialogDescription>
                Configure company profiles for partner employers.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Associated User Profile *</Label>
                  <select
                    value={formData.user_id}
                    disabled={!!editingCompany}
                    onChange={(e) => setFormData({ ...formData, user_id: e.target.value })}
                    className="w-full rounded-xl border border-[#eadfd7] bg-[#fcfbfa] p-2.5 text-sm"
                  >
                    <option value="">-- Choose User Profile --</option>
                    {availableUsers.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.full_name || "No Name"} ({u.email})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Company Name *</Label>
                  <Input
                    placeholder="e.g. Innovate Nepal"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Industry Sector</Label>
                  <Input
                    placeholder="e.g. Technology, Finance, Education"
                    value={formData.industry}
                    onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Corporate Size</Label>
                  <Select value={formData.size} onValueChange={(v) => setFormData({ ...formData, size: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1-10">1-10 employees</SelectItem>
                      <SelectItem value="11-50">11-50 employees</SelectItem>
                      <SelectItem value="51-200">51-200 employees</SelectItem>
                      <SelectItem value="201-500">201-500 employees</SelectItem>
                      <SelectItem value="500+">500+ employees</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button
                type="button"
                variant="outline"
                className="w-full border-2 border-dashed border-[#c2410c]/30 text-[#c2410c] hover:bg-[#fff5ed]"
                onClick={handleAIGenerate}
                disabled={isAiGenerating || !formData.name}
              >
                {isAiGenerating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating bio with AI...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Generate Bio & Sector with AI
                  </>
                )}
              </Button>

              <div className="space-y-2">
                <Label>About Company Description</Label>
                <Textarea
                  placeholder="Tell job seekers about your company..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                />
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Website Domain</Label>
                  <Input
                    placeholder="e.g. https://example.com"
                    value={formData.website}
                    onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Primary Location</Label>
                  <Input
                    placeholder="e.g. Kathmandu, Nepal"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <SignedMediaUploader
                    label="Company Brand Logo"
                    module="company_logo"
                    resourceId={editingCompany?.id || "new-company"}
                    onUploaded={([asset]: SignedMediaAsset[]) => {
                      if (asset) {
                        setFormData((current) => ({ ...current, logo_url: asset.publicUrl || asset.path }));
                      }
                    }}
                  />
                  {formData.logo_url && (
                    <div className="relative h-20 w-20 overflow-hidden rounded-xl border mt-2">
                      <img src={formData.logo_url} alt="Brand Logo" className="h-full w-full object-cover" />
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 pt-6">
                  <Switch
                    checked={formData.is_verified}
                    onCheckedChange={(v) => setFormData({ ...formData, is_verified: v })}
                  />
                  <Label>Verified Corporate Partner</Label>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={resetForm}>Cancel</Button>
              <Button variant="hero" onClick={handleSubmit} disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                {editingCompany ? "Update Company" : "Add Company"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
        {stats.map((stat) => (
          <Card key={stat.label} className="border-border/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg bg-muted flex items-center justify-center ${stat.color}`}>
                  <stat.icon className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stat.value}</p>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Search */}
      <div className="relative max-w-md mt-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search companies by name or sector..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Table */}
      <Card className="border-border/50 mt-6">
        <CardContent className="p-0">
          <div className="table-responsive">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Company</TableHead>
                  <TableHead>Industry</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Verification</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCompanies.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-[#fff5ed] text-[#c2410c] font-bold flex items-center justify-center border overflow-hidden shrink-0">
                          {c.logo_url ? (
                            <img src={c.logo_url} alt="Logo" className="w-full h-full object-cover" />
                          ) : (
                            <Building2 className="w-5 h-5" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium">{c.name}</p>
                          {c.website && (
                            <a
                              href={c.website}
                              target="_blank"
                              rel="noreferrer"
                              className="text-xs text-primary flex items-center gap-1 hover:underline mt-0.5"
                            >
                              <Globe className="w-3 h-3" />
                              {c.website.replace("https://", "").replace("http://", "")}
                            </a>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium text-[#17162e]">
                      {c.industry || "General"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {c.size ? `${c.size} employees` : "Not specified"}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-muted-foreground text-xs">
                        <MapPin className="w-3.5 h-3.5" />
                        {c.location || "Nepal"}
                      </div>
                    </TableCell>
                    <TableCell>
                      {c.is_verified ? (
                        <Badge className="bg-success/10 text-success border-success/20 w-fit">
                          Verified Partner
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-warning/10 text-warning border-warning/20 w-fit">
                          Unverified
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(c)}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className={c.is_verified ? "text-amber-600" : "text-emerald-600"}
                          onClick={() => void toggleVerification(c)}
                          title={c.is_verified ? "Revoke Partnership" : "Verify Company"}
                        >
                          <CheckCircle className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive"
                          onClick={() => handleDelete(c.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredCompanies.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      {isLoading ? "Loading..." : "No companies found"}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </OperationsPage>
  );
};

export default AdminCompanies;
