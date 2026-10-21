import { isNeonClientRuntime } from "@/lib/backend-selection";
import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Briefcase, Building2, CheckCircle2, MapPin } from "lucide-react";
import PublicPageLayout from "@/components/landing/PublicPageLayout";
import JobApplicationWizard from "@/components/jobs/JobApplicationWizard";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";

type Job = {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  job_type: string | null;
  experience_level: string | null;
  salary_min: number | null;
  salary_max: number | null;
  requirements: unknown;
  skills: unknown;
  skills_required?: unknown;
  expires_at: string | null;
  companies?: { name?: string | null; logo_url?: string | null } | null;
  company_name?: string | null;
};

const arrayOfStrings = (value: unknown) => (Array.isArray(value) ? value.map(String) : []);
const salaryLabel = (job: Job) =>
  job.salary_min || job.salary_max
    ? `NPR ${Number(job.salary_min || 0).toLocaleString()}${job.salary_max ? ` – ${Number(job.salary_max).toLocaleString()}` : "+"}`
    : "Compensation shared by employer";

export default function JobDetailPage() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { user, session } = useAuth();
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [applyOpen, setApplyOpen] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (!id) return;
      setLoading(true);
      try {
        const res = await fetch(`/api/v1/jobs?id=${encodeURIComponent(id)}`);
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          setError(body.error?.message || "This job is no longer available.");
          setJob(null);
        } else {
          const body = await res.json();
          if (body?.data) {
            setJob(body.data as Job);
            setError(null);
          } else {
            setError("This job is no longer available.");
            setJob(null);
          }
        }
      } catch (err: any) {
        setError(err.message || "Failed to load job details.");
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [id]);

  const apply = () => {
    if (!session && !(isNeonClientRuntime() && user)) {
      navigate("/login", { state: { from: { pathname: location.pathname } } });
      return;
    }
    setApplyOpen(true);
  };

  const companyName = job?.companies?.name || job?.company_name || "Independent employer";
  const skillList = arrayOfStrings(job?.skills).length
    ? arrayOfStrings(job?.skills)
    : arrayOfStrings(job?.skills_required);

  return (
    <PublicPageLayout activeNavId="jobs">
      <main className="mx-auto w-full max-w-5xl px-5 py-10 sm:px-8">
        <Link
          to="/jobs"
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-[#0073e6]"
        >
          <ArrowLeft className="h-4 w-4" />
          All jobs
        </Link>
        {loading ? (
          <div className="py-24 text-center text-sm text-slate-500">Loading job…</div>
        ) : !job ? (
          <div className="mt-8 rounded-2xl border border-dashed p-12 text-center">
            <h1 className="text-xl font-bold">Job unavailable</h1>
            <p className="mt-2 text-sm text-slate-500">{error || "This listing cannot be viewed."}</p>
          </div>
        ) : (
          <>
            <section className="mt-6 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
              <div className="bg-gradient-to-br from-[#071a3d] via-[#0b54a9] to-[#0073e6] px-6 py-10 text-white sm:px-10">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-100">
                  {job.job_type?.replace(/_/g, " ") || "Opportunity"}
                </p>
                <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">{job.title}</h1>
                <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-sm text-blue-50">
                  <span className="inline-flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    {companyName}
                  </span>
                  <span className="inline-flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    {job.location || "Location to be confirmed"}
                  </span>
                  <span className="inline-flex items-center gap-2">
                    <Briefcase className="h-4 w-4" />
                    {salaryLabel(job)}
                  </span>
                </div>
              </div>
              <div className="flex flex-col justify-between gap-4 p-6 sm:flex-row sm:items-center">
                <p className="text-sm text-slate-600">
                  {job.expires_at
                    ? `Applications close ${new Date(job.expires_at).toLocaleDateString()}.`
                    : "Applications are currently open."}
                </p>
                <Button onClick={apply} className="bg-[#0073e6] hover:bg-[#0062c4]">
                  Apply through MeroTalent
                </Button>
              </div>
            </section>
            <div className="mt-8 grid gap-8 lg:grid-cols-[1.5fr_0.8fr]">
              <section className="space-y-7">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">About this role</h2>
                  <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-600">
                    {job.description || "The employer has not added a detailed description yet."}
                  </p>
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Requirements</h2>
                  {arrayOfStrings(job.requirements).length ? (
                    <ul className="mt-3 space-y-2">
                      {arrayOfStrings(job.requirements).map((requirement) => (
                        <li key={requirement} className="flex gap-2 text-sm text-slate-600">
                          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#0073e6]" />
                          {requirement}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-3 text-sm text-slate-500">
                      Requirements are shared by the employer during the application process.
                    </p>
                  )}
                </div>
              </section>
              <aside className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <h2 className="font-bold text-slate-900">Skills</h2>
                <div className="mt-3 flex flex-wrap gap-2">
                  {skillList.length ? (
                    skillList.map((skill) => (
                      <span
                        key={skill}
                        className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700 shadow-sm"
                      >
                        {skill}
                      </span>
                    ))
                  ) : (
                    <span className="text-sm text-slate-500">Not specified</span>
                  )}
                </div>
              </aside>
            </div>
            {applyOpen ? (
              <JobApplicationWizard
                isOpen
                onClose={() => setApplyOpen(false)}
                job={{
                  id: job.id,
                  title: job.title,
                  company: companyName,
                  location: job.location || "Nepal",
                  salary: salaryLabel(job),
                  requirements: arrayOfStrings(job.requirements),
                  skills: skillList,
                }}
              />
            ) : null}
          </>
        )}
      </main>
    </PublicPageLayout>
  );
}
