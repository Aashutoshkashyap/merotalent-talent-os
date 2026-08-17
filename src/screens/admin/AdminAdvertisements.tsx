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
import { Plus, Search, Pencil, Trash2, Image, ExternalLink, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { OperationsPage } from "./OperationsUI";

interface AdItem {
  id: string;
  title: string;
  placement: string;
  image_url: string | null;
  destination_url: string | null;
  sponsor_name: string | null;
  start_date: string;
  end_date: string;
  priority: number;
  status: string;
  is_active: boolean;
  impressions: number;
  clicks: number;
  created_at: string;
}

export default function AdminAdvertisements() {
  const { toast } = useToast();
  const [ads, setAds] = useState<AdItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingAd, setEditingAd] = useState<AdItem | null>(null);

  const [formData, setFormData] = useState({
    title: "",
    placement: "homepage_banner",
    image_url: "",
    destination_url: "",
    sponsor_name: "",
    start_date: "",
    end_date: "",
    priority: "0",
    is_active: true,
  });

  useEffect(() => {
    fetchAds();
  }, []);

  const fetchAds = async () => {
    const { data, error } = await (supabase as any)
      .from("advertisements")
      .select("*")
      .order("priority", { ascending: false });

    if (error) {
      toast({ variant: "destructive", title: "Unable to load advertisements", description: error.message });
    }
    setAds((data || []) as AdItem[]);
    setIsLoading(false);
  };

  const handleSubmit = async () => {
    if (!formData.title.trim() || !formData.start_date || !formData.end_date) {
      toast({ variant: "destructive", title: "Title, start date, and end date required" });
      return;
    }

    setIsSubmitting(true);

    const payload = {
      title: formData.title.trim(),
      placement: formData.placement,
      image_url: formData.image_url || null,
      destination_url: formData.destination_url || null,
      sponsor_name: formData.sponsor_name || null,
      start_date: new Date(formData.start_date).toISOString(),
      end_date: new Date(formData.end_date).toISOString(),
      priority: parseInt(formData.priority || "0", 10),
      status: formData.is_active ? "active" : "draft",
      is_active: formData.is_active,
    };

    let error;
    if (editingAd) {
      const res = await (supabase as any).from("advertisements").update(payload).eq("id", editingAd.id);
      error = res.error;
    } else {
      const res = await (supabase as any).from("advertisements").insert(payload);
      error = res.error;
    }

    if (error) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } else {
      toast({ title: editingAd ? "Ad updated" : "Ad created" });
      resetForm();
      fetchAds();
    }
    setIsSubmitting(false);
  };

  const handleDelete = async (id: string) => {
    const { error } = await (supabase as any).from("advertisements").delete().eq("id", id);
    if (error) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } else {
      toast({ title: "Ad deleted" });
      fetchAds();
    }
  };

  const openEdit = (ad: AdItem) => {
    setEditingAd(ad);
    setFormData({
      title: ad.title,
      placement: ad.placement,
      image_url: ad.image_url || "",
      destination_url: ad.destination_url || "",
      sponsor_name: ad.sponsor_name || "",
      start_date: ad.start_date ? ad.start_date.slice(0, 16) : "",
      end_date: ad.end_date ? ad.end_date.slice(0, 16) : "",
      priority: ad.priority ? ad.priority.toString() : "0",
      is_active: ad.is_active ?? true,
    });
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      title: "",
      placement: "homepage_banner",
      image_url: "",
      destination_url: "",
      sponsor_name: "",
      start_date: "",
      end_date: "",
      priority: "0",
      is_active: true,
    });
    setEditingAd(null);
    setIsDialogOpen(false);
  };

  const filteredAds = ads.filter((ad) =>
    ad.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (ad.sponsor_name || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <OperationsPage>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold">Advertisement Management</h1>
          <p className="text-muted-foreground">Manage homepage banners, sponsored cards, and target ads</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => { if (!open) resetForm(); else setIsDialogOpen(open); }}>
          <DialogTrigger asChild>
            <Button variant="hero">
              <Plus className="w-4 h-4 mr-2" />
              New Banner / Ad
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{editingAd ? "Edit Ad Campaign" : "Create New Ad Campaign"}</DialogTitle>
              <DialogDescription>Set up target placement and schedule</DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label>Campaign Title *</Label>
                <Input
                  placeholder="e.g. Admission Open 2026 Banner"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                />
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Placement</Label>
                  <Select value={formData.placement} onValueChange={(v) => setFormData({ ...formData, placement: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="homepage_banner">Homepage Hero Banner</SelectItem>
                      <SelectItem value="listing_sidebar">Directory Listing Sidebar</SelectItem>
                      <SelectItem value="sponsored_card">Sponsored Card</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Priority Score</Label>
                  <Input
                    type="number"
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Sponsor Name</Label>
                <Input
                  placeholder="e.g. Herald College Kathmandu"
                  value={formData.sponsor_name}
                  onChange={(e) => setFormData({ ...formData, sponsor_name: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>Image URL</Label>
                <Input
                  placeholder="https://..."
                  value={formData.image_url}
                  onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>Destination Link URL</Label>
                <Input
                  placeholder="https://..."
                  value={formData.destination_url}
                  onChange={(e) => setFormData({ ...formData, destination_url: e.target.value })}
                />
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Start Date *</Label>
                  <Input
                    type="datetime-local"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>End Date *</Label>
                  <Input
                    type="datetime-local"
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <Switch
                  checked={formData.is_active}
                  onCheckedChange={(v) => setFormData({ ...formData, is_active: v })}
                />
                <Label>Active Campaign</Label>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={resetForm}>Cancel</Button>
              <Button variant="hero" onClick={handleSubmit} disabled={isSubmitting}>
                {isSubmitting ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Saving...</> : (editingAd ? "Update Ad" : "Save Ad")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search advertisements..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Campaign & Sponsor</TableHead>
              <TableHead>Placement</TableHead>
              <TableHead>Dates</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredAds.map((ad) => (
              <TableRow key={ad.id}>
                <TableCell>
                  <div>
                    <p className="font-semibold">{ad.title}</p>
                    <p className="text-xs text-muted-foreground">{ad.sponsor_name || "MeroTalent"}</p>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="capitalize">{ad.placement.replace(/_/g, " ")}</Badge>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {new Date(ad.start_date).toLocaleDateString()} - {new Date(ad.end_date).toLocaleDateString()}
                </TableCell>
                <TableCell className="font-bold">{ad.priority}</TableCell>
                <TableCell>
                  <Badge variant={ad.is_active ? "default" : "secondary"}>
                    {ad.is_active ? "Active" : "Paused"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    {ad.destination_url && (
                      <Button variant="ghost" size="icon" asChild>
                        <a href={ad.destination_url} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" onClick={() => openEdit(ad)}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDelete(ad.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {filteredAds.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  {isLoading ? "Loading..." : "No advertisements found."}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </OperationsPage>
  );
}
