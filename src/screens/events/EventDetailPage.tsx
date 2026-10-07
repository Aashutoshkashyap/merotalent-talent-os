import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Calendar, MapPin, Ticket } from "lucide-react";

import ModuleSubmissionDialog from "@/components/forms/ModuleSubmissionDialog";
import PublicPageLayout from "@/components/landing/PublicPageLayout";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { startEsewaCheckout } from "@/lib/payments/browser-checkout";

type Event = {
  id: string;
  title: string;
  description: string | null;
  event_type: "free" | "paid";
  format: string;
  location: string | null;
  cover_image_url: string | null;
  start_date: string;
  end_date: string;
  registration_deadline: string | null;
  ticket_price: number;
  currency: string;
  organizer_type: string;
};

export default function EventDetailPage() {
  const { id } = useParams();
  const { session } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [registerOpen, setRegisterOpen] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (!id) return;
      const { data, error } = await (supabase as any)
        .from("events")
        .select("*")
        .eq("id", id)
        .in("status", ["approved", "published"])
        .eq("approval_status", "approved")
        .eq("is_active", true)
        .is("deleted_at", null)
        .gt("end_date", new Date().toISOString())
        .maybeSingle();
      if (error || !data) setError(error?.message || "This event is no longer available.");
      else setEvent(data as Event);
      setLoading(false);
    };
    void load();
  }, [id]);

  const register = () => {
    if (!session) {
      navigate("/login", { state: { from: { pathname: location.pathname } } });
      return;
    }
    setRegisterOpen(true);
  };

  return (
    <PublicPageLayout activeNavId="events">
      <main className="mx-auto w-full max-w-5xl px-5 py-10 sm:px-8">
        <Link to="/events" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-[#0073e6]"><ArrowLeft className="h-4 w-4" />All events</Link>
        {loading ? <div className="py-24 text-center text-sm text-slate-500">Loading event…</div> : !event ? (
          <div className="mt-8 rounded-2xl border border-dashed p-12 text-center"><h1 className="text-xl font-bold">Event unavailable</h1><p className="mt-2 text-sm text-slate-500">{error}</p></div>
        ) : <>
          <section className="mt-6 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            {event.cover_image_url ? <img src={event.cover_image_url} alt={event.title} className="h-64 w-full object-cover sm:h-80" /> : <div className="h-64 bg-gradient-to-br from-[#071a3d] via-[#0b54a9] to-[#0073e6] sm:h-80" />}
            <div className="p-6 sm:p-8">
              <div className="flex flex-wrap gap-2 text-xs font-bold"><span className="rounded-full bg-blue-50 px-3 py-1 text-blue-700 capitalize">{event.format}</span><span className="rounded-full bg-emerald-50 px-3 py-1 text-emerald-700">{event.event_type === "free" ? "Free registration" : `${event.currency} ${Number(event.ticket_price).toLocaleString()}`}</span></div>
              <h1 className="mt-4 text-3xl font-black text-slate-900 sm:text-4xl">{event.title}</h1>
              <div className="mt-5 grid gap-3 text-sm text-slate-600 sm:grid-cols-2"><p className="inline-flex gap-2"><Calendar className="h-4 w-4 text-[#0073e6]" />{new Date(event.start_date).toLocaleString()} – {new Date(event.end_date).toLocaleString()}</p><p className="inline-flex gap-2"><MapPin className="h-4 w-4 text-[#0073e6]" />{event.location || "Location to be announced"}</p></div>
            </div>
          </section>
          <div className="mt-8 grid gap-8 lg:grid-cols-[1.5fr_0.8fr]">
            <section><h2 className="text-xl font-bold text-slate-900">About this event</h2><p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-600">{event.description || "The organiser has not added a detailed description yet."}</p></section>
            <aside className="h-fit rounded-2xl border border-slate-200 bg-slate-50 p-5"><h2 className="font-bold text-slate-900">Registration</h2><p className="mt-2 text-sm text-slate-600">Organised by a {event.organizer_type}.</p>{event.registration_deadline ? <p className="mt-2 text-xs text-slate-500">Register by {new Date(event.registration_deadline).toLocaleDateString()}.</p> : null}<Button onClick={register} className="mt-5 w-full bg-[#0073e6] hover:bg-[#0062c4]"><Ticket className="mr-2 h-4 w-4" />{event.event_type === "free" ? "Register free" : "Register & continue to eSewa"}</Button>{event.event_type === "paid" ? <p className="mt-3 text-xs text-slate-500">Your ticket is confirmed only after MeroTalent verifies the eSewa payment.</p> : null}</aside>
          </div>
          {registerOpen ? (
            <ModuleSubmissionDialog
              module="event_registration"
              targetId={event.id}
              targetName={event.title}
              open
              onOpenChange={(open) => { if (!open) setRegisterOpen(false); }}
              onSubmitted={async (result) => {
                if (event.event_type === "paid") {
                  if (!session?.access_token) throw new Error("Sign in again before continuing to eSewa.");
                  await startEsewaCheckout(session.access_token, { eventRegistrationId: result.id });
                }
              }}
              successTitle={event.event_type === "free" ? "Registration confirmed" : "Continue to eSewa"}
              successDescription={event.event_type === "free" ? `Your free registration for ${event.title} is confirmed.` : `Your registration for ${event.title} is stored. The ticket is confirmed only after verified eSewa payment.`}
            />
          ) : null}
        </>}
      </main>
    </PublicPageLayout>
  );
}
