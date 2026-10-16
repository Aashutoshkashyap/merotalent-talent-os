import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import PublicPageLayout from "@/components/landing/PublicPageLayout";
import InstituteImage from "@/components/institutes/InstituteImage";
import { fetchPublicInstitute, institutePath, type InstituteRecord } from "@/lib/institutes/public-institutes";

type Blog = { id: string; title: string; slug: string; excerpt: string | null; featured_image_url: string | null; published_at: string | null; };
export default function InstituteBlogsPage() {
  const { slug } = useParams(); const [institute, setInstitute] = useState<InstituteRecord | null>(null); const [rows, setRows] = useState<Blog[]>([]); const [loading, setLoading] = useState(true); const [failed, setFailed] = useState(false);
  useEffect(() => { let active = true; setLoading(true); setFailed(false); setInstitute(null); setRows([]); const load = async () => {
    try {
      if (!slug) return;
      const college = await fetchPublicInstitute(slug);
      if (!college) return;
      const response = await fetch(`/api/v1/institutes/${encodeURIComponent(college.id)}/blogs`);
      if (!response.ok) throw new Error("College updates unavailable.");
      const json = await response.json() as { data?: Blog[] };
      if (active) { setInstitute(college); setRows(json.data ?? []); }
    } catch { if (active) setFailed(true);
    } finally { if (active) setLoading(false); }
  }; void load(); return () => { active = false; }; }, [slug]);
  return <PublicPageLayout activeNavId="colleges"><main className="mx-auto w-full max-w-6xl px-5 py-10 sm:px-8"><Link to={institute ? institutePath(institute) : "/institutes"} className="text-sm font-semibold text-[#0073e6]">← Back to college</Link>{loading ? <p className="py-20 text-center text-sm text-slate-500">Loading college updates…</p> : failed ? <p className="py-20 text-center text-sm text-slate-500">College updates could not be loaded. Please try again later.</p> : !institute ? <p className="py-20 text-center text-sm text-slate-500">College not found.</p> : <><header className="mt-6"><p className="text-xs font-black uppercase tracking-wider text-[#0073e6]">{institute.name}</p><h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">College updates</h1></header><div className="mt-7 grid gap-5 md:grid-cols-2 lg:grid-cols-3">{rows.map((row) => <article key={row.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white"><InstituteImage source={row.featured_image_url} alt="" className="aspect-[2.63/1] w-full" /><div className="p-5"><p className="text-xs font-semibold text-slate-500">{row.published_at ? new Date(row.published_at).toLocaleDateString() : "Update"}</p><h2 className="mt-2 text-lg font-black text-slate-900"><Link to={`${institutePath(institute)}/blogs/${row.slug}`} className="hover:text-[#0073e6]">{row.title}</Link></h2><p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-600">{row.excerpt || "Read the latest update from this college."}</p></div></article>)}</div>{rows.length === 0 && <p className="py-12 text-center text-sm text-slate-500">No published updates yet.</p>}</>}</main></PublicPageLayout>;
}
