"use client";

import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import PublicPageLayout from "@/components/landing/PublicPageLayout";
import { Calendar, MapPin, ArrowRight, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

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

const mockEvents: EventItem[] = [
  {
    id: "locus-2026",
    title: "LOCUS National Tech Exhibition 2026",
    description: "Annual hardware, software, and robotics exhibition organized by Pulchowk Campus students.",
    event_type: "free",
    format: "offline",
    location: "Pulchowk Campus, Lalitpur",
    start_date: "2026-02-20T09:00:00Z",
    end_date: "2026-02-22T17:00:00Z",
    ticket_price: 0,
    cover_image_url: null,
    organizer_type: "college",
  },
  {
    id: "ku-hackfest",
    title: "KU HackFest 2026 Open Community Sprint",
    description: "48-hour hackathon bringing together developer talents to solve real-world civic challenges.",
    event_type: "free",
    format: "hybrid",
    location: "Kathmandu University, Dhulikhel",
    start_date: "2026-02-25T10:00:00Z",
    end_date: "2026-02-27T16:00:00Z",
    ticket_price: 0,
    cover_image_url: null,
    organizer_type: "college",
  },
  {
    id: "ai-career-summit",
    title: "Nepal AI & Tech Talent Summit 2026",
    description: "Industry keynotes, mentorship roundtables, and career fairs for tech graduates in Nepal.",
    event_type: "paid",
    format: "offline",
    location: "Hotel Himalaya, Kupondole",
    start_date: "2026-03-05T09:00:00Z",
    end_date: "2026-03-05T18:00:00Z",
    ticket_price: 500,
    cover_image_url: null,
    organizer_type: "company",
  },
];

export default function EventsPage() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedFormat, setSelectedFormat] = useState("all");

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      const { data } = await (supabase as any)
        .from("events")
        .select("*")
        .order("start_date", { ascending: true });

      if (data && data.length > 0) {
        setEvents(data as EventItem[]);
      } else {
        setEvents(mockEvents);
      }
    } catch {
      setEvents(mockEvents);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredEvents = events.filter((e) => {
    if (selectedFormat === "all") return true;
    return e.format === selectedFormat || e.event_type === selectedFormat;
  });

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
                  <div className="flex items-center justify-between z-10">
                    <span className="text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full bg-white/20 backdrop-blur-md">
                      {event.format}
                    </span>
                    <span className="text-xs font-black px-2.5 py-1 rounded-full bg-emerald-500/90 text-white">
                      {event.event_type === "free" ? "Free Registration" : `NPR ${event.ticket_price}`}
                    </span>
                  </div>
                  <div className="z-10">
                    <h3 className="text-base font-extrabold leading-snug line-clamp-2 group-hover:text-blue-200 transition-colors">
                      {event.title}
                    </h3>
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
                  <Link
                    to="/login"
                    className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-[#0073e6] hover:bg-[#0062c4] text-white text-xs font-bold rounded-full transition-all"
                  >
                    <span>Register</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>

        {filteredEvents.length === 0 && !isLoading && (
          <div className="text-center py-16 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
            <Calendar className="w-10 h-10 text-slate-400 mx-auto mb-3" />
            <p className="text-base font-bold text-slate-700">No events found</p>
            <p className="text-xs text-slate-400 mt-1">Try switching categories or check back soon.</p>
          </div>
        )}
      </div>
    </PublicPageLayout>
  );
}
