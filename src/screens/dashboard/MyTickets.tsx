"use client";

import { useCallback, useEffect, useState } from "react";
import { isNeonClientRuntime } from "@/lib/backend-selection";
import { Ticket, Calendar, Sparkles, RefreshCw, AlertCircle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { fetchMyTickets, type DigitalTicket } from "@/lib/events/events-client";
import TicketPassCard from "@/components/events/TicketPassCard";
import { Button } from "@/components/ui/button";
import StudentEventActivities from "@/components/events/StudentEventActivities";

export default function MyTickets() {
  const { session, user } = useAuth();
  const [tickets, setTickets] = useState<DigitalTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activityEvent, setActivityEvent] = useState<string | null>(null);

  const loadTickets = useCallback(async () => {
    if (!(isNeonClientRuntime() ? user : session?.access_token)) { setTickets([]); setLoading(false); return; }
    setLoading(true);
    try {
      const data = await fetchMyTickets(session?.access_token);
      setTickets(data || []);
      setError(null);
    } catch (err: any) {
      setError(err.message || "Failed to load tickets.");
    } finally {
      setLoading(false);
    }
  }, [user, session]);

  useEffect(() => { void loadTickets(); }, [loadTickets]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">My Event Passes</h1>
          <p className="text-xs text-slate-500 font-medium">
            View your digital QR passes for upcoming workshops, hackathons, and sessions.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={loadTickets}
          disabled={loading}
          className="text-xs font-bold"
        >
          <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {loading ? (
        <div className="py-20 text-center text-sm font-semibold text-slate-400 animate-pulse">
          Loading your event passes...
        </div>
      ) : error ? (
        <div role="alert" className="rounded-3xl border border-dashed border-red-200 bg-red-50/50 p-8 text-center text-xs text-red-600">
          <AlertCircle className="mx-auto h-6 w-6 text-red-500 mb-2" />
          {error}
          <Button variant="outline" className="mt-3" onClick={() => void loadTickets()}>Try again</Button>
        </div>
      ) : tickets.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50/60 p-12 text-center space-y-3">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-[#0073e6]">
            <Ticket className="h-6 w-6" />
          </div>
          <h3 className="text-base font-extrabold text-slate-900">No event tickets yet</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            You have not registered for any events yet. Discover upcoming hackathons and summits on MeroTalent.
          </p>
          <Button asChild className="bg-[#0073e6] hover:bg-[#0062c4] text-xs font-bold">
            <a href="/events">Browse Events</a>
          </Button>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {tickets.map((ticket) => (
            <div key={ticket.id} className="space-y-3"><TicketPassCard ticket={ticket} />{ticket.event && <Button variant="outline" onClick={() => setActivityEvent(ticket.event!.id)}>Open event activities</Button>}</div>
          ))}
        </div>
      )}
      {activityEvent && <StudentEventActivities key={activityEvent} eventId={activityEvent} />}
    </div>
  );
}
