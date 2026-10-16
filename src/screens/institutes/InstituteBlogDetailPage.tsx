import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import PublicPageLayout from "@/components/landing/PublicPageLayout";
import InstituteImage from "@/components/institutes/InstituteImage";
import { fetchPublicInstitute, institutePath, type InstituteRecord } from "@/lib/institutes/public-institutes";

type Blog = { title: string; excerpt: string | null; content: string; featured_image_url: string | null; published_at: string | null; seo_title: string | null; seo_description: string | null; };
export default function InstituteBlogDetailPage() {
  const { slug, blogSlug } = useParams(); const [institute, setInstitute] = useState<InstituteRecord | null>(null); const [blog, setBlog] = useState<Blog | null>(null); const [loading, setLoading] = useState(true);
  useEffect(() => { let active = true; setLoading(true); setInstitute(null); setBlog(null); const load = async () => {
    try {
      if (!slug || !blogSlug) return;
      const college = await fetchPublicInstitute(slug);
      if (!college) return;
      const response = await fetch(`/api/v1/institutes/${encodeURIComponent(college.id)}/blogs?slug=${encodeURIComponent(blogSlug)}`);
      if (!response.ok) throw new Error("College update unavailable.");
      const json = await response.json() as { data?: Blog | null };
      if (active) { setInstitute(college); setBlog(json.data ?? null); }
    } catch { if (active) setBlog(null);
    } finally { if (active) setLoading(false); }
  }; void load(); return () => { active = false; }; }, [slug, blogSlug]);
  return <PublicPageLayout activeNavId="colleges"><main className="mx-auto w-full max-w-3xl px-5 py-10 sm:px-8"><Link to={institute ? `${institutePath(institute)}/blogs` : "/institutes"} className="text-sm font-semibold text-[#0073e6]">← College updates</Link>{loading ? <p className="py-20 text-center text-sm text-slate-500">Loading update…</p> : !blog ? <p className="py-20 text-center text-sm text-slate-500">This update is unavailable.</p> : <article className="mt-6"><p className="text-xs font-black uppercase tracking-wider text-[#0073e6]">{institute?.name}</p><h1 className="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-5xl">{blog.title}</h1><p className="mt-3 text-sm text-slate-500">{blog.published_at ? new Date(blog.published_at).toLocaleDateString() : ""}</p>{blog.featured_image_url && <InstituteImage source={blog.featured_image_url} alt="" className="mt-7 aspect-[2.63/1] w-full rounded-2xl" />}<p className="mt-7 text-lg leading-8 text-slate-600">{blog.excerpt}</p><div className="mt-7 whitespace-pre-wrap text-base leading-8 text-slate-700">{blog.content}</div></article>}</main></PublicPageLayout>;
}
