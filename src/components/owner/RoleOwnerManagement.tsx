import { useEffect, useState, type FormEvent } from "react";
import {
  BriefcaseBusiness,
  CalendarDays,
  Clock3,
  Edit3,
  Plus,
  UserRound,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import OwnerResourceDialog from "@/components/owner/OwnerResourceDialog";
import OwnerStatusActions from "@/components/owner/OwnerStatusActions";
import EntityAIControls from "@/components/owner/EntityAIControls";

export interface OwnerCompanyRecord {
  id: string;
  name: string;
}

export interface OwnerJobRecord {
  id: string;
  company_id: string | null;
  title: string;
  description: string | null;
  location: string | null;
  job_type: string | null;
  experience_level: string | null;
  is_remote: boolean | null;
  application_deadline: string | null;
  expires_at: string | null;
  status: string;
  created_at: string;
}

export interface OwnerEventRecord {
  id: string;
  organizer_type: string;
  organizer_id: string | null;
  title: string;
  description: string | null;
  event_type: string;
  format: string;
  location: string | null;
  meeting_url: string | null;
  start_date: string;
  end_date: string;
  registration_deadline: string | null;
  capacity: number | null;
  ticket_price: number | null;
  currency: string | null;
  status: string;
  created_at: string;
}

export interface OwnerMentorRecord {
  id: string;
  headline: string | null;
  description: string | null;
  expertise: string[] | null;
  hourly_rate: number | null;
  years_experience: number | null;
  is_available: boolean | null;
  approval_status: string;
}

export interface OwnerMentorServiceRecord {
  id: string;
  mentor_id: string;
  title: string;
  description: string | null;
  session_type: string;
  duration_minutes: number;
  capacity: number;
  price: number;
  currency: string;
  is_active: boolean;
  created_at: string;
}

export interface OwnerJobApplicationRecord {
  id: string;
  job_id: string;
  full_name: string | null;
  email: string | null;
  status: string;
  applied_at: string;
}

export interface OwnerEventRegistrationRecord {
  id: string;
  event_id: string;
  status: string;
  payment_status: string;
  ticket_quantity: number;
  form_data: Record<string, unknown> | null;
  registered_at: string;
}

export interface OwnerMentorBookingRecord {
  id: string;
  mentor_service_id: string | null;
  status: string;
  payment_status: string;
  amount: number;
  currency: string;
  scheduled_start: string;
  form_data: Record<string, unknown> | null;
}

export interface RoleOwnerSnapshot {
  company: OwnerCompanyRecord | null;
  mentor: OwnerMentorRecord | null;
  jobs: OwnerJobRecord[];
  events: OwnerEventRecord[];
  services: OwnerMentorServiceRecord[];
  jobApplications: OwnerJobApplicationRecord[];
  eventRegistrations: OwnerEventRegistrationRecord[];
  mentorBookings: OwnerMentorBookingRecord[];
}

interface RoleOwnerManagementProps {
  role: "company" | "mentor";
  userId: string;
  snapshot: RoleOwnerSnapshot;
  onSaved: () => void;
}

const fieldClassName = "rounded-xl border-[#eadfd7] bg-white";

const formatDate = (value: string | null | undefined) => {
  if (!value) return "Date not set";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date not set";
  return new Intl.DateTimeFormat("en-NP", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Kathmandu",
  }).format(date);
};

const toLocalDateTime = (value: string | null | undefined) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
};

const futureLocalDateTime = (hoursFromNow: number) =>
  toLocalDateTime(new Date(Date.now() + hoursFromNow * 60 * 60 * 1_000).toISOString());

const nullableIso = (value: string) => (value ? new Date(value).toISOString() : null);

const prettify = (value: string) => value.replaceAll("_", " ");

const submittedName = (formData: Record<string, unknown> | null | undefined, fallback: string) => {
  const candidate = formData?.fullName;
  return typeof candidate === "string" && candidate.trim() ? candidate : fallback;
};

interface EventEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  organizerType: "company" | "mentor";
  organizerId: string;
  event: OwnerEventRecord | null;
  onSaved: () => void;
}

const EventEditor = ({
  open,
  onOpenChange,
  userId,
  organizerType,
  organizerId,
  event,
  onSaved,
}: EventEditorProps) => {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [eventType, setEventType] = useState("free");
  const [format, setFormat] = useState("offline");
  const [location, setLocation] = useState("");
  const [meetingUrl, setMeetingUrl] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [registrationDeadline, setRegistrationDeadline] = useState("");
  const [capacity, setCapacity] = useState("");
  const [ticketPrice, setTicketPrice] = useState("0");
  const [status, setStatus] = useState<"draft" | "pending_approval">("draft");

  useEffect(() => {
    if (!open) return;
    setTitle(event?.title ?? "");
    setDescription(event?.description ?? "");
    setEventType(event?.event_type ?? "free");
    setFormat(event?.format ?? "offline");
    setLocation(event?.location ?? "");
    setMeetingUrl(event?.meeting_url ?? "");
    setStartDate(toLocalDateTime(event?.start_date) || futureLocalDateTime(24));
    setEndDate(toLocalDateTime(event?.end_date) || futureLocalDateTime(26));
    setRegistrationDeadline(toLocalDateTime(event?.registration_deadline));
    setCapacity(event?.capacity == null ? "" : String(event.capacity));
    setTicketPrice(String(event?.ticket_price ?? 0));
    setStatus(event?.status === "draft" ? "draft" : "pending_approval");
  }, [event, open]);

  const handleSubmit = async (submitEvent: FormEvent<HTMLFormElement>) => {
    submitEvent.preventDefault();
    const startsAt = new Date(startDate);
    const endsAt = new Date(endDate);
    if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime()) || endsAt <= startsAt) {
      toast({ variant: "destructive", title: "Check the schedule", description: "The end date must be after the start date." });
      return;
    }
    if (eventType === "paid" && Number(ticketPrice) <= 0) {
      toast({ variant: "destructive", title: "Ticket price required", description: "Paid events need a ticket price greater than zero." });
      return;
    }

    setIsSubmitting(true);
    const payload = {
      organizer_user_id: userId,
      organizer_type: organizerType,
      organizer_id: organizerId,
      title: title.trim(),
      description: description.trim() || null,
      event_type: eventType,
      format,
      location: format === "online" ? null : location.trim() || null,
      meeting_url: format === "offline" ? null : meetingUrl.trim() || null,
      start_date: startsAt.toISOString(),
      end_date: endsAt.toISOString(),
      registration_deadline: nullableIso(registrationDeadline),
      capacity: capacity ? Number(capacity) : null,
      ticket_price: eventType === "paid" ? Number(ticketPrice) : 0,
      currency: "NPR",
      status,
    };
    const db = supabase as any;
    const result = event
      ? await db.from("events").update(payload).eq("id", event.id).eq("organizer_user_id", userId)
      : await db.from("events").insert(payload);

    setIsSubmitting(false);
    if (result.error) {
      toast({ variant: "destructive", title: "Event was not saved", description: result.error.message });
      return;
    }
    toast({
      title: event ? "Event updated" : "Event created",
      description: status === "draft" ? "The event remains a private draft." : "The event is ready for Super Admin review.",
    });
    onOpenChange(false);
    onSaved();
  };

  return (
    <OwnerResourceDialog
      open={open}
      onOpenChange={onOpenChange}
      title={event ? "Edit event" : "Create event"}
      description="Owner edits return approved events to review. Approval, featuring, and payment state stay under Super Admin control."
      submitLabel={event ? "Save event" : "Create event"}
      isSubmitting={isSubmitting}
      onSubmit={handleSubmit}
    >
      <div className="space-y-2">
        <Label htmlFor="owner-event-title">Title</Label>
        <Input id="owner-event-title" required maxLength={160} value={title} onChange={(e) => setTitle(e.target.value)} className={fieldClassName} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="owner-event-description">Description</Label>
        <Textarea id="owner-event-description" value={description} onChange={(e) => setDescription(e.target.value)} className={fieldClassName} rows={4} />
      </div>
      {event ? <EntityAIControls module="events" entityType="event" entityId={event.id} title={title} context={`Event format: ${format}\nLocation: ${location}\nCurrent description: ${description}`} onDraft={setDescription} /> : <p className="text-xs text-muted-foreground">Save this event once to enable its entity-scoped AI controls.</p>}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <Label>Access</Label>
          <Select value={eventType} onValueChange={setEventType}>
            <SelectTrigger className={fieldClassName}><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="free">Free</SelectItem><SelectItem value="paid">Paid</SelectItem></SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Format</Label>
          <Select value={format} onValueChange={setFormat}>
            <SelectTrigger className={fieldClassName}><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="offline">Offline</SelectItem><SelectItem value="online">Online</SelectItem><SelectItem value="hybrid">Hybrid</SelectItem></SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Submission</Label>
          <Select value={status} onValueChange={(value: "draft" | "pending_approval") => setStatus(value)}>
            <SelectTrigger className={fieldClassName}><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="draft">Save draft</SelectItem><SelectItem value="pending_approval">Submit for review</SelectItem></SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="owner-event-location">Location</Label>
          <Input id="owner-event-location" disabled={format === "online"} value={location} onChange={(e) => setLocation(e.target.value)} className={fieldClassName} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="owner-event-meeting">Meeting URL</Label>
          <Input id="owner-event-meeting" type="url" disabled={format === "offline"} value={meetingUrl} onChange={(e) => setMeetingUrl(e.target.value)} className={fieldClassName} />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2"><Label htmlFor="owner-event-start">Starts</Label><Input id="owner-event-start" type="datetime-local" required value={startDate} onChange={(e) => setStartDate(e.target.value)} className={fieldClassName} /></div>
        <div className="space-y-2"><Label htmlFor="owner-event-end">Ends</Label><Input id="owner-event-end" type="datetime-local" required value={endDate} onChange={(e) => setEndDate(e.target.value)} className={fieldClassName} /></div>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-2"><Label htmlFor="owner-event-deadline">Registration closes</Label><Input id="owner-event-deadline" type="datetime-local" value={registrationDeadline} onChange={(e) => setRegistrationDeadline(e.target.value)} className={fieldClassName} /></div>
        <div className="space-y-2"><Label htmlFor="owner-event-capacity">Capacity</Label><Input id="owner-event-capacity" type="number" min={1} value={capacity} onChange={(e) => setCapacity(e.target.value)} className={fieldClassName} /></div>
        <div className="space-y-2"><Label htmlFor="owner-event-price">Ticket price (NPR)</Label><Input id="owner-event-price" type="number" min={0} step="0.01" disabled={eventType === "free"} value={ticketPrice} onChange={(e) => setTicketPrice(e.target.value)} className={fieldClassName} /></div>
      </div>
    </OwnerResourceDialog>
  );
};

const CompanyOwnerManagement = ({ userId, snapshot, onSaved }: Omit<RoleOwnerManagementProps, "role">) => {
  const { toast } = useToast();
  const [jobOpen, setJobOpen] = useState(false);
  const [eventOpen, setEventOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState<OwnerJobRecord | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<OwnerEventRecord | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [jobType, setJobType] = useState("full-time");
  const [experienceLevel, setExperienceLevel] = useState("entry");
  const [isRemote, setIsRemote] = useState(false);
  const [deadline, setDeadline] = useState("");
  const [status, setStatus] = useState<"draft" | "pending_approval">("draft");

  useEffect(() => {
    if (!jobOpen) return;
    setTitle(selectedJob?.title ?? "");
    setDescription(selectedJob?.description ?? "");
    setLocation(selectedJob?.location ?? "");
    setJobType(selectedJob?.job_type ?? "full-time");
    setExperienceLevel(selectedJob?.experience_level ?? "entry");
    setIsRemote(selectedJob?.is_remote ?? false);
    setDeadline(toLocalDateTime(selectedJob?.expires_at ?? selectedJob?.application_deadline));
    setStatus(selectedJob?.status === "draft" ? "draft" : "pending_approval");
  }, [jobOpen, selectedJob]);

  const openJob = (job: OwnerJobRecord | null) => {
    setSelectedJob(job);
    setJobOpen(true);
  };

  const openEvent = (event: OwnerEventRecord | null) => {
    setSelectedEvent(event);
    setEventOpen(true);
  };

  const handleJobSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!snapshot.company) return;
    setIsSubmitting(true);
    const expiresAt = nullableIso(deadline);
    const payload = {
      company_id: snapshot.company.id,
      owner_user_id: userId,
      title: title.trim(),
      description: description.trim() || null,
      location: location.trim() || null,
      job_type: jobType,
      experience_level: experienceLevel,
      is_remote: isRemote,
      application_deadline: expiresAt,
      expires_at: expiresAt,
      status,
    };
    const db = supabase as any;
    const result = selectedJob
      ? await db.from("jobs").update(payload).eq("id", selectedJob.id).eq("owner_user_id", userId)
      : await db.from("jobs").insert(payload);
    setIsSubmitting(false);
    if (result.error) {
      toast({ variant: "destructive", title: "Job was not saved", description: result.error.message });
      return;
    }
    toast({
      title: selectedJob ? "Job updated" : "Job created",
      description: status === "draft" ? "The job remains a private draft." : "The job is ready for Super Admin review.",
    });
    setJobOpen(false);
    onSaved();
  };

  if (!snapshot.company) {
    return (
      <section className="rounded-[24px] border border-dashed border-[#eadfd7] bg-[#fffdfb] p-6 text-sm text-[#746a64]">
        A company profile must be assigned to this account before jobs or company events can be created.
      </section>
    );
  }

  return (
    <section id="manage" className="scroll-mt-20 rounded-[24px] border border-[#f0e3da] bg-white p-5 shadow-[0_14px_38px_rgba(79,48,30,0.06)] sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><h2 className="font-display text-xl font-bold">Manage listings</h2><p className="mt-1 text-sm text-[#8d8179]">Draft and submit jobs or events owned by {snapshot.company.name}.</p></div>
        <div className="flex gap-2">
          <Button variant="outline" className="rounded-xl border-[#eadfd7]" onClick={() => openEvent(null)}><CalendarDays className="mr-2 h-4 w-4" />New event</Button>
          <Button className="rounded-xl bg-[#c2410c] hover:bg-[#9a3412]" onClick={() => openJob(null)}><Plus className="mr-2 h-4 w-4" />New job</Button>
        </div>
      </div>
      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <div>
          <h3 className="mb-2 text-sm font-semibold">Jobs</h3>
          <div className="space-y-2">
            {snapshot.jobs.length === 0 ? <p className="rounded-2xl bg-[#fff8f3] p-4 text-sm text-[#8d8179]">No jobs created yet.</p> : snapshot.jobs.slice(0, 5).map((job) => (
              <button key={job.id} type="button" onClick={() => openJob(job)} className="flex w-full items-center gap-3 rounded-2xl border border-[#f0e3da] p-3 text-left transition hover:border-[#fdba74]">
                <BriefcaseBusiness className="h-4 w-4 shrink-0 text-[#c2410c]" /><span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{job.title}</span><span className="block text-xs capitalize text-[#8d8179]">{prettify(job.status)} · {job.location || (job.is_remote ? "Remote" : "Location not set")}</span></span><Edit3 className="h-4 w-4 text-[#8d8179]" />
              </button>
            ))}
          </div>
        </div>
        <div>
          <h3 className="mb-2 text-sm font-semibold">Events</h3>
          <div className="space-y-2">
            {snapshot.events.length === 0 ? <p className="rounded-2xl bg-[#fff8f3] p-4 text-sm text-[#8d8179]">No company events created yet.</p> : snapshot.events.slice(0, 5).map((event) => (
              <button key={event.id} type="button" onClick={() => openEvent(event)} className="flex w-full items-center gap-3 rounded-2xl border border-[#f0e3da] p-3 text-left transition hover:border-[#fdba74]">
                <CalendarDays className="h-4 w-4 shrink-0 text-[#c2410c]" /><span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{event.title}</span><span className="block text-xs capitalize text-[#8d8179]">{prettify(event.status)} · {formatDate(event.start_date)}</span></span><Edit3 className="h-4 w-4 text-[#8d8179]" />
              </button>
            ))}
          </div>
        </div>
      </div>

      {(snapshot.jobApplications.length > 0 || snapshot.eventRegistrations.length > 0) && (
        <div className="mt-6 grid gap-4 border-t border-[#f3e8e1] pt-5 lg:grid-cols-2">
          <div>
            <h3 className="mb-2 text-sm font-semibold">Applicant workflow</h3>
            <div className="space-y-2">
              {snapshot.jobApplications.slice(0, 6).map((application) => {
                const job = snapshot.jobs.find((item) => item.id === application.job_id);
                return (
                  <div key={application.id} className="rounded-2xl border border-[#f0e3da] bg-[#fffdfb] p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">{application.full_name || application.email || "Job applicant"}</p>
                        <p className="truncate text-xs text-[#8d8179]">{job?.title || "Owned job"} · {formatDate(application.applied_at)}</p>
                      </div>
                      <span className="shrink-0 text-[10px] font-semibold capitalize text-[#8d8179]">{prettify(application.status)}</span>
                    </div>
                    <OwnerStatusActions workflow="job_application" recordId={application.id} status={application.status} onSaved={onSaved} />
                  </div>
                );
              })}
            </div>
          </div>
          <div>
            <h3 className="mb-2 text-sm font-semibold">Attendee workflow</h3>
            <div className="space-y-2">
              {snapshot.eventRegistrations.slice(0, 6).map((registration) => {
                const event = snapshot.events.find((item) => item.id === registration.event_id);
                return (
                  <div key={registration.id} className="rounded-2xl border border-[#f0e3da] bg-[#fffdfb] p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">{submittedName(registration.form_data, "Event attendee")}</p>
                        <p className="truncate text-xs text-[#8d8179]">{event?.title || "Owned event"} · {registration.ticket_quantity} ticket(s)</p>
                      </div>
                      <span className="shrink-0 text-[10px] font-semibold capitalize text-[#8d8179]">{prettify(registration.status)} · {prettify(registration.payment_status)}</span>
                    </div>
                    <OwnerStatusActions workflow="event_registration" recordId={registration.id} status={registration.status} paymentStatus={registration.payment_status} onSaved={onSaved} />
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <OwnerResourceDialog open={jobOpen} onOpenChange={setJobOpen} title={selectedJob ? "Edit job" : "Create job"} description="Owner changes are saved as a draft or returned to Super Admin review. Approval fields cannot be changed here." submitLabel={selectedJob ? "Save job" : "Create job"} isSubmitting={isSubmitting} onSubmit={handleJobSubmit}>
        <div className="space-y-2"><Label htmlFor="owner-job-title">Job title</Label><Input id="owner-job-title" required maxLength={160} value={title} onChange={(e) => setTitle(e.target.value)} className={fieldClassName} /></div>
        <div className="space-y-2"><Label htmlFor="owner-job-description">Description</Label><Textarea id="owner-job-description" value={description} onChange={(e) => setDescription(e.target.value)} className={fieldClassName} rows={5} /></div>
        {selectedJob ? <EntityAIControls module="jobs" entityType="company" entityId={snapshot.company.id} title={title} context={`Job type: ${jobType}\nLocation: ${location}\nExperience: ${experienceLevel}\nCurrent description: ${description}`} onDraft={setDescription} /> : <p className="text-xs text-muted-foreground">Save this job once to use the AI controls scoped to this company workspace.</p>}
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2"><Label>Type</Label><Select value={jobType} onValueChange={setJobType}><SelectTrigger className={fieldClassName}><SelectValue /></SelectTrigger><SelectContent><SelectItem value="full-time">Full-time</SelectItem><SelectItem value="part-time">Part-time</SelectItem><SelectItem value="contract">Contract</SelectItem><SelectItem value="internship">Internship</SelectItem><SelectItem value="freelance">Freelance</SelectItem></SelectContent></Select></div>
          <div className="space-y-2"><Label>Experience</Label><Select value={experienceLevel} onValueChange={setExperienceLevel}><SelectTrigger className={fieldClassName}><SelectValue /></SelectTrigger><SelectContent><SelectItem value="entry">Entry</SelectItem><SelectItem value="mid">Mid</SelectItem><SelectItem value="senior">Senior</SelectItem><SelectItem value="lead">Lead</SelectItem></SelectContent></Select></div>
          <div className="space-y-2"><Label>Submission</Label><Select value={status} onValueChange={(value: "draft" | "pending_approval") => setStatus(value)}><SelectTrigger className={fieldClassName}><SelectValue /></SelectTrigger><SelectContent><SelectItem value="draft">Save draft</SelectItem><SelectItem value="pending_approval">Submit for review</SelectItem></SelectContent></Select></div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2"><Label htmlFor="owner-job-location">Location</Label><Input id="owner-job-location" value={location} onChange={(e) => setLocation(e.target.value)} className={fieldClassName} /></div>
          <div className="space-y-2"><Label htmlFor="owner-job-deadline">Application deadline</Label><Input id="owner-job-deadline" type="datetime-local" value={deadline} onChange={(e) => setDeadline(e.target.value)} className={fieldClassName} /></div>
        </div>
        <div className="flex items-center justify-between rounded-2xl border border-[#f0e3da] p-4"><div><Label htmlFor="owner-job-remote">Remote-friendly</Label><p className="mt-1 text-xs text-[#8d8179]">The location can still identify the hiring region.</p></div><Switch id="owner-job-remote" checked={isRemote} onCheckedChange={setIsRemote} /></div>
      </OwnerResourceDialog>
      <EventEditor open={eventOpen} onOpenChange={setEventOpen} userId={userId} organizerType="company" organizerId={snapshot.company.id} event={selectedEvent} onSaved={onSaved} />
    </section>
  );
};

const MentorOwnerManagement = ({ userId, snapshot, onSaved }: Omit<RoleOwnerManagementProps, "role">) => {
  const { toast } = useToast();
  const [profileOpen, setProfileOpen] = useState(false);
  const [serviceOpen, setServiceOpen] = useState(false);
  const [eventOpen, setEventOpen] = useState(false);
  const [selectedService, setSelectedService] = useState<OwnerMentorServiceRecord | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<OwnerEventRecord | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [headline, setHeadline] = useState("");
  const [description, setDescription] = useState("");
  const [expertise, setExpertise] = useState("");
  const [hourlyRate, setHourlyRate] = useState("0");
  const [yearsExperience, setYearsExperience] = useState("");
  const [isAvailable, setIsAvailable] = useState(true);
  const [serviceTitle, setServiceTitle] = useState("");
  const [serviceDescription, setServiceDescription] = useState("");
  const [sessionType, setSessionType] = useState("one_to_one");
  const [duration, setDuration] = useState("60");
  const [capacity, setCapacity] = useState("1");
  const [price, setPrice] = useState("0");
  const [serviceActive, setServiceActive] = useState(true);

  useEffect(() => {
    if (!profileOpen || !snapshot.mentor) return;
    setHeadline(snapshot.mentor.headline ?? "");
    setDescription(snapshot.mentor.description ?? "");
    setExpertise((snapshot.mentor.expertise ?? []).join(", "));
    setHourlyRate(String(snapshot.mentor.hourly_rate ?? 0));
    setYearsExperience(snapshot.mentor.years_experience == null ? "" : String(snapshot.mentor.years_experience));
    setIsAvailable(snapshot.mentor.is_available ?? true);
  }, [profileOpen, snapshot.mentor]);

  useEffect(() => {
    if (!serviceOpen) return;
    setServiceTitle(selectedService?.title ?? "");
    setServiceDescription(selectedService?.description ?? "");
    setSessionType(selectedService?.session_type ?? "one_to_one");
    setDuration(String(selectedService?.duration_minutes ?? 60));
    setCapacity(String(selectedService?.capacity ?? 1));
    setPrice(String(selectedService?.price ?? snapshot.mentor?.hourly_rate ?? 0));
    setServiceActive(selectedService?.is_active ?? true);
  }, [selectedService, serviceOpen, snapshot.mentor?.hourly_rate]);

  const handleProfileSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!snapshot.mentor) return;
    setIsSubmitting(true);
    const result = await (supabase as any)
      .from("mentors")
      .update({
        headline: headline.trim() || null,
        description: description.trim() || null,
        expertise: expertise.split(",").map((item) => item.trim()).filter(Boolean),
        hourly_rate: Number(hourlyRate),
        years_experience: yearsExperience ? Number(yearsExperience) : null,
        is_available: isAvailable,
      })
      .eq("id", snapshot.mentor.id)
      .eq("user_id", userId);
    setIsSubmitting(false);
    if (result.error) {
      toast({ variant: "destructive", title: "Profile was not saved", description: result.error.message });
      return;
    }
    toast({ title: "Mentor profile updated", description: "Availability and public profile details now use this live record." });
    setProfileOpen(false);
    onSaved();
  };

  const handleServiceSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!snapshot.mentor) return;
    const durationMinutes = Number(duration);
    const serviceCapacity = sessionType === "one_to_one" ? 1 : Number(capacity);
    if (durationMinutes < 15 || durationMinutes > 480 || serviceCapacity < 1) {
      toast({ variant: "destructive", title: "Check session details", description: "Duration must be 15–480 minutes and capacity at least one." });
      return;
    }
    setIsSubmitting(true);
    const payload = {
      mentor_id: snapshot.mentor.id,
      title: serviceTitle.trim(),
      description: serviceDescription.trim() || null,
      session_type: sessionType,
      duration_minutes: durationMinutes,
      capacity: serviceCapacity,
      price: Number(price),
      currency: "NPR",
      is_active: serviceActive,
    };
    const db = supabase as any;
    const result = selectedService
      ? await db.from("mentor_services").update(payload).eq("id", selectedService.id).eq("mentor_id", snapshot.mentor.id)
      : await db.from("mentor_services").insert(payload);
    setIsSubmitting(false);
    if (result.error) {
      toast({ variant: "destructive", title: "Service was not saved", description: result.error.message });
      return;
    }
    toast({ title: selectedService ? "Service updated" : "Service created", description: "The mentor directory reads active services from this record." });
    setServiceOpen(false);
    onSaved();
  };

  if (!snapshot.mentor) {
    return (
      <section className="rounded-[24px] border border-dashed border-[#eadfd7] bg-[#fffdfb] p-6 text-sm text-[#746a64]">
        A mentor profile must be assigned to this account before services or mentor events can be created.
      </section>
    );
  }

  const openService = (service: OwnerMentorServiceRecord | null) => {
    setSelectedService(service);
    setServiceOpen(true);
  };
  const openEvent = (event: OwnerEventRecord | null) => {
    setSelectedEvent(event);
    setEventOpen(true);
  };

  return (
    <section id="manage" className="scroll-mt-20 rounded-[24px] border border-[#f0e3da] bg-white p-5 shadow-[0_14px_38px_rgba(79,48,30,0.06)] sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><h2 className="font-display text-xl font-bold">Manage mentor offering</h2><p className="mt-1 text-sm text-[#8d8179]">Update the same profile, service, and event records used by the public directory.</p></div>
        <div className="flex flex-wrap gap-2"><Button variant="outline" className="rounded-xl border-[#eadfd7]" onClick={() => openEvent(null)}><CalendarDays className="mr-2 h-4 w-4" />New event</Button><Button variant="outline" className="rounded-xl border-[#eadfd7]" onClick={() => setProfileOpen(true)}><UserRound className="mr-2 h-4 w-4" />Edit profile</Button><Button className="rounded-xl bg-[#c2410c] hover:bg-[#9a3412]" onClick={() => openService(null)}><Plus className="mr-2 h-4 w-4" />New service</Button></div>
      </div>
      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <div>
          <h3 className="mb-2 text-sm font-semibold">Services</h3>
          <div className="space-y-2">{snapshot.services.length === 0 ? <p className="rounded-2xl bg-[#fff8f3] p-4 text-sm text-[#8d8179]">No services created yet.</p> : snapshot.services.slice(0, 5).map((service) => <button key={service.id} type="button" onClick={() => openService(service)} className="flex w-full items-center gap-3 rounded-2xl border border-[#f0e3da] p-3 text-left transition hover:border-[#fdba74]"><Clock3 className="h-4 w-4 shrink-0 text-[#c2410c]" /><span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{service.title}</span><span className="block text-xs text-[#8d8179]">{service.duration_minutes} min · NPR {service.price} · {service.is_active ? "Active" : "Hidden"}</span></span><Edit3 className="h-4 w-4 text-[#8d8179]" /></button>)}</div>
        </div>
        <div>
          <h3 className="mb-2 text-sm font-semibold">Events</h3>
          <div className="space-y-2">{snapshot.events.length === 0 ? <p className="rounded-2xl bg-[#fff8f3] p-4 text-sm text-[#8d8179]">No mentor events created yet.</p> : snapshot.events.slice(0, 5).map((event) => <button key={event.id} type="button" onClick={() => openEvent(event)} className="flex w-full items-center gap-3 rounded-2xl border border-[#f0e3da] p-3 text-left transition hover:border-[#fdba74]"><CalendarDays className="h-4 w-4 shrink-0 text-[#c2410c]" /><span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{event.title}</span><span className="block text-xs capitalize text-[#8d8179]">{prettify(event.status)} · {formatDate(event.start_date)}</span></span><Edit3 className="h-4 w-4 text-[#8d8179]" /></button>)}</div>
        </div>
      </div>

      {(snapshot.mentorBookings.length > 0 || snapshot.eventRegistrations.length > 0) && (
        <div className="mt-6 grid gap-4 border-t border-[#f3e8e1] pt-5 lg:grid-cols-2">
          <div>
            <h3 className="mb-2 text-sm font-semibold">Booking workflow</h3>
            <div className="space-y-2">
              {snapshot.mentorBookings.slice(0, 6).map((booking) => {
                const service = snapshot.services.find((item) => item.id === booking.mentor_service_id);
                return (
                  <div key={booking.id} className="rounded-2xl border border-[#f0e3da] bg-[#fffdfb] p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">{submittedName(booking.form_data, "Mentor booking")}</p>
                        <p className="truncate text-xs text-[#8d8179]">{service?.title || "Mentor session"} · {formatDate(booking.scheduled_start)}</p>
                      </div>
                      <span className="shrink-0 text-[10px] font-semibold capitalize text-[#8d8179]">{prettify(booking.status)} · {prettify(booking.payment_status)}</span>
                    </div>
                    <OwnerStatusActions workflow="mentor_booking" recordId={booking.id} status={booking.status} paymentStatus={booking.payment_status} onSaved={onSaved} />
                  </div>
                );
              })}
            </div>
          </div>
          <div>
            <h3 className="mb-2 text-sm font-semibold">Event attendees</h3>
            <div className="space-y-2">
              {snapshot.eventRegistrations.slice(0, 6).map((registration) => {
                const event = snapshot.events.find((item) => item.id === registration.event_id);
                return (
                  <div key={registration.id} className="rounded-2xl border border-[#f0e3da] bg-[#fffdfb] p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">{submittedName(registration.form_data, "Event attendee")}</p>
                        <p className="truncate text-xs text-[#8d8179]">{event?.title || "Mentor event"} · {registration.ticket_quantity} ticket(s)</p>
                      </div>
                      <span className="shrink-0 text-[10px] font-semibold capitalize text-[#8d8179]">{prettify(registration.status)} · {prettify(registration.payment_status)}</span>
                    </div>
                    <OwnerStatusActions workflow="event_registration" recordId={registration.id} status={registration.status} paymentStatus={registration.payment_status} onSaved={onSaved} />
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <OwnerResourceDialog open={profileOpen} onOpenChange={setProfileOpen} title="Edit mentor profile" description="Approval, commission, rating, and featuring remain protected Super Admin fields." submitLabel="Save profile" isSubmitting={isSubmitting} onSubmit={handleProfileSubmit}>
        <div className="space-y-2"><Label htmlFor="mentor-headline">Headline</Label><Input id="mentor-headline" maxLength={160} value={headline} onChange={(e) => setHeadline(e.target.value)} className={fieldClassName} /></div>
        <div className="space-y-2"><Label htmlFor="mentor-description">About</Label><Textarea id="mentor-description" value={description} onChange={(e) => setDescription(e.target.value)} className={fieldClassName} rows={5} /></div>
        <EntityAIControls module="mentor" entityType="mentor" entityId={snapshot.mentor.id} title={headline || "Mentor profile"} context={`Expertise: ${expertise}\nYears of experience: ${yearsExperience}\nCurrent bio: ${description}`} onDraft={setDescription} />
        <div className="space-y-2"><Label htmlFor="mentor-expertise">Expertise</Label><Input id="mentor-expertise" placeholder="Product strategy, UX research" value={expertise} onChange={(e) => setExpertise(e.target.value)} className={fieldClassName} /><p className="text-xs text-[#8d8179]">Separate skills with commas.</p></div>
        <div className="grid gap-4 sm:grid-cols-2"><div className="space-y-2"><Label htmlFor="mentor-rate">Hourly rate (NPR)</Label><Input id="mentor-rate" type="number" min={0} step="0.01" required value={hourlyRate} onChange={(e) => setHourlyRate(e.target.value)} className={fieldClassName} /></div><div className="space-y-2"><Label htmlFor="mentor-experience">Years of experience</Label><Input id="mentor-experience" type="number" min={0} max={80} value={yearsExperience} onChange={(e) => setYearsExperience(e.target.value)} className={fieldClassName} /></div></div>
        <div className="flex items-center justify-between rounded-2xl border border-[#f0e3da] p-4"><div><Label htmlFor="mentor-available">Available for booking</Label><p className="mt-1 text-xs text-[#8d8179]">Turning this off hides the mentor from public availability.</p></div><Switch id="mentor-available" checked={isAvailable} onCheckedChange={setIsAvailable} /></div>
      </OwnerResourceDialog>

      <OwnerResourceDialog open={serviceOpen} onOpenChange={setServiceOpen} title={selectedService ? "Edit mentor service" : "Create mentor service"} description="Active services are read directly by the public mentor directory and booking flow." submitLabel={selectedService ? "Save service" : "Create service"} isSubmitting={isSubmitting} onSubmit={handleServiceSubmit}>
        <div className="space-y-2"><Label htmlFor="mentor-service-title">Title</Label><Input id="mentor-service-title" required maxLength={160} value={serviceTitle} onChange={(e) => setServiceTitle(e.target.value)} className={fieldClassName} /></div>
        <div className="space-y-2"><Label htmlFor="mentor-service-description">Description</Label><Textarea id="mentor-service-description" value={serviceDescription} onChange={(e) => setServiceDescription(e.target.value)} className={fieldClassName} rows={4} /></div>
        <div className="grid gap-4 sm:grid-cols-2"><div className="space-y-2"><Label>Session type</Label><Select value={sessionType} onValueChange={setSessionType}><SelectTrigger className={fieldClassName}><SelectValue /></SelectTrigger><SelectContent><SelectItem value="one_to_one">One-to-one</SelectItem><SelectItem value="group">Group</SelectItem></SelectContent></Select></div><div className="space-y-2"><Label htmlFor="mentor-service-duration">Duration (minutes)</Label><Input id="mentor-service-duration" type="number" min={15} max={480} required value={duration} onChange={(e) => setDuration(e.target.value)} className={fieldClassName} /></div></div>
        <div className="grid gap-4 sm:grid-cols-2"><div className="space-y-2"><Label htmlFor="mentor-service-capacity">Capacity</Label><Input id="mentor-service-capacity" type="number" min={1} disabled={sessionType === "one_to_one"} value={sessionType === "one_to_one" ? "1" : capacity} onChange={(e) => setCapacity(e.target.value)} className={fieldClassName} /></div><div className="space-y-2"><Label htmlFor="mentor-service-price">Price (NPR)</Label><Input id="mentor-service-price" type="number" min={0} step="0.01" required value={price} onChange={(e) => setPrice(e.target.value)} className={fieldClassName} /></div></div>
        <div className="flex items-center justify-between rounded-2xl border border-[#f0e3da] p-4"><div><Label htmlFor="mentor-service-active">Publicly bookable</Label><p className="mt-1 text-xs text-[#8d8179]">Inactive services remain in your workspace but are hidden publicly.</p></div><Switch id="mentor-service-active" checked={serviceActive} onCheckedChange={setServiceActive} /></div>
      </OwnerResourceDialog>
      <EventEditor open={eventOpen} onOpenChange={setEventOpen} userId={userId} organizerType="mentor" organizerId={snapshot.mentor.id} event={selectedEvent} onSaved={onSaved} />
    </section>
  );
};

const RoleOwnerManagement = ({ role, userId, snapshot, onSaved }: RoleOwnerManagementProps) =>
  role === "company" ? (
    <CompanyOwnerManagement userId={userId} snapshot={snapshot} onSaved={onSaved} />
  ) : (
    <MentorOwnerManagement userId={userId} snapshot={snapshot} onSaved={onSaved} />
  );

export default RoleOwnerManagement;
