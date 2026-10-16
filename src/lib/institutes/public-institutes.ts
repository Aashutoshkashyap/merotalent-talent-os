import { placeInstitutes } from "./placement";
export {
  getGoogleMapsEmbedUrl,
  getGoogleMapsSearchUrl,
} from "./map-location";

export type InstituteCategory = "all" | "college" | "school" | "plus-two";
export type InstituteSort = "recommended" | "name" | "newest";
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

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
  chairperson_name: string | null;
  chairperson_designation: string | null;
  chairperson_message: string | null;
  chairperson_image_url: string | null;
  principal_name: string | null;
  principal_designation: string | null;
  principal_message: string | null;
  principal_image_url: string | null;
  location: string | null;
  map_location: string | null;
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
  if (!safePath || safePath.length > 512 || safePath.includes("\\") || safePath.includes("%") ||
      safePath.includes("://") || safePath.split("/").some((part) => !part || part === "." || part === "..")) {
    return "/placeholder.svg";
  }

  return `/api/v1/institutes/media?path=${encodeURIComponent(safePath)}`;
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

interface CacheEntry<T> {
  timestamp: number;
  data: T;
}

const queryCache = new Map<string, CacheEntry<PublicInstituteResult>>();
const detailCache = new Map<string, CacheEntry<InstituteRecord | null>>();
const CACHE_TTL_MS = 30000; // 30 seconds TTL

export const invalidatePublicInstituteCache = () => {
  queryCache.clear();
  detailCache.clear();
};

export async function fetchPublicInstitutes(query: PublicInstituteQuery): Promise<PublicInstituteResult> {
  const cacheKey = JSON.stringify(query);
  const cached = queryCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }

  const params = new URLSearchParams({
    search: query.search,
    category: query.category,
    location: query.location,
    affiliation: query.affiliation,
    admissionStatus: query.admissionStatus,
    sort: query.sort,
    limit: String(query.limit),
  });
  const response = await fetch(`/api/v1/institutes/directory?${params}`);
  if (!response.ok) throw new Error("College directory is unavailable.");
  const payload = await response.json() as { data: InstituteRecord[]; positions: InstituteRecord[]; count: number };
  const result: PublicInstituteResult = {
    institutes: query.sort === "recommended"
      ? placeInstitutes(payload.data, payload.positions, payload.count, query.limit)
      : payload.data,
    count: payload.count,
  };

  queryCache.set(cacheKey, { timestamp: Date.now(), data: result });
  return result;
}

export async function fetchPublicInstitute(identifier: string): Promise<InstituteRecord | null> {
  const cacheKey = identifier.toLowerCase();
  const cached = detailCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }

  const response = await fetch(`/api/v1/institutes/directory?identifier=${encodeURIComponent(identifier)}`);
  if (!response.ok) throw new Error("College details are unavailable.");
  const payload = await response.json() as { data: InstituteRecord | null };
  const record = payload.data;
  detailCache.set(cacheKey, { timestamp: Date.now(), data: record });
  return record;
}
