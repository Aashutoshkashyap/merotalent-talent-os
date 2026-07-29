import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { OperationsPage } from "./OperationsUI";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { 
  Search, 
  Building2, 
  MapPin, 
  Users, 
  CheckCircle, 
  XCircle,
  Eye,
  MoreHorizontal,
  Plus,
  Globe,
  GraduationCap,
  Loader2,
  Pencil,
  Trash2
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Institute {
  id: string;
  name: string;
  short_name: string | null;
  type: string | null;
  description: string | null;
  location: string | null;
  website: string | null;
  logo_url: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  admission_status: string | null;
  admission_deadline: string | null;
  total_seats: number | null;
  available_seats: number | null;
  is_verified: boolean | null;
  created_at: string;
}

const AdminInstitutions = () => {
  const { toast } = useToast();
  const [institutes, setInstitutes] = useState<Institute[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingInstitute, setEditingInstitute] = useState<Institute | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    short_name: "",
    type: "engineering",
    description: "",
    location: "",
    website: "",
    contact_email: "",
    contact_phone: "",
    admission_status: "closed",
    total_seats: "",
    available_seats: "",
  });

  useEffect(() => {
    fetchInstitutes();
  }, []);

  const fetchInstitutes = async () => {
    const { data } = await supabase
      .from("institutes")
      .select("*")
      .order("created_at", { ascending: false });
    
    if (data) setInstitutes(data);
    setIsLoading(false);
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      toast({
        variant: "destructive",
        title: "Name required",
        description: "Please enter an institute name.",
      });
      return;
    }

    setIsSubmitting(true);

    const instituteData = {
      name: formData.name,
      short_name: formData.short_name || null,
      type: formData.type,
      description: formData.description || null,
      location: formData.location || null,
      website: formData.website || null,
      contact_email: formData.contact_email || null,
      contact_phone: formData.contact_phone || null,
      admission_status: formData.admission_status,
      total_seats: formData.total_seats ? parseInt(formData.total_seats) : null,
      available_seats: formData.available_seats ? parseInt(formData.available_seats) : null,
    };

    let error;
    if (editingInstitute) {
      const result = await supabase
        .from("institutes")
        .update(instituteData)
        .eq("id", editingInstitute.id);
      error = result.error;
    } else {
      const result = await supabase.from("institutes").insert(instituteData);
      error = result.error;
    }

    if (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    } else {
      toast({
        title: editingInstitute ? "Institute updated!" : "Institute added!",
        description: `${formData.name} has been ${editingInstitute ? "updated" : "added"} successfully.`,
      });
      resetForm();
      fetchInstitutes();
    }
    setIsSubmitting(false);
  };

  const handleVerify = async (id: string, currentStatus: boolean | null) => {
    const { error } = await supabase
      .from("institutes")
      .update({ is_verified: !currentStatus })
      .eq("id", id);

    if (error) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } else {
      toast({
        title: currentStatus ? "Verification revoked" : "Institute verified!",
        description: `The institute has been ${currentStatus ? "unverified" : "verified"}.`,
      });
      fetchInstitutes();
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("institutes").delete().eq("id", id);

    if (error) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } else {
      toast({ title: "Institute deleted", description: "The institute has been removed." });
      fetchInstitutes();
    }
  };

  const openEdit = (institute: Institute) => {
    setEditingInstitute(institute);
    setFormData({
      name: institute.name,
      short_name: institute.short_name || "",
      type: institute.type || "engineering",
      description: institute.description || "",
      location: institute.location || "",
      website: institute.website || "",
      contact_email: institute.contact_email || "",
      contact_phone: institute.contact_phone || "",
      admission_status: institute.admission_status || "closed",
      total_seats: institute.total_seats?.toString() || "",
      available_seats: institute.available_seats?.toString() || "",
    });
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      name: "",
      short_name: "",
      type: "engineering",
      description: "",
      location: "",
      website: "",
      contact_email: "",
      contact_phone: "",
      admission_status: "closed",
      total_seats: "",
      available_seats: "",
    });
    setEditingInstitute(null);
    setIsDialogOpen(false);
  };

  const filteredInstitutes = institutes.filter(
    (inst) =>
      inst.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (inst.type && inst.type.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (inst.location && inst.location.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const stats = [
    { label: "Total Institutes", value: institutes.length, icon: Building2, color: "text-primary" },
    { label: "Verified", value: institutes.filter(i => i.is_verified).length, icon: CheckCircle, color: "text-success" },
    { label: "Admissions Open", value: institutes.filter(i => i.admission_status === "open").length, icon: GraduationCap, color: "text-warning" },
    { label: "Total Seats", value: institutes.reduce((sum, i) => sum + (i.total_seats || 0), 0).toLocaleString(), icon: Users, color: "text-accent" },
  ];

  return (
    <OperationsPage>
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold">Institutes Management</h1>
          <p className="text-muted-foreground">Manage engineering colleges and institutes</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => { if (!open) resetForm(); else setIsDialogOpen(open); }}>
          <DialogTrigger asChild>
            <Button variant="hero">
              <Plus className="w-4 h-4 mr-2" />
              Add Institute
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingInstitute ? "Edit Institute" : "Add New Institute"}</DialogTitle>
              <DialogDescription>
                {editingInstitute ? "Update institute details" : "Add a new engineering institute to the platform"}
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Institute Name *</Label>
                  <Input
                    placeholder="e.g., Pulchowk Campus"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Short Name</Label>
                  <Input
                    placeholder="e.g., IOE Pulchowk"
                    value={formData.short_name}
                    onChange={(e) => setFormData({ ...formData, short_name: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select value={formData.type} onValueChange={(v) => setFormData({ ...formData, type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="engineering">Engineering</SelectItem>
                      <SelectItem value="medical">Medical</SelectItem>
                      <SelectItem value="management">Management</SelectItem>
                      <SelectItem value="science">Science</SelectItem>
                      <SelectItem value="arts">Arts</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Location</Label>
                  <Input
                    placeholder="e.g., Lalitpur, Nepal"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  placeholder="Brief description of the institute..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                />
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Website</Label>
                  <Input
                    placeholder="https://example.edu.np"
                    value={formData.website}
                    onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Contact Email</Label>
                  <Input
                    type="email"
                    placeholder="contact@example.edu.np"
                    value={formData.contact_email}
                    onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Admission Status</Label>
                  <Select value={formData.admission_status} onValueChange={(v) => setFormData({ ...formData, admission_status: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="open">Open</SelectItem>
                      <SelectItem value="closed">Closed</SelectItem>
                      <SelectItem value="upcoming">Upcoming</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Total Seats</Label>
                  <Input
                    type="number"
                    placeholder="e.g., 96"
                    value={formData.total_seats}
                    onChange={(e) => setFormData({ ...formData, total_seats: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Available Seats</Label>
                  <Input
                    type="number"
                    placeholder="e.g., 12"
                    value={formData.available_seats}
                    onChange={(e) => setFormData({ ...formData, available_seats: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={resetForm}>Cancel</Button>
              <Button variant="hero" onClick={handleSubmit} disabled={isSubmitting}>
                {isSubmitting ? (
                  <><Loader2 className="w-4 h-4 animate-spin mr-2" />Saving...</>
                ) : (
                  editingInstitute ? "Update Institute" : "Add Institute"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search institutes..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Table */}
      <Card className="border-border/50">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Institute</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Admission</TableHead>
                <TableHead className="text-center">Seats</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredInstitutes.map((institute) => (
                <TableRow key={institute.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{institute.name}</p>
                      {institute.short_name && (
                        <p className="text-xs text-muted-foreground">{institute.short_name}</p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize">{institute.type}</Badge>
                  </TableCell>
                  <TableCell>
                    <span className="flex items-center gap-1 text-sm text-muted-foreground">
                      <MapPin className="w-3 h-3" />
                      {institute.location || "-"}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge 
                      variant="outline"
                      className={
                        institute.admission_status === "open" 
                          ? "bg-success/10 text-success" 
                          : institute.admission_status === "upcoming"
                          ? "bg-warning/10 text-warning"
                          : "bg-muted text-muted-foreground"
                      }
                    >
                      {institute.admission_status || "Closed"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    {institute.available_seats !== null && institute.total_seats !== null ? (
                      <span className="text-sm">
                        <span className="font-medium">{institute.available_seats}</span>
                        <span className="text-muted-foreground">/{institute.total_seats}</span>
                      </span>
                    ) : "-"}
                  </TableCell>
                  <TableCell>
                    {institute.is_verified ? (
                      <Badge className="bg-success/10 text-success border-success/20">
                        <CheckCircle className="w-3 h-3 mr-1" />Verified
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-warning/10 text-warning border-warning/20">
                        Pending
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEdit(institute)}>
                          <Pencil className="w-4 h-4 mr-2" />Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleVerify(institute.id, institute.is_verified)}>
                          <CheckCircle className="w-4 h-4 mr-2" />
                          {institute.is_verified ? "Revoke Verification" : "Verify"}
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          className="text-destructive" 
                          onClick={() => handleDelete(institute.id)}
                        >
                          <Trash2 className="w-4 h-4 mr-2" />Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
              {filteredInstitutes.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    {isLoading ? "Loading..." : "No institutes found"}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </OperationsPage>
  );
};

export default AdminInstitutions;
