import { useState, useEffect, useMemo } from "react";
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
import { Calendar, Plus, Search, MapPin, CheckCircle, XCircle, Pencil, Trash2, Loader2, Star, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { OperationsPage } from "./OperationsUI";
import { SystemPagination } from "@/components/ui/SystemPagination";
import { SignedMediaUploader, type SignedMediaAsset } from "@/components/media/SignedMediaUploader";
import { generateEventDetails } from "@/lib/ai/ai-generator";
import {
  createAdminResource,
  deleteAdminResource,
  listAdminResource,
  updateAdminResource,
} from "@/lib/admin/admin-client";

type EventStatus = "pending_approval" | "approved" | "published" | "rejected" | "completed" | "cancelled";

interface EventItem {
  id: string;
  organizer_user_id: string;
  organizer_type: "user" | "college" | "mentor" | "company";
  organizer_id: string | null;
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
  status: EventStatus;
  approval_status: "pending" | "approved" | "rejected";
  rejection_reason: string | null;
  is_active: boolean;
  is_featured: boolean;
  cover_image_url?: string | null;
  attachment_path?: string | null;
  attachment_name?: string | null;
  attachment_mime_type?: string | null;
  created_at: string;
}

interface OrganizerOption {
  user_id: string;
  full_name: string | null;
  email: string;
}

export default function AdminEvents() {
  const { toast } = useToast();
  const [events, setEvents] = useState<EventItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingEvent, setEditingEvent] = useState<EventItem | null>(null);
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const [organizers, setOrganizers] = useState<OrganizerOption[]>([]);

  const [formData, setFormData] = useState({
    title: "",
    organizer_user_id: "",
    organizer_type: "user" as EventItem["organizer_type"],
    organizer_id: "",
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
    attachment_path: "",
    attachment_name: "",
    attachment_mime_type: "",
    is_featured: false,
    status: "pending_approval" as EventStatus,
    rejection_reason: "",
  });

  const handleAIGenerate = async () => {
    if (!formData.title.trim()) {
      toast({
        variant: "destructive",
        title: "Event title required",
        description: "Please type the event title first before generating with AI.",
      });
      return;
    }

    setIsAiGenerating(true);
    try {
      const aiResult = await generateEventDetails(formData.title, formData.format);
      setFormData((current) => ({
        ...current,
        description: current.description || aiResult.description,
      }));
      toast({
        title: "AI Generation Complete!",
        description: "Event description generated successfully.",
      });
    } catch {
      toast({
        variant: "destructive",
        title: "AI Generation failed",
        description: "Unable to generate event details.",
      });
    } finally {
      setIsAiGenerating(false);
    }
  };

  useEffect(() => {
    void Promise.all([fetchEvents(), fetchOrganizers()]);
  }, []);

  const fetchEvents = async () => {
    setIsLoading(true);
    try {
      const data = await listAdminResource<EventItem>("events", {
        page_size: 100,
        sort_by: "created_at",
        sort_direction: "desc",
      });
      setEvents(data);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Unable to load events",
        description: error instanceof Error ? error.message : "The events could not be loaded.",
      });
      setEvents([]);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchOrganizers = async () => {
    const { data, error } = await (supabase as any)
      .from("profiles")
      .select("user_id,full_name,email")
      .eq("account_status", "active")
      .is("deleted_at", null)
      .order("full_name")
      .limit(100);

    if (error) {
      toast({ variant: "destructive", title: "Unable to load event organizers", description: error.message });
      setOrganizers([]);
      return;
    }
    setOrganizers((data || []) as OrganizerOption[]);
  };

  const handleSubmit = async () => {
    if (!formData.organizer_user_id || !formData.title.trim() || !formData.start_date || !formData.end_date) {
      toast({ variant: "destructive", title: "Organizer, title, start date, and end date are required" });
      return;
    }

    if (new Date(formData.end_date) <= new Date(formData.start_date)) {
      toast({ variant: "destructive", title: "End date must be after the start date" });
      return;
    }

    if (formData.organizer_type !== "user" && !formData.organizer_id.trim()) {
      toast({ variant: "destructive", title: "The organizer entity UUID is required" });
      return;
    }

    if (formData.status === "rejected" && !formData.rejection_reason.trim()) {
      toast({ variant: "destructive", title: "A rejection reason is required" });
      return;
    }

    setIsSubmitting(true);

    const payload = {
      title: formData.title,
      organizer_user_id: formData.organizer_user_id,
      organizer_type: formData.organizer_type,
      organizer_id: formData.organizer_type === "user" ? null : formData.organizer_id || null,
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
      attachment_path: formData.attachment_path || null,
      attachment_name: formData.attachment_name || null,
      attachment_mime_type: formData.attachment_mime_type || null,
      is_featured: formData.is_featured,
      status: formData.status,
      rejection_reason: formData.status === "rejected" ? formData.rejection_reason.trim() : null,
    };

    try {
      if (editingEvent) {
        await updateAdminResource<EventItem>("events", editingEvent.id, payload);
      } else {
        await createAdminResource<EventItem>("events", payload);
      }
      toast({ title: editingEvent ? "Event updated" : "Event created" });
      resetForm();
      await fetchEvents();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Unable to save event",
        description: error instanceof Error ? error.message : "The event could not be saved.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Remove this event from active administration views?")) return;
    try {
      await deleteAdminResource("events", id);
      toast({ title: "Event removed" });
      await fetchEvents();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Unable to remove event",
        description: error instanceof Error ? error.message : "The event could not be removed.",
      });
    }
  };

  const updateEventStatus = async (event: EventItem, status: EventStatus) => {
    let rejectionReason: string | null | undefined;
    if (status === "rejected") {
      rejectionReason = window.prompt("Reason for rejecting this event:", event.rejection_reason || "");
      if (rejectionReason === null) return;
      if (!rejectionReason.trim()) {
        toast({ variant: "destructive", title: "A rejection reason is required" });
        return;
      }
    }

    try {
      await updateAdminResource<EventItem>("events", event.id, {
        status,
        ...(status === "rejected" ? { rejection_reason: rejectionReason?.trim() } : {}),
      });
      toast({ title: `Event marked ${status.replace(/_/g, " ")}` });
      await fetchEvents();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Unable to update event status",
        description: error instanceof Error ? error.message : "The event status could not be changed.",
      });
    }
  };

  const openEdit = (event: EventItem) => {
    setEditingEvent(event);
    setFormData({
      title: event.title,
      organizer_user_id: event.organizer_user_id,
      organizer_type: event.organizer_type,
      organizer_id: event.organizer_id || "",
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
      attachment_path: event.attachment_path || "",
      attachment_name: event.attachment_name || "",
      attachment_mime_type: event.attachment_mime_type || "",
      is_featured: event.is_featured ?? false,
      status: event.status || "pending_approval",
      rejection_reason: event.rejection_reason || "",
    });
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      title: "",
      organizer_user_id: "",
      organizer_type: "user",
      organizer_id: "",
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
      attachment_path: "",
      attachment_name: "",
      attachment_mime_type: "",
      is_featured: false,
      status: "pending_approval",
      rejection_reason: "",
    });
    setEditingEvent(null);
    setIsDialogOpen(false);
  };

  const filteredEvents = events.filter((e) =>
    e.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const [eventsPage, setEventsPage] = useState(1);
  const [eventsPageSize, setEventsPageSize] = useState(15);
  const paginatedEvents = useMemo(() => {
    const start = (eventsPage - 1) * eventsPageSize;
    return filteredEvents.slice(start, start + eventsPageSize);
  }, [filteredEvents, eventsPage, eventsPageSize]);

  const organizerNames = new Map(
    organizers.map((organizer) => [
      organizer.user_id,
      organizer.full_name || organizer.email,
    ]),
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
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Organizer *</Label>
                  <Select
                    value={formData.organizer_user_id}
                    onValueChange={(organizer_user_id) => setFormData({ ...formData, organizer_user_id })}
                  >
                    <SelectTrigger><SelectValue placeholder="Select an organizer" /></SelectTrigger>
                    <SelectContent>
                      {organizers.map((organizer) => (
                        <SelectItem key={organizer.user_id} value={organizer.user_id}>
                          {organizer.full_name || organizer.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Organizer Type</Label>
                  <Select
                    value={formData.organizer_type}
                    onValueChange={(organizer_type: EventItem["organizer_type"]) =>
                      setFormData({
                        ...formData,
                        organizer_type,
                        organizer_id: organizer_type === "user" ? "" : formData.organizer_id,
                      })
                    }
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user">User</SelectItem>
                      <SelectItem value="college">College</SelectItem>
                      <SelectItem value="mentor">Mentor</SelectItem>
                      <SelectItem value="company">Company</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {formData.organizer_type !== "user" && (
                <div className="space-y-2">
                  <Label>Organizer Entity UUID</Label>
                  <Input
                    placeholder={`Select the ${formData.organizer_type} record UUID`}
                    value={formData.organizer_id}
                    onChange={(e) => setFormData({ ...formData, organizer_id: e.target.value })}
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label>Event Title *</Label>
                <Input
                  placeholder="e.g. Annual Tech Symposium"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                />
              </div>

              <Button
                type="button"
                variant="outline"
                className="w-full border-2 border-dashed border-[#c2410c]/30 text-[#c2410c] hover:bg-[#fff5ed]"
                onClick={handleAIGenerate}
                disabled={isAiGenerating || !formData.title.trim()}
              >
                {isAiGenerating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating event description with AI...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Generate Description & Overview with AI
                  </>
                )}
              </Button>

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

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Location</Label>
                  <Input
                    placeholder="e.g. Kathmandu University, Dhulikhel"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Online Meeting URL</Label>
                  <Input
                    placeholder="https://meet.example.com/event"
                    value={formData.meeting_url}
                    onChange={(e) => setFormData({ ...formData, meeting_url: e.target.value })}
                  />
                </div>
              </div>

              {editingEvent ? (
                <div className="space-y-2">
                  <SignedMediaUploader
                    label="Event Banner Image"
                    module="event_cover"
                    resourceId={editingEvent.id}
                    onUploaded={([asset]: SignedMediaAsset[]) => {
                      if (asset) {
                        setFormData((current) => ({
                          ...current,
                          cover_image_url: asset.publicUrl || asset.path,
                        }));
                      }
                    }}
                  />
                  {formData.cover_image_url && (
                    <div className="relative h-28 w-full overflow-hidden rounded-xl border">
                      <img
                        src={formData.cover_image_url}
                        alt="Cover preview"
                        className="h-full w-full object-cover"
                      />
                    </div>
                  )}
                  <SignedMediaUploader
                    label="Private event proposal or supporting document"
                    module="event_attachment"
                    resourceId={editingEvent.id}
                    onUploaded={([asset]: SignedMediaAsset[]) => {
                      if (asset) {
                        setFormData((current) => ({
                          ...current,
                          attachment_path: asset.path,
                          attachment_name: asset.fileName,
                          attachment_mime_type: asset.contentType,
                        }));
                      }
                    }}
                  />
                  {formData.attachment_path && (
                    <p className="text-xs font-semibold text-emerald-700">Attached privately: {formData.attachment_name || "Event document"}</p>
                  )}
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-border/80 bg-muted/10 p-4 text-xs text-muted-foreground">
                  💡 Save the event draft first to upload event banner images and attachments with verified storage security.
                </div>
              )}

              <div className="grid sm:grid-cols-2 gap-4 pt-2 items-end">
                <div className="space-y-2">
                  <Label>Workflow Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(status: EventStatus) => setFormData({ ...formData, status })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending_approval">Pending approval</SelectItem>
                      <SelectItem value="approved">Approved</SelectItem>
                      <SelectItem value="published">Published</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={formData.is_featured}
                    onCheckedChange={(v) => setFormData({ ...formData, is_featured: v })}
                  />
                  <Label>Featured</Label>
                </div>
              </div>

              {formData.status === "rejected" && (
                <div className="space-y-2">
                  <Label>Rejection Reason *</Label>
                  <Textarea
                    value={formData.rejection_reason}
                    onChange={(e) => setFormData({ ...formData, rejection_reason: e.target.value })}
                    placeholder="Explain what the organizer should correct."
                    rows={2}
                  />
                </div>
              )}
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
            {paginatedEvents.map((event) => (
              <TableRow key={event.id}>
                <TableCell>
                  <div className="font-medium flex items-center gap-2">
                    {event.is_featured && <Star className="w-4 h-4 text-amber-500 fill-amber-500" />}
                    {event.title}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {organizerNames.get(event.organizer_user_id) || event.organizer_user_id}
                  </p>
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
                  <Badge variant={event.status === "published" ? "default" : "secondary"} className="capitalize">
                    {event.status.replace(/_/g, " ")}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(event)}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                    {event.approval_status !== "approved" && (
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Approve event"
                        onClick={() => updateEventStatus(event, "approved")}
                      >
                        <CheckCircle className="w-4 h-4 text-green-600" />
                      </Button>
                    )}
                    {event.status !== "published" && event.approval_status === "approved" && (
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Publish event"
                        onClick={() => updateEventStatus(event, "published")}
                      >
                        <Star className="w-4 h-4 text-amber-500" />
                      </Button>
                    )}
                    {event.status !== "rejected" && (
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Reject event"
                        onClick={() => updateEventStatus(event, "rejected")}
                      >
                        <XCircle className="w-4 h-4 text-amber-600" />
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDelete(event.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {paginatedEvents.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  {isLoading ? "Loading events..." : "No events found."}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        <div className="border-t border-slate-100 px-4 bg-slate-50/50">
          <SystemPagination
            currentPage={eventsPage}
            totalPages={Math.ceil(filteredEvents.length / eventsPageSize)}
            totalItems={filteredEvents.length}
            pageSize={eventsPageSize}
            onPageChange={setEventsPage}
            onPageSizeChange={(size) => { setEventsPageSize(size); setEventsPage(1); }}
            itemLabel="events"
          />
        </div>
      </Card>
    </OperationsPage>
  );
}
