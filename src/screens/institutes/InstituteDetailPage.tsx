"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  BadgeCheck,
  Bell,
  BookOpen,
  Building2,
  CalendarDays,
  CheckCircle2,
  ExternalLink,
  FileText,
  Globe2,
  GraduationCap,
  ImageIcon,
  Mail,
  MapPin,
  Phone,
  PlayCircle,
  RefreshCw,
  School,
  Users,
} from "lucide-react";
import { Link, useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import PublicPageLayout from "@/components/landing/PublicPageLayout";
import CollegeApplicationDialog from "@/components/institutes/CollegeApplicationDialog";
import InstituteImage from "@/components/institutes/InstituteImage";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/AuthContext";
import {
  fetchPublicInstitute,
  formatInstituteCategory,
  getContactValue,
  getGoogleMapsEmbedUrl,
  getGoogleMapsSearchUrl,
  getInstitutePrograms,
  getYoutubeEmbedUrl,
  institutePath,
  safeExternalUrl,
} from "@/lib/institutes/public-institutes";

const sectionLinks = [
  { id: "about", label: "About" },
  { id: "updates", label: "Updates" },
  { id: "leadership", label: "Leadership" },
  { id: "admissions", label: "Admissions" },
  { id: "programs", label: "Programs" },
  { id: "features", label: "Features" },
  { id: "gallery", label: "Gallery" },
  { id: "video", label: "Video" },
  { id: "location", label: "Location" },
];

const displayDate = (value: string | null) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? null
    : new Intl.DateTimeFormat("en-NP", { year: "numeric", month: "long", day: "numeric" }).format(date);
};

const titleCase = (value: string | null | undefined) =>
  value ? value.replace(/[_-]+/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase()) : null;

function DetailSkeleton() {
  return (
    <div className="mx-auto w-full max-w-[1280px] px-5 py-8 sm:px-8 lg:px-10">
      <Skeleton className="aspect-[2.2/1] max-h-[480px] w-full rounded-[28px] bg-slate-100 sm:aspect-[2.63/1]" />
      <div className="relative px-4 pb-6 sm:px-8 sm:pb-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
          <Skeleton className="-mt-14 h-28 w-28 rounded-[24px] border-4 border-white bg-slate-100 sm:-mt-20 sm:h-40 sm:w-40" />
          <div className="flex-1 space-y-3 sm:pb-1">
            <Skeleton className="h-8 w-3/5 bg-slate-100" />
            <Skeleton className="h-4 w-2/5 bg-slate-100" />
          </div>
        </div>
      </div>
      <div className="mt-10 grid gap-8 xl:grid-cols-[180px_minmax(0,1fr)_300px]">
        <Skeleton className="h-64 rounded-2xl bg-slate-100" />
        <div className="space-y-5">
          <Skeleton className="h-52 rounded-2xl bg-slate-100" />
          <Skeleton className="h-72 rounded-2xl bg-slate-100" />
        </div>
        <Skeleton className="h-80 rounded-2xl bg-slate-100" />
      </div>
    </div>
  );
}

export default function InstituteDetailPage() {
  const { slug = "" } = useParams<{ slug: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, isLoading: authLoading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [applicationOpen, setApplicationOpen] = useState(false);

  const instituteQuery = useQuery({
    queryKey: ["institute-directory-detail", slug],
    queryFn: () => fetchPublicInstitute(slug),
    enabled: Boolean(slug),
    retry: 1,
  });

  const updatesQuery = useQuery({
    queryKey: ["public-college-updates", instituteQuery.data?.id],
    enabled: Boolean(instituteQuery.data?.id),
    queryFn: async () => {
      const instituteId = instituteQuery.data!.id;
      const response = await fetch(`/api/v1/institutes/${encodeURIComponent(instituteId)}/updates`, {
        headers: { accept: "application/json" }, cache: "no-store",
      });
      if (!response.ok) throw new Error("College updates could not be loaded.");
      const json = await response.json() as { data?: {
        blogs: Array<{ id: string; title: string; slug: string; excerpt: string | null; published_at: string | null }>;
        notices: Array<{ id: string; title: string; content: string | null; published_at: string | null }>;
      } };
      return json.data ?? { blogs: [], notices: [] };
    },
  });

  useEffect(() => {
    if (searchParams.get("apply") !== "1" || authLoading) return;

    if (!user) {
      navigate("/login", {
        replace: true,
        state: { from: { pathname: `${location.pathname}?apply=1` } },
      });
      return;
    }

    setApplicationOpen(true);
    const next = new URLSearchParams(searchParams);
    next.delete("apply");
    setSearchParams(next, { replace: true });
  }, [authLoading, location.pathname, navigate, searchParams, setSearchParams, user]);

  const institute = instituteQuery.data;
  const programs = useMemo(() => getInstitutePrograms(institute?.courses_offered), [institute?.courses_offered]);
  const gallery = institute?.gallery_urls?.filter(Boolean).slice(0, 12) ?? [];
  const youtubeEmbedUrl = getYoutubeEmbedUrl(institute?.youtube_url);
  const website = safeExternalUrl(institute?.website);
  const deadline = displayDate(institute?.admission_deadline ?? null);
  const address = getContactValue(institute?.contact_info, ["address", "street_address"]);
  const mapEmbedUrl = getGoogleMapsEmbedUrl(institute?.map_location);
  const mapSearchUrl = getGoogleMapsSearchUrl(institute?.map_location);
  const blogs = updatesQuery.data?.blogs ?? [];
  const notices = updatesQuery.data?.notices ?? [];
  const hasUpdates = blogs.length > 0 || notices.length > 0;

  const openApplication = () => {
    if (!user) {
      navigate("/login", { state: { from: { pathname: `${location.pathname}?apply=1` } } });
      return;
    }
    setApplicationOpen(true);
  };

  if (instituteQuery.isPending) {
    return (
      <PublicPageLayout activeNavId="colleges">
        <DetailSkeleton />
      </PublicPageLayout>
    );
  }

  if (instituteQuery.isError || !institute) {
    return (
      <PublicPageLayout activeNavId="colleges">
        <div className="mx-auto flex min-h-[65vh] w-full max-w-3xl flex-col items-center justify-center px-6 py-16 text-center">
          <div className="grid h-16 w-16 place-items-center rounded-2xl bg-blue-50 text-[#0073e6]">
            {instituteQuery.isError ? <RefreshCw className="h-7 w-7" /> : <Building2 className="h-7 w-7" />}
          </div>
          <h1 className="mt-5 text-2xl font-black tracking-tight text-slate-900">
            {instituteQuery.isError ? "This college could not be loaded" : "College not found"}
          </h1>
          <p className="mt-2 max-w-lg text-sm font-medium leading-relaxed text-slate-500">
            {instituteQuery.isError
              ? "Please try again. If the problem continues, the directory may be temporarily unavailable."
              : "This listing may have moved, is awaiting approval, or is no longer public."}
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            {instituteQuery.isError && (
              <Button onClick={() => instituteQuery.refetch()} className="rounded-xl bg-[#0073e6] hover:bg-[#0062c4]">Try again</Button>
            )}
            <Button asChild variant="outline" className="rounded-xl border-slate-200">
              <Link to="/institutes">Back to directory</Link>
            </Button>
          </div>
        </div>
      </PublicPageLayout>
    );
  }

  const canApply = institute.applications_enabled === true;
  const galleryItems: Array<string | null> = gallery.length ? gallery : [null, null, null];

  return (
    <PublicPageLayout activeNavId="colleges">
      <div className="mx-auto w-full max-w-[1280px] px-4 py-6 sm:px-8 lg:px-10 lg:py-9">
        <Link to="/institutes" className="mb-4 inline-flex items-center gap-1.5 text-xs font-extrabold text-slate-500 transition hover:text-[#0073e6]">
          <span aria-hidden="true">←</span>
          Back to education directory
        </Link>

        <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
          <div className="relative aspect-[2.2/1] max-h-[480px] w-full overflow-hidden bg-slate-100 sm:aspect-[2.63/1]">
            <InstituteImage
              source={institute.cover_image_url}
              alt={`${institute.name} cover`}
              decoding="async"
              fetchPriority="high"
              className="h-full w-full"
            />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-950/35 via-transparent to-transparent" />
          </div>

          <div className="relative px-5 pb-6 sm:px-8 sm:pb-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
              <div className="relative z-10 -mt-14 h-28 w-28 shrink-0 overflow-hidden rounded-[24px] border-4 border-white bg-white shadow-xl sm:-mt-20 sm:h-40 sm:w-40">
                <InstituteImage source={institute.logo_url} alt={`${institute.name} logo`} className="h-full w-full object-contain p-3" />
              </div>

              <div className="relative z-10 min-w-0 flex-1 sm:pb-1">
                <div className="flex flex-wrap items-center gap-2">
                  {institute.institution_category && (
                    <span className="rounded-full bg-blue-50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-[#0073e6]">
                      {formatInstituteCategory(institute.institution_category)}
                    </span>
                  )}
                  {institute.payment_verified && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.08em] text-[#0073e6]">
                      <BadgeCheck className="h-3.5 w-3.5" /> Paid & verified
                    </span>
                  )}
                </div>
                <h1 className="mt-2 flex items-start gap-2 text-2xl font-black leading-tight tracking-[-0.03em] text-slate-950 sm:text-3xl lg:text-4xl">
                  <span>{institute.name}</span>
                  {institute.payment_verified && (
                    <BadgeCheck aria-label="Paid and verified" className="mt-1 h-6 w-6 shrink-0 fill-blue-50 text-[#0073e6] sm:h-7 sm:w-7" />
                  )}
                </h1>
                <p className="mt-2 flex items-start gap-1.5 text-sm font-semibold text-slate-500 sm:text-base">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#0073e6]" />
                  {institute.location || address || "Location available on request"}
                </p>
              </div>

              <div className="relative z-10 flex flex-wrap gap-2 sm:pb-1">
                {canApply && (
                  <Button onClick={openApplication} className="h-11 flex-1 rounded-xl bg-[#0073e6] px-6 font-extrabold hover:bg-[#0062c4] sm:flex-none">
                    Apply now
                  </Button>
                )}
                {website && (
                  <Button asChild variant="outline" className="h-11 flex-1 rounded-xl border-slate-200 bg-white px-5 font-extrabold text-slate-700 sm:flex-none">
                    <a href={website} target="_blank" rel="noopener noreferrer">
                      Website <ExternalLink className="ml-2 h-4 w-4" />
                    </a>
                  </Button>
                )}
              </div>
            </div>
          </div>
        </section>

        <div className="mt-7 grid gap-7 xl:grid-cols-[180px_minmax(0,1fr)_300px] xl:items-start">
          <aside className="sticky top-[72px] z-20 -mx-4 overflow-x-auto border-y border-slate-200 bg-white/95 px-4 py-2 backdrop-blur [scrollbar-width:none] [&::-webkit-scrollbar]:hidden xl:mx-0 xl:rounded-2xl xl:border xl:p-2 xl:shadow-sm">
            <nav aria-label="College detail sections" className="flex min-w-max gap-1 xl:min-w-0 xl:flex-col">
              {sectionLinks.filter((item) => item.id !== "updates" || hasUpdates).map((item) => (
                <a
                  key={item.id}
                  href={`#${item.id}`}
                  className="rounded-xl px-4 py-2.5 text-xs font-extrabold text-slate-600 transition hover:bg-blue-50 hover:text-[#0073e6] xl:text-sm"
                >
                  {item.label}
                </a>
              ))}
            </nav>
          </aside>

          <main className="min-w-0 space-y-6">
            <section id="about" className="scroll-mt-28 rounded-[22px] border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
              <div className="mb-4 flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-blue-50 text-[#0073e6]"><Building2 className="h-5 w-5" /></div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#0073e6]">Overview</p>
                  <h2 className="text-xl font-black tracking-tight text-slate-900 sm:text-2xl">About {institute.short_name || institute.name}</h2>
                </div>
              </div>
              <p className="whitespace-pre-line text-[15px] font-medium leading-8 text-slate-600">
                {institute.description || "A detailed institution profile will be available soon."}
              </p>
            </section>

            {hasUpdates && (
              <section id="updates" className="scroll-mt-28 rounded-[22px] border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
                <h2 className="text-xl font-black tracking-tight text-slate-900 sm:text-2xl">Latest college updates</h2>
                <div className="mt-4 grid gap-3">
                  {blogs.map((blog) => (
                    <Link key={blog.id} to={`${institutePath(institute)}/blogs/${blog.slug}`} className="rounded-2xl border border-slate-100 p-4 transition hover:border-blue-200 hover:bg-blue-50/40">
                      <p className="flex items-center gap-2 text-xs font-extrabold text-[#0073e6]"><FileText className="h-4 w-4" /> College post {displayDate(blog.published_at) ? `· ${displayDate(blog.published_at)}` : ""}</p>
                      <h3 className="mt-1 font-black text-slate-900">{blog.title}</h3>
                      {blog.excerpt && <p className="mt-1 line-clamp-2 text-sm text-slate-600">{blog.excerpt}</p>}
                    </Link>
                  ))}
                  {notices.map((notice) => (
                    <article key={notice.id} className="rounded-2xl border border-slate-100 p-4">
                      <p className="flex items-center gap-2 text-xs font-extrabold text-[#0073e6]"><Bell className="h-4 w-4" /> Notice {displayDate(notice.published_at) ? `· ${displayDate(notice.published_at)}` : ""}</p>
                      <h3 className="mt-1 font-black text-slate-900">{notice.title}</h3>
                      <p className="mt-1 line-clamp-3 whitespace-pre-line text-sm text-slate-600">{notice.content}</p>
                    </article>
                  ))}
                </div>
                {blogs.length > 0 && <Link to={`${institutePath(institute)}/blogs`} className="mt-4 inline-block text-sm font-extrabold text-[#0073e6] hover:underline">View all college posts →</Link>}
              </section>
            )}

            {(institute.chairperson_name || institute.chairperson_message || institute.principal_name || institute.principal_message) && (
              <section id="leadership" className="scroll-mt-28 rounded-[22px] border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
                <div className="mb-5 flex items-center gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-xl bg-blue-50 text-[#0073e6]"><Users className="h-5 w-5" /></div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#0073e6]">Leadership</p>
                    <h2 className="text-xl font-black tracking-tight text-slate-900 sm:text-2xl">A message from the institution</h2>
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  {[
                    { key: "chairperson", title: institute.chairperson_name, designation: institute.chairperson_designation, message: institute.chairperson_message, image: institute.chairperson_image_url, fallback: "Chairperson" },
                    { key: "principal", title: institute.principal_name, designation: institute.principal_designation, message: institute.principal_message, image: institute.principal_image_url, fallback: "Principal" },
                  ].filter((person) => person.title || person.message).map((person) => (
                    <article key={person.key} className="rounded-2xl bg-slate-50 p-4">
                      <div className="flex items-center gap-3">
                        <div className="h-12 w-12 shrink-0 overflow-hidden rounded-full bg-white ring-1 ring-slate-200">
                          <InstituteImage source={person.image} alt="" className="h-full w-full object-cover" />
                        </div>
                        <div>
                          <h3 className="font-black text-slate-900">{person.title || person.fallback}</h3>
                          {person.designation && <p className="text-xs font-bold text-[#0073e6]">{person.designation}</p>}
                        </div>
                      </div>
                      {person.message && <p className="mt-4 whitespace-pre-line text-sm font-medium leading-7 text-slate-600">{person.message}</p>}
                    </article>
                  ))}
                </div>
              </section>
            )}

            <section id="admissions" className="scroll-mt-28 rounded-[22px] border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#0073e6]">Admissions</p>
                  <h2 className="mt-1 text-xl font-black tracking-tight text-slate-900 sm:text-2xl">Admission information</h2>
                </div>
                {institute.admission_status && (
                  <span className={`w-fit rounded-full px-3 py-1.5 text-xs font-extrabold capitalize ${
                    institute.admission_status === "open" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"
                  }`}>
                    {titleCase(institute.admission_status)}
                  </span>
                )}
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl bg-slate-50 p-4">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-500"><CalendarDays className="h-4 w-4 text-[#0073e6]" />Application deadline</div>
                  <p className="mt-2 text-base font-black text-slate-900">{deadline || "Contact the institution"}</p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-4">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-500"><Users className="h-4 w-4 text-[#0073e6]" />Available seats</div>
                  <p className="mt-2 text-base font-black text-slate-900">
                    {institute.available_seats ?? "Contact institution"}
                    {typeof institute.total_seats === "number" ? ` of ${institute.total_seats}` : ""}
                  </p>
                </div>
              </div>

              {institute.admission_guidelines && (
                <div className="mt-5 border-t border-slate-100 pt-5">
                  <h3 className="text-sm font-black text-slate-900">Admission guidelines</h3>
                  <p className="mt-2 whitespace-pre-line text-sm font-medium leading-7 text-slate-600">{institute.admission_guidelines}</p>
                </div>
              )}

              {canApply && (
                <Button onClick={openApplication} className="mt-5 rounded-xl bg-[#0073e6] px-6 font-extrabold hover:bg-[#0062c4]">
                  Apply now through MeroTalent
                </Button>
              )}
            </section>

            <section id="programs" className="scroll-mt-28 rounded-[22px] border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
              <div className="mb-5 flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-blue-50 text-[#0073e6]"><BookOpen className="h-5 w-5" /></div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#0073e6]">Study options</p>
                  <h2 className="text-xl font-black tracking-tight text-slate-900 sm:text-2xl">Programs offered</h2>
                </div>
              </div>
              {programs.length ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  {programs.map((program) => (
                    <article key={`${program.name}-${program.level || ""}`} className="rounded-2xl border border-slate-200 p-4 transition hover:border-blue-200 hover:bg-blue-50/30">
                      <div className="flex items-start gap-3">
                        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-blue-50 text-[#0073e6]"><GraduationCap className="h-4 w-4" /></div>
                        <div>
                          <h3 className="text-sm font-extrabold leading-snug text-slate-900">{program.name}</h3>
                          {program.level && <p className="mt-1 text-xs font-bold text-[#0073e6]">{program.level}</p>}
                          {program.description && <p className="mt-2 text-xs font-medium leading-relaxed text-slate-500">{program.description}</p>}
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm font-semibold text-slate-500">
                  Program details are being prepared.
                </div>
              )}
            </section>

            <section id="features" className="scroll-mt-28 rounded-[22px] border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
              <div className="mb-5 flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-blue-50 text-[#0073e6]"><CheckCircle2 className="h-5 w-5" /></div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#0073e6]">College profile</p>
                  <h2 className="text-xl font-black tracking-tight text-slate-900 sm:text-2xl">Features & scholarships</h2>
                </div>
              </div>
              {institute.salient_features?.length ? (
                <ul className="grid gap-3 sm:grid-cols-2">
                  {institute.salient_features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 rounded-xl bg-slate-50 p-3 text-sm font-semibold leading-relaxed text-slate-600">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                      {feature}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm font-medium text-slate-500">Feature details will be added by the institution.</p>
              )}
              {institute.scholarships && (
                <div className="mt-5 rounded-2xl border border-blue-100 bg-blue-50/60 p-4">
                  <h3 className="text-sm font-black text-slate-900">Scholarship information</h3>
                  <p className="mt-2 whitespace-pre-line text-sm font-medium leading-7 text-slate-600">{institute.scholarships}</p>
                </div>
              )}
            </section>

            <section id="gallery" className="scroll-mt-28 rounded-[22px] border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
              <div className="mb-5 flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-blue-50 text-[#0073e6]"><ImageIcon className="h-5 w-5" /></div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#0073e6]">Campus life</p>
                  <h2 className="text-xl font-black tracking-tight text-slate-900 sm:text-2xl">Image gallery</h2>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {galleryItems.map((image, index) => (
                  <div key={`${image || "placeholder"}-${index}`} className={`overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 ${index === 0 ? "col-span-2 row-span-2 sm:col-span-2" : ""}`}>
                    <InstituteImage
                      source={image}
                      alt={image ? `${institute.name} gallery image ${index + 1}` : "Gallery image placeholder"}
                      loading="lazy"
                      decoding="async"
                      className={`h-full min-h-36 w-full ${index === 0 ? "sm:min-h-[300px]" : "sm:min-h-[144px]"}`}
                    />
                  </div>
                ))}
              </div>
              {!gallery.length && <p className="mt-3 text-xs font-semibold text-slate-400">Campus photographs will appear here when the institution uploads them.</p>}
            </section>

            <section id="video" className="scroll-mt-28 rounded-[22px] border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
              <div className="mb-5 flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-blue-50 text-[#0073e6]"><PlayCircle className="h-5 w-5" /></div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#0073e6]">Watch</p>
                  <h2 className="text-xl font-black tracking-tight text-slate-900 sm:text-2xl">College video</h2>
                </div>
              </div>
              <div className="aspect-video overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
                {youtubeEmbedUrl ? (
                  <iframe
                    src={youtubeEmbedUrl}
                    title={`${institute.name} video`}
                    className="h-full w-full"
                    loading="lazy"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                    referrerPolicy="strict-origin-when-cross-origin"
                  />
                ) : (
                  <div className="relative h-full w-full">
                    <InstituteImage source={null} alt="Video placeholder" className="h-full w-full opacity-45" />
                    <div className="absolute inset-0 grid place-items-center bg-white/35 text-center backdrop-blur-[1px]">
                      <div>
                        <PlayCircle className="mx-auto h-11 w-11 text-[#0073e6]" />
                        <p className="mt-2 text-sm font-extrabold text-slate-700">No college video has been added yet</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </section>
          </main>

          <aside className="space-y-4 xl:sticky xl:top-[82px]">
            <section className="rounded-[22px] border border-slate-200 bg-slate-50 p-5 shadow-sm">
              <h2 className="text-base font-black text-slate-900">College facts</h2>
              <dl className="mt-4 space-y-4">
                {institute.affiliation && (
                  <div className="flex gap-3"><School className="mt-0.5 h-4 w-4 shrink-0 text-[#0073e6]" /><div><dt className="text-[10px] font-black uppercase tracking-wider text-slate-400">Affiliation</dt><dd className="mt-0.5 text-sm font-bold text-slate-700">{institute.affiliation}</dd></div></div>
                )}
                {institute.established_year && (
                  <div className="flex gap-3"><CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-[#0073e6]" /><div><dt className="text-[10px] font-black uppercase tracking-wider text-slate-400">Established</dt><dd className="mt-0.5 text-sm font-bold text-slate-700">{institute.established_year}</dd></div></div>
                )}
                {(institute.type || institute.level) && (
                  <div className="flex gap-3"><GraduationCap className="mt-0.5 h-4 w-4 shrink-0 text-[#0073e6]" /><div><dt className="text-[10px] font-black uppercase tracking-wider text-slate-400">Institution</dt><dd className="mt-0.5 text-sm font-bold text-slate-700">{[titleCase(institute.type), institute.level].filter(Boolean).join(" • ")}</dd></div></div>
                )}
                {(institute.location || address) && (
                  <div className="flex gap-3"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#0073e6]" /><div><dt className="text-[10px] font-black uppercase tracking-wider text-slate-400">Address</dt><dd className="mt-0.5 text-sm font-bold leading-relaxed text-slate-700">{address || institute.location}</dd></div></div>
                )}
              </dl>
            </section>

            <section className="rounded-[22px] border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-base font-black text-slate-900">Contact</h2>
              <div className="mt-4 space-y-2">
                {institute.contact_phone && (
                  <a href={`tel:${institute.contact_phone.replace(/[^+\d]/g, "")}`} className="flex items-start gap-2 rounded-xl p-2 text-sm font-semibold text-slate-600 transition hover:bg-blue-50 hover:text-[#0073e6]"><Phone className="mt-0.5 h-4 w-4 shrink-0" /><span className="break-all">{institute.contact_phone}</span></a>
                )}
                {institute.contact_email && (
                  <a href={`mailto:${institute.contact_email}`} className="flex items-start gap-2 rounded-xl p-2 text-sm font-semibold text-slate-600 transition hover:bg-blue-50 hover:text-[#0073e6]"><Mail className="mt-0.5 h-4 w-4 shrink-0" /><span className="break-all">{institute.contact_email}</span></a>
                )}
                {website && (
                  <a href={website} target="_blank" rel="noopener noreferrer" className="flex items-start gap-2 rounded-xl p-2 text-sm font-semibold text-slate-600 transition hover:bg-blue-50 hover:text-[#0073e6]"><Globe2 className="mt-0.5 h-4 w-4 shrink-0" /><span>Official website</span><ExternalLink className="ml-auto mt-0.5 h-3.5 w-3.5" /></a>
                )}
                {!institute.contact_phone && !institute.contact_email && !website && (
                  <p className="text-sm font-medium leading-relaxed text-slate-500">Contact details will be added by the institution.</p>
                )}
              </div>
              {canApply && (
                <Button onClick={openApplication} className="mt-5 h-11 w-full rounded-xl bg-[#0073e6] font-extrabold hover:bg-[#0062c4]">
                  Apply now
                </Button>
              )}
            </section>
          </aside>
        </div>

        <section id="location" className="mt-7 overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between sm:px-7">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-blue-50 text-[#0073e6]">
                <MapPin className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#0073e6]">Visit campus</p>
                <h2 className="text-xl font-black tracking-tight text-slate-900 sm:text-2xl">College location</h2>
              </div>
            </div>
            {mapSearchUrl && (
              <Button asChild variant="outline" className="w-fit rounded-xl border-slate-200 font-extrabold text-slate-700 hover:bg-blue-50 hover:text-[#0073e6]">
                <a href={mapSearchUrl} target="_blank" rel="noopener noreferrer">
                  Open in Google Maps <ExternalLink className="ml-2 h-4 w-4" />
                </a>
              </Button>
            )}
          </div>

          {mapEmbedUrl ? (
            <iframe
              src={mapEmbedUrl}
              title={`${institute.name} location map`}
              className="h-[320px] w-full border-0 sm:h-[440px]"
              loading="lazy"
              referrerPolicy="strict-origin-when-cross-origin"
            />
          ) : (
            <div className="grid min-h-[220px] place-items-center bg-slate-50 px-6 text-center">
              <div>
                <MapPin className="mx-auto h-10 w-10 text-slate-300" />
                <p className="mt-3 text-sm font-bold text-slate-600">The college has not provided a map location yet</p>
                <p className="mt-1 text-xs font-medium text-slate-400">The college administrator can add the exact location from the college module.</p>
              </div>
            </div>
          )}
        </section>
      </div>

      <CollegeApplicationDialog
        instituteId={institute.id}
        instituteName={institute.name}
        open={applicationOpen}
        onOpenChange={setApplicationOpen}
      />
    </PublicPageLayout>
  );
}
