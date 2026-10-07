"use client";

import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import PublicPageLayout from "@/components/landing/PublicPageLayout";
import { Calendar, MapPin, ArrowRight, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import ModuleSubmissionDialog from "@/components/forms/ModuleSubmissionDialog";
import { startEsewaCheckout } from "@/lib/payments/browser-checkout";

interface EventItem {
  id: string;
  title: string;
  description: string | null;
  event_type: string;
  format: string;
  location: string | null;
  start_date: string;
  end_date: string;
  ticket_price: number;
  cover_image_url: string | null;
  organizer_type: string;
}

export default function EventsPage() {
  const { session } = useAuth();
  const navigate = useNavigate();
  const [events, setEvents] = useState<EventItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedFormat, setSelectedFormat] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedEvent, setSelectedEvent] = useState<EventItem | null>(null);
  const [registeredEventIds, setRegisteredEventIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from("events")
        .select("*")
        .in("status", ["approved", "published"])
        .eq("approval_status", "approved")
        .eq("is_active", true)
        .is("deleted_at", null)
        .gt("end_date", new Date().toISOString())
        .order("start_date", { ascending: true });

      if (error) throw error;
      setEvents((data || []) as EventItem[]);
      setLoadError(null);
    } catch (error) {
      setEvents([]);
      setLoadError(error instanceof Error ? error.message : "Events could not be loaded.");
    } finally {
      setIsLoading(false);
    }
  };

  const filteredEvents = events.filter((e) => {
    const matchesFilter = selectedFormat === "all" || e.format === selectedFormat || e.event_type === selectedFormat;
    return matchesFilter && [e.title, e.description || "", e.location || "", e.organizer_type].join(" ").toLowerCase().includes(searchQuery.toLowerCase());
  });

  const openRegistration = (event: EventItem) => {
    if (!session) {
      navigate("/login", { state: { from: { pathname: "/events" } } });
      return;
    }
    setSelectedEvent(event);
  };

  return (
    <PublicPageLayout activeNavId="events">
      <div className="max-w-6xl mx-auto w-full px-6 sm:px-8 py-12 flex flex-col gap-10">
        {/* Header */}
        <div className="flex flex-col gap-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-[#0073e6] text-xs font-bold w-fit">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Discover Tech & Academic Events</span>
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            Events, Workshops & Summits
          </h1>
          <p className="text-sm text-slate-500 font-medium max-w-lg leading-relaxed">
            Explore upcoming hackathons, career workshops, and technical conferences across Nepal.
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2.5">
          {[
            { id: "all", label: "All Events" },
            { id: "free", label: "Free Events" },
            { id: "paid", label: "Paid Tickets" },
            { id: "online", label: "Online" },
            { id: "offline", label: "In-Person" },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setSelectedFormat(item.id)}
              className={`px-4 py-2 rounded-full border text-xs font-extrabold transition-all ${
                selectedFormat === item.id
                  ? "bg-[#0073e6] border-[#0073e6] text-white shadow-sm"
                  : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
        <label className="sr-only" htmlFor="event-search">Search events</label>
        <input id="event-search" value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Search events, organisers, or locations" className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-[#0073e6] focus:ring-2 focus:ring-blue-100" />

        {/* List */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredEvents.map((event) => {
            const startDate = new Date(event.start_date).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            });

            return (
              <div
                key={event.id}
                className="group flex flex-col rounded-2xl bg-white border border-slate-200/80 shadow-sm hover:shadow-md transition-all overflow-hidden"
              >
                {/* Header Banner */}
                <div className="relative h-44 bg-gradient-to-br from-[#071a3d] via-[#1d4ed8] to-blue-600 p-6 flex flex-col justify-between text-white overflow-hidden">
                  {event.cover_image_url && (
                    <img
                      src={event.cover_image_url}
                      alt={event.title}
                      className="absolute inset-0 h-full w-full object-cover"
                    />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-[#071a3d]/90 via-[#071a3d]/40 to-transparent" />
                  <div className="flex items-center justify-between z-10">
                    <span className="text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full bg-white/20 backdrop-blur-md">
                      {event.format}
                    </span>
                    <span className="text-xs font-black px-2.5 py-1 rounded-full bg-emerald-500/90 text-white">
                      {event.event_type === "free" ? "Free Registration" : `NPR ${event.ticket_price}`}
                    </span>
                  </div>
                  <div className="z-10">
                    <h3 className="text-base font-extrabold leading-snug line-clamp-2 group-hover:text-blue-200 transition-colors"><Link to={`/events/${event.id}`}>{event.title}</Link></h3>
                  </div>
                </div>

                {/* Body */}
                <div className="p-5 flex flex-col gap-3 flex-1">
                  <p className="text-xs text-slate-500 font-medium leading-relaxed line-clamp-3">
                    {event.description || "Join this exciting event on MeroTalent to network, learn, and grow your skills."}
                  </p>

                  <div className="mt-auto flex flex-col gap-2 pt-2 border-t border-slate-100 text-xs text-slate-600 font-semibold">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5 text-[#0073e6] flex-shrink-0" />
                      <span>{startDate}</span>
                    </div>
                    {event.location && (
                      <div className="flex items-center gap-2">
                        <MapPin className="w-3.5 h-3.5 text-[#0073e6] flex-shrink-0" />
                        <span className="truncate">{event.location}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3.5 bg-slate-50/50">
                  <span className="text-xs font-bold text-slate-700 capitalize">
                    {event.organizer_type} Event
                  </span>
                  <button
                    type="button"
                    onClick={() => openRegistration(event)}
                    disabled={registeredEventIds.has(event.id)}
                    className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-[#0073e6] hover:bg-[#0062c4] disabled:bg-emerald-600 text-white text-xs font-bold rounded-full transition-all"
                  >
                    <span>{registeredEventIds.has(event.id) ? "Registered" : "Register"}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {filteredEvents.length === 0 && !isLoading && (
          <div className="text-center py-16 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
            <Calendar className="w-10 h-10 text-slate-400 mx-auto mb-3" />
            <p className="text-base font-bold text-slate-700">No events found</p>
            <p className="text-xs text-slate-400 mt-1">
              {loadError || "Approved upcoming events created in Admin will appear here automatically."}
            </p>
          </div>
        )}

        {selectedEvent && (
          <ModuleSubmissionDialog
            module="event_registration"
            targetId={selectedEvent.id}
            targetName={selectedEvent.title}
            open={Boolean(selectedEvent)}
            onOpenChange={(open) => { if (!open) setSelectedEvent(null); }}
            onSubmitted={async (result) => {
              setRegisteredEventIds((current) => new Set(current).add(selectedEvent.id));
              if (selectedEvent.event_type === "paid") {
                if (!session?.access_token) throw new Error("Sign in again before continuing to eSewa.");
                await startEsewaCheckout(session.access_token, { eventRegistrationId: result.id });
              }
            }}
            successTitle="Event registration submitted"
            successDescription={selectedEvent.event_type === "free"
              ? `Your free registration for ${selectedEvent.title} is confirmed.`
              : `Your registration for ${selectedEvent.title} is stored. Continue through eSewa; the ticket is confirmed only after verified payment.`}
          />
        )}
      </div>
    </PublicPageLayout>
  );
}
