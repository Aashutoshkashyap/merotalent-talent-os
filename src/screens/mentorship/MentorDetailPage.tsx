import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, CalendarCheck, Clock, Star } from "lucide-react";
import PublicPageLayout from "@/components/landing/PublicPageLayout";
import BookingDialog from "@/components/mentors/BookingDialog";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";

type MentorAvailability = { days?: string[]; startTime?: string; endTime?: string; timezone?: string };
type Mentor = { id: string; user_id: string; full_name?: string | null; headline: string | null; description: string | null; expertise: unknown; availability: MentorAvailability | null; years_experience: number | null; hourly_rate: number | null; rating: number | null; total_sessions: number | null; profile_image_url: string | null; avatar_url?: string | null; profiles?: { full_name?: string | null; avatar_url?: string | null; bio?: string | null } | null };
type Service = { id: string; title: string; description: string | null; session_type: string; duration_minutes: number; capacity: number; price: number; currency: string };
const values = (value: unknown) => Array.isArray(value) ? value.map(String) : [];

export default function MentorDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mentor, setMentor] = useState<Mentor | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bookOpen, setBookOpen] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (!id) return;
      try {
        const res = await fetch(`/api/v1/mentors/${id}`);
        const json = await res.json();
        if (!res.ok || !json.data) {
          setError(json?.error?.message || "This mentor is no longer available.");
          setLoading(false);
          return;
        }
        const data = json.data;
        setMentor(data);
        setServices(data.services || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load mentor.");
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [id]);

  const book = () => {
    if (!user) {
      navigate("/login", { state: { from: { pathname: location.pathname } } });
      return;
    }
    setBookOpen(true);
  };

  const name = mentor?.full_name || mentor?.profiles?.full_name || mentor?.headline || "Mentor";
  const photo = mentor?.avatar_url || mentor?.profile_image_url || mentor?.profiles?.avatar_url || "/placeholder.svg";

  return (
    <PublicPageLayout activeNavId="mentors">
      <main className="mx-auto w-full max-w-5xl px-5 py-10 sm:px-8">
        <Link to="/mentorship" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-[#0073e6]">
          <ArrowLeft className="h-4 w-4" />All mentors
        </Link>
        {loading ? (
          <div className="py-24 text-center text-sm text-slate-500">Loading mentor…</div>
        ) : !mentor ? (
          <div className="mt-8 rounded-2xl border border-dashed p-12 text-center">
            <h1 className="text-xl font-bold">Mentor unavailable</h1>
            <p className="mt-2 text-sm text-slate-500">{error}</p>
          </div>
        ) : (
          <>
            <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
              <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
                <img src={photo} alt={name} className="h-28 w-28 rounded-2xl object-cover ring-4 ring-blue-50" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-3">
                    <h1 className="text-3xl font-black text-slate-900">{name}</h1>
                    {mentor.rating != null ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-700">
                        <Star className="h-3.5 w-3.5 fill-current" />{mentor.rating}
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-2 text-base font-semibold text-[#0073e6]">{mentor.headline || "MeroTalent mentor"}</p>
                  <p className="mt-3 text-sm leading-6 text-slate-600">
                    {mentor.description || mentor.profiles?.bio || "This mentor has not added a public introduction yet."}
                  </p>
                </div>
                <Button onClick={book} className="bg-[#0073e6] hover:bg-[#0062c4]">
                  <CalendarCheck className="mr-2 h-4 w-4" />Book a session
                </Button>
              </div>
            </section>
            <div className="mt-8 grid gap-8 lg:grid-cols-[0.85fr_1.5fr]">
              <aside className="rounded-2xl bg-slate-50 p-5">
                <h2 className="font-bold text-slate-900">Profile</h2>
                <p className="mt-3 text-sm text-slate-600">{mentor.years_experience || 0}+ years experience</p>
                <p className="mt-2 text-sm text-slate-600">{mentor.total_sessions || 0} sessions completed</p>
                <p className="mt-2 text-sm font-semibold text-slate-800">
                  From NPR {Number(mentor.hourly_rate || 0).toLocaleString()} / session
                </p>
                <h3 className="mt-6 font-bold text-slate-900">Expertise</h3>
                <div className="mt-3 flex flex-wrap gap-2">
                  {values(mentor.expertise).map((item) => (
                    <span key={item} className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700">
                      {item}
                    </span>
                  )) || <span className="text-sm text-slate-500">Not specified</span>}
                </div>
                {mentor.availability?.days?.length ? (
                  <>
                    <h3 className="mt-6 font-bold text-slate-900">Availability</h3>
                    <p className="mt-2 text-sm text-slate-600">{mentor.availability.days.join(", ")}</p>
                    <p className="mt-1 text-sm text-slate-600">
                      {mentor.availability.startTime || "09:00"}–{mentor.availability.endTime || "17:00"} ({mentor.availability.timezone || "Asia/Kathmandu"})
                    </p>
                  </>
                ) : null}
              </aside>
              <section>
                <h2 className="text-xl font-bold text-slate-900">Available sessions</h2>
                <div className="mt-4 space-y-3">
                  {services.length ? (
                    services.map((service) => (
                      <article key={service.id} className="rounded-2xl border border-slate-200 bg-white p-5">
                        <div className="flex flex-col justify-between gap-4 sm:flex-row">
                          <div>
                            <h3 className="font-bold text-slate-900">{service.title}</h3>
                            <p className="mt-1 text-sm text-slate-600">
                              {service.description || "Book a guided mentoring session."}
                            </p>
                            <p className="mt-3 inline-flex items-center gap-2 text-xs font-semibold text-slate-500">
                              <Clock className="h-3.5 w-3.5" />{service.duration_minutes} minutes · {service.session_type.replace(/_/g, " ")}
                            </p>
                          </div>
                          <div className="text-left sm:text-right">
                            <p className="font-bold text-slate-900">
                              {service.currency} {Number(service.price).toLocaleString()}
                            </p>
                            <Button size="sm" className="mt-3 bg-[#0073e6] hover:bg-[#0062c4]" onClick={book}>
                              Book
                            </Button>
                          </div>
                        </div>
                      </article>
                    ))
                  ) : (
                    <div className="rounded-2xl border border-dashed p-8 text-sm text-slate-500">
                      No bookable sessions have been published yet.
                    </div>
                  )}
                </div>
              </section>
            </div>
            {bookOpen ? (
              <BookingDialog
                isOpen
                onClose={() => setBookOpen(false)}
                mentor={{
                  id: mentor.id,
                  name,
                  hourlyRate: Number(mentor.hourly_rate || 0),
                  expertise: values(mentor.expertise),
                  availability: mentor.availability,
                }}
              />
            ) : null}
          </>
        )}
      </main>
    </PublicPageLayout>
  );
}

