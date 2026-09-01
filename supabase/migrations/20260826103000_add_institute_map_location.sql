-- Add a safe, owner-controlled map pin to public college profiles.

BEGIN;

ALTER TABLE public.institutes
  ADD COLUMN IF NOT EXISTS map_location text;

ALTER TABLE public.institutes
  DROP CONSTRAINT IF EXISTS institutes_map_location_length_check;
ALTER TABLE public.institutes
  ADD CONSTRAINT institutes_map_location_length_check
  CHECK (map_location IS NULL OR char_length(btrim(map_location)) BETWEEN 2 AND 500);

COMMENT ON COLUMN public.institutes.map_location IS
  'Exact public campus address or latitude,longitude used to render the Google Maps pin.';

CREATE OR REPLACE FUNCTION public.protect_institute_map_location()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.map_location IS NOT DISTINCT FROM OLD.map_location THEN
    RETURN NEW;
  END IF;

  IF auth.role() = 'service_role' OR public.is_platform_admin(auth.uid()) THEN
    RETURN NEW;
  END IF;

  IF NEW.owner_user_id = auth.uid()
    AND public.is_account_active(auth.uid())
    AND public.has_permission(auth.uid(), 'college.manage')
  THEN
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'Only the assigned college manager or a Super Admin can change the campus map pin'
    USING ERRCODE = '42501';
END;
$$;

REVOKE ALL ON FUNCTION public.protect_institute_map_location() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS protect_institute_map_location_trigger ON public.institutes;
CREATE TRIGGER protect_institute_map_location_trigger
BEFORE INSERT OR UPDATE ON public.institutes
FOR EACH ROW EXECUTE FUNCTION public.protect_institute_map_location();

-- The field is appended to preserve all existing public-view column order.
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
  ) AS search_document,
  i.map_location
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

REVOKE ALL ON public.institute_directory FROM PUBLIC;
GRANT SELECT ON public.institute_directory TO anon, authenticated;

COMMIT;
