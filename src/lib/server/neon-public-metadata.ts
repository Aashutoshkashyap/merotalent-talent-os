import type { QueryResultRow } from "pg";
import { queryRows } from "./db";
import { resolveCollegeMediaUrl, safeExternalUrl } from "../institutes/public-institutes";

export type NeonPublicRecord = {
  type: "CollegeOrUniversity" | "JobPosting" | "Person" | "Event";
  title: string;
  description: string;
  image?: string | null;
  path: string;
  jsonLd: Record<string, unknown>;
};

const validUuid = (value: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
const site = () => (process.env.NEXT_PUBLIC_SITE_URL || "https://www.merotalent.com").replace(/\/$/, "");
const publicImage = (value: string | null) => value ? safeExternalUrl(value) : null;

export async function readNeonPublicRecord(slug: string[] | undefined): Promise<NeonPublicRecord | null> {
  if (!slug || slug.length !== 2) return null;
  const [section, identifier] = slug;
  if (section === "institutes" && identifier.length <= 160) {
    const rows = await queryRows<QueryResultRow & {
      id: string; name: string; slug: string | null; description: string | null;
      logo_url: string | null; cover_image_url: string | null; location: string | null; website: string | null;
    }>(`SELECT id, name, slug, description, logo_url, cover_image_url, location, website
        FROM public.institutes
        WHERE (slug = $1 OR ($2::uuid IS NOT NULL AND id = $2::uuid))
          AND status = 'approved' AND deleted_at IS NULL LIMIT 1`,
      [identifier, validUuid(identifier) ? identifier : null]);
    const row = rows[0];
    if (!row) return null;
    const path = `/institutes/${encodeURIComponent(row.slug || row.id)}`;
    const image = row.cover_image_url || row.logo_url;
    const imageUrl = image ? resolveCollegeMediaUrl(image) : null;
    const description = row.description || `${row.name} on MeroTalent.`;
    return {
      type: "CollegeOrUniversity", title: row.name, description, image: imageUrl, path,
      jsonLd: { "@context": "https://schema.org", "@type": "CollegeOrUniversity", name: row.name,
        description, url: `${site()}${path}`,
        ...(row.logo_url ? { logo: resolveCollegeMediaUrl(row.logo_url) } : {}),
        ...(row.location ? { address: { "@type": "PostalAddress", addressLocality: row.location, addressCountry: "NP" } } : {}),
        ...(safeExternalUrl(row.website) ? { sameAs: safeExternalUrl(row.website) } : {}) },
    };
  }
  if (!validUuid(identifier)) return null;
  if (section === "jobs") {
    const rows = await queryRows<QueryResultRow & {
      id: string; title: string; description: string | null; location: string | null;
      job_type: string | null; created_at: Date; expires_at: Date | null;
      application_deadline: Date | null; company_name: string | null; company_logo_url: string | null;
    }>(`SELECT j.id, j.title, j.description, j.location, j.job_type, j.created_at,
                 j.expires_at, j.application_deadline, c.name AS company_name, c.logo_url AS company_logo_url
          FROM public.jobs j LEFT JOIN public.companies c ON c.id = j.company_id
          WHERE j.id = $1::uuid AND j.status = 'published' AND j.approval_status = 'approved'
            AND j.is_active = true AND j.deleted_at IS NULL
            AND (j.expires_at IS NULL OR j.expires_at > now()) LIMIT 1`, [identifier]);
    const row = rows[0];
    if (!row) return null;
    const description = row.description || `${row.title} opportunity on MeroTalent.`;
    return { type: "JobPosting", title: row.title, description, image: publicImage(row.company_logo_url), path: `/jobs/${row.id}`,
      jsonLd: { "@context": "https://schema.org", "@type": "JobPosting", title: row.title,
        description, datePosted: row.created_at, ...(row.expires_at || row.application_deadline ? { validThrough: row.expires_at || row.application_deadline } : {}),
        ...(row.job_type ? { employmentType: row.job_type } : {}),
        ...(row.location ? { jobLocation: { "@type": "Place", address: { "@type": "PostalAddress", addressLocality: row.location, addressCountry: "NP" } } } : {}),
        ...(row.company_name ? { hiringOrganization: { "@type": "Organization", name: row.company_name,
          ...(publicImage(row.company_logo_url) ? { logo: publicImage(row.company_logo_url) } : {}) } } : {}) } };
  }
  if (section === "mentorship") {
    const rows = await queryRows<QueryResultRow & {
      id: string; full_name: string; headline: string | null; description: string | null;
      avatar_url: string | null; expertise: string[] | null;
    }>(`SELECT m.id, p.full_name, m.headline, m.description, p.avatar_url, m.expertise
          FROM public.mentors m JOIN public.profiles p ON p.user_id = m.user_id
          WHERE m.id = $1::uuid AND m.approval_status = 'approved' AND m.deleted_at IS NULL
            AND p.account_status = 'active' AND p.deleted_at IS NULL LIMIT 1`, [identifier]);
    const row = rows[0];
    if (!row) return null;
    const title = row.full_name || row.headline || "Mentor";
    const description = row.description || row.headline || "Mentorship on MeroTalent.";
    const image = publicImage(row.avatar_url);
    return { type: "Person", title, description, image, path: `/mentorship/${row.id}`,
      jsonLd: { "@context": "https://schema.org", "@type": "Person", name: title, description,
        url: `${site()}/mentorship/${row.id}`, ...(image ? { image } : {}),
        ...(row.expertise?.length ? { knowsAbout: row.expertise } : {}) } };
  }
  if (section === "events") {
    const rows = await queryRows<QueryResultRow & {
      id: string; title: string; description: string | null; cover_image_url: string | null;
      start_date: Date; end_date: Date | null; format: string | null; location: string | null;
      meeting_url: string | null;
    }>(`SELECT id, title, description, cover_image_url, start_date, end_date, format, location, meeting_url
          FROM public.events WHERE id = $1::uuid AND is_active = true
            AND status IN ('approved', 'published') AND approval_status = 'approved'
            AND deleted_at IS NULL AND (end_date IS NULL OR end_date >= now()) LIMIT 1`, [identifier]);
    const row = rows[0];
    if (!row) return null;
    const description = row.description || `${row.title} on MeroTalent.`;
    const image = publicImage(row.cover_image_url);
    return { type: "Event", title: row.title, description, image, path: `/events/${row.id}`,
      jsonLd: { "@context": "https://schema.org", "@type": "Event", name: row.title, description,
        startDate: row.start_date, ...(row.end_date ? { endDate: row.end_date } : {}),
        eventAttendanceMode: row.format === "online" ? "https://schema.org/OnlineEventAttendanceMode" : "https://schema.org/OfflineEventAttendanceMode",
        ...(row.location ? { location: { "@type": "Place", name: row.location } } : safeExternalUrl(row.meeting_url) ? { location: { "@type": "VirtualLocation", url: safeExternalUrl(row.meeting_url) } } : {}),
        ...(image ? { image } : {}) } };
  }
  return null;
}
