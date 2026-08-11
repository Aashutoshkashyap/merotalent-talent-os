import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Calendar, Plus, Search, MapPin, CheckCircle, XCircle, Pencil, Trash2, Loader2, Star } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { OperationsPage } from "./OperationsUI";
import { SignedMediaUploader, type SignedMediaAsset } from "@/components/media/SignedMediaUploader";

interface EventItem {
  id: string;
  title: string;
  description: string | null;
  event_type: string;
  format: string;
  location: string | null;
  meeting_url: string | null;
  start_date: string;
  end_date: string;
  capacity: number | null;
  ticket_price: number;
  currency: string;
  status: string;
  approval_status: string;
  is_active: boolean;
  is_featured: boolean;
  cover_image_url?: string | null;
  created_at: string;
}

export default function AdminEvents() {
  const { toast } = useToast();
  const [events, setEvents] = useState<EventItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingEvent, setEditingEvent] = useState<EventItem | null>(null);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    event_type: "free",
    format: "offline",
    location: "",
    meeting_url: "",
    start_date: "",
    end_date: "",
    capacity: "",
    ticket_price: "0",
    cover_image_url: "",
    is_active: true,
    is_featured: false,
    approval_status: "approved",
    status: "approved",
  });

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    const { data } = await (supabase as any)
      .from("events")
      .select("*")
      .order("created_at", { ascending: false });

    if (data) setEvents(data as EventItem[]);
    setIsLoading(false);
  };

  const handleSubmit = async () => {
    if (!formData.title.trim() || !formData.start_date || !formData.end_date) {
      toast({ variant: "destructive", title: "Title, start date, and end date are required" });
      return;
    }

    setIsSubmitting(true);

    const payload = {
      title: formData.title,
      description: formData.description || null,
      event_type: formData.event_type,
      format: formData.format,
      location: formData.location || null,
      meeting_url: formData.meeting_url || null,
      start_date: new Date(formData.start_date).toISOString(),
      end_date: new Date(formData.end_date).toISOString(),
      capacity: formData.capacity ? parseInt(formData.capacity, 10) : null,
      ticket_price: parseFloat(formData.ticket_price || "0"),
      cover_image_url: formData.cover_image_url || null,
      is_active: formData.is_active,
      is_featured: formData.is_featured,
      approval_status: formData.approval_status,
      status: formData.status,
    };

    let error;
    if (editingEvent) {
      const res = await (supabase as any).from("events").update(payload).eq("id", editingEvent.id);
      error = res.error;
    } else {
      const res = await (supabase as any).from("events").insert(payload);
      error = res.error;
    }

    if (error) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } else {
      toast({ title: editingEvent ? "Event updated" : "Event created" });
      resetForm();
      fetchEvents();
    }
    setIsSubmitting(false);
  };

  const handleDelete = async (id: string) => {
    const { error } = await (supabase as any).from("events").delete().eq("id", id);
    if (error) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } else {
      toast({ title: "Event deleted" });
      fetchEvents();
    }
  };

  const toggleApproval = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === "approved" ? "pending" : "approved";
    const { error } = await (supabase as any).from("events").update({ approval_status: newStatus, status: newStatus }).eq("id", id);
    if (!error) {
      toast({ title: `Event status changed to ${newStatus}` });
      fetchEvents();
    }
  };

  const openEdit = (event: EventItem) => {
    setEditingEvent(event);
    setFormData({
      title: event.title,
      description: event.description || "",
      event_type: event.event_type || "free",
      format: event.format || "offline",
      location: event.location || "",
      meeting_url: event.meeting_url || "",
      start_date: event.start_date ? event.start_date.slice(0, 16) : "",
      end_date: event.end_date ? event.end_date.slice(0, 16) : "",
      capacity: event.capacity ? event.capacity.toString() : "",
      ticket_price: event.ticket_price ? event.ticket_price.toString() : "0",
      cover_image_url: event.cover_image_url || "",
      is_active: event.is_active ?? true,
      is_featured: event.is_featured ?? false,
      approval_status: event.approval_status || "approved",
      status: event.status || "approved",
    });
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      event_type: "free",
      format: "offline",
      location: "",
      meeting_url: "",
      start_date: "",
      end_date: "",
      capacity: "",
      ticket_price: "0",
      cover_image_url: "",
      is_active: true,
      is_featured: false,
      approval_status: "approved",
      status: "approved",
    });
    setEditingEvent(null);
    setIsDialogOpen(false);
  };

  const filteredEvents = events.filter((e) =>
    e.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <OperationsPage>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold">Events Management</h1>
          <p className="text-muted-foreground">Approve, create, and manage platform events</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => { if (!open) resetForm(); else setIsDialogOpen(open); }}>
          <DialogTrigger asChild>
            <Button variant="hero">
              <Plus className="w-4 h-4 mr-2" />
              Create Event
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingEvent ? "Edit Event" : "Create New Event"}</DialogTitle>
              <DialogDescription>Fill out event details</DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label>Event Title *</Label>
                <Input
                  placeholder="e.g. Annual Tech Symposium"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  placeholder="Event overview..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                />
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Event Type</Label>
                  <Select value={formData.event_type} onValueChange={(v) => setFormData({ ...formData, event_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="free">Free</SelectItem>
                      <SelectItem value="paid">Paid</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Format</Label>
                  <Select value={formData.format} onValueChange={(v) => setFormData({ ...formData, format: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="offline">Offline / In-person</SelectItem>
                      <SelectItem value="online">Online</SelectItem>
                      <SelectItem value="hybrid">Hybrid</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Start Date & Time *</Label>
                  <Input
                    type="datetime-local"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>End Date & Time *</Label>
                  <Input
                    type="datetime-local"
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Ticket Price (NPR)</Label>
                  <Input
                    type="number"
                    value={formData.ticket_price}
                    onChange={(e) => setFormData({ ...formData, ticket_price: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Max Capacity</Label>
                  <Input
                    type="number"
                    placeholder="Unlimited if blank"
                    value={formData.capacity}
                    onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Location</Label>
                <Input
                  placeholder="e.g. Kathmandu University, Dhulikhel"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <SignedMediaUploader
                  label="Event Banner / Cover Image"
                  module="event_cover"
                  resourceId={editingEvent?.id || "new-event"}
                  onUploaded={([asset]: SignedMediaAsset[]) => {
                    if (asset) {
                      setFormData((current) => ({ ...current, cover_image_url: asset.publicUrl || asset.path }));
                    }
                  }}
                />
                {formData.cover_image_url && (
                  <div className="relative h-28 w-full overflow-hidden rounded-xl border">
                    <img src={formData.cover_image_url} alt="Cover preview" className="h-full w-full object-cover" />
                  </div>
                )}
              </div>

              <div className="flex items-center gap-6 pt-2">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={formData.is_active}
                    onCheckedChange={(v) => setFormData({ ...formData, is_active: v })}
                  />
                  <Label>Active</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={formData.is_featured}
                    onCheckedChange={(v) => setFormData({ ...formData, is_featured: v })}
                  />
                  <Label>Featured</Label>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={resetForm}>Cancel</Button>
              <Button variant="hero" onClick={handleSubmit} disabled={isSubmitting}>
                {isSubmitting ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Saving...</> : (editingEvent ? "Update Event" : "Create Event")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search events..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Event Title</TableHead>
              <TableHead>Format & Type</TableHead>
              <TableHead>Dates</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Approval</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredEvents.map((event) => (
              <TableRow key={event.id}>
                <TableCell>
                  <div className="font-medium flex items-center gap-2">
                    {event.is_featured && <Star className="w-4 h-4 text-amber-500 fill-amber-500" />}
                    {event.title}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1.5 capitalize">
                    <Badge variant="outline">{event.format}</Badge>
                    <Badge variant={event.event_type === "free" ? "secondary" : "default"}>
                      {event.event_type}
                    </Badge>
                  </div>
                </TableCell>
                <TableCell>
                  <span className="text-xs text-muted-foreground">
                    {new Date(event.start_date).toLocaleDateString()}
                  </span>
                </TableCell>
                <TableCell>
                  {event.event_type === "free" ? "Free" : `NPR ${event.ticket_price}`}
                </TableCell>
                <TableCell>
                  <Badge variant={event.approval_status === "approved" ? "default" : "secondary"}>
                    {event.approval_status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(event)}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => toggleApproval(event.id, event.approval_status)}>
                      {event.approval_status === "approved" ? <XCircle className="w-4 h-4 text-amber-500" /> : <CheckCircle className="w-4 h-4 text-green-500" />}
                    </Button>
                    <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDelete(event.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {filteredEvents.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  {isLoading ? "Loading events..." : "No events found."}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </OperationsPage>
  );
}
