import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Calendar,
  MapPin,
  Ticket,
  Clock,
  Users,
  Layers,
  Sparkles,
  ShieldCheck,
  Phone,
  Mail,
  FileText,
} from "lucide-react";
import PublicPageLayout from "@/components/landing/PublicPageLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { fetchPublicEventDetail, type EventDetail } from "@/lib/events/events-client";
import EventRegistrationModal from "@/components/events/EventRegistrationModal";

export default function EventDetailPage() {
  const { id } = useParams();
  const { session } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [event, setEvent] = useState<EventDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [registerOpen, setRegisterOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"about" | "schedule" | "tickets">("about");

  useEffect(() => {
    loadEvent();
  }, [id]);

  const loadEvent = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const data = await fetchPublicEventDetail(id);
      setEvent(data);
      setError(null);
    } catch (err: any) {
      setError(err.message || "This event is no longer available.");
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterClick = () => {
    if (!session) {
      navigate("/login", { state: { from: { pathname: location.pathname } } });
      return;
    }
    setRegisterOpen(true);
  };

  const isFree = event?.event_type === "free" || Number(event?.ticket_price) === 0;

  return (
    <PublicPageLayout activeNavId="events">
      <main className="mx-auto w-full max-w-5xl px-5 py-10 sm:px-8">
        <Link
          to="/events"
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-[#0073e6] transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> All events
        </Link>

        {loading ? (
          <div className="py-28 text-center text-sm font-semibold text-slate-400 animate-pulse">
            Loading event details...
          </div>
        ) : !event ? (
          <div className="mt-8 rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-12 text-center">
            <h1 className="text-xl font-bold text-slate-800">Event unavailable</h1>
            <p className="mt-2 text-xs text-slate-500">{error}</p>
          </div>
        ) : (
          <>
            {/* Main Event Hero Section */}
            <section className="mt-6 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
              {event.cover_image_url ? (
                <img
                  src={event.cover_image_url}
                  alt={event.title}
                  className="h-64 w-full object-cover sm:h-80"
                />
              ) : (
                <div className="h-64 bg-gradient-to-br from-[#071a3d] via-[#0b54a9] to-[#0073e6] sm:h-80 flex items-center justify-center p-8 text-center text-white">
                  <h1 className="text-3xl sm:text-5xl font-black tracking-tight">{event.title}</h1>
                </div>
              )}

              <div className="p-6 sm:p-8">
                <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
                  {event.category && (
                    <Badge className="bg-blue-600 hover:bg-blue-700 text-white font-extrabold">
                      {event.category.name}
                    </Badge>
                  )}
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-700 capitalize">
                    {event.format}
                  </span>
                  <span
                    className={`rounded-full px-3 py-1 font-extrabold ${
                      isFree ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-800"
                    }`}
                  >
                    {isFree
                      ? "Free Registration"
                      : `${event.currency} ${Number(event.ticket_price).toLocaleString()}`}
                  </span>
                  {event.is_multi_program && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-purple-50 px-3 py-1 text-purple-700">
                      <Layers className="h-3 w-3" /> Multi-Session Event
                    </span>
                  )}
                </div>

                <h1 className="mt-4 text-3xl font-black text-slate-900 sm:text-4xl">
                  {event.title}
                </h1>

                {event.short_description && (
                  <p className="mt-2 text-sm text-slate-600 font-medium">
                    {event.short_description}
                  </p>
                )}

                <div className="mt-6 grid gap-4 text-xs font-medium text-slate-600 sm:grid-cols-2 border-t border-slate-100 pt-5">
                  <p className="inline-flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-[#0073e6] shrink-0" />
                    <span>
                      {new Date(event.start_date).toLocaleString(undefined, { dateStyle: "full", timeStyle: "short" })}
                    </span>
                  </p>
                  <p className="inline-flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-[#0073e6] shrink-0" />
                    <span>{event.location || "Online event"}</span>
                  </p>
                </div>
              </div>
            </section>

            {/* Content & Registration Layout */}
            <div className="mt-8 grid gap-8 lg:grid-cols-[1.5fr_0.8fr]">
              {/* Left Column: Tabs for Details / Schedule / Tickets */}
              <div className="space-y-6">
                {/* Navigation Tabs */}
                <div className="flex gap-2 border-b border-slate-200 pb-2">
                  <button
                    onClick={() => setActiveTab("about")}
                    className={`pb-2 px-3 text-xs font-extrabold transition-all ${
                      activeTab === "about"
                        ? "border-b-2 border-[#0073e6] text-[#0073e6]"
                        : "text-slate-500 hover:text-slate-900"
                    }`}
                  >
                    About Event
                  </button>

                  {event.is_multi_program && event.programs && event.programs.length > 0 && (
                    <button
                      onClick={() => setActiveTab("schedule")}
                      className={`pb-2 px-3 text-xs font-extrabold transition-all ${
                        activeTab === "schedule"
                          ? "border-b-2 border-[#0073e6] text-[#0073e6]"
                          : "text-slate-500 hover:text-slate-900"
                      }`}
                    >
                      Program Schedule ({event.programs.length})
                    </button>
                  )}

                  {event.ticket_types && event.ticket_types.length > 0 && (
                    <button
                      onClick={() => setActiveTab("tickets")}
                      className={`pb-2 px-3 text-xs font-extrabold transition-all ${
                        activeTab === "tickets"
                          ? "border-b-2 border-[#0073e6] text-[#0073e6]"
                          : "text-slate-500 hover:text-slate-900"
                      }`}
                    >
                      Ticket Options ({event.ticket_types.length})
                    </button>
                  )}
                </div>

                {/* TAB 1: About */}
                {activeTab === "about" && (
                  <div className="space-y-6">
                    <section className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8">
                      <h2 className="text-lg font-black text-slate-900">Event Overview</h2>
                      <p className="mt-3 whitespace-pre-wrap text-xs sm:text-sm leading-7 text-slate-600">
                        {event.description || "The organiser has not provided a detailed description."}
                      </p>
                    </section>

                    {event.terms_and_conditions && (
                      <section className="rounded-3xl border border-slate-200 bg-slate-50 p-6">
                        <div className="flex items-center gap-2 text-xs font-bold text-slate-700 uppercase">
                          <FileText className="h-4 w-4 text-slate-500" />
                          <span>Terms & Instructions</span>
                        </div>
                        <p className="mt-2 whitespace-pre-wrap text-xs text-slate-600 leading-relaxed">
                          {event.terms_and_conditions}
                        </p>
                      </section>
                    )}
                  </div>
                )}

                {/* TAB 2: Program Schedule (Sessions) */}
                {activeTab === "schedule" && event.programs && (
                  <section className="space-y-4">
                    <h2 className="text-lg font-black text-slate-900">Session Schedule</h2>
                    <div className="space-y-3">
                      {event.programs.map((prog, idx) => (
                        <div
                          key={prog.id}
                          className="rounded-2xl border border-slate-200 bg-white p-5 space-y-2"
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-[10px] font-extrabold text-[#0073e6]">
                                  Session {idx + 1}
                                </span>
                                {prog.venue && (
                                  <span className="text-xs text-slate-500 font-medium">
                                    📍 {prog.venue}
                                  </span>
                                )}
                              </div>
                              <h3 className="mt-1 text-base font-extrabold text-slate-900">
                                {prog.title}
                              </h3>
                            </div>
                            <div className="text-right text-xs font-bold text-slate-700">
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3 text-[#0073e6]" />
                                {new Date(prog.start_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                              </span>
                            </div>
                          </div>

                          {prog.description && (
                            <p className="text-xs text-slate-600 leading-relaxed">{prog.description}</p>
                          )}

                          {prog.speaker_or_organizer && (
                            <p className="text-xs font-semibold text-slate-700">
                              Speaker / Host: {prog.speaker_or_organizer}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {/* TAB 3: Ticket Options */}
                {activeTab === "tickets" && event.ticket_types && (
                  <section className="space-y-4">
                    <h2 className="text-lg font-black text-slate-900">Available Ticket Tiers</h2>
                    <div className="space-y-3">
                      {event.ticket_types.map((tt) => {
                        const isSoldOut = tt.total_quantity !== null && tt.total_quantity !== undefined && (tt.quantity_sold || 0) >= tt.total_quantity;

                        return (
                          <div
                            key={tt.id}
                            className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-5"
                          >
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="font-extrabold text-slate-900">{tt.name}</span>
                                <Badge variant="outline" className="text-[10px] font-bold uppercase">
                                  {tt.ticket_kind}
                                </Badge>
                                {isSoldOut && (
                                  <Badge variant="destructive" className="text-[10px]">Sold Out</Badge>
                                )}
                              </div>
                              {tt.description && (
                                <p className="text-xs text-slate-500">{tt.description}</p>
                              )}
                              {tt.ticket_kind === "team" && (
                                <p className="text-xs text-blue-600 font-semibold">
                                  Team Size: {tt.min_team_size} - {tt.max_team_size} members
                                </p>
                              )}
                            </div>

                            <div className="text-right">
                              <span className="text-lg font-black text-slate-900">
                                {Number(tt.price) === 0 ? "Free" : `${tt.currency} ${Number(tt.price).toLocaleString()}`}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </section>
                )}
              </div>

              {/* Right Column: Registration Card */}
              <aside className="space-y-4">
                <div className="rounded-3xl border border-slate-200 bg-slate-50/80 p-6 shadow-sm space-y-4">
                  <div>
                    <span className="text-xs font-bold uppercase text-slate-500">Registration</span>
                    <h3 className="mt-1 text-2xl font-black text-slate-900">
                      {isFree ? "Free Registration" : `From ${event.currency} ${Number(event.ticket_price).toLocaleString()}`}
                    </h3>
                  </div>

                  <div className="space-y-2 border-t border-slate-200/60 pt-4 text-xs text-slate-600">
                    <p className="flex items-center justify-between">
                      <span className="text-slate-500">Organised by:</span>
                      <span className="font-bold text-slate-800 capitalize">{event.organizer_type}</span>
                    </p>
                    {event.capacity && (
                      <p className="flex items-center justify-between">
                        <span className="text-slate-500">Total Capacity:</span>
                        <span className="font-bold text-slate-800">{event.capacity} seats</span>
                      </p>
                    )}
                    {event.registration_deadline && (
                      <p className="flex items-center justify-between">
                        <span className="text-slate-500">Deadline:</span>
                        <span className="font-bold text-slate-800">
                          {new Date(event.registration_deadline).toLocaleDateString()}
                        </span>
                      </p>
                    )}
                  </div>

                  <Button
                    onClick={handleRegisterClick}
                    className="w-full bg-[#0073e6] hover:bg-[#0062c4] font-bold py-6 text-sm rounded-2xl shadow-sm"
                  >
                    <Ticket className="mr-2 h-4 w-4" />
                    {isFree ? "Register for Free" : "Select Tickets & Register"}
                  </Button>

                  <div className="rounded-2xl bg-white p-3 border border-slate-200/60 text-[11px] text-slate-500 flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span>Instant digital QR pass generated upon confirmed registration.</span>
                  </div>
                </div>

                {/* Organizer Contact Info */}
                {event.contact_info && (
                  <div className="rounded-3xl border border-slate-200 bg-white p-5 space-y-2 text-xs">
                    <span className="font-bold uppercase text-slate-600">Need Help / Contact</span>
                    {event.contact_info.email && (
                      <p className="flex items-center gap-2 text-slate-600">
                        <Mail className="h-3.5 w-3.5 text-[#0073e6]" />
                        <span>{event.contact_info.email}</span>
                      </p>
                    )}
                    {event.contact_info.phone && (
                      <p className="flex items-center gap-2 text-slate-600">
                        <Phone className="h-3.5 w-3.5 text-[#0073e6]" />
                        <span>{event.contact_info.phone}</span>
                      </p>
                    )}
                  </div>
                )}
              </aside>
            </div>

            {/* Registration Modal */}
            {registerOpen && (
              <EventRegistrationModal
                event={event}
                open={registerOpen}
                onOpenChange={setRegisterOpen}
                onSuccess={() => {
                  loadEvent();
                }}
              />
            )}
          </>
        )}
      </main>
    </PublicPageLayout>
  );
}
