-- =============================================================
-- MeroTalent Education Directory Ingestion (Fail-safe Version)
-- Works across all PostgreSQL index configurations.
-- =============================================================

BEGIN;

-- 1. Ensure the institute_directory view is up to date
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

-- 2. Insert St. Xavier's College
INSERT INTO public.institutes (
  name, slug, type, institution_category, location, affiliation, level,
  website, description, salient_features, scholarships, admission_guidelines,
  established_year, courses_offered, source_url, status, applications_enabled, is_verified, is_featured
)
SELECT
  'St. Xavier''s College', 'st-xaviers-college-maitighar', 'college', 'college',
  'Maitighar, Kathmandu', 'Tribhuvan University', 'Undergraduate & Postgraduate',
  'https://sxc.edu.np', 'St. Xavier''s College is an autonomous Jesuit educational institution in Kathmandu renowned for top academic standards.',
  ARRAY['Jesuit Educational Heritage', 'Advanced Science Labs', 'Top Academic Ranks in TU'],
  'Jesuit Need-based Freeships & TU Merit Scholarships.', 'Admission via SXC entrance exam & panel interview.', 1988,
  '[{"name": "BSc Computer Science & Information Technology (BSc CSIT)", "degree": "Bachelor", "duration": "4 Years"}, {"name": "Bachelor of Information Management (BIM)", "degree": "Bachelor", "duration": "4 Years"}]'::jsonb,
  'https://edusanjal.com/college/st-xaviers-college/', 'approved', true, true, true
WHERE NOT EXISTS (
  SELECT 1 FROM public.institutes WHERE slug = 'st-xaviers-college-maitighar' AND deleted_at IS NULL
);

-- 3. Insert Pulchowk Campus
INSERT INTO public.institutes (
  name, slug, type, institution_category, location, affiliation, level,
  website, description, salient_features, scholarships, admission_guidelines,
  established_year, courses_offered, source_url, status, applications_enabled, is_verified, is_featured
)
SELECT
  'Pulchowk Campus - Institute of Engineering (IOE)', 'pulchowk-campus-ioe', 'engineering', 'college',
  'Pulchowk, Lalitpur', 'Tribhuvan University', 'Undergraduate & Postgraduate',
  'https://pulchowk.ioe.edu.np', 'Pulchowk Campus is the central constituent campus of IOE, Tribhuvan University.',
  ARRAY['Premier Engineering Institute', 'LOCUS Tech Festival', 'Global Employability'],
  'Government-subsidized regular seats for entrance toppers.', 'Strictly based on rank in IOE Entrance Exam.', 1972,
  '[{"name": "BE Computer Engineering", "degree": "Bachelor", "duration": "4 Years"}, {"name": "BE Civil Engineering", "degree": "Bachelor", "duration": "4 Years"}]'::jsonb,
  'https://edusanjal.com/college/pulchowk-campus/', 'approved', true, true, true
WHERE NOT EXISTS (
  SELECT 1 FROM public.institutes WHERE slug = 'pulchowk-campus-ioe' AND deleted_at IS NULL
);

-- 4. Insert Tri-Chandra Multiple Campus
INSERT INTO public.institutes (
  name, slug, type, institution_category, location, affiliation, level,
  website, description, salient_features, scholarships, admission_guidelines,
  established_year, courses_offered, source_url, status, applications_enabled, is_verified, is_featured
)
SELECT
  'Tri-Chandra Multiple Campus', 'tri-chandra-multiple-campus', 'college', 'college',
  'Ghantaghar, Kathmandu', 'Tribhuvan University', 'Undergraduate & Postgraduate',
  'https://trichandra.edu.np', 'Tri-Chandra Multiple Campus is the oldest higher education institution in Nepal.',
  ARRAY['Oldest Campus in Nepal', 'Historical Heritage Site', 'Central Ghantaghar Location'],
  'TU Merit scholarship schemes.', 'Admission based on TU entrance for Science streams.', 1918,
  '[{"name": "BSc Computer Science and Information Technology (BSc CSIT)", "degree": "Bachelor", "duration": "4 Years"}]'::jsonb,
  'https://edusanjal.com/college/tri-chandra-multiple-campus/', 'approved', true, true, true
WHERE NOT EXISTS (
  SELECT 1 FROM public.institutes WHERE slug = 'tri-chandra-multiple-campus' AND deleted_at IS NULL
);

-- 5. Insert The British College
INSERT INTO public.institutes (
  name, slug, type, institution_category, location, affiliation, level,
  website, description, salient_features, scholarships, admission_guidelines,
  established_year, courses_offered, source_url, status, applications_enabled, is_verified, is_featured
)
SELECT
  'The British College', 'the-british-college-kathmandu', 'college', 'college',
  'Thapathali, Kathmandu', 'University of the West of England (UWE), UK', 'Undergraduate & Postgraduate',
  'https://thebritishcollege.edu.np', 'The British College provides world-class UK degrees directly in Kathmandu.',
  ARRAY['Direct British Degree', 'UK Credit Transfer', 'International Placements'],
  'TBC Founders Scholarship.', 'High School completion with English interview assessment.', 2012,
  '[{"name": "BSc (Hons) Computing", "degree": "Bachelor", "duration": "4 Years"}]'::jsonb,
  'https://edusanjal.com/college/the-british-college/', 'approved', true, true, true
WHERE NOT EXISTS (
  SELECT 1 FROM public.institutes WHERE slug = 'the-british-college-kathmandu' AND deleted_at IS NULL
);

COMMIT;
