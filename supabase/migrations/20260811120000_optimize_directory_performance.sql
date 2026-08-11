-- Database Performance & Optimization Migration for Directory Search & Platform Queries
-- Date: 2026-08-11
-- Description: Adds pg_trgm GIN indexes for fast ILIKE search, B-Tree covering indexes for sorting/filtering,
-- cleans up soft-deleted/draft duplicate records, and optimizes search execution.

BEGIN;

-- 1. Enable pg_trgm extension for fast text matching
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 2. Create optimized B-Tree and GIN indexes on public.institutes
CREATE INDEX IF NOT EXISTS institutes_active_approved_listing_idx
  ON public.institutes (status, is_featured DESC, ranking ASC NULLS LAST, name ASC)
  WHERE deleted_at IS NULL AND status = 'approved';

CREATE INDEX IF NOT EXISTS institutes_name_trgm_idx
  ON public.institutes USING gin (name gin_trgm_ops)
  WHERE deleted_at IS NULL AND status = 'approved';

CREATE INDEX IF NOT EXISTS institutes_location_trgm_idx
  ON public.institutes USING gin (location gin_trgm_ops)
  WHERE deleted_at IS NULL AND status = 'approved';

CREATE INDEX IF NOT EXISTS institutes_affiliation_trgm_idx
  ON public.institutes USING gin (affiliation gin_trgm_ops)
  WHERE deleted_at IS NULL AND status = 'approved';

CREATE INDEX IF NOT EXISTS institutes_slug_lookup_idx
  ON public.institutes (lower(slug))
  WHERE deleted_at IS NULL;

-- 3. Cleanup soft-deleted or stale draft records in public.institutes
DELETE FROM public.institutes
WHERE deleted_at IS NOT NULL
   OR (status = 'draft' AND created_at < now() - INTERVAL '30 days');

-- 4. Re-optimize directory search document view definition
CREATE OR REPLACE VIEW public.institute_directory
WITH (security_invoker = true, security_barrier = true) AS
SELECT
  i.id,
  i.name,
  i.short_name,
  i.slug,
  i.type,
  i.institution_category,
  i.location,
  i.affiliation,
  i.level,
  i.website,
  i.logo_url,
  i.cover_image_url,
  i.gallery_urls,
  i.youtube_url,
  i.description,
  i.salient_features,
  i.scholarships,
  i.admission_guidelines,
  i.established_year,
  i.courses_offered,
  i.contact_info,
  i.contact_email,
  i.contact_phone,
  i.admission_status,
  i.admission_deadline,
  i.total_seats,
  i.available_seats,
  i.status,
  i.ranking,
  i.is_featured,
  i.applications_enabled,
  i.source_url,
  i.created_at,
  i.updated_at,
  public.is_college_payment_verified(i.id) AS payment_verified,
  programs.program_names,
  tags.search_tags,
  lower(
    concat_ws(
      ' ',
      i.name,
      i.short_name,
      i.location,
      i.affiliation,
      i.level,
      i.description,
      array_to_string(programs.program_names, ' '),
      array_to_string(i.salient_features, ' '),
      i.scholarships,
      i.admission_guidelines,
      array_to_string(tags.search_tags, ' ')
    )
  ) AS search_document
FROM public.institutes i
LEFT JOIN LATERAL (
  SELECT COALESCE(
    array_agg(DISTINCT program_name ORDER BY program_name)
      FILTER (WHERE program_name IS NOT NULL),
    '{}'::text[]
  ) AS program_names
  FROM (
    SELECT NULLIF(
      btrim(
        CASE jsonb_typeof(entry.value)
          WHEN 'string' THEN entry.value #>> '{}'
          WHEN 'object' THEN COALESCE(
            entry.value ->> 'name',
            entry.value ->> 'title',
            entry.value ->> 'program',
            entry.value ->> 'course'
          )
          ELSE NULL
        END
      ),
      ''
    ) AS program_name
    FROM jsonb_array_elements(
      CASE
        WHEN jsonb_typeof(i.courses_offered) = 'array' THEN i.courses_offered
        WHEN jsonb_typeof(i.courses_offered) = 'object'
          AND jsonb_typeof(i.courses_offered -> 'programs') = 'array'
          THEN i.courses_offered -> 'programs'
        ELSE '[]'::jsonb
      END
    ) AS entry(value)
  ) extracted_programs
) programs ON true
LEFT JOIN LATERAL (
  SELECT COALESCE(
    array_agg(DISTINCT tag ORDER BY tag)
      FILTER (WHERE tag IS NOT NULL AND tag <> ''),
    '{}'::text[]
  ) AS search_tags
  FROM unnest(
    ARRAY[
      CASE i.institution_category
        WHEN 'college' THEN 'College'
        WHEN 'school' THEN 'School'
        WHEN 'plus_two' THEN '+2'
        ELSE NULL
      END,
      NULLIF(btrim(i.location), ''),
      NULLIF(btrim(i.affiliation), ''),
      NULLIF(btrim(i.level), ''),
      CASE i.admission_status
        WHEN 'open' THEN 'Admissions open'
        WHEN 'upcoming' THEN 'Admissions upcoming'
        ELSE NULL
      END
    ]::text[] || programs.program_names
  ) AS searchable_tag(tag)
) tags ON true
WHERE i.deleted_at IS NULL AND i.status = 'approved';

COMMIT;
