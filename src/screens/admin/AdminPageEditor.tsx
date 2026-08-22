import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  Globe,
  Save,
  Sliders,
  CornerDownRight,
  Layers,
  Sparkles
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
  parent_id?: string | null;
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
  { value: "faq", label: "FAQ Q&A Section" },
  { value: "about", label: "About Us" },
  { value: "contact", label: "Contact Page" },
  { value: "pricing", label: "Pricing Page" },
  { value: "explore", label: "Explore / Discover" },
  { value: "header_footer", label: "Header & Footer" },
];

const defaultSiteSettings = {
  site_title: "MeroTalent",
  favicon_url: "",
  logo_url: "",
  meta_description: "",
  contact_email: "",
  contact_phone: "",
};

const emptyForm = (): SectionFormData => ({
  parent_id: null,
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

  // Site Branding & Favicon settings state
  const [siteSettings, setSiteSettings] = useState(defaultSiteSettings);
  const [isSavingSettings, setIsSavingSettings] = useState(false);

const STANDARD_HOME_SECTIONS = [
  {
    page: "home",
    section_key: "trust_strip",
    title: "Trusted Partners",
    subtitle: "TRUSTED BY LEADING BRANDS & INSTITUTIONS",
    body: "",
    display_order: 4,
    is_visible: true,
  },
  {
    page: "home",
    section_key: "competitions_section",
    title: "Competitions",
    subtitle: "Discover current competitions published by MeroTalent partners.",
    body: "",
    display_order: 5,
    is_visible: true,
  },
  {
    page: "home",
    section_key: "internships_section",
    title: "Internships",
    subtitle: "Explore approved internships from active employers.",
    body: "",
    display_order: 6,
    is_visible: true,
  },
  {
    page: "home",
    section_key: "jobs_section",
    title: "Jobs",
    subtitle: "Explore approved roles from active employers.",
    body: "",
    display_order: 7,
    is_visible: true,
  },
  {
    page: "home",
    section_key: "about_us",
    title: "Why MeroTalent?",
    subtitle: "Built for students, academic institutions, and industry leaders",
    body: "Comprehensive OS offering verified profiles, mentor sessions, university admissions, and hiring pipelines.",
    display_order: 8,
    is_visible: true,
  },
  {
    page: "home",
    section_key: "testimonials",
    title: "Success Stories",
    subtitle: "What our community says",
    body: "",
    display_order: 9,
    is_visible: true,
  },
  {
    page: "home",
    section_key: "faq",
    title: "Frequently asked questions",
    subtitle: "MeroTalent FAQ",
    body: "Can't find the answer to your question? Connect with our helpdesk team directly.",
    display_order: 10,
    is_visible: true,
  },
];

  const fetchSections = useCallback(async () => {
    setIsLoading(true);
    const db = supabase as any;
    const { data, error } = await db
      .from("page_sections")
      .select("*")
      .order("page")
      .order("display_order", { ascending: true });

    if (error) {
      toast({ variant: "destructive", title: "Unable to load page sections", description: error.message });
      setSections([]);
    } else {
      const fetched: PageSection[] = data || [];
      const existingKeys = new Set(fetched.map((s) => s.section_key));
      const missing = STANDARD_HOME_SECTIONS.filter((s) => !existingKeys.has(s.section_key));

      if (missing.length > 0) {
        const { error: seedError } = await db.from("page_sections").insert(missing);
        if (!seedError) {
          const { data: reloaded } = await db
            .from("page_sections")
            .select("*")
            .order("page")
            .order("display_order", { ascending: true });
          setSections(reloaded || fetched);
          setIsLoading(false);
          return;
        }
      }
      setSections(fetched);
    }
    setIsLoading(false);
  }, [toast]);

  const fetchSiteSettings = useCallback(async () => {
    const { data, error } = await (supabase as any).from("site_settings").select("*");
    if (error) {
      toast({ variant: "destructive", title: "Unable to load site settings", description: error.message });
      return;
    }
    if (data && data.length > 0) {
      const settingsMap: Record<string, string> = {};
      data.forEach((row: { key: string; value: string }) => {
        settingsMap[row.key] = row.value;
      });
      setSiteSettings((current) => ({
        ...current,
        ...settingsMap,
      }));
    } else setSiteSettings(defaultSiteSettings);
  }, [toast]);

  useEffect(() => {
    fetchSections();
    fetchSiteSettings();
  }, [fetchSections, fetchSiteSettings]);

  const resetForm = () => {
    setEditingSection(null);
    setFormData(emptyForm());
  };

  const openEdit = (section: PageSection) => {
    setEditingSection(section);
    setFormData({
      parent_id: section.parent_id || null,
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

  const openAddChild = (parentSection: PageSection) => {
    resetForm();
    setFormData({
      ...emptyForm(),
      parent_id: parentSection.id,
      page: parentSection.page,
      section_key: `${parentSection.section_key}_item_${Date.now().toString().slice(-4)}`,
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.section_key.trim() || !formData.title.trim()) {
      toast({ variant: "destructive", title: "Section key and title are required" });
      return;
    }

    const payload: Record<string, any> = {
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

    if (formData.parent_id) {
      payload.parent_id = formData.parent_id;
    }

    const db = supabase as any;

    let { error } = editingSection
      ? await db.from("page_sections").update(payload).eq("id", editingSection.id)
      : await db.from("page_sections").insert(payload);

    if (error && (error.message?.includes("parent_id") || error.message?.includes("column"))) {
      delete payload.parent_id;
      const retryResult = editingSection
        ? await db.from("page_sections").update(payload).eq("id", editingSection.id)
        : await db.from("page_sections").insert(payload);
      error = retryResult.error;
    }

    if (error) {
      toast({ variant: "destructive", title: editingSection ? "Update failed" : "Create failed", description: error.message });
    } else {
      toast({ title: editingSection ? "Section updated successfully" : "New section created" });
      setIsDialogOpen(false);
      resetForm();
      fetchSections();
    }

    setIsSubmitting(false);
  };

  const handleSaveBranding = async () => {
    setIsSavingSettings(true);
    const db = supabase as any;

    const rows = Object.entries(siteSettings).map(([key, value]) => ({
      key,
      value,
      updated_at: new Date().toISOString(),
    }));

    const { error } = await db.from("site_settings").upsert(rows);

    if (error) {
      toast({ variant: "destructive", title: "Branding save failed", description: error.message });
    } else {
      // Update DOM favicon dynamically if specified
      if (siteSettings.favicon_url) {
        let faviconLink = document.querySelector<HTMLLinkElement>("link[rel*='icon']");
        if (!faviconLink) {
          faviconLink = document.createElement("link");
          faviconLink.type = "image/x-icon";
          faviconLink.rel = "shortcut icon";
          document.getElementsByTagName("head")[0].appendChild(faviconLink);
        }
        faviconLink.href = siteSettings.favicon_url;
      }

      toast({ title: "Site branding & favicon updated!" });
    }
    setIsSavingSettings(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this section and any sub-items permanently?")) return;
    const { error } = await (supabase as any).from("page_sections").delete().eq("id", id);
    if (error) {
      toast({ variant: "destructive", title: "Delete failed", description: error.message });
    } else {
      toast({ title: "Section deleted" });
      fetchSections();
    }
  };

  const toggleVisibility = async (section: PageSection) => {
    const { error } = await (supabase as any)
      .from("page_sections")
      .update({ is_visible: !section.is_visible })
      .eq("id", section.id);

    if (error) {
      toast({ variant: "destructive", title: "Visibility not changed", description: error.message });
      return;
    }
    fetchSections();
  };

  const filtered = filterPage === "all" ? sections : sections.filter((s) => s.page === filterPage);
  const parentSections = sections.filter((s) => !s.parent_id);

  /* ---------------------------------------------------------------- */
  /* Render                                                            */
  /* ---------------------------------------------------------------- */

  return (
    <OperationsPage>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold">CMS Page & Section Editor</h1>
          <p className="text-muted-foreground text-sm">
            Customize heroes, banners, text blocks, favicons, logos, and sub-items across all pages.
          </p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button variant="hero">
              <Plus className="mr-2 h-4 w-4" />
              Add Section / Item
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingSection ? "Edit Section / Item" : "Create New Section / Item"}</DialogTitle>
              <DialogDescription>
                {editingSection ? "Update content and images for this section" : "Add a visual block or sub-item under a parent section"}
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Parent Section (Optional nesting)</Label>
                  <Select
                    value={formData.parent_id || "none"}
                    onValueChange={(v) => setFormData({ ...formData, parent_id: v === "none" ? null : v })}
                  >
                    <SelectTrigger><SelectValue placeholder="Standalone top-level section" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">-- Standalone Top-Level Section --</SelectItem>
                      {parentSections.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          Under: {p.title} ({p.page})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Page Target</Label>
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

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Section Identifier (Key) *</Label>
                  <Input
                    placeholder="e.g. hero_banner, feature_card_1"
                    value={formData.section_key}
                    onChange={(e) => setFormData({ ...formData, section_key: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Display Order Index</Label>
                  <Input
                    type="number"
                    value={formData.display_order}
                    onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) || 0 })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Title / Heading *</Label>
                <Input
                  placeholder="e.g., Empowering Nepal's Next Gen Leaders"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>Subtitle / Tagline</Label>
                <Input
                  placeholder="Supporting tagline or secondary title"
                  value={formData.subtitle || ""}
                  onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>Body / Paragraph Content</Label>
                <Textarea
                  placeholder="Detailed text description..."
                  value={formData.body || ""}
                  onChange={(e) => setFormData({ ...formData, body: e.target.value })}
                  rows={4}
                />
              </div>

              {/* Image Upload */}
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <SignedMediaUploader
                    label="Section Banner / Feature Image"
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
                    <div className="relative h-28 w-full overflow-hidden rounded-xl border mt-2">
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
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </div>
                  )}
                </div>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Image Alt Text</Label>
                    <Input
                      placeholder="Accessibility alt text"
                      value={formData.image_alt || ""}
                      onChange={(e) => setFormData({ ...formData, image_alt: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Direct Image URL (Optional)</Label>
                    <Input
                      placeholder="https://... or paste direct image URL"
                      value={formData.image_url || ""}
                      onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              {/* CTA */}
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>CTA Button Text</Label>
                  <Input
                    placeholder="e.g. Apply Now / Learn More"
                    value={formData.cta_label || ""}
                    onChange={(e) => setFormData({ ...formData, cta_label: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>CTA Destination URL</Label>
                  <Input
                    placeholder="/jobs or https://..."
                    value={formData.cta_url || ""}
                    onChange={(e) => setFormData({ ...formData, cta_url: e.target.value })}
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <Switch
                  checked={formData.is_visible}
                  onCheckedChange={(v) => setFormData({ ...formData, is_visible: v })}
                />
                <Label>Visible on website</Label>
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

      <Tabs defaultValue="sections" className="w-full mt-4">
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="sections" className="flex items-center gap-2">
            <Layers className="h-4 w-4" />
            Page Content Sections
          </TabsTrigger>
          <TabsTrigger value="branding" className="flex items-center gap-2">
            <Globe className="h-4 w-4" />
            Favicon & Site Branding
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: Page Content Sections */}
        <TabsContent value="sections" className="space-y-4 pt-4">
          <div className="flex items-center justify-between">
            <Select value={filterPage} onValueChange={setFilterPage}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter page" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Pages</SelectItem>
                {PAGES.map((p) => (
                  <SelectItem key={p.value} value={p.value}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <span className="text-xs text-muted-foreground font-medium">
              Showing {filtered.length} section{filtered.length === 1 ? "" : "s"}
            </span>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <Card className="border-border/50">
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <LayoutTemplate className="h-12 w-12 text-muted-foreground/40 mb-4" />
                <h3 className="text-lg font-semibold">No sections created yet</h3>
                <p className="text-sm text-muted-foreground max-w-md mt-1 mb-4">
                  Add content blocks for homepage heroes, banners, about text, CTAs, and custom nested sub-items.
                </p>
                <Button variant="hero" onClick={() => setIsDialogOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add First Section
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {filtered.map((section) => (
                <Card
                  key={section.id}
                  className={`border-border/50 overflow-hidden transition-all ${
                    section.is_visible ? "" : "opacity-60 bg-muted/20"
                  }`}
                >
                  {section.image_url ? (
                    <div className="relative h-36 w-full bg-muted">
                      <img
                        src={section.image_url}
                        alt={section.image_alt || section.title}
                        className="h-full w-full object-cover"
                      />
                      <span className="absolute left-2 top-2 rounded-lg bg-black/70 px-2 py-0.5 text-[10px] font-bold uppercase text-white tracking-wider">
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
                      <span className="shrink-0 flex items-center gap-1 text-xs text-muted-foreground font-mono">
                        #{section.display_order}
                      </span>
                    </div>
                    <p className="text-[11px] font-mono text-muted-foreground">{section.section_key}</p>
                  </CardHeader>
                  <CardContent className="pb-3 pt-0 space-y-3">
                    {section.body && (
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {section.body}
                      </p>
                    )}

                    <div className="flex items-center gap-1.5 flex-wrap pt-1 border-t border-border/40">
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
                        onClick={() => openAddChild(section)}
                        title="Add sub-item under this section"
                      >
                        <CornerDownRight className="mr-1 h-3 w-3 text-primary" />
                        Sub-item
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 text-xs"
                        onClick={() => toggleVisibility(section)}
                      >
                        {section.is_visible ? (
                          <Eye className="mr-1 h-3 w-3 text-emerald-600" />
                        ) : (
                          <EyeOff className="mr-1 h-3 w-3 text-muted-foreground" />
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
        </TabsContent>

        {/* TAB 2: Site Branding & Favicon */}
        <TabsContent value="branding" className="pt-4 space-y-6 max-w-3xl">
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Globe className="h-5 w-5 text-primary" />
                Global Favicon & Brand Identity
              </CardTitle>
              <CardDescription>
                Configure site favicon icon, main logo, default meta descriptions, and header titles.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Favicon Settings */}
              <div className="grid sm:grid-cols-2 gap-4 p-4 rounded-xl bg-[#fff5ed] border border-[#f1e2d7]">
                <div className="space-y-2">
                  <SignedMediaUploader
                    label="Favicon (.ico, .png)"
                    module="company_logo"
                    resourceId="site-favicon"
                    onUploaded={([asset]: SignedMediaAsset[]) => {
                      if (asset) {
                        setSiteSettings((current) => ({
                          ...current,
                          favicon_url: asset.publicUrl || asset.path,
                        }));
                      }
                    }}
                  />
                  {siteSettings.favicon_url && (
                    <div className="flex items-center gap-3 mt-2">
                      <img
                        src={siteSettings.favicon_url}
                        alt="Favicon preview"
                        className="h-8 w-8 object-contain rounded-md border bg-white p-1"
                      />
                      <span className="text-xs text-muted-foreground font-mono">Favicon Active</span>
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Favicon Direct URL</Label>
                  <Input
                    placeholder="https://.../favicon.ico"
                    value={siteSettings.favicon_url}
                    onChange={(e) => setSiteSettings({ ...siteSettings, favicon_url: e.target.value })}
                  />
                  <p className="text-[11px] text-muted-foreground">Appears on browser tabs and bookmarks</p>
                </div>
              </div>

              {/* Main Brand Logo */}
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <SignedMediaUploader
                    label="Header / Navbar Logo Image"
                    module="company_logo"
                    resourceId="site-logo"
                    onUploaded={([asset]: SignedMediaAsset[]) => {
                      if (asset) {
                        setSiteSettings((current) => ({
                          ...current,
                          logo_url: asset.publicUrl || asset.path,
                        }));
                      }
                    }}
                  />
                  {siteSettings.logo_url && (
                    <div className="h-12 w-auto max-w-[200px] overflow-hidden rounded-lg border mt-2">
                      <img src={siteSettings.logo_url} alt="Logo preview" className="h-full w-auto object-contain" />
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Logo Direct URL</Label>
                  <Input
                    placeholder="https://.../logo.png"
                    value={siteSettings.logo_url}
                    onChange={(e) => setSiteSettings({ ...siteSettings, logo_url: e.target.value })}
                  />
                </div>
              </div>

              {/* SEO & Platform Info */}
              <div className="space-y-4 pt-2 border-t">
                <div className="space-y-2">
                  <Label>Default Website Title</Label>
                  <Input
                    placeholder="MeroTalent - Higher Education & Career OS"
                    value={siteSettings.site_title}
                    onChange={(e) => setSiteSettings({ ...siteSettings, site_title: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Global Meta Description</Label>
                  <Textarea
                    placeholder="Meta description for search engines..."
                    value={siteSettings.meta_description}
                    onChange={(e) => setSiteSettings({ ...siteSettings, meta_description: e.target.value })}
                    rows={3}
                  />
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Contact Support Email</Label>
                    <Input
                      value={siteSettings.contact_email}
                      onChange={(e) => setSiteSettings({ ...siteSettings, contact_email: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Contact Phone Number</Label>
                    <Input
                      value={siteSettings.contact_phone}
                      onChange={(e) => setSiteSettings({ ...siteSettings, contact_phone: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t flex justify-end">
                <Button variant="hero" onClick={handleSaveBranding} disabled={isSavingSettings}>
                  {isSavingSettings ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  Save Branding & Favicon Settings
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </OperationsPage>
  );
};

export default AdminPageEditor;
