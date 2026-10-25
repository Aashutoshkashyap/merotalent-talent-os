import { isNeonClientRuntime } from "@/lib/backend-selection";
import EventTicketManager from "@/components/events/EventTicketManager";
import { useState, useEffect, useMemo, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Calendar,
  Plus,
  Search,
  MapPin,
  CheckCircle,
  XCircle,
  Pencil,
  Trash2,
  Loader2,
  Sparkles,
  Layers,
  Ticket,
  Users,
  QrCode,
  Download,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Eye,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { OperationsPage } from "./OperationsUI";
import { SystemPagination } from "@/components/ui/SystemPagination";
import { SignedMediaUploader, type SignedMediaAsset } from "@/components/media/SignedMediaUploader";
import { generateEventDetails } from "@/lib/ai/ai-generator";
import {
  createAdminResource,
  deleteAdminResource,
  listAdminResource,
  listNeonAdminOptions,
  listNeonAdminEventPanel,
  createNeonAdminEventPanel,
  updateAdminResource,
} from "@/lib/admin/admin-client";
import { useAuth } from "@/contexts/AuthContext";
import { checkinTicket } from "@/lib/events/events-client";

type EventStatus = "pending_approval" | "approved" | "published" | "rejected" | "completed" | "cancelled" | "postponed";
type LifecycleStatus = "draft" | "published" | "registration_open" | "registration_closed" | "ongoing" | "completed" | "cancelled" | "postponed";
const isNeonStaging=isNeonClientRuntime();

interface EventCategory {
  id: string;
  name: string;
  slug: string;
}

interface EventItem {
  id: string;
  organizer_user_id: string;
  organizer_type: "user" | "college" | "mentor" | "company";
  organizer_id: string | null;
  category_id?: string | null;
  title: string;
  slug?: string | null;
  short_description?: string | null;
  description: string | null;
  event_type: string;
  format: string;
  location: string | null;
  meeting_url: string | null;
  start_date: string;
  end_date: string;
  registration_open_at?: string | null;
  registration_close_at?: string | null;
  capacity: number | null;
  ticket_price: number;
  currency: string;
  status: EventStatus;
  lifecycle_status?: LifecycleStatus;
  approval_status: "pending" | "approved" | "rejected";
  rejection_reason: string | null;
  is_active: boolean;
  is_featured: boolean;
  is_multi_program?: boolean;
  terms_and_conditions?: string | null;
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
  const { session } = useAuth();
  const { toast } = useToast();
  const [events, setEvents] = useState<EventItem[]>([]);
  const [categories, setCategories] = useState<EventCategory[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingEvent, setEditingEvent] = useState<EventItem | null>(null);
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const [organizers, setOrganizers] = useState<OrganizerOption[]>([]);

  // Sub-management modals
  const [managingProgramsEvent, setManagingProgramsEvent] = useState<EventItem | null>(null);
  const [programsList, setProgramsList] = useState<any[]>([]);
  const [newProgram, setNewProgram] = useState({ title: "", start_time: "", end_time: "", venue: "", capacity: "", speaker: "" });

  const [managingTicketsEvent, setManagingTicketsEvent] = useState<EventItem | null>(null);
  const [ticketTypesList, setTicketTypesList] = useState<any[]>([]);
  const [newTicketType, setNewTicketType] = useState({
    name: "",
    ticket_kind: "individual",
    price: "0",
    total_quantity: "",
    min_team_size: "1",
    max_team_size: "4",
    min_per_order: "1",
    max_per_order: "10",
    description: "",sales_start_at: "",sales_end_at: "",benefits: "",
  });

  const [managingRegistrationsEvent, setManagingRegistrationsEvent] = useState<EventItem | null>(null);
  const [registrationsList, setRegistrationsList] = useState<any[]>([]);
  const [regLoading, setRegLoading] = useState(false);

  // Scanner modal
  const [scannerOpen, setScannerOpen] = useState(false);
  const [qrInput, setQrInput] = useState("");
  const [scannerFeedback, setScannerFeedback] = useState<any>(null);
  const [scanning, setScanning] = useState(false);

  // Lifecycle modal
  const [lifecycleModalEvent, setLifecycleModalEvent] = useState<EventItem | null>(null);
  const [targetLifecycle, setTargetLifecycle] = useState<LifecycleStatus>("published");
  const [lifecycleReason, setLifecycleReason] = useState("");
  const [postponedDate, setPostponedDate] = useState("");

  const [formData, setFormData] = useState({
    title: "",
    organizer_user_id: "",
    organizer_type: "user" as EventItem["organizer_type"],
    organizer_id: "",
    category_id: "",
    short_description: "",
    description: "",
    event_type: "free",
    format: "offline",
    location: "",
    meeting_url: "",
    start_date: "",
    end_date: "",
    registration_open_at: "",
    registration_close_at: "",
    capacity: "",
    ticket_price: "0",
    is_multi_program: false,
    terms_and_conditions: "",
    cover_image_url: "",
    attachment_path: "",
    attachment_name: "",
    attachment_mime_type: "",
    is_featured: false,
    status: "pending_approval" as EventStatus,
    lifecycle_status: "draft" as LifecycleStatus,
    rejection_reason: "",
  });

  const fetchCategories = useCallback(async () => {
    if(isNeonStaging) {
      try {setCategories(await listNeonAdminOptions<EventCategory>("event-categories"));}
      catch(error) {toast({variant:"destructive",title:"Unable to load categories",description:error instanceof Error?error.message:"Try again shortly."});}
      return;
    }
    const { data } = await (supabase as any).from("event_categories").select("id, name, slug").order("display_order");
    if (data) setCategories(data);
  },[toast]);

  const fetchEvents = useCallback(async () => {
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
  },[toast]);

  const fetchOrganizers = useCallback(async () => {
    if(isNeonStaging) {
      try {setOrganizers(await listNeonAdminOptions<OrganizerOption>("owners"));}
      catch(error) {toast({variant:"destructive",title:"Unable to load organizers",description:error instanceof Error?error.message:"Try again shortly."});}
      return;
    }
    const { data } = await (supabase as any)
      .from("profiles")
      .select("id,user_id,full_name,email")
      .eq("account_status", "active")
      .is("deleted_at", null)
      .order("full_name")
      .limit(100);
    if (data) {
      setOrganizers(
        data.map((item: any) => ({
          user_id: item.user_id || item.id,
          full_name: item.full_name,
          email: item.email,
        }))
      );
    }
  },[toast]);

  useEffect(()=>{void Promise.all([fetchEvents(),fetchOrganizers(),fetchCategories()]);},[fetchEvents,fetchOrganizers,fetchCategories]);

  const handleAIGenerate = async () => {
    if (!formData.title.trim()) {
      toast({ variant: "destructive", title: "Title required", description: "Enter title before generating with AI." });
      return;
    }
    setIsAiGenerating(true);
    try {
      const aiResult = await generateEventDetails(formData.title, formData.format);
      setFormData((current) => ({
        ...current,
        description: current.description || aiResult.description,
        short_description: current.short_description || aiResult.description?.slice(0, 160),
      }));
      toast({ title: "AI Generation Complete!" });
    } catch {
      toast({ variant: "destructive", title: "AI Generation failed" });
    } finally {
      setIsAiGenerating(false);
    }
  };

  const handleOpenCreate = () => {
    setEditingEvent(null);
    setFormData({
      title: "",
      organizer_user_id: session?.user?.id || "",
      organizer_type: "user",
      organizer_id: "",
      category_id: categories[0]?.id || "",
      short_description: "",
      description: "",
      event_type: "free",
      format: "offline",
      location: "",
      meeting_url: "",
      start_date: new Date(Date.now() + 86400000).toISOString().slice(0, 16),
      end_date: new Date(Date.now() + 86400000 * 2).toISOString().slice(0, 16),
      registration_open_at: new Date().toISOString().slice(0, 16),
      registration_close_at: new Date(Date.now() + 86400000).toISOString().slice(0, 16),
      capacity: "100",
      ticket_price: "0",
      is_multi_program: false,
      terms_and_conditions: "",
      cover_image_url: "",
      attachment_path: "",
      attachment_name: "",
      attachment_mime_type: "",
      is_featured: false,
      status: "approved",
      lifecycle_status: "published",
      rejection_reason: "",
    });
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (eventItem: EventItem) => {
    setEditingEvent(eventItem);
    setFormData({
      title: eventItem.title,
      organizer_user_id: eventItem.organizer_user_id,
      organizer_type: eventItem.organizer_type,
      organizer_id: eventItem.organizer_id || "",
      category_id: eventItem.category_id || "",
      short_description: eventItem.short_description || "",
      description: eventItem.description || "",
      event_type: eventItem.event_type,
      format: eventItem.format,
      location: eventItem.location || "",
      meeting_url: eventItem.meeting_url || "",
      start_date: eventItem.start_date ? new Date(eventItem.start_date).toISOString().slice(0, 16) : "",
      end_date: eventItem.end_date ? new Date(eventItem.end_date).toISOString().slice(0, 16) : "",
      registration_open_at: eventItem.registration_open_at ? new Date(eventItem.registration_open_at).toISOString().slice(0, 16) : "",
      registration_close_at: eventItem.registration_close_at ? new Date(eventItem.registration_close_at).toISOString().slice(0, 16) : "",
      capacity: eventItem.capacity ? String(eventItem.capacity) : "",
      ticket_price: String(eventItem.ticket_price || 0),
      is_multi_program: Boolean(eventItem.is_multi_program),
      terms_and_conditions: eventItem.terms_and_conditions || "",
      cover_image_url: eventItem.cover_image_url || "",
      attachment_path: eventItem.attachment_path || "",
      attachment_name: eventItem.attachment_name || "",
      attachment_mime_type: eventItem.attachment_mime_type || "",
      is_featured: eventItem.is_featured,
      status: eventItem.status,
      lifecycle_status: eventItem.lifecycle_status || "draft",
      rejection_reason: eventItem.rejection_reason || "",
    });
    setIsDialogOpen(true);
  };

  const handleSaveEvent = async () => {
    if (!formData.title.trim()) {
      toast({ variant: "destructive", title: "Event title required" });
      return;
    }
    setIsSubmitting(true);
    try {
      const payload = {
        title: formData.title.trim(),
        organizer_user_id: formData.organizer_user_id || session?.user?.id,
        organizer_type: formData.organizer_type,
        organizer_id: formData.organizer_id ? formData.organizer_id : null,
        category_id: formData.category_id ? formData.category_id : null,
        short_description: formData.short_description ? formData.short_description : null,
        description: formData.description ? formData.description : null,
        event_type: formData.event_type,
        format: formData.format,
        location: formData.location ? formData.location : null,
        meeting_url: formData.meeting_url ? formData.meeting_url : null,
        start_date: new Date(formData.start_date).toISOString(),
        end_date: new Date(formData.end_date).toISOString(),
        registration_open_at: formData.registration_open_at ? new Date(formData.registration_open_at).toISOString() : null,
        registration_close_at: formData.registration_close_at ? new Date(formData.registration_close_at).toISOString() : null,
        capacity: formData.capacity ? parseInt(formData.capacity, 10) : null,
        ticket_price: parseFloat(formData.ticket_price) || 0,
        currency: "NPR",
        is_multi_program: formData.is_multi_program,
        terms_and_conditions: formData.terms_and_conditions || null,
        cover_image_url: formData.cover_image_url || null,
        attachment_path: formData.attachment_path || null,
        attachment_name: formData.attachment_name || null,
        attachment_mime_type: formData.attachment_mime_type || null,
        is_featured: formData.is_featured,
        status: formData.status,
        lifecycle_status: formData.lifecycle_status,
        rejection_reason:formData.status === "rejected" ? formData.rejection_reason || null : null,
      };

      if (editingEvent) {
        await updateAdminResource("events", editingEvent.id, payload);
        toast({ title: "Event Updated" });
      } else {
        await createAdminResource("events", payload);
        toast({ title: "Event Created Successfully" });
      }
      setIsDialogOpen(false);
      void fetchEvents();
    } catch (err: any) {
      toast({ variant: "destructive", title: "Save failed", description: err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteEvent = async (id: string) => {
    if (!confirm("Are you sure you want to delete this event?")) return;
    try {
      await deleteAdminResource("events", id);
      toast({ title: "Event Deleted" });
      void fetchEvents();
    } catch (err: any) {
      toast({ variant: "destructive", title: "Delete failed", description: err.message });
    }
  };

  // Program Management Handlers
  const handleOpenPrograms = async (eventItem: EventItem) => {
    setManagingProgramsEvent(eventItem);
    if(isNeonStaging) {
      try {setProgramsList(await listNeonAdminEventPanel(eventItem.id,"programs"));}
      catch(error) {toast({variant:"destructive",title:"Unable to load sessions",description:error instanceof Error?error.message:"Try again shortly."});setProgramsList([]);}
    } else {
      const { data } = await (supabase as any)
      .from("event_programs")
      .select("*")
      .eq("event_id", eventItem.id)
      .is("deleted_at", null)
      .order("start_time");
    setProgramsList(data || []);
    }
    setNewProgram({
      title: "",
      start_time: eventItem.start_date ? new Date(eventItem.start_date).toISOString().slice(0, 16) : "",
      end_time: eventItem.end_date ? new Date(eventItem.end_date).toISOString().slice(0, 16) : "",
      venue: eventItem.location || "",
      capacity: "",
      speaker: "",
    });
  };

  const handleAddProgram = async () => {
    if (!managingProgramsEvent || !newProgram.title.trim()) return;
    try {
      const payload={
        title: newProgram.title.trim(),
        start_time: new Date(newProgram.start_time).toISOString(),
        end_time: new Date(newProgram.end_time).toISOString(),
        venue: newProgram.venue || null,
        capacity: newProgram.capacity ? parseInt(newProgram.capacity, 10) : null,
        speaker_or_organizer: newProgram.speaker || null,
      };
      if(isNeonStaging) await createNeonAdminEventPanel(managingProgramsEvent.id,"programs",payload);
      else {const {error}=await (supabase as any).from("event_programs").insert({event_id:managingProgramsEvent.id,...payload});if(error) throw error;}
      toast({ title: "Program Session Added" });
      handleOpenPrograms(managingProgramsEvent);
    } catch (err: any) {
      toast({ variant: "destructive", title: "Failed to add session", description: err.message });
    }
  };

  // Ticket Types Management Handlers
  const handleOpenTicketTypes = async (eventItem: EventItem) => {
    setManagingTicketsEvent(eventItem);
    if(isNeonStaging) {
      try {setTicketTypesList(await listNeonAdminEventPanel(eventItem.id,"tickets"));}
      catch(error) {toast({variant:"destructive",title:"Unable to load ticket tiers",description:error instanceof Error?error.message:"Try again shortly."});setTicketTypesList([]);}
    } else {
    const { data } = await (supabase as any)
      .from("event_ticket_types")
      .select("*")
      .eq("event_id", eventItem.id)
      .is("deleted_at", null)
      .order("price");
    setTicketTypesList(data || []);
    }
    setNewTicketType({
      name: "",
      ticket_kind: "individual",
      price: "0",
      total_quantity: "100",
      min_team_size: "1",
      max_team_size: "4",
      min_per_order: "1",
      max_per_order: "10",
      description: "",sales_start_at: "",sales_end_at: "",benefits: "",
    });
  };

  const handleAddTicketType = async () => {
    if (!managingTicketsEvent || !newTicketType.name.trim()) return;
    try {
      const payload={
        name: newTicketType.name.trim(),
        ticket_kind: newTicketType.ticket_kind,
        price: parseFloat(newTicketType.price) || 0,
        currency: "NPR",
        total_quantity: newTicketType.total_quantity ? parseInt(newTicketType.total_quantity, 10) : null,
        min_team_size: parseInt(newTicketType.min_team_size, 10) || 1,
        max_team_size: parseInt(newTicketType.max_team_size, 10) || 1,
        min_per_order: newTicketType.ticket_kind === "individual" ? parseInt(newTicketType.min_per_order, 10) || 1 : 1,
        max_per_order: newTicketType.ticket_kind === "individual" ? parseInt(newTicketType.max_per_order, 10) || 10 : 1,
        description: newTicketType.description.trim() || null,
        sales_start_at: newTicketType.sales_start_at ? new Date(newTicketType.sales_start_at).toISOString() : null,
        sales_end_at: newTicketType.sales_end_at ? new Date(newTicketType.sales_end_at).toISOString() : null,
        eligibility_rules: { benefits: newTicketType.benefits.split("\n").map(item => item.trim()).filter(Boolean) },
        is_active: true,
      };
      if(isNeonStaging) await createNeonAdminEventPanel(managingTicketsEvent.id,"tickets",payload);
      else {const {error}=await (supabase as any).from("event_ticket_types").insert({event_id:managingTicketsEvent.id,...payload});if(error) throw error;}
      toast({ title: "Ticket Tier Added" });
      handleOpenTicketTypes(managingTicketsEvent);
    } catch (err: any) {
      toast({ variant: "destructive", title: "Failed to add ticket tier", description: err.message });
    }
  };

  // Registrations Viewer
  const handleOpenRegistrations = async (eventItem: EventItem) => {
    setManagingRegistrationsEvent(eventItem);
    setRegLoading(true);
    try {
      if(isNeonStaging) {setRegistrationsList(await listNeonAdminEventPanel(eventItem.id,"registrations"));return;}
      const { data } = await (supabase as any)
        .from("event_registrations")
        .select(`
          id,
          registration_number,
          team_name,
          status,
          payment_status,
          ticket_quantity,
          attendee_count,
          total_amount,
          registered_at,
          user:user_id (
            id,
            email
          ),
          ticket_type:ticket_type_id (
            name
          ),
          participants:event_participants (
            id,
            full_name,
            email,
            phone,
            student_id,
            role_in_team
          )
        `)
        .eq("event_id", eventItem.id)
        .order("registered_at", { ascending: false });
      setRegistrationsList(data || []);
    } catch (err: any) {
      toast({ variant: "destructive", title: "Failed to load registrations" });
    } finally {
      setRegLoading(false);
    }
  };

  // Live QR Check-in verification
  const handlePerformCheckin = async () => {
    if (!qrInput.trim() || !session?.access_token) return;
    setScanning(true);
    try {
      const res = await checkinTicket(qrInput.trim(), session.access_token, "Admin Desk Scanner");
      setScannerFeedback(res);
      if (res.success) {
        toast({ title: "Check-in Successful!", description: res.message });
        setQrInput("");
      } else {
        toast({ variant: "destructive", title: "Check-in Warning", description: res.message });
      }
    } catch (err: any) {
      setScannerFeedback({ success: false, message: err.message });
    } finally {
      setScanning(false);
    }
  };

  // Lifecycle Update
  const handleUpdateLifecycle = async () => {
    if (!lifecycleModalEvent || !session?.access_token) return;
    try {
      const res = await fetch(`/api/v1/events/${lifecycleModalEvent.id}/lifecycle`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          lifecycleStatus: targetLifecycle,
          cancellationReason: targetLifecycle === "cancelled" ? lifecycleReason : undefined,
          postponedReason: targetLifecycle === "postponed" ? lifecycleReason : undefined,
          postponedDate: targetLifecycle === "postponed" ? postponedDate : undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || "Failed to update lifecycle.");
      toast({ title: "Event Lifecycle Updated", description: `Status changed to ${targetLifecycle}.` });
      setLifecycleModalEvent(null);
      void fetchEvents();
    } catch (err: any) {
      toast({ variant: "destructive", title: "Lifecycle Update Failed", description: err.message });
    }
  };

  const filteredEvents = events.filter((e) =>
    [e.title, e.location || "", e.organizer_type, e.status].join(" ").toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <OperationsPage>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#0f172a]">
            Event & Session Management
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-500 font-medium">
            Create, publish, and govern hackathons, academic lectures, workshops, college festivals, and multi-program conferences.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setScannerFeedback(null);
              setQrInput("");
              setScannerOpen(true);
            }}
            className="text-xs font-bold"
          >
            <QrCode className="h-4 w-4 mr-1.5 text-[#0073e6]" />
            Live Check-in Scanner
          </Button>
          <Button onClick={handleOpenCreate} className="bg-[#0073e6] hover:bg-[#0062c4] text-xs font-bold">
            <Plus className="h-4 w-4 mr-1.5" /> Create Event
          </Button>
        </div>
      </div>

      <div className="space-y-6 mt-6">
        {/* Search and Filters */}
        <div className="flex items-center justify-between gap-4">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search events by title, organizer, or venue..."
              className="pl-9 text-xs"
            />
          </div>
        </div>

        {/* Table of Events */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <Table>
            <TableHeader className="bg-slate-50/75">
              <TableRow>
                <TableHead className="text-xs font-extrabold text-slate-700">Event Title & Category</TableHead>
                <TableHead className="text-xs font-extrabold text-slate-700">Type & Format</TableHead>
                <TableHead className="text-xs font-extrabold text-slate-700">Date & Venue</TableHead>
                <TableHead className="text-xs font-extrabold text-slate-700">Pricing / Cap</TableHead>
                <TableHead className="text-xs font-extrabold text-slate-700">Status</TableHead>
                <TableHead className="text-right text-xs font-extrabold text-slate-700">Manage</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-12 text-center text-xs text-slate-400">
                    Loading events...
                  </TableCell>
                </TableRow>
              ) : filteredEvents.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-12 text-center text-xs text-slate-500">
                    No events found. Create your first event to get started.
                  </TableCell>
                </TableRow>
              ) : (
                filteredEvents.map((item) => (
                  <TableRow key={item.id} className="hover:bg-slate-50/50 transition-colors">
                    <TableCell>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-xs text-slate-900">{item.title}</span>
                          {item.is_multi_program && (
                            <Badge variant="secondary" className="text-[10px] bg-purple-50 text-purple-700">
                              Multi-Program
                            </Badge>
                          )}
                        </div>
                        <span className="text-[11px] text-slate-500 capitalize">
                          Organiser: {item.organizer_type}
                        </span>
                      </div>
                    </TableCell>

                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <Badge variant="outline" className="w-fit text-[10px] capitalize">
                          {item.format}
                        </Badge>
                        <span className="text-[10px] font-bold text-slate-500 uppercase">
                          {item.event_type}
                        </span>
                      </div>
                    </TableCell>

                    <TableCell>
                      <div className="text-xs text-slate-600">
                        <p className="font-semibold text-slate-800">
                          {new Date(item.start_date).toLocaleDateString()}
                        </p>
                        <p className="text-[11px] text-slate-500 truncate max-w-[150px]">
                          {item.location || "Online"}
                        </p>
                      </div>
                    </TableCell>

                    <TableCell>
                      <div className="text-xs">
                        <span className="font-bold text-slate-900">
                          {item.event_type === "free" ? "Free" : `${item.currency} ${item.ticket_price}`}
                        </span>
                        {item.capacity && (
                          <p className="text-[11px] text-slate-400">{item.capacity} seats</p>
                        )}
                      </div>
                    </TableCell>

                    <TableCell>
                      <Badge
                        className={`text-[10px] font-extrabold capitalize ${
                          item.status === "published" || item.status === "approved"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : item.status === "cancelled"
                            ? "bg-red-50 text-red-700 border-red-200"
                            : "bg-amber-50 text-amber-800 border-amber-200"
                        }`}
                      >
                        {item.lifecycle_status || item.status}
                      </Badge>
                    </TableCell>

                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="ghost"
                          size="sm"
                          title="Manage Programs/Sessions"
                          onClick={() => handleOpenPrograms(item)}
                          className="h-8 w-8 p-0 text-slate-600 hover:text-[#0073e6]"
                        >
                          <Layers className="h-4 w-4" />
                        </Button>

                        <Button
                          variant="ghost"
                          size="sm"
                          title="Manage Ticket Tiers"
                          onClick={() => handleOpenTicketTypes(item)}
                          className="h-8 w-8 p-0 text-slate-600 hover:text-[#0073e6]"
                        >
                          <Ticket className="h-4 w-4" />
                        </Button>

                        <Button
                          variant="ghost"
                          size="sm"
                          title="View Registrations"
                          onClick={() => handleOpenRegistrations(item)}
                          className="h-8 w-8 p-0 text-slate-600 hover:text-emerald-600"
                        >
                          <Users className="h-4 w-4" />
                        </Button>

                        <Button
                          variant="ghost"
                          size="sm"
                          title="Lifecycle Status"
                          onClick={() => {
                            setLifecycleModalEvent(item);
                            setTargetLifecycle(item.lifecycle_status || "published");
                            setLifecycleReason("");
                          }}
                          className="h-8 w-8 p-0 text-slate-600 hover:text-amber-600"
                        >
                          <Clock className="h-4 w-4" />
                        </Button>

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenEdit(item)}
                          className="h-8 w-8 p-0 text-slate-600 hover:text-slate-900"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteEvent(item.id)}
                          className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* CREATE / EDIT EVENT DIALOG */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-6 sm:p-8">
          <DialogHeader>
            <DialogTitle className="text-xl font-black">
              {editingEvent ? "Edit Event" : "Create New Event"}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Configure event parameters, category, multi-program support, and registration settings.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold text-slate-700">Event Title *</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAIGenerate}
                disabled={isAiGenerating}
                className="h-7 text-[11px] font-bold text-[#0073e6] border-blue-200"
              >
                <Sparkles className="mr-1 h-3 w-3" />
                {isAiGenerating ? "Generating..." : "Generate Description with AI"}
              </Button>
            </div>
            <Input
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g. LOKUS 2026: National Tech & Cultural Festival"
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">Category</Label>
                <Select
                  value={formData.category_id}
                  onValueChange={(val) => setFormData({ ...formData, category_id: val })}
                >
                  <SelectTrigger className="text-xs">
                    <SelectValue placeholder="Select Category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.id} className="text-xs">
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">Format</Label>
                <Select
                  value={formData.format}
                  onValueChange={(val) => setFormData({ ...formData, format: val })}
                >
                  <SelectTrigger className="text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="offline" className="text-xs">In-Person (Offline)</SelectItem>
                    <SelectItem value="online" className="text-xs">Virtual (Online)</SelectItem>
                    <SelectItem value="hybrid" className="text-xs">Hybrid</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">Venue / Location</Label>
                <Input
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="e.g. IOE Pulchowk Campus, Lalitpur"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">Online Meeting URL (if virtual)</Label>
                <Input
                  value={formData.meeting_url}
                  onChange={(e) => setFormData({ ...formData, meeting_url: e.target.value })}
                  placeholder="https://meet.google.com/..."
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">Event Start Date/Time *</Label>
                <Input
                  type="datetime-local"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">Event End Date/Time *</Label>
                <Input
                  type="datetime-local"
                  value={formData.end_date}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">Pricing Model</Label>
                <Select
                  value={formData.event_type}
                  onValueChange={(val) => setFormData({ ...formData, event_type: val })}
                >
                  <SelectTrigger className="text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="free" className="text-xs">Free Admission</SelectItem>
                    <SelectItem value="paid" className="text-xs">Paid Tickets</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {formData.event_type === "paid" && (
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700">Base Price (NPR)</Label>
                  <Input
                    type="number"
                    value={formData.ticket_price}
                    onChange={(e) => setFormData({ ...formData, ticket_price: e.target.value })}
                  />
                </div>
              )}
            </div>

            <div className="flex items-center justify-between rounded-xl border p-3 bg-slate-50">
              <div>
                <Label className="font-bold text-xs">Multi-Program / Multi-Session Event</Label>
                <p className="text-[11px] text-slate-500">Enable if event contains multiple sessions (hackathon, theater, talk).</p>
              </div>
              <Switch
                checked={formData.is_multi_program}
                onCheckedChange={(checked) => setFormData({ ...formData, is_multi_program: checked })}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">Cover Image URL</Label>
              <Input
                value={formData.cover_image_url}
                onChange={(e) => setFormData({ ...formData, cover_image_url: e.target.value })}
                placeholder="https://..."
              />
            </div>
            {isNeonStaging && (editingEvent ? <div className="space-y-3 rounded-xl border p-3">
              <SignedMediaUploader label="Upload cover image" module="event_cover" resourceId={editingEvent.id}
                disabled={isSubmitting} onUploaded={(assets:SignedMediaAsset[])=>{if(assets[0])setFormData(current=>({...current,cover_image_url:assets[0].path}));}}/>
              <SignedMediaUploader label="Event document" module="event_attachment" resourceId={editingEvent.id}
                disabled={isSubmitting} onUploaded={(assets:SignedMediaAsset[])=>{if(assets[0])setFormData(current=>({...current,attachment_path:assets[0].path,attachment_name:assets[0].fileName,attachment_mime_type:assets[0].contentType}));}}/>
              {formData.attachment_path && <div className="flex items-center gap-2">
                <span className="min-w-0 flex-1 truncate text-xs">{formData.attachment_name||"Attached document"}</span>
                <Button type="button" variant="ghost" size="sm" onClick={()=>setFormData(current=>({...current,attachment_path:"",attachment_name:"",attachment_mime_type:""}))}>Remove document</Button>
              </div>}
            </div> : <p className="text-xs text-muted-foreground">Save the event, then edit it to upload a cover image or document.</p>)}

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">Short Summary</Label>
              <Input
                value={formData.short_description}
                onChange={(e) => setFormData({ ...formData, short_description: e.target.value })}
                placeholder="Brief one-line summary"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">Full Description</Label>
              <Textarea
                rows={4}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Full event details..."
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">Terms & Participant Instructions</Label>
              <Textarea
                rows={3}
                value={formData.terms_and_conditions}
                onChange={(e) => setFormData({ ...formData, terms_and_conditions: e.target.value })}
                placeholder="Important rules, eligibility requirements, or entry guidelines..."
              />
            </div>
          </div>

          <DialogFooter className="mt-6">
            <Button variant="outline" onClick={() => setIsDialogOpen(false)} className="text-xs">
              Cancel
            </Button>
            <Button
              onClick={handleSaveEvent}
              disabled={isSubmitting}
              className="bg-[#0073e6] hover:bg-[#0062c4] text-xs font-bold"
            >
              {isSubmitting ? "Saving..." : "Save Event"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* PROGRAMS / SESSIONS MODAL */}
      {managingProgramsEvent && (
        <Dialog open={Boolean(managingProgramsEvent)} onOpenChange={() => setManagingProgramsEvent(null)}>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto p-6">
            <DialogHeader>
              <DialogTitle className="text-lg font-black">
                Program Sessions: {managingProgramsEvent.title}
              </DialogTitle>
              <DialogDescription className="text-xs">
                Add and manage individual tracks, competitions, theater, or lectures within this event.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 mt-3">
              <div className="rounded-2xl border p-4 bg-slate-50/50 space-y-3">
                <span className="text-xs font-bold uppercase text-slate-700">Add New Session / Program</span>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Input
                    placeholder="Session Title (e.g. Hackathon Track)"
                    value={newProgram.title}
                    onChange={(e) => setNewProgram({ ...newProgram, title: e.target.value })}
                  />
                  <Input
                    placeholder="Venue / Room"
                    value={newProgram.venue}
                    onChange={(e) => setNewProgram({ ...newProgram, venue: e.target.value })}
                  />
                  <Input
                    type="datetime-local"
                    value={newProgram.start_time}
                    onChange={(e) => setNewProgram({ ...newProgram, start_time: e.target.value })}
                  />
                  <Input
                    type="datetime-local"
                    value={newProgram.end_time}
                    onChange={(e) => setNewProgram({ ...newProgram, end_time: e.target.value })}
                  />
                  <Input
                    placeholder="Speaker / Organiser"
                    value={newProgram.speaker}
                    onChange={(e) => setNewProgram({ ...newProgram, speaker: e.target.value })}
                  />
                  <Input
                    type="number"
                    placeholder="Capacity (optional)"
                    value={newProgram.capacity}
                    onChange={(e) => setNewProgram({ ...newProgram, capacity: e.target.value })}
                  />
                </div>
                <Button onClick={handleAddProgram} size="sm" className="bg-[#0073e6] hover:bg-[#0062c4] text-xs font-bold">
                  <Plus className="mr-1.5 h-3.5 w-3.5" /> Add Program Session
                </Button>
              </div>

              <div className="space-y-2">
                <span className="text-xs font-bold uppercase text-slate-700">Configured Sessions ({programsList.length})</span>
                {programsList.map((p) => (
                  <div key={p.id} className="flex items-center justify-between rounded-xl border p-3 text-xs bg-white">
                    <div>
                      <p className="font-extrabold text-slate-900">{p.title}</p>
                      <p className="text-slate-500">
                        {new Date(p.start_time).toLocaleString()} | 📍 {p.venue || "TBD"}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-[10px] capitalize">{p.status}</Badge>
                  </div>
                ))}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* TICKET TIERS MODAL */}
      {managingTicketsEvent && (
        <Dialog open={Boolean(managingTicketsEvent)} onOpenChange={() => setManagingTicketsEvent(null)}>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto p-6">
            <DialogHeader>
              <DialogTitle className="text-lg font-black">
                Ticket Tiers & Pricing: {managingTicketsEvent.title}
              </DialogTitle>
              <DialogDescription className="text-xs">
                Configure Early Bird, Regular, Silver, VIP or Group tiers. Individual prices are per attendee; group prices cover one complete group. Use NPR 10 only for tiers explicitly designated for temporary payment testing.
              </DialogDescription>
            </DialogHeader>

            {isNeonStaging ? <EventTicketManager eventId={managingTicketsEvent.id} /> : <div className="space-y-4 mt-3">
              <div className="rounded-2xl border p-4 bg-slate-50/50 space-y-3">
                <span className="text-xs font-bold uppercase text-slate-700">Add New Ticket Tier</span>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Input
                    placeholder="Tier Name (e.g. Early Bird, Team Pass)"
                    value={newTicketType.name}
                    onChange={(e) => setNewTicketType({ ...newTicketType, name: e.target.value })}
                  />
                  <Select
                    value={newTicketType.ticket_kind}
                    onValueChange={(val) => setNewTicketType({ ...newTicketType, ticket_kind: val })}
                  >
                    <SelectTrigger className="text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="individual" className="text-xs">Individual Ticket</SelectItem>
                      <SelectItem value="team" className="text-xs">Team Registration</SelectItem>
                      <SelectItem value="group" className="text-xs">Group Batch</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    type="number"
                    placeholder="Price in NPR (0 for free)"
                    value={newTicketType.price}
                    onChange={(e) => setNewTicketType({ ...newTicketType, price: e.target.value })}
                  />
                  <Input
                    type="number"
                    placeholder="Total Quantity Available"
                    value={newTicketType.total_quantity}
                    onChange={(e) => setNewTicketType({ ...newTicketType, total_quantity: e.target.value })}
                  />
                  {newTicketType.ticket_kind !== "individual" && (
                    <>
                      <Input
                        type="number"
                        placeholder="Min Team Size (e.g. 2)"
                        value={newTicketType.min_team_size}
                        onChange={(e) => setNewTicketType({ ...newTicketType, min_team_size: e.target.value })}
                      />
                      <Input
                        type="number"
                        placeholder="Max Team Size (e.g. 4)"
                        value={newTicketType.max_team_size}
                        onChange={(e) => setNewTicketType({ ...newTicketType, max_team_size: e.target.value })}
                      />
                    </>
                  )}
                </div>
                <label className="block text-sm">Description<Input value={newTicketType.description} onChange={e => setNewTicketType({...newTicketType,description:e.target.value})} /></label>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="text-sm">Sale starts (local time)<Input type="datetime-local" value={newTicketType.sales_start_at} onChange={e => setNewTicketType({...newTicketType,sales_start_at:e.target.value})} /></label>
                  <label className="text-sm">Sale ends (local time)<Input type="datetime-local" value={newTicketType.sales_end_at} onChange={e => setNewTicketType({...newTicketType,sales_end_at:e.target.value})} /></label>
                  {newTicketType.ticket_kind === "individual" && <>
                    <label className="text-sm">Minimum tickets per order<Input type="number" min="1" max="10" value={newTicketType.min_per_order} onChange={e => setNewTicketType({...newTicketType,min_per_order:e.target.value})} /></label>
                    <label className="text-sm">Maximum tickets per order<Input type="number" min="1" max="10" value={newTicketType.max_per_order} onChange={e => setNewTicketType({...newTicketType,max_per_order:e.target.value})} /></label>
                  </>}
                </div>
                <label className="block text-sm">Benefits (one per line)<Textarea value={newTicketType.benefits} onChange={e => setNewTicketType({...newTicketType,benefits:e.target.value})} /></label>
                <Button onClick={handleAddTicketType} size="sm" className="bg-[#0073e6] hover:bg-[#0062c4] text-xs font-bold">
                  <Plus className="mr-1.5 h-3.5 w-3.5" /> Add Ticket Tier
                </Button>
              </div>

              <div className="space-y-2">
                <span className="text-xs font-bold uppercase text-slate-700">Configured Tiers ({ticketTypesList.length})</span>
                {ticketTypesList.map((tt) => (
                  <div key={tt.id} className="flex items-center justify-between rounded-xl border p-3 text-xs bg-white">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-slate-900">{tt.name}</span>
                        <Badge variant="outline" className="text-[10px] uppercase">{tt.ticket_kind}</Badge>
                      </div>
                      <p className="text-slate-500">
                        {Number(tt.price) === 0 ? "Free" : `NPR ${tt.price}`} | Sold: {tt.quantity_sold || 0} / {tt.total_quantity ?? "Unlimited"}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>}
          </DialogContent>
        </Dialog>
      )}

      {/* REGISTRATIONS VIEWER MODAL */}
      {managingRegistrationsEvent && (
        <Dialog open={Boolean(managingRegistrationsEvent)} onOpenChange={() => setManagingRegistrationsEvent(null)}>
          <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto p-6">
            <DialogHeader>
              <div className="flex items-center justify-between">
                <div>
                  <DialogTitle className="text-lg font-black">
                    Registrations & Attendees: {managingRegistrationsEvent.title}
                  </DialogTitle>
                  <DialogDescription className="text-xs">
                    View registered students, team members, payment status, and export attendee lists.
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div className="mt-4 space-y-4">
              <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                <Table>
                  <TableHeader className="bg-slate-50">
                    <TableRow>
                      <TableHead className="text-xs font-bold">Reg # / Team</TableHead>
                      <TableHead className="text-xs font-bold">Primary Attendee</TableHead>
                      <TableHead className="text-xs font-bold">Ticket Tier</TableHead>
                      <TableHead className="text-xs font-bold">Qty / Amount</TableHead>
                      <TableHead className="text-xs font-bold">Payment</TableHead>
                      <TableHead className="text-xs font-bold">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {regLoading ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-xs text-slate-400">Loading registrations...</TableCell>
                      </TableRow>
                    ) : registrationsList.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-xs text-slate-500">No registrations yet.</TableCell>
                      </TableRow>
                    ) : (
                      registrationsList.map((reg) => (
                        <TableRow key={reg.id}>
                          <TableCell>
                            <span className="font-mono font-bold text-xs text-[#0073e6]">
                              {reg.registration_number || "REG-—"}
                            </span>
                            {reg.team_name && <p className="text-[11px] font-bold text-slate-700">{reg.team_name}</p>}
                          </TableCell>
                          <TableCell>
                            <span className="font-semibold text-xs text-slate-900">
                              {reg.participants?.[0]?.full_name || reg.user?.email || "Attendee"}
                            </span>
                            {reg.participants && reg.participants.length > 1 && (
                              <p className="text-[10px] text-slate-500">+{reg.participants.length - 1} members</p>
                            )}
                          </TableCell>
                          <TableCell className="text-xs">{reg.ticket_type?.name || "General"}</TableCell>
                          <TableCell className="text-xs font-bold">
                            {reg.attendee_count}x | NPR {reg.total_amount}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-[10px] uppercase">
                              {reg.payment_status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge className="text-[10px] capitalize bg-emerald-50 text-emerald-700">
                              {reg.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* LIVE QR CHECK-IN SCANNER MODAL */}
      <Dialog open={scannerOpen} onOpenChange={setScannerOpen}>
        <DialogContent className="max-w-md p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-black flex items-center gap-2">
              <QrCode className="h-5 w-5 text-[#0073e6]" />
              Live Check-in & Pass Scanner
            </DialogTitle>
            <DialogDescription className="text-xs">
              Scan attendee QR codes or enter pass tokens to verify admission in real-time.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-3">
            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-700">QR Code Token or Ticket Pass</Label>
              <div className="flex gap-2">
                <Input
                  value={qrInput}
                  onChange={(e) => setQrInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handlePerformCheckin();
                  }}
                  placeholder="Paste or scan QR token (mt_qr_...)"
                  className="font-mono text-xs"
                />
                <Button
                  onClick={handlePerformCheckin}
                  disabled={scanning || !qrInput.trim()}
                  className="bg-[#0073e6] hover:bg-[#0062c4] font-bold text-xs"
                >
                  {scanning ? <Loader2 className="h-4 w-4 animate-spin" /> : "Verify"}
                </Button>
              </div>
            </div>

            {/* Scan Feedback */}
            {scannerFeedback && (
              <div
                className={`rounded-2xl border p-4 transition-all ${
                  scannerFeedback.success
                    ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                    : scannerFeedback.code === "ALREADY_CHECKED_IN"
                    ? "bg-amber-50 border-amber-200 text-amber-900"
                    : "bg-red-50 border-red-200 text-red-900"
                }`}
              >
                <div className="flex items-center gap-2 font-black text-sm">
                  {scannerFeedback.success ? (
                    <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                  ) : (
                    <AlertTriangle className="h-5 w-5 text-amber-600" />
                  )}
                  <span>{scannerFeedback.message}</span>
                </div>

                {scannerFeedback.ticket && (
                  <div className="mt-3 space-y-1 text-xs border-t border-slate-200/50 pt-2 font-medium">
                    <p>Attendee: <span className="font-bold">{scannerFeedback.ticket.attendeeName}</span></p>
                    <p>Event: <span className="font-bold">{scannerFeedback.ticket.eventTitle}</span></p>
                    <p>Pass Code: <span className="font-mono font-bold">{scannerFeedback.ticket.ticketNumber}</span></p>
                    {scannerFeedback.ticket.checkedInAt && (
                      <p>Time: {new Date(scannerFeedback.ticket.checkedInAt).toLocaleTimeString()}</p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* LIFECYCLE MANAGEMENT MODAL */}
      {lifecycleModalEvent && (
        <Dialog open={Boolean(lifecycleModalEvent)} onOpenChange={() => setLifecycleModalEvent(null)}>
          <DialogContent className="max-w-md p-6">
            <DialogHeader>
              <DialogTitle className="text-lg font-black">
                Update Lifecycle: {lifecycleModalEvent.title}
              </DialogTitle>
              <DialogDescription className="text-xs">
                Changes to status (Publish, Postpone, Cancel) automatically send targeted notifications to registrants.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 mt-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">Target Lifecycle State</Label>
                <Select
                  value={targetLifecycle}
                  onValueChange={(val: any) => setTargetLifecycle(val)}
                >
                  <SelectTrigger className="text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft" className="text-xs">Draft</SelectItem>
                    <SelectItem value="published" className="text-xs">Published</SelectItem>
                    <SelectItem value="registration_open" className="text-xs">Registration Open</SelectItem>
                    <SelectItem value="registration_closed" className="text-xs">Registration Closed</SelectItem>
                    <SelectItem value="ongoing" className="text-xs">Ongoing</SelectItem>
                    <SelectItem value="completed" className="text-xs">Completed</SelectItem>
                    <SelectItem value="postponed" className="text-xs">Postponed</SelectItem>
                    <SelectItem value="cancelled" className="text-xs">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {targetLifecycle === "postponed" && (
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700">New Rescheduled Date</Label>
                  <Input
                    type="datetime-local"
                    value={postponedDate}
                    onChange={(e) => setPostponedDate(e.target.value)}
                  />
                </div>
              )}

              {(targetLifecycle === "cancelled" || targetLifecycle === "postponed") && (
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700">Reason for Update (Sent to Registrants)</Label>
                  <Textarea
                    rows={3}
                    value={lifecycleReason}
                    onChange={(e) => setLifecycleReason(e.target.value)}
                    placeholder="Provide a clear reason for attendees..."
                  />
                </div>
              )}
            </div>

            <DialogFooter className="mt-5">
              <Button variant="outline" onClick={() => setLifecycleModalEvent(null)} className="text-xs">
                Cancel
              </Button>
              <Button onClick={handleUpdateLifecycle} className="bg-[#0073e6] hover:bg-[#0062c4] text-xs font-bold">
                Confirm & Notify Attendees
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </OperationsPage>
  );
}
