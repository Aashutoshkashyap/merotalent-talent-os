"use client";
import { isNeonClientRuntime } from "@/lib/backend-selection";


import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import PublicPageLayout from "@/components/landing/PublicPageLayout";
import { Calendar, MapPin, ArrowRight, Sparkles, Tag, Users, Layers } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { fetchPublicEvents, fetchEventCategories, type EventDetail, type EventCategory } from "@/lib/events/events-client";
import EventRegistrationModal from "@/components/events/EventRegistrationModal";

export default function EventsPage() {
  const { session, user } = useAuth();
  const navigate = useNavigate();
  const [events, setEvents] = useState<EventDetail[]>([]);
  const [categories, setCategories] = useState<EventCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedFormat, setSelectedFormat] = useState<string>("all");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [registeringEvent, setRegisteringEvent] = useState<EventDetail | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [eventsData, catsData] = await Promise.all([
        fetchPublicEvents(),
        fetchEventCategories().catch(() => []),
      ]);
      setEvents(eventsData || []);
      setCategories(catsData || []);
      setLoadError(null);
    } catch (error) {
      setEvents([]);
      setLoadError(error instanceof Error ? error.message : "Events could not be loaded.");
    } finally {
      setIsLoading(false);
    }
  };

  const filteredEvents = events.filter((e) => {
    const matchesCategory = selectedCategory === "all" || e.category?.slug === selectedCategory;
    const matchesFormat = selectedFormat === "all" || e.format === selectedFormat;
    const matchesType = selectedType === "all" || e.event_type === selectedType;
    const matchesSearch = [
      e.title,
      e.short_description || "",
      e.description || "",
      e.location || "",
      e.category?.name || "",
    ]
      .join(" ")
      .toLowerCase()
      .includes(searchQuery.toLowerCase());

    return matchesCategory && matchesFormat && matchesType && matchesSearch;
  });

  const handleOpenRegistration = (e: React.MouseEvent, eventItem: EventDetail) => {
    e.preventDefault();
    e.stopPropagation();
    if (!session && !(isNeonClientRuntime() && user)) {
      navigate("/login", { state: { from: { pathname: `/events/${eventItem.id}` } } });
      return;
    }
    setRegisteringEvent(eventItem);
  };

  return (
    <PublicPageLayout activeNavId="events">
      <div className="max-w-6xl mx-auto w-full px-6 sm:px-8 py-12 flex flex-col gap-8">
        {/* Header Hero */}
        <div className="flex flex-col gap-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-[#0073e6] text-xs font-bold w-fit">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Discover Tech, Cultural & Academic Events</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
            Events, Hackathons & Festivals
          </h1>
          <p className="text-sm text-slate-500 font-medium max-w-2xl leading-relaxed">
            Explore hackathons, guest lectures, sports tournaments, technical summits, and college festivals across Nepal.
          </p>
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          <button
            onClick={() => setSelectedCategory("all")}
            className={`px-4 py-2 rounded-full border text-xs font-extrabold whitespace-nowrap transition-all ${
              selectedCategory === "all"
                ? "bg-[#0073e6] border-[#0073e6] text-white shadow-sm"
                : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"
            }`}
          >
            All Categories
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.slug)}
              className={`px-4 py-2 rounded-full border text-xs font-extrabold whitespace-nowrap transition-all ${
                selectedCategory === cat.slug
                  ? "bg-[#0073e6] border-[#0073e6] text-white shadow-sm"
                  : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* Filters and Search Bar */}
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          <div className="flex flex-wrap gap-2">
            {[
              { id: "all", label: "All Formats" },
              { id: "offline", label: "In-Person" },
              { id: "online", label: "Online" },
              { id: "hybrid", label: "Hybrid" },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setSelectedFormat(f.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  selectedFormat === f.id
                    ? "bg-slate-900 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {f.label}
              </button>
            ))}

            <div className="h-6 w-px bg-slate-200 mx-1 hidden sm:block" />

            {[
              { id: "all", label: "All Pricing" },
              { id: "free", label: "Free" },
              { id: "paid", label: "Paid" },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setSelectedType(t.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  selectedType === t.id
                    ? "bg-blue-600 text-white"
                    : "bg-blue-50 text-blue-700 hover:bg-blue-100"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <input
            id="event-search"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search events, topics, or venues..."
            className="w-full md:w-72 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-medium outline-none transition focus:border-[#0073e6] focus:ring-2 focus:ring-blue-100"
          />
        </div>

        {/* Events Grid */}
        {isLoading ? (
          <div className="py-24 text-center text-sm font-semibold text-slate-400 animate-pulse">
            Loading upcoming events...
          </div>
        ) : loadError ? (
          <div className="rounded-2xl border border-dashed border-red-200 p-10 text-center text-sm text-red-600">
            {loadError}
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50/50 p-12 text-center">
            <h3 className="text-lg font-bold text-slate-800">No events found</h3>
            <p className="mt-1 text-xs text-slate-500">
              Try adjusting your search query or filters.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredEvents.map((eventItem) => {
              const isFreeEvent = eventItem.event_type === "free" || Number(eventItem.ticket_price) === 0;

              return (
                <div
                  key={eventItem.id}
                  className="group flex flex-col justify-between overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-md"
                >
                  <div>
                    {/* Event Cover Image */}
                    <div className="relative h-48 w-full overflow-hidden bg-gradient-to-br from-[#071a3d] via-[#0b54a9] to-[#0073e6]">
                      {eventItem.cover_image_url ? (
                        <img
                          src={eventItem.cover_image_url}
                          alt={eventItem.title}
                          loading="lazy"
                          decoding="async"
                          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center p-6 text-center text-white">
                          <span className="text-lg font-black tracking-tight">{eventItem.title}</span>
                        </div>
                      )}

                      {/* Top Badges */}
                      <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
                        {eventItem.category && (
                          <span className="rounded-full bg-white/90 px-2.5 py-0.5 text-[11px] font-extrabold text-slate-800 shadow-sm backdrop-blur-sm">
                            {eventItem.category.name}
                          </span>
                        )}
                        <span className="rounded-full bg-slate-900/80 px-2.5 py-0.5 text-[11px] font-bold text-white capitalize backdrop-blur-sm">
                          {eventItem.format}
                        </span>
                      </div>

                      <div className="absolute right-3 top-3">
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-[11px] font-extrabold shadow-sm backdrop-blur-sm ${
                            isFreeEvent
                              ? "bg-emerald-500 text-white"
                              : "bg-amber-400 text-slate-900"
                          }`}
                        >
                          {isFreeEvent ? "Free" : `${eventItem.currency} ${Number(eventItem.ticket_price).toLocaleString()}`}
                        </span>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="p-5">
                      {eventItem.is_multi_program && (
                        <div className="mb-2 flex items-center gap-1.5 text-[11px] font-bold text-[#0073e6]">
                          <Layers className="h-3 w-3" />
                          <span>Multi-Program Event ({eventItem.programs?.length || 1} sessions)</span>
                        </div>
                      )}

                      <h3 className="text-lg font-black text-slate-900 group-hover:text-[#0073e6] transition-colors line-clamp-1">
                        {eventItem.title}
                      </h3>

                      <p className="mt-2 text-xs text-slate-500 line-clamp-2 leading-relaxed">
                        {eventItem.short_description || eventItem.description || "Discover more details about this upcoming event."}
                      </p>

                      <div className="mt-4 space-y-1.5 border-t border-slate-100 pt-3 text-xs text-slate-600">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-3.5 w-3.5 text-[#0073e6] shrink-0" />
                          <span className="truncate">
                            {new Date(eventItem.start_date).toLocaleDateString(undefined, {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <MapPin className="h-3.5 w-3.5 text-[#0073e6] shrink-0" />
                          <span className="truncate">{eventItem.location || "Online"}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="border-t border-slate-100 p-4 bg-slate-50/50 flex items-center justify-between gap-3">
                    <Link
                      to={`/events/${eventItem.id}`}
                      className="text-xs font-bold text-slate-700 hover:text-[#0073e6] transition-colors"
                    >
                      View Details
                    </Link>

                    <button
                      onClick={(e) => handleOpenRegistration(e, eventItem)}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-[#0073e6] px-4 py-2 text-xs font-extrabold text-white shadow-sm transition-all hover:bg-[#0062c4]"
                    >
                      <span>Register</span>
                      <ArrowRight className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Registration Wizard Modal */}
      {registeringEvent && (
        <EventRegistrationModal
          event={registeringEvent}
          open={Boolean(registeringEvent)}
          onOpenChange={(open) => {
            if (!open) setRegisteringEvent(null);
          }}
          onSuccess={() => {
            loadData();
          }}
        />
      )}
    </PublicPageLayout>
  );
}
