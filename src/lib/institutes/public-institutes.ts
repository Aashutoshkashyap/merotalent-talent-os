import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import {
  cleanInstituteFilterText,
  tokenizeInstituteSearch,
} from "./directory-search";

export type InstituteCategory = "all" | "college" | "school" | "plus-two";
export type InstituteSort = "recommended" | "name" | "newest";

export interface InstituteRecord {
  id: string;
  name: string;
  short_name: string | null;
  slug: string | null;
  type: string | null;
  institution_category: string | null;
  affiliation: string | null;
  level: string | null;
  description: string | null;
  logo_url: string | null;
  cover_image_url: string | null;
  gallery_urls: string[] | null;
  youtube_url: string | null;
  website: string | null;
  source_url: string | null;
  location: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  contact_info: Json | null;
  courses_offered: Json | null;
  salient_features: string[] | null;
  scholarships: string | null;
  admission_guidelines: string | null;
  established_year: number | null;
  total_seats: number | null;
  available_seats: number | null;
  admission_status: string | null;
  admission_deadline: string | null;
  applications_enabled: boolean | null;
  payment_verified: boolean | null;
  program_names: string[] | null;
  search_tags: string[] | null;
  search_document: string | null;
  is_featured: boolean | null;
  ranking: number | null;
  status: string | null;
  created_at: string;
  updated_at: string;
}

export interface InstituteProgram {
  name: string;
  level?: string;
  description?: string;
}

export interface PublicInstituteQuery {
  search: string;
  category: InstituteCategory;
  location: string;
  affiliation: string;
  admissionStatus: string;
  sort: InstituteSort;
  limit: number;
}

export interface PublicInstituteResult {
  institutes: InstituteRecord[];
  count: number;
}

const categoryValues: Record<Exclude<InstituteCategory, "all">, string[]> = {
  college: ["college", "colleges", "university", "universities", "campus"],
  school: ["school", "schools"],
  "plus-two": ["plus_two", "+2", "plus two", "plus-two", "higher secondary"],
};

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const youtubeIdPattern = /^[A-Za-z0-9_-]{11}$/;

export const institutePath = (institute: Pick<InstituteRecord, "id" | "slug">) =>
  `/institutes/${encodeURIComponent(institute.slug || institute.id)}`;

export const formatInstituteCategory = (value: string | null | undefined) => {
  if (!value) return null;
  if (["plus_two", "plus-two", "plus two", "+2"].includes(value.toLowerCase())) return "+2";
  return value.replace(/[_-]+/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
};

export const resolveCollegeMediaUrl = (value: string | null | undefined) => {
  if (!value) return "/placeholder.svg";

  try {
    const parsed = new URL(value);
    if (parsed.protocol === "https:" || parsed.protocol === "http:") return parsed.toString();
  } catch {
    // Canonical Supabase object paths are deliberately not URLs.
  }

  const safePath = value.replace(/^\/+/, "");
  if (!safePath || safePath.includes("..") || safePath.includes("://")) {
    return "/placeholder.svg";
  }

  return supabase.storage.from("college-media").getPublicUrl(safePath).data.publicUrl;
};

export const safeExternalUrl = (value: string | null | undefined) => {
  if (!value) return null;
  try {
    const parsed = new URL(value);
    return parsed.protocol === "https:" || parsed.protocol === "http:" ? parsed.toString() : null;
  } catch {
    return null;
  }
};

const stringValue = (value: unknown) =>
  typeof value === "string" && value.trim() ? value.trim() : undefined;

export const getInstitutePrograms = (value: Json | null | undefined): InstituteProgram[] => {
  const source = Array.isArray(value)
    ? value
    : value && typeof value === "object" && !Array.isArray(value) && Array.isArray(value.programs)
      ? value.programs
      : [];

  return source
    .map((program): InstituteProgram | null => {
      if (typeof program === "string" && program.trim()) return { name: program.trim() };
      if (!program || typeof program !== "object" || Array.isArray(program)) return null;

      const name =
        stringValue(program.name) ||
        stringValue(program.title) ||
        stringValue(program.program) ||
        stringValue(program.course);
      if (!name) return null;

      return {
        name,
        level: stringValue(program.level),
        description: stringValue(program.description),
      };
    })
    .filter((program): program is InstituteProgram => Boolean(program));
};

export const getContactValue = (value: Json | null | undefined, keys: string[]) => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  for (const key of keys) {
    const candidate = value[key];
    if (typeof candidate === "string" && candidate.trim()) return candidate.trim();
  }
  return null;
};

export const getYoutubeEmbedUrl = (value: string | null | undefined) => {
  if (!value) return null;

  try {
    const parsed = new URL(value);
    const host = parsed.hostname.toLowerCase().replace(/^www\./, "");
    let videoId: string | null = null;

    if (host === "youtu.be") {
      videoId = parsed.pathname.split("/").filter(Boolean)[0] ?? null;
    } else if (host === "youtube.com" || host === "m.youtube.com" || host === "youtube-nocookie.com") {
      if (parsed.pathname === "/watch") videoId = parsed.searchParams.get("v");
      else {
        const [kind, id] = parsed.pathname.split("/").filter(Boolean);
        if (["embed", "shorts", "live"].includes(kind)) videoId = id ?? null;
      }
    }

    return videoId && youtubeIdPattern.test(videoId)
      ? `https://www.youtube-nocookie.com/embed/${videoId}?rel=0`
      : null;
  } catch {
    return null;
  }
};

export async function fetchPublicInstitutes({
  search,
  category,
  location,
  affiliation,
  admissionStatus,
  sort,
  limit,
}: PublicInstituteQuery): Promise<PublicInstituteResult> {
  let request = supabase
    .from("institute_directory")
    .select("*", { count: "exact" });

  const searchTokens = tokenizeInstituteSearch(search);
  for (const token of searchTokens) {
    request = request.ilike("search_document", `%${token}%`);
  }

  if (category !== "all") {
    request = request.in("institution_category", categoryValues[category]);
  }

  const normalizedLocation = cleanInstituteFilterText(location);
  if (normalizedLocation) request = request.ilike("location", `%${normalizedLocation}%`);

  const normalizedAffiliation = cleanInstituteFilterText(affiliation);
  if (normalizedAffiliation) request = request.ilike("affiliation", `%${normalizedAffiliation}%`);

  if (admissionStatus) request = request.eq("admission_status", admissionStatus);

  if (sort === "name") {
    request = request.order("name", { ascending: true });
  } else if (sort === "newest") {
    request = request.order("created_at", { ascending: false });
  } else {
    request = request
      .order("is_featured", { ascending: false })
      .order("ranking", { ascending: true, nullsFirst: false })
      .order("name", { ascending: true });
  }

  const { data, error, count } = await request.range(0, Math.max(0, limit - 1));
  if (error) throw new Error(error.message);

  return {
    institutes: (data ?? []) as InstituteRecord[],
    count: count ?? data?.length ?? 0,
  };
}

export async function fetchPublicInstitute(identifier: string): Promise<InstituteRecord | null> {
  let request = supabase
    .from("institute_directory")
    .select("*");

  request = uuidPattern.test(identifier)
    ? request.eq("id", identifier)
    : request.eq("slug", identifier);

  const { data, error } = await request.maybeSingle();
  if (error) throw new Error(error.message);
  return data as InstituteRecord | null;
}
