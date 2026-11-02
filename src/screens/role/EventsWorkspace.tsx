import { Label as InputFieldLabel } from "@/components/ui/label";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CalendarDays, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { EventEditor, type OwnerEventRecord, type RoleOwnerSnapshot } from "@/components/owner/RoleOwnerManagement";
import OwnerStatusActions from "@/components/owner/OwnerStatusActions";
import { requestRoleWorkspace } from "@/lib/neon/role-workspaces-client";
import EventTicketManager from "@/components/events/EventTicketManager";
import EventActivityManager from "@/components/events/EventActivityManager";

interface EventWorkspaceState {
  entityOptions: Array<{ id: string; label: string }>;
  entityId: string | null;
  snapshot: RoleOwnerSnapshot;
  locked: boolean;
  capabilities: Record<string, boolean>;
  subscription: { package_name?: string; status: string; expires_at: string | null } | null;
}
const date = (value: string) => new Intl.DateTimeFormat("en-NP", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kathmandu" }).format(new Date(value));

/** Event managers enter their exact assigned event without requiring an unrelated Jobs workspace. */
export default function EventsWorkspace() {
  const { user } = useAuth();
  const [data, setData] = useState<EventWorkspaceState | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editOpen, setEditOpen] = useState(false);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    if (!user) return;
    let current = true;
    setLoading(true); setError(""); setEditOpen(false);
    void requestRoleWorkspace(`/api/v1/neon-staging/role-workspaces?role=events${selectedId ? `&entityId=${encodeURIComponent(selectedId)}` : ""}`)
      .then(result => { if (current) setData(result as EventWorkspaceState); })
      .catch(cause => { if (current) { setData(null); setError(cause instanceof Error ? cause.message : "Event workspace unavailable."); } })
      .finally(() => { if (current) setLoading(false); });
    return () => { current = false; };
  }, [user, selectedId, revision]);
  const event = data?.snapshot.events[0] ?? null;
  const refreshed = () => setRevision(value => value + 1);
  return <main className="min-h-screen bg-white px-4 py-6 text-slate-900 sm:px-8">
    <div className="mx-auto max-w-6xl space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b pb-5">
        <div><p className="flex items-center gap-2 text-sm font-semibold text-orange-700"><CalendarDays className="h-4 w-4" />Events workspace</p><h1 className="mt-2 text-3xl font-bold">Manage assigned events</h1></div>
        <div className="flex gap-2"><Button asChild variant="outline"><Link to="/dashboard">Student dashboard</Link></Button><Button asChild variant="outline"><Link to="/dashboard/payments">Payments and renewals</Link></Button></div>
      </header>
      {data && data.entityOptions.length > 0 && <div className="space-y-2">
        <InputFieldLabel htmlFor="managed-event" className="text-sm font-semibold">Managed event</InputFieldLabel>
        <select id="managed-event" value={selectedId || data.entityId || ""} disabled={loading} onChange={change => { setSelectedId(change.target.value); setEditOpen(false); }} className="block w-full max-w-2xl rounded-xl border bg-white p-3">
          {data.entityOptions.map(option => <option key={option.id} value={option.id}>{option.label}</option>)}
        </select>
      </div>}
      {loading ? <div role="status" className="flex gap-2 p-5"><Loader2 className="h-5 w-5 animate-spin" />Loading assigned event…</div> : error ? <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-5 text-rose-900">{error}<Button variant="outline" className="ml-3" onClick={refreshed}>Retry</Button></div> : data?.locked ? <section role="alert" className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-amber-900">
        <h2 className="text-xl font-semibold">Events workspace locked</h2><p className="mt-2">Your subscription/trial has expired or no event is assigned. Renew or request access to restore event management.</p>
        <Button asChild variant="outline" className="mt-4"><Link to="/dashboard/payments">View payments and renew</Link></Button>
      </section> : event && data ? <>
        <section className="rounded-2xl border border-orange-100 bg-orange-50/40 p-6">
          <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-2xl font-bold">{event.title}</h2><p className="mt-2 text-sm capitalize text-slate-600">{event.status.replaceAll("_", " ")} · {date(event.start_date)}</p><p className="mt-1 text-sm text-slate-600">{event.location || (event.format === "online" ? "Online" : "Location not provided")}</p></div><Button disabled={!data.capabilities.profile} onClick={() => setEditOpen(true)}>Edit event and settings</Button></div>
          <p className="mt-5 text-sm text-slate-600">{data.subscription?.package_name || "Assigned module access"}{data.subscription?.expires_at ? ` · Expires ${date(data.subscription.expires_at)}` : ""}</p>
          <p className="mt-3 whitespace-pre-wrap text-sm">{event.description}</p>
        </section>
        {data.capabilities.profile && <section className="rounded-2xl border p-5"><h2 className="mb-4 text-xl font-semibold">Ticket categories and inventory</h2><EventTicketManager key={event.id} eventId={event.id} /></section>}
        {data.capabilities.profile && <section className="rounded-2xl border p-5"><EventActivityManager eventId={event.id} onEnrollmentChanged={refreshed} /></section>}
        <section className="rounded-2xl border p-5">
          <h2 className="text-xl font-semibold">Registrations</h2>
          {!data.capabilities.registrations ? <p className="mt-3 text-sm text-slate-600">Registration access is not included in your current entitlement.</p> : data.snapshot.eventRegistrations.length === 0 ? <p className="mt-3 text-sm text-slate-600">No registrations for this event yet.</p> : <div className="mt-4 grid gap-3 md:grid-cols-2">{data.snapshot.eventRegistrations.map(registration => <article key={registration.id} className="rounded-xl border p-4">
            <h3 className="font-semibold">{typeof registration.form_data?.fullName === "string" ? registration.form_data.fullName : "Event attendee"}</h3>
            {typeof registration.form_data?.email === "string" && <p className="mt-1 break-all text-sm text-slate-600">{registration.form_data.email}</p>}
            <p className="mt-2 text-sm capitalize">{registration.status} · Payment {registration.payment_status.replaceAll("_", " ")} · {registration.ticket_quantity} ticket(s)</p>
            <p className="mt-1 text-xs text-slate-500">{date(registration.registered_at)}</p>
            <OwnerStatusActions workflow="event_registration" recordId={registration.id} status={registration.status} paymentStatus={registration.payment_status} readOnly={!data.capabilities.registrationManagement} onSaved={refreshed} />
          </article>)}</div>}
        </section>
        {user && <EventEditor open={editOpen} onOpenChange={setEditOpen} userId={user.id}
          organizerType={event.organizer_type as "user" | "college" | "company" | "mentor"} organizerId={event.organizer_id}
          event={event as OwnerEventRecord} onSaved={refreshed} />}
      </> : null}
    </div>
  </main>;
}
