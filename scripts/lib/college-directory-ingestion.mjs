import { createHash } from "node:crypto";

const managedFieldNames = [
  "name",
  "short_name",
  "slug",
  "institution_category",
  "type",
  "affiliation",
  "level",
  "description",
  "location",
  "contact_email",
  "contact_phone",
  "website",
  "courses_offered",
  "admission_status",
  "admission_deadline",
  "scholarships",
  "salient_features",
  "established_year",
];

const bootstrapFields = new Set([
  "name",
  "short_name",
  "slug",
  "institution_category",
  "type",
  "affiliation",
  "level",
  "location",
  "contact_email",
  "contact_phone",
  "website",
  "courses_offered",
  "admission_status",
  "admission_deadline",
  "established_year",
]);

const sourceUrlPattern = /^https:\/\/(?:[a-z0-9-]+\.)*edusanjal\.com\//i;

export const normalizeText = (value, maxLength = 500) => {
  if (typeof value !== "string") return null;
  const normalized = value.replace(/\s+/g, " ").trim();
  return normalized ? normalized.slice(0, maxLength) : null;
};

export const slugify = (value) => {
  const text = normalizeText(value, 180);
  if (!text) return null;
  return text
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120) || null;
};

export const safeHttpsUrl = (value, { allowSource = false } = {}) => {
  const text = normalizeText(value, 2048);
  if (!text) return null;
  try {
    const parsed = new URL(text);
    if (parsed.protocol !== "https:") return null;
    if (!allowSource && /(^|\.)edusanjal\.com$/i.test(parsed.hostname)) return null;
    return parsed.toString();
  } catch {
    return null;
  }
};

const toStringList = (value, maxItems = 40, maxLength = 180) => {
  const values = Array.isArray(value) ? value : value ? [value] : [];
  return [...new Set(values.map((entry) => normalizeText(entry, maxLength)).filter(Boolean))]
    .slice(0, maxItems);
};

const toPrograms = (value) => {
  const values = Array.isArray(value) ? value : value ? [value] : [];
  const programs = values
    .map((entry) => {
      if (typeof entry === "string") {
        const name = normalizeText(entry, 180);
        return name ? { name } : null;
      }
      if (!entry || typeof entry !== "object") return null;
      const name = normalizeText(entry.name ?? entry.title ?? entry.course ?? entry.program, 180);
      if (!name) return null;
      const level = normalizeText(entry.level, 80);
      return level ? { name, level } : { name };
    })
    .filter(Boolean);
  return programs.slice(0, 80);
};

const normalizeCategory = (value) => {
  const normalized = normalizeText(value, 40)?.toLowerCase();
  if (["school", "schools"].includes(normalized)) return "school";
  if (["plus_two", "plus-two", "plus two", "+2", "higher secondary"].includes(normalized)) return "plus_two";
  return "college";
};

const normalizeYear = (value) => {
  const year = Number.parseInt(String(value ?? ""), 10);
  return Number.isInteger(year) && year >= 1800 && year <= 2200 ? year : null;
};

const normalizeDate = (value) => {
  const text = normalizeText(value, 32);
  if (!text) return null;
  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10);
};

const stableJson = (value) => {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
};

export const sourceHash = (record) => createHash("sha256").update(stableJson(record)).digest("hex");

/**
 * Convert a reviewed external record into factual MeroTalent bootstrap fields.
 * Editorial prose, source media, and unsupported claims are intentionally ignored.
 */
export function normalizeSourceRecord(raw, options = {}) {
  if (!raw || typeof raw !== "object") throw new Error("A source record object is required.");
  const sourceName = normalizeText(options.sourceName ?? raw.source_name ?? "Edusanjal", 80);
  const sourceUrl = safeHttpsUrl(options.sourceUrl ?? raw.source_url ?? raw.sourceUrl, { allowSource: true });
  const name = normalizeText(raw.name, 180);
  if (!sourceName || !sourceUrl || !sourceUrlPattern.test(sourceUrl)) {
    throw new Error("A valid Edusanjal HTTPS source URL and source name are required.");
  }
  if (!name) throw new Error("An institution name is required.");

  const result = {
    name,
    short_name: normalizeText(raw.short_name ?? raw.shortName, 80),
    slug: slugify(raw.slug ?? raw.slug_hint ?? name),
    institution_category: normalizeCategory(raw.institution_category ?? raw.category ?? raw.type),
    type: normalizeText(raw.type, 80),
    affiliation: normalizeText(raw.affiliation, 180),
    level: normalizeText(raw.level, 100),
    location: normalizeText(raw.location ?? raw.address?.locality ?? raw.address, 240),
    contact_email: normalizeText(raw.contact_email ?? raw.email, 254),
    contact_phone: normalizeText(raw.contact_phone ?? raw.telephone ?? raw.phone, 80),
    website: safeHttpsUrl(raw.website ?? raw.official_website ?? raw.url),
    courses_offered: toPrograms(raw.courses_offered ?? raw.programs ?? raw.courses),
    admission_status: normalizeText(raw.admission_status, 32),
    admission_deadline: normalizeDate(raw.admission_deadline),
    established_year: normalizeYear(raw.established_year ?? raw.founding_year ?? raw.foundingDate),
    source_name: sourceName,
    source_url: sourceUrl,
    source_record_id: normalizeText(raw.source_record_id ?? raw.sourceRecordId ?? new URL(sourceUrl).pathname, 240),
  };

  // These are only accepted from an explicitly reviewed, factual input feed.
  // A raw scrape must never copy third-party editorial prose or media by default.
  if (options.allowReviewedFacts) {
    result.salient_features = toStringList(raw.salient_features ?? raw.features);
    result.scholarships = normalizeText(raw.scholarships, 2000);
    result.description = normalizeText(raw.factual_description, 2000);
  }

  result.source_hash = sourceHash(Object.fromEntries(
    Object.entries(result).filter(([key]) => !["source_hash", "source_url"].includes(key)),
  ));
  return result;
}

export const normalizeIdentity = (value) => normalizeText(value, 500)
  ?.normalize("NFKD")
  .replace(/[\u0300-\u036f]/g, "")
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, "") || "";

const normalizedWebsite = (value) => safeHttpsUrl(value)?.replace(/\/+$/, "")?.toLowerCase() ?? "";

const activeRecords = (records) => records.filter((record) => !record.deleted_at);
const byExact = (records, predicate) => records.filter(predicate);

/**
 * Resolve a source record against MeroTalent's existing directory. A fuzzy
 * name resemblance is deliberately review-only: it never creates or modifies
 * an institute automatically.
 */
export function reconcileSourceRecord(records, imported) {
  const candidates = activeRecords(records);
  const sourceRecordId = imported.source_record_id ?? "";
  const sourceName = imported.source_name ?? "";
  const slug = normalizeIdentity(imported.slug);
  const website = normalizedWebsite(imported.website);
  const name = normalizeIdentity(imported.name);
  const location = normalizeIdentity(imported.location);
  const affiliation = normalizeIdentity(imported.affiliation);

  const checks = [
    {
      reason: "provenance",
      rows: byExact(candidates, (record) =>
        record.provenance?.source_name === sourceName
        && record.provenance?.source_record_id === sourceRecordId,
      ),
    },
    { reason: "slug", rows: byExact(candidates, (record) => normalizeIdentity(record.slug) === slug) },
    { reason: "official_website", rows: website ? byExact(candidates, (record) => normalizedWebsite(record.website) === website) : [] },
    {
      reason: "name_location_affiliation",
      rows: name && location && affiliation ? byExact(candidates, (record) =>
        normalizeIdentity(record.name) === name
        && normalizeIdentity(record.location) === location
        && normalizeIdentity(record.affiliation) === affiliation,
      ) : [],
    },
    { reason: "name", rows: name ? byExact(candidates, (record) => normalizeIdentity(record.name) === name) : [] },
  ];

  for (const check of checks) {
    if (check.rows.length === 1) {
      return { status: "matched", reason: check.reason, record: check.rows[0], candidates: check.rows };
    }
    if (check.rows.length > 1) {
      return { status: "needs_review", reason: `${check.reason}_ambiguous`, record: null, candidates: check.rows };
    }
  }

  const fuzzyCandidates = candidates.filter((record) => {
    const candidateName = normalizeIdentity(record.name);
    return candidateName.length >= 6 && name.length >= 6
      && (candidateName.includes(name) || name.includes(candidateName));
  }).slice(0, 10);
  if (fuzzyCandidates.length) {
    return { status: "needs_review", reason: "name_similarity", record: null, candidates: fuzzyCandidates };
  }
  return { status: "new", reason: "no_existing_match", record: null, candidates: [] };
}

/** Extract only structured Organization facts; never prose, images, or logos. */
export function extractStructuredFactsFromHtml(html, sourceUrl) {
  if (typeof html !== "string") throw new Error("HTML is required.");
  const scripts = [...html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  const nodes = [];
  for (const match of scripts) {
    try {
      const decoded = JSON.parse(match[1].trim());
      if (Array.isArray(decoded)) nodes.push(...decoded);
      else if (Array.isArray(decoded?.["@graph"])) nodes.push(...decoded["@graph"]);
      else nodes.push(decoded);
    } catch {
      // A malformed unrelated schema block must not fail the whole record.
    }
  }
  const node = nodes.find((candidate) => {
    const type = candidate?.["@type"];
    const types = Array.isArray(type) ? type : [type];
    return types.some((entry) => /CollegeOrUniversity|EducationalOrganization|School/i.test(String(entry)));
  });
  if (!node) throw new Error("No structured educational organization record was found.");
  const address = node.address && typeof node.address === "object" ? node.address : {};
  const courses = Array.isArray(node.hasCourse) ? node.hasCourse : node.hasCourse ? [node.hasCourse] : [];
  return normalizeSourceRecord({
    name: node.name,
    url: node.url,
    telephone: node.telephone,
    email: node.email,
    address: [address.streetAddress, address.addressLocality, address.addressRegion].filter(Boolean).join(", "),
    foundingDate: node.foundingDate,
    courses: courses.map((course) => typeof course === "string" ? course : course?.name),
  }, { sourceUrl, sourceName: "Edusanjal" });
}

export function isRobotsAllowed(robotsText, targetUrl, userAgent = "*") {
  const groups = [];
  let agents = [];
  let rules = [];
  for (const rawLine of String(robotsText ?? "").split(/\r?\n/)) {
    const line = rawLine.replace(/#.*/, "").trim();
    if (!line) continue;
    const [rawKey, ...rest] = line.split(":");
    const key = rawKey.trim().toLowerCase();
    const value = rest.join(":").trim();
    if (key === "user-agent") {
      if (agents.length && rules.length) groups.push({ agents, rules });
      if (rules.length) { agents = []; rules = []; }
      agents.push(value.toLowerCase());
    } else if ((key === "allow" || key === "disallow") && agents.length) {
      rules.push({ key, value });
    }
  }
  if (agents.length) groups.push({ agents, rules });
  const agent = userAgent.toLowerCase();
  const matching = groups.filter((group) => group.agents.some((candidate) => candidate === "*" || agent.includes(candidate)));
  const rulesToCheck = matching.flatMap((group) => group.rules);
  const pathname = new URL(targetUrl).pathname;
  const best = rulesToCheck
    .filter((rule) => rule.value && pathname.startsWith(rule.value))
    .sort((a, b) => b.value.length - a.value.length)[0];
  return !best || best.key === "allow";
}

export function mergeSourceRecord(existing, imported) {
  const current = existing ?? {};
  const protectedFields = new Set([
    ...(Array.isArray(current.merotalent_managed_fields) ? current.merotalent_managed_fields : []),
    ...(current.owner_user_id ? managedFieldNames : []),
  ]);
  const merged = { ...current };
  const changedFields = [];

  for (const field of managedFieldNames) {
    if (!bootstrapFields.has(field) && !Object.hasOwn(imported, field)) continue;
    if (protectedFields.has(field)) continue;
    const next = imported[field];
    if (next === undefined || next === null || next === "" || (Array.isArray(next) && !next.length)) continue;
    if (stableJson(current[field] ?? null) !== stableJson(next)) {
      merged[field] = next;
      changedFields.push(field);
    }
  }
  merged.directory_source_metadata = {
    ...(current.directory_source_metadata ?? {}),
    source_name: imported.source_name,
    source_url: imported.source_url,
    source_record_id: imported.source_record_id,
    source_hash: imported.source_hash,
    last_checked_at: new Date().toISOString(),
  };
  return { record: merged, changedFields, protectedFields: [...protectedFields] };
}

export const sourceManagedFieldNames = [...bootstrapFields];
