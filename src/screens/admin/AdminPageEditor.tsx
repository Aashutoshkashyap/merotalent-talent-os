import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
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
import {
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Image,
  LayoutTemplate,
  Eye,
  EyeOff,
  GripVertical,
} from "lucide-react";
import { OperationsPage } from "./OperationsUI";
import {
  SignedMediaUploader,
  type SignedMediaAsset,
} from "@/components/media/SignedMediaUploader";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

interface PageSection {
  id: string;
  section_key: string;
  title: string;
  subtitle: string | null;
  body: string | null;
  image_url: string | null;
  image_alt: string | null;
  cta_label: string | null;
  cta_url: string | null;
  display_order: number;
  is_visible: boolean;
  page: string;
  updated_at: string;
}

type SectionFormData = Omit<PageSection, "id" | "updated_at">;

const PAGES = [
  { value: "home", label: "Homepage" },
  { value: "about", label: "About Us" },
  { value: "contact", label: "Contact Page" },
  { value: "pricing", label: "Pricing Page" },
  { value: "explore", label: "Explore / Discover" },
];

const emptyForm = (): SectionFormData => ({
  section_key: "",
  title: "",
  subtitle: "",
  body: "",
  image_url: "",
  image_alt: "",
  cta_label: "",
  cta_url: "",
  display_order: 0,
  is_visible: true,
  page: "home",
});

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

const AdminPageEditor = () => {
  const { toast } = useToast();
  const [sections, setSections] = useState<PageSection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingSection, setEditingSection] = useState<PageSection | null>(null);
  const [formData, setFormData] = useState<SectionFormData>(emptyForm());
  const [filterPage, setFilterPage] = useState("all");

  const fetchSections = useCallback(async () => {
    setIsLoading(true);
    const { data, error } = await (supabase as any)
      .from("page_sections")
      .select("*")
      .order("page")
      .order("display_order", { ascending: true });

    if (error) {
      // Table doesn't exist yet — show empty state
      setSections([]);
    } else {
      setSections(data || []);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchSections();
  }, [fetchSections]);

  const resetForm = () => {
    setEditingSection(null);
    setFormData(emptyForm());
  };

  const openEdit = (section: PageSection) => {
    setEditingSection(section);
    setFormData({
      section_key: section.section_key,
      title: section.title,
      subtitle: section.subtitle || "",
      body: section.body || "",
      image_url: section.image_url || "",
      image_alt: section.image_alt || "",
      cta_label: section.cta_label || "",
      cta_url: section.cta_url || "",
      display_order: section.display_order,
      is_visible: section.is_visible,
      page: section.page,
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.section_key.trim() || !formData.title.trim()) {
      toast({ variant: "destructive", title: "Section key and title are required" });
      return;
    }

    setIsSubmitting(true);

    const payload = {
      section_key: formData.section_key,
      title: formData.title,
      subtitle: formData.subtitle || null,
      body: formData.body || null,
      image_url: formData.image_url || null,
      image_alt: formData.image_alt || null,
      cta_label: formData.cta_label || null,
      cta_url: formData.cta_url || null,
      display_order: Number(formData.display_order) || 0,
      is_visible: formData.is_visible,
      page: formData.page,
    };

    const db = supabase as any;

    if (editingSection) {
      const { error } = await db
        .from("page_sections")
        .update(payload)
        .eq("id", editingSection.id);
      if (error) {
        toast({ variant: "destructive", title: "Update failed", description: error.message });
      } else {
        toast({ title: "Section updated" });
        setIsDialogOpen(false);
        resetForm();
        fetchSections();
      }
    } else {
      const { error } = await db.from("page_sections").insert(payload);
      if (error) {
        toast({ variant: "destructive", title: "Create failed", description: error.message });
      } else {
        toast({ title: "Section created" });
        setIsDialogOpen(false);
        resetForm();
        fetchSections();
      }
    }

    setIsSubmitting(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this section permanently?")) return;
    const { error } = await (supabase as any).from("page_sections").delete().eq("id", id);
    if (error) {
      toast({ variant: "destructive", title: "Delete failed", description: error.message });
    } else {
      toast({ title: "Section deleted" });
      fetchSections();
    }
  };

  const toggleVisibility = async (section: PageSection) => {
    await (supabase as any)
      .from("page_sections")
      .update({ is_visible: !section.is_visible })
      .eq("id", section.id);
    fetchSections();
  };

  const filtered = filterPage === "all" ? sections : sections.filter((s) => s.page === filterPage);

  /* ---------------------------------------------------------------- */
  /* Render                                                            */
  /* ---------------------------------------------------------------- */

  return (
    <OperationsPage>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold">Page & Section Editor</h1>
          <p className="text-muted-foreground text-sm">
            Edit homepage hero, banners, about sections, CTAs and other visual content with images
          </p>
        </div>

        <div className="flex gap-2">
          <Select value={filterPage} onValueChange={setFilterPage}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Filter page" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All pages</SelectItem>
              {PAGES.map((p) => (
                <SelectItem key={p.value} value={p.value}>
                  {p.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button variant="hero">
                <Plus className="mr-2 h-4 w-4" />
                Add Section
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingSection ? "Edit Section" : "Create New Section"}</DialogTitle>
                <DialogDescription>
                  {editingSection ? "Update the content and imagery for this section" : "Add a new visual content block to any page"}
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-4 py-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Section Key *</Label>
                    <Input
                      placeholder="e.g., hero_banner, about_mission"
                      value={formData.section_key}
                      onChange={(e) => setFormData({ ...formData, section_key: e.target.value })}
                    />
                    <p className="text-xs text-muted-foreground">Unique identifier used in code</p>
                  </div>
                  <div className="space-y-2">
                    <Label>Page</Label>
                    <Select value={formData.page} onValueChange={(v) => setFormData({ ...formData, page: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {PAGES.map((p) => (
                          <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Title *</Label>
                  <Input
                    placeholder="e.g., Discover Your Potential"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Subtitle</Label>
                  <Input
                    placeholder="Supporting tagline text"
                    value={formData.subtitle || ""}
                    onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Body / Description</Label>
                  <Textarea
                    placeholder="Main content for this section..."
                    value={formData.body || ""}
                    onChange={(e) => setFormData({ ...formData, body: e.target.value })}
                    rows={4}
                  />
                </div>

                {/* Image Upload */}
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <SignedMediaUploader
                      label="Section Image / Banner"
                      module="advertisement"
                      resourceId={editingSection?.id || "new-section"}
                      onUploaded={([asset]: SignedMediaAsset[]) => {
                        if (asset) {
                          setFormData((current) => ({
                            ...current,
                            image_url: asset.publicUrl || asset.path,
                          }));
                        }
                      }}
                    />
                    {formData.image_url && (
                      <div className="relative h-28 w-full overflow-hidden rounded-xl border">
                        <img
                          src={formData.image_url}
                          alt={formData.image_alt || "Section preview"}
                          className="h-full w-full object-cover"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-1 top-1 h-7 w-7 bg-white/80 hover:bg-white"
                          onClick={() => setFormData({ ...formData, image_url: "" })}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    )}
                  </div>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Image Alt Text</Label>
                      <Input
                        placeholder="Describe the image for accessibility"
                        value={formData.image_alt || ""}
                        onChange={(e) => setFormData({ ...formData, image_alt: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Image URL (manual)</Label>
                      <Input
                        placeholder="https://... or paste a direct URL"
                        value={formData.image_url || ""}
                        onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                {/* CTA */}
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>CTA Button Label</Label>
                    <Input
                      placeholder="e.g., Get Started"
                      value={formData.cta_label || ""}
                      onChange={(e) => setFormData({ ...formData, cta_label: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>CTA Button URL</Label>
                    <Input
                      placeholder="/signup or https://..."
                      value={formData.cta_url || ""}
                      onChange={(e) => setFormData({ ...formData, cta_url: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Display Order</Label>
                    <Input
                      type="number"
                      value={formData.display_order}
                      onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="flex items-center gap-3 pt-6">
                    <Switch
                      checked={formData.is_visible}
                      onCheckedChange={(v) => setFormData({ ...formData, is_visible: v })}
                    />
                    <Label>Visible on site</Label>
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => { setIsDialogOpen(false); resetForm(); }}>
                  Cancel
                </Button>
                <Button variant="hero" onClick={handleSubmit} disabled={isSubmitting}>
                  {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  {editingSection ? "Update Section" : "Create Section"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Section Cards Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <Card className="border-border/50">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <LayoutTemplate className="h-12 w-12 text-muted-foreground/40 mb-4" />
            <h3 className="text-lg font-semibold">No sections yet</h3>
            <p className="text-sm text-muted-foreground max-w-md mt-1">
              {sections.length === 0
                ? 'Create a "page_sections" table in Supabase first, then add your first content section here.'
                : "No sections match the selected filter."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((section) => (
            <Card
              key={section.id}
              className={`border-border/50 overflow-hidden transition-opacity ${
                section.is_visible ? "" : "opacity-60"
              }`}
            >
              {section.image_url ? (
                <div className="relative h-36 w-full bg-muted">
                  <img
                    src={section.image_url}
                    alt={section.image_alt || section.title}
                    className="h-full w-full object-cover"
                  />
                  <span className="absolute left-2 top-2 rounded-lg bg-black/60 px-2 py-0.5 text-[10px] font-bold uppercase text-white tracking-wider">
                    {section.page}
                  </span>
                </div>
              ) : (
                <div className="flex h-24 items-center justify-center bg-[#fff5ed]">
                  <Image className="h-8 w-8 text-[#c2410c]/30" />
                  <span className="absolute left-2 top-2 rounded-lg bg-[#c2410c]/10 px-2 py-0.5 text-[10px] font-bold uppercase text-[#c2410c] tracking-wider">
                    {section.page}
                  </span>
                </div>
              )}
              <CardHeader className="pb-2 pt-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <CardTitle className="text-sm truncate">{section.title}</CardTitle>
                    {section.subtitle && (
                      <CardDescription className="text-xs truncate mt-0.5">
                        {section.subtitle}
                      </CardDescription>
                    )}
                  </div>
                  <span className="shrink-0 flex items-center gap-1 text-xs text-muted-foreground">
                    <GripVertical className="h-3 w-3" />
                    {section.display_order}
                  </span>
                </div>
                <p className="text-[11px] font-mono text-muted-foreground">{section.section_key}</p>
              </CardHeader>
              <CardContent className="pb-3 pt-0">
                {section.body && (
                  <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
                    {section.body}
                  </p>
                )}
                <div className="flex items-center gap-1.5">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs"
                    onClick={() => openEdit(section)}
                  >
                    <Pencil className="mr-1.5 h-3 w-3" />
                    Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 text-xs"
                    onClick={() => toggleVisibility(section)}
                    title={section.is_visible ? "Hide" : "Show"}
                  >
                    {section.is_visible ? (
                      <Eye className="mr-1.5 h-3 w-3" />
                    ) : (
                      <EyeOff className="mr-1.5 h-3 w-3" />
                    )}
                    {section.is_visible ? "Visible" : "Hidden"}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 text-xs text-destructive hover:text-destructive ml-auto"
                    onClick={() => handleDelete(section.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </OperationsPage>
  );
};

export default AdminPageEditor;
