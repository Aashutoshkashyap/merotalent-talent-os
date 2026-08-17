import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Search, Star, Trash2, Loader2, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { OperationsPage } from "./OperationsUI";
import { SEED_FEATURED_ITEMS } from "@/lib/admin/admin-seed-fallbacks";

interface FeaturedItem {
  id: string;
  entity_type: string;
  entity_id: string;
  title: string | null;
  placement: string;
  priority: number;
  is_active: boolean;
  created_at: string;
}

export default function AdminFeaturedItems() {
  const { toast } = useToast();
  const [featured, setFeatured] = useState<FeaturedItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    entity_type: "college",
    entity_id: "",
    title: "",
    placement: "homepage",
    priority: "0",
    is_active: true,
  });

  interface EntityOption {
    id: string;
    label: string;
    subtitle?: string;
  }

  const [availableEntities, setAvailableEntities] = useState<EntityOption[]>([]);
  const [isFetchingEntities, setIsFetchingEntities] = useState(false);

  useEffect(() => {
    const fetchEntities = async () => {
      setIsFetchingEntities(true);
      let options: EntityOption[] = [];

      try {
        if (formData.entity_type === "college") {
          const { data } = await supabase.from("institutes").select("id, name, location").order("name").limit(100);
          if (data) {
            options = data.map((item) => ({
              id: item.id,
              label: item.name,
              subtitle: item.location || "College / Institution",
            }));
          }
        } else if (formData.entity_type === "job") {
          const { data } = await (supabase as any).from("jobs").select("id, title, company_name").order("title").limit(100);
          if (data) {
            options = (data as any[]).map((item) => ({
              id: item.id,
              label: item.title,
              subtitle: item.company_name || "Job listing",
            }));
          }
        } else if (formData.entity_type === "course") {
          const { data } = await supabase.from("courses").select("id, title").order("title").limit(100);
          if (data) {
            options = data.map((item) => ({
              id: item.id,
              label: item.title,
              subtitle: "LMS Course",
            }));
          }
        } else if (formData.entity_type === "event") {
          const { data } = await (supabase as any).from("events").select("id, title, location").order("title").limit(100);
          if (data) {
            options = data.map((item: any) => ({
              id: item.id,
              label: item.title,
              subtitle: item.location || "Event",
            }));
          }
        } else if (formData.entity_type === "mentor") {
          const { data } = await supabase.from("mentors").select("id, profiles(full_name, email)").limit(100);
          if (data) {
            options = data.map((item: any) => ({
              id: item.id,
              label: item.profiles?.full_name || "Mentor Profile",
              subtitle: item.profiles?.email || "Mentor",
            }));
          }
        }
      } catch {
        // Fall back gracefully
      }

      setAvailableEntities(options);
      setIsFetchingEntities(false);
    };

    if (isDialogOpen) {
      void fetchEntities();
    }
  }, [formData.entity_type, isDialogOpen]);

  const fetchFeatured = async () => {
    const { data } = await (supabase as any)
      .from("featured_items")
      .select("*")
      .order("priority", { ascending: false });

    if (data && data.length > 0) {
      setFeatured(data as FeaturedItem[]);
    } else {
      setFeatured(SEED_FEATURED_ITEMS as FeaturedItem[]);
    }
    setIsLoading(false);
  };

  const handleSubmit = async () => {
    if (!formData.entity_id.trim()) {
      toast({ variant: "destructive", title: "Target Entity UUID is required" });
      return;
    }

    setIsSubmitting(true);

    const payload = {
      entity_type: formData.entity_type,
      entity_id: formData.entity_id.trim(),
      title: formData.title || null,
      placement: formData.placement,
      priority: parseInt(formData.priority || "0", 10),
      is_active: formData.is_active,
    };

    const { error } = await (supabase as any).from("featured_items").insert(payload);

    if (error) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } else {
      toast({ title: "Featured item added" });
      setIsDialogOpen(false);
      resetForm();
      fetchFeatured();
    }
    setIsSubmitting(false);
  };

  const handleDelete = async (id: string) => {
    const { error } = await (supabase as any).from("featured_items").delete().eq("id", id);
    if (error) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } else {
      toast({ title: "Featured item removed" });
      fetchFeatured();
    }
  };

  const resetForm = () => {
    setFormData({
      entity_type: "college",
      entity_id: "",
      title: "",
      placement: "homepage",
      priority: "0",
      is_active: true,
    });
  };

  const filteredFeatured = featured.filter((f) =>
    (f.title || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
    f.entity_type.toLowerCase().includes(searchQuery.toLowerCase()) ||
    f.entity_id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <OperationsPage>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold">Featured Content Manager</h1>
          <p className="text-muted-foreground">Dynamically feature colleges, mentors, jobs, courses, and events on the homepage</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="hero">
              <Plus className="w-4 h-4 mr-2" />
              Feature New Entity
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Feature Platform Item</DialogTitle>
              <DialogDescription>Mark entity as featured on homepage or directory sections</DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Entity Type</Label>
                  <Select value={formData.entity_type} onValueChange={(v) => setFormData({ ...formData, entity_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="college">College / Institute</SelectItem>
                      <SelectItem value="mentor">Mentor</SelectItem>
                      <SelectItem value="job">Job Listing</SelectItem>
                      <SelectItem value="event">Event</SelectItem>
                      <SelectItem value="course">Course</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Priority</Label>
                  <Input
                    type="number"
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Select Target Entity *</Label>
                {isFetchingEntities ? (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Loading available {formData.entity_type}s...
                  </div>
                ) : availableEntities.length > 0 ? (
                  <Select
                    value={formData.entity_id}
                    onValueChange={(val) => {
                      const selected = availableEntities.find((e) => e.id === val);
                      setFormData({
                        ...formData,
                        entity_id: val,
                        title: formData.title || selected?.label || "",
                      });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={`Choose a ${formData.entity_type}...`} />
                    </SelectTrigger>
                    <SelectContent>
                      {availableEntities.map((opt) => (
                        <SelectItem key={opt.id} value={opt.id}>
                          <div className="flex flex-col">
                            <span className="font-medium">{opt.label}</span>
                            {opt.subtitle && <span className="text-[10px] text-muted-foreground">{opt.subtitle}</span>}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    placeholder="Enter record UUID..."
                    value={formData.entity_id}
                    onChange={(e) => setFormData({ ...formData, entity_id: e.target.value })}
                  />
                )}
              </div>

              <div className="space-y-2">
                <Label>Display Label / Title</Label>
                <Input
                  placeholder="Optional custom display title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <Switch
                  checked={formData.is_active}
                  onCheckedChange={(v) => setFormData({ ...formData, is_active: v })}
                />
                <Label>Active Featured Status</Label>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
              <Button variant="hero" onClick={handleSubmit} disabled={isSubmitting}>
                {isSubmitting ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Saving...</> : "Add Featured"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search featured items..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Type</TableHead>
              <TableHead>Target Entity ID / Label</TableHead>
              <TableHead>Placement</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredFeatured.map((item) => (
              <TableRow key={item.id}>
                <TableCell>
                  <Badge variant="outline" className="capitalize flex items-center gap-1 w-fit">
                    <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                    {item.entity_type}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div>
                    <p className="font-semibold">{item.title || "Featured Item"}</p>
                    <p className="text-xs text-muted-foreground font-mono">{item.entity_id}</p>
                  </div>
                </TableCell>
                <TableCell className="capitalize">{item.placement}</TableCell>
                <TableCell className="font-bold">{item.priority}</TableCell>
                <TableCell>
                  <Badge variant={item.is_active ? "default" : "secondary"}>
                    {item.is_active ? "Active" : "Inactive"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDelete(item.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {filteredFeatured.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  {isLoading ? "Loading..." : "No featured items found."}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </OperationsPage>
  );
}
