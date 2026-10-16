import type { Metadata } from "next";
import ClientApp from "../client-app";
import { getAdminClient } from "@/lib/server/supabase";
import { getBackendMode } from "@/lib/server/backend-mode";
import { readPublicCms } from "@/lib/server/neon-cms";
import { readNeonPublicRecord } from "@/lib/server/neon-public-metadata";
import type { CmsSnapshot, PublicSectionVisibility } from "@/hooks/useSiteCMS";

export const dynamic = "force-dynamic";
type Props = { params: Promise<{ slug?: string[] }> };
type PublicRecord = { type: "CollegeOrUniversity" | "JobPosting" | "Person" | "Event"; title: string; description: string; image?: string | null; path: string; jsonLd: Record<string, unknown> };
const uuid = (value: string | undefined) => Boolean(value && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value));
const site = () => (process.env.NEXT_PUBLIC_SITE_URL || "https://www.merotalent.com").replace(/\/$/, "");

async function getHomeCmsSnapshot(slug: string[] | undefined): Promise<CmsSnapshot | null> {
  if (slug?.length) return null;
  try {
    if (getBackendMode() === "neon-staging") return await readPublicCms("home");
    const db = getAdminClient() as any;
    const [sectionsResult, visibilityResult, settingsResult] = await Promise.all([
      db.from("page_sections").select("*").eq("page", "home").eq("is_visible", true).order("display_order", { ascending: true }),
      db.rpc("get_public_page_section_visibility", { requested_page: "home" }),
      db.from("site_settings").select("key,value"),
    ]);
    if (sectionsResult.error || visibilityResult.error || settingsResult.error) return null;
    const settings: Record<string, string> = {};
    for (const row of settingsResult.data || []) {
      if (typeof row.key === "string" && typeof row.value === "string") settings[row.key] = row.value;
    }
    return {
      sections: sectionsResult.data || [],
      sectionVisibility: ((visibilityResult.data || []) as PublicSectionVisibility[]).reduce((result, section) => {
        result[section.section_key] = section;
        return result;
      }, {} as Record<string, PublicSectionVisibility>),
      settings,
    };
  } catch {
    return null;
  }
}

async function getPublicRecord(slug: string[] | undefined): Promise<PublicRecord | null> {
  if (!slug || slug.length !== 2) return null;
  if (getBackendMode() === "neon-staging") {
    try { return await readNeonPublicRecord(slug); } catch { return null; }
  }
  const [section, identifier] = slug; const db = getAdminClient() as any;
  try {
    if (section === "institutes") {
      const { data } = await db.from("institutes").select("name,slug,description,logo_url,cover_image_url,location,website,contact_phone").eq("slug", identifier).eq("status", "approved").is("deleted_at", null).maybeSingle();
      if (!data) return null;
      const description = data.description || `${data.name} on MeroTalent.`;
      return { type: "CollegeOrUniversity", title: data.name, description, image: data.cover_image_url || data.logo_url, path: `/institutes/${data.slug}`, jsonLd: { "@context": "https://schema.org", "@type": "CollegeOrUniversity", name: data.name, description, url: `${site()}/institutes/${data.slug}`, ...(data.logo_url ? { logo: data.logo_url } : {}), ...(data.location ? { address: { "@type": "PostalAddress", addressLocality: data.location, addressCountry: "NP" } } : {}), ...(data.website ? { sameAs: data.website } : {}) } };
    }
    if (section === "jobs" && uuid(identifier)) {
      const { data } = await db.from("jobs").select("id,title,description,location,job_type,is_remote,application_deadline,expires_at,companies(name,logo_url)").eq("id", identifier).eq("status", "published").is("deleted_at", null).maybeSingle();
      if (!data || (data.expires_at && new Date(data.expires_at) <= new Date())) return null;
      const description = data.description || `${data.title} opportunity on MeroTalent.`;
      return { type: "JobPosting", title: data.title, description, image: data.companies?.logo_url, path: `/jobs/${data.id}`, jsonLd: { "@context": "https://schema.org", "@type": "JobPosting", title: data.title, description, datePosted: data.application_deadline || undefined, validThrough: data.expires_at || undefined, employmentType: data.job_type || undefined, ...(data.location ? { jobLocation: { "@type": "Place", address: { "@type": "PostalAddress", addressLocality: data.location, addressCountry: "NP" } } } : {}), ...(data.companies?.name ? { hiringOrganization: { "@type": "Organization", name: data.companies.name, ...(data.companies.logo_url ? { logo: data.companies.logo_url } : {}) } } : {}) } };
    }
    if (section === "mentorship" && uuid(identifier)) {
      const { data } = await db.from("mentors").select("id,headline,description,profile_image_url,expertise,approval_status,is_available,profiles(full_name)").eq("id", identifier).eq("approval_status", "approved").eq("is_available", true).is("deleted_at", null).maybeSingle();
      if (!data) return null;
      const title = data.profiles?.full_name || data.headline || "Mentor"; const description = data.description || data.headline || "Mentorship on MeroTalent.";
      return { type: "Person", title, description, image: data.profile_image_url, path: `/mentorship/${data.id}`, jsonLd: { "@context": "https://schema.org", "@type": "Person", name: title, description, url: `${site()}/mentorship/${data.id}`, ...(data.profile_image_url ? { image: data.profile_image_url } : {}), ...(Array.isArray(data.expertise) ? { knowsAbout: data.expertise } : {}) } };
    }
    if (section === "events" && uuid(identifier)) {
      const { data } = await db.from("events").select("id,title,description,cover_image_url,start_date,end_date,location,meeting_url,format,approval_status,status").eq("id", identifier).eq("approval_status", "approved").eq("status", "published").is("deleted_at", null).maybeSingle();
      if (!data || (data.end_date && new Date(data.end_date) < new Date())) return null;
      const description = data.description || `${data.title} on MeroTalent.`;
      return { type: "Event", title: data.title, description, image: data.cover_image_url, path: `/events/${data.id}`, jsonLd: { "@context": "https://schema.org", "@type": "Event", name: data.title, description, startDate: data.start_date, ...(data.end_date ? { endDate: data.end_date } : {}), eventAttendanceMode: data.format === "online" ? "https://schema.org/OnlineEventAttendanceMode" : "https://schema.org/OfflineEventAttendanceMode", ...(data.location ? { location: { "@type": "Place", name: data.location } } : data.meeting_url ? { location: { "@type": "VirtualLocation", url: data.meeting_url } } : {}), ...(data.cover_image_url ? { image: data.cover_image_url } : {}) } };
    }
  } catch { return null; }
  return null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const record = await getPublicRecord((await params).slug); if (!record) return {};
  const canonical = `${site()}${record.path}`;
  return { title: record.title, description: record.description, alternates: { canonical }, openGraph: { title: record.title, description: record.description, url: canonical, type: record.type === "Event" ? "article" : "website", ...(record.image ? { images: [{ url: record.image }] } : {}) }, twitter: { card: record.image ? "summary_large_image" : "summary", title: record.title, description: record.description, ...(record.image ? { images: [record.image] } : {}) }, robots: { index: true, follow: true } };
}

export default async function AppPage({ params }: Props) {
  const slug = (await params).slug;
  const [record, homeCmsSnapshot] = await Promise.all([getPublicRecord(slug), getHomeCmsSnapshot(slug)]);
  const safeJson = record ? JSON.stringify(record.jsonLd).replace(/</g, "\\u003c") : null;
  return <>{safeJson && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJson }} />}<ClientApp initialCmsSnapshot={homeCmsSnapshot} /></>;
}
