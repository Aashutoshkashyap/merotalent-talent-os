-- Enrich the approved public directory with normalized program names, useful
-- search tags, and one searchable document. Existing public columns remain in
-- their original order so CREATE OR REPLACE VIEW is safe for API consumers.

BEGIN;

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
WHERE i.status = 'approved' AND i.deleted_at IS NULL;

REVOKE ALL ON public.institute_directory FROM PUBLIC;
GRANT SELECT ON public.institute_directory TO anon, authenticated;

COMMENT ON COLUMN public.institute_directory.search_document IS
  'Lower-cased public directory text used for tokenized server-side search.';

COMMIT;
