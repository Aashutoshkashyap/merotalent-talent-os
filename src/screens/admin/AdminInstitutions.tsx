import { useCallback, useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  SignedMediaUploader,
  type SignedMediaAsset,
} from "@/components/media/SignedMediaUploader";
import { resolveCollegeMediaUrl } from "@/lib/institutes/public-institutes";
import type { Database, Json } from "@/integrations/supabase/types";
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
  MoreHorizontal,
  Plus,
  GraduationCap,
  Loader2,
  Pencil,
  Trash2,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { generateInstituteDetails } from "@/lib/ai/ai-generator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type InstituteRow = Database["public"]["Tables"]["institutes"]["Row"];
type Institute = InstituteRow & { payment_verified: boolean };

interface InstituteFormData {
  name: string;
  short_name: string;
  type: string;
  institution_category: "college" | "school" | "plus_two";
  affiliation: string;
  level: string;
  description: string;
  location: string;
  website: string;
  youtube_url: string;
  contact_email: string;
  contact_phone: string;
  admission_status: string;
  total_seats: string;
  available_seats: string;
  courses_offered: string;
  logo_url: string;
  cover_image_url: string;
  gallery_urls: string[];
  applications_enabled: boolean;
  status: string;
}

const emptyFormData = (): InstituteFormData => ({
  name: "",
  short_name: "",
  type: "engineering",
  institution_category: "college",
  affiliation: "",
  level: "",
  description: "",
  location: "",
  website: "",
  youtube_url: "",
  contact_email: "",
  contact_phone: "",
  admission_status: "closed",
  total_seats: "",
  available_seats: "",
  courses_offered: "",
  logo_url: "",
  cover_image_url: "",
  gallery_urls: [],
  applications_enabled: false,
  status: "pending",
});

const courseNames = (value: Json): string => {
  const courses = Array.isArray(value)
    ? value
    : value && typeof value === "object" && Array.isArray(value.programs)
      ? value.programs
      : [];

  return courses
    .map((course) => {
      if (typeof course === "string") return course;
      if (!course || typeof course !== "object" || Array.isArray(course)) return "";
      const name = course.name ?? course.title ?? course.program ?? course.course;
      return typeof name === "string" ? name : "";
    })
    .filter(Boolean)
    .join("\n");
};

const MediaPreview = ({
  value,
  label,
  onRemove,
}: {
  value: string;
  label: string;
  onRemove: () => void;
}) => (
  <div className="mt-2 flex items-center gap-3 rounded-lg border bg-muted/20 p-2">
    <div
      role="img"
      aria-label={`${label} preview`}
      className="h-14 w-20 rounded-md bg-cover bg-center"
      style={{ backgroundImage: `url(${JSON.stringify(resolveCollegeMediaUrl(value))})` }}
    />
    <p className="min-w-0 flex-1 truncate text-xs text-muted-foreground" title={value}>
      {value}
    </p>
    <Button type="button" variant="ghost" size="icon" onClick={onRemove}>
      <Trash2 className="h-4 w-4" />
      <span className="sr-only">Remove {label.toLowerCase()}</span>
    </Button>
  </div>
);

const AdminInstitutions = () => {
  const { toast } = useToast();
  const [institutes, setInstitutes] = useState<Institute[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const [editingInstitute, setEditingInstitute] = useState<Institute | null>(null);
  const [formData, setFormData] = useState<InstituteFormData>(emptyFormData());

  const handleAIGenerate = async () => {
    if (!formData.name.trim()) {
      toast({
        variant: "destructive",
        title: "Institute name required",
        description: "Please type the institute name first before generating with AI.",
      });
      return;
    }

    setIsAiGenerating(true);
    try {
      const aiResult = await generateInstituteDetails(
        formData.name,
        formData.type,
        formData.location || "Nepal",
      );

      setFormData((current) => ({
        ...current,
        description: current.description || aiResult.description,
        courses_offered: current.courses_offered || aiResult.courses_offered.join("\n"),
        contact_phone: current.contact_phone || aiResult.contact_phone,
        contact_email: current.contact_email || aiResult.contact_email,
        website: current.website || aiResult.website,
      }));

      toast({
        title: "AI Generation Complete!",
        description: "Description, programs, phone, email, and website generated successfully.",
      });
    } catch {
      toast({
        variant: "destructive",
        title: "AI Generation failed",
        description: "Unable to generate institute details.",
      });
    } finally {
      setIsAiGenerating(false);
    }
  };

  const fetchInstitutes = useCallback(async () => {
    const [instituteResult, directoryResult] = await Promise.all([
      supabase
        .from("institutes")
        .select("*")
        .order("created_at", { ascending: false }),
      supabase.from("institute_directory").select("id,payment_verified"),
    ]);

    if (instituteResult.error) {
      toast({
        variant: "destructive",
        title: "Unable to load institutes",
        description: instituteResult.error.message,
      });
    } else {
      const paymentByInstitute = new Map(
        (directoryResult.data ?? []).map((item) => [
          item.id,
          item.payment_verified === true,
        ]),
      );
      setInstitutes(
        (instituteResult.data ?? []).map((institute) => ({
          ...institute,
          payment_verified: paymentByInstitute.get(institute.id) ?? false,
        })),
      );
    }
    setIsLoading(false);
  }, [toast]);

  useEffect(() => {
    void fetchInstitutes();
  }, [fetchInstitutes]);

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

    const courses = formData.courses_offered
      .split(/[\n,]/)
      .map((course) => course.trim())
      .filter(Boolean);

    const instituteData = {
      name: formData.name,
      short_name: formData.short_name || null,
      type: formData.type,
      institution_category: formData.institution_category,
      affiliation: formData.affiliation || null,
      level: formData.level || null,
      description: formData.description || null,
      location: formData.location || null,
      website: formData.website || null,
      youtube_url: formData.youtube_url || null,
      contact_email: formData.contact_email || null,
      contact_phone: formData.contact_phone || null,
      admission_status: formData.admission_status,
      total_seats: formData.total_seats ? parseInt(formData.total_seats) : null,
      available_seats: formData.available_seats ? parseInt(formData.available_seats) : null,
      courses_offered: courses,
      logo_url: formData.logo_url || null,
      cover_image_url: formData.cover_image_url || null,
      gallery_urls: formData.gallery_urls,
      applications_enabled: formData.applications_enabled,
      status: formData.status,
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
      institution_category:
        institute.institution_category === "school" ||
        institute.institution_category === "plus_two"
          ? institute.institution_category
          : "college",
      affiliation: institute.affiliation || "",
      level: institute.level || "",
      description: institute.description || "",
      location: institute.location || "",
      website: institute.website || "",
      youtube_url: institute.youtube_url || "",
      contact_email: institute.contact_email || "",
      contact_phone: institute.contact_phone || "",
      admission_status: institute.admission_status || "closed",
      total_seats: institute.total_seats?.toString() || "",
      available_seats: institute.available_seats?.toString() || "",
      courses_offered: courseNames(institute.courses_offered),
      logo_url: institute.logo_url || "",
      cover_image_url: institute.cover_image_url || "",
      gallery_urls: institute.gallery_urls || [],
      applications_enabled: institute.applications_enabled,
      status: institute.status || "pending",
    });
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setFormData(emptyFormData());
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
    { label: "Paid verified", value: institutes.filter(i => i.payment_verified).length, icon: ShieldCheck, color: "text-success" },
    { label: "Admissions Open", value: institutes.filter(i => i.admission_status === "open").length, icon: GraduationCap, color: "text-warning" },
    { label: "Total Seats", value: institutes.reduce((sum, i) => sum + (i.total_seats || 0), 0).toLocaleString(), icon: Users, color: "text-accent" },
  ];

  return (
    <OperationsPage>
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold">Institutes Management</h1>
          <p className="text-muted-foreground">Manage colleges, schools and +2 institutions</p>
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
                {editingInstitute ? "Update institute details" : "Add a new institute to the platform"}
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

              <Button
                type="button"
                variant="outline"
                className="w-full border-2 border-dashed border-[#c2410c]/30 text-[#c2410c] hover:bg-[#fff5ed]"
                onClick={handleAIGenerate}
                disabled={isAiGenerating || !formData.name.trim()}
              >
                {isAiGenerating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating details with AI...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Generate Description, Programs & Contact Details with AI
                  </>
                )}
              </Button>

              <div className="grid sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select
                    value={formData.institution_category}
                    onValueChange={(value: InstituteFormData["institution_category"]) =>
                      setFormData({ ...formData, institution_category: value })
                    }
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="college">College</SelectItem>
                      <SelectItem value="school">School</SelectItem>
                      <SelectItem value="plus_two">+2</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Academic focus</Label>
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

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Affiliation</Label>
                  <Input
                    placeholder="e.g., Tribhuvan University"
                    value={formData.affiliation}
                    onChange={(e) => setFormData({ ...formData, affiliation: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Level</Label>
                  <Input
                    placeholder="e.g., Bachelor, Master"
                    value={formData.level}
                    onChange={(e) => setFormData({ ...formData, level: e.target.value })}
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
                  <Label>YouTube video</Label>
                  <Input
                    type="url"
                    placeholder="https://www.youtube.com/watch?v=..."
                    value={formData.youtube_url}
                    onChange={(e) => setFormData({ ...formData, youtube_url: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Contact Email</Label>
                  <Input
                    type="email"
                    placeholder="contact@example.edu.np"
                    value={formData.contact_email}
                    onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Contact Phone</Label>
                  <Input
                    type="tel"
                    placeholder="e.g., 01-5555555"
                    value={formData.contact_phone}
                    onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Programs offered</Label>
                <Textarea
                  placeholder={"One program per line, e.g.\nBBA\nBCA\nBSc CSIT"}
                  value={formData.courses_offered}
                  onChange={(e) => setFormData({ ...formData, courses_offered: e.target.value })}
                  rows={4}
                />
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

              <div className="grid gap-4 rounded-lg border bg-muted/20 p-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Listing status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(status) => setFormData({ ...formData, status })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="pending">Pending review</SelectItem>
                      <SelectItem value="approved">Approved</SelectItem>
                      <SelectItem value="suspended">Suspended</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Approval controls directory visibility, not paid verification.
                  </p>
                </div>
                <div className="flex items-start justify-between gap-4 rounded-md bg-background p-3">
                  <div>
                    <Label htmlFor="applications-enabled">Accept applications</Label>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Enables Apply Now independently of paid verification.
                    </p>
                  </div>
                  <Switch
                    id="applications-enabled"
                    checked={formData.applications_enabled}
                    onCheckedChange={(applications_enabled) =>
                      setFormData({ ...formData, applications_enabled })
                    }
                  />
                </div>
              </div>

              {editingInstitute ? (
                <div className="space-y-4 rounded-lg border p-4">
                  <div>
                    <h3 className="font-medium">Institute media</h3>
                    <p className="text-xs text-muted-foreground">
                      Secure uploads are stored as canonical object paths. Save the form after uploading.
                    </p>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <SignedMediaUploader
                        label="Logo"
                        module="college_logo"
                        resourceId={editingInstitute.id}
                        onUploaded={([asset]: SignedMediaAsset[]) => {
                          if (asset) {
                            setFormData((current) => ({ ...current, logo_url: asset.path }));
                          }
                        }}
                      />
                      {formData.logo_url && (
                        <MediaPreview
                          value={formData.logo_url}
                          label="Logo"
                          onRemove={() =>
                            setFormData((current) => ({ ...current, logo_url: "" }))
                          }
                        />
                      )}
                    </div>

                    <div>
                      <SignedMediaUploader
                        label="Cover image"
                        module="college_cover"
                        resourceId={editingInstitute.id}
                        onUploaded={([asset]: SignedMediaAsset[]) => {
                          if (asset) {
                            setFormData((current) => ({ ...current, cover_image_url: asset.path }));
                          }
                        }}
                      />
                      {formData.cover_image_url && (
                        <MediaPreview
                          value={formData.cover_image_url}
                          label="Cover image"
                          onRemove={() =>
                            setFormData((current) => ({ ...current, cover_image_url: "" }))
                          }
                        />
                      )}
                    </div>
                  </div>

                  <SignedMediaUploader
                    label="Gallery"
                    module="college_gallery"
                    resourceId={editingInstitute.id}
                    multiple
                    maxFiles={30 - formData.gallery_urls.length}
                    disabled={formData.gallery_urls.length >= 30}
                    onUploaded={(assets) =>
                      setFormData((current) => ({
                        ...current,
                        gallery_urls: [
                          ...current.gallery_urls,
                          ...assets.map((asset) => asset.path),
                        ].slice(0, 30),
                      }))
                    }
                  />
                  {formData.gallery_urls.length > 0 && (
                    <div className="grid gap-2 sm:grid-cols-2">
                      {formData.gallery_urls.map((value, index) => (
                        <MediaPreview
                          key={`${value}-${index}`}
                          value={value}
                          label={`Gallery image ${index + 1}`}
                          onRemove={() =>
                            setFormData((current) => ({
                              ...current,
                              gallery_urls: current.gallery_urls.filter((_, itemIndex) => itemIndex !== index),
                            }))
                          }
                        />
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                  Save the institute first, then reopen it to upload its logo, cover and gallery images.
                </p>
              )}
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
                <TableHead>Payment</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredInstitutes.map((institute) => (
                <TableRow key={institute.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{institute.name}</p>
                      <p className="text-xs capitalize text-muted-foreground">
                        {[institute.short_name, institute.status].filter(Boolean).join(" · ")}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      <Badge variant="outline" className="capitalize">
                        {institute.institution_category === "plus_two"
                          ? "+2"
                          : institute.institution_category}
                      </Badge>
                      {institute.type && (
                        <Badge variant="secondary" className="capitalize">{institute.type}</Badge>
                      )}
                    </div>
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
                    {institute.payment_verified ? (
                      <Badge className="bg-success/10 text-success border-success/20">
                        <CheckCircle className="w-3 h-3 mr-1" />Paid verified
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-muted text-muted-foreground">
                        Not paid
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
