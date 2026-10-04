-- The ownership trigger must append scalar field names to text[]. The prior
-- `changed_fields || 'type'` form can resolve as text[] || text[] and attempt
-- to parse the field name as an array literal during an admin profile update.
BEGIN;

CREATE OR REPLACE FUNCTION public.track_institute_content_ownership()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  changed_fields text[] := '{}'::text[];
BEGIN
  -- Ingestion must not claim MeroTalent content ownership.
  IF COALESCE(auth.role(), '') = 'service_role' THEN RETURN NEW; END IF;

  IF NEW.name IS DISTINCT FROM OLD.name THEN changed_fields := array_append(changed_fields, 'name'); END IF;
  IF NEW.short_name IS DISTINCT FROM OLD.short_name THEN changed_fields := array_append(changed_fields, 'short_name'); END IF;
  IF NEW.slug IS DISTINCT FROM OLD.slug THEN changed_fields := array_append(changed_fields, 'slug'); END IF;
  IF NEW.institution_category IS DISTINCT FROM OLD.institution_category THEN changed_fields := array_append(changed_fields, 'institution_category'); END IF;
  IF NEW.type IS DISTINCT FROM OLD.type THEN changed_fields := array_append(changed_fields, 'type'); END IF;
  IF NEW.affiliation IS DISTINCT FROM OLD.affiliation THEN changed_fields := array_append(changed_fields, 'affiliation'); END IF;
  IF NEW.level IS DISTINCT FROM OLD.level THEN changed_fields := array_append(changed_fields, 'level'); END IF;
  IF NEW.description IS DISTINCT FROM OLD.description THEN changed_fields := array_append(changed_fields, 'description'); END IF;
  IF NEW.location IS DISTINCT FROM OLD.location THEN changed_fields := array_append(changed_fields, 'location'); END IF;
  IF NEW.contact_email IS DISTINCT FROM OLD.contact_email THEN changed_fields := array_append(changed_fields, 'contact_email'); END IF;
  IF NEW.contact_phone IS DISTINCT FROM OLD.contact_phone THEN changed_fields := array_append(changed_fields, 'contact_phone'); END IF;
  IF NEW.website IS DISTINCT FROM OLD.website THEN changed_fields := array_append(changed_fields, 'website'); END IF;
  IF NEW.courses_offered IS DISTINCT FROM OLD.courses_offered THEN changed_fields := array_append(changed_fields, 'courses_offered'); END IF;
  IF NEW.admission_status IS DISTINCT FROM OLD.admission_status THEN changed_fields := array_append(changed_fields, 'admission_status'); END IF;
  IF NEW.admission_deadline IS DISTINCT FROM OLD.admission_deadline THEN changed_fields := array_append(changed_fields, 'admission_deadline'); END IF;
  IF NEW.scholarships IS DISTINCT FROM OLD.scholarships THEN changed_fields := array_append(changed_fields, 'scholarships'); END IF;
  IF NEW.salient_features IS DISTINCT FROM OLD.salient_features THEN changed_fields := array_append(changed_fields, 'salient_features'); END IF;
  IF NEW.established_year IS DISTINCT FROM OLD.established_year THEN changed_fields := array_append(changed_fields, 'established_year'); END IF;
  IF NEW.logo_url IS DISTINCT FROM OLD.logo_url THEN changed_fields := array_append(changed_fields, 'logo_url'); END IF;
  IF NEW.cover_image_url IS DISTINCT FROM OLD.cover_image_url THEN changed_fields := array_append(changed_fields, 'cover_image_url'); END IF;
  IF NEW.gallery_urls IS DISTINCT FROM OLD.gallery_urls THEN changed_fields := array_append(changed_fields, 'gallery_urls'); END IF;
  IF NEW.youtube_url IS DISTINCT FROM OLD.youtube_url THEN changed_fields := array_append(changed_fields, 'youtube_url'); END IF;
  IF NEW.map_location IS DISTINCT FROM OLD.map_location THEN changed_fields := array_append(changed_fields, 'map_location'); END IF;
  IF NEW.chairperson_name IS DISTINCT FROM OLD.chairperson_name THEN changed_fields := array_append(changed_fields, 'chairperson_name'); END IF;
  IF NEW.chairperson_designation IS DISTINCT FROM OLD.chairperson_designation THEN changed_fields := array_append(changed_fields, 'chairperson_designation'); END IF;
  IF NEW.chairperson_message IS DISTINCT FROM OLD.chairperson_message THEN changed_fields := array_append(changed_fields, 'chairperson_message'); END IF;
  IF NEW.chairperson_image_url IS DISTINCT FROM OLD.chairperson_image_url THEN changed_fields := array_append(changed_fields, 'chairperson_image_url'); END IF;
  IF NEW.principal_name IS DISTINCT FROM OLD.principal_name THEN changed_fields := array_append(changed_fields, 'principal_name'); END IF;
  IF NEW.principal_designation IS DISTINCT FROM OLD.principal_designation THEN changed_fields := array_append(changed_fields, 'principal_designation'); END IF;
  IF NEW.principal_message IS DISTINCT FROM OLD.principal_message THEN changed_fields := array_append(changed_fields, 'principal_message'); END IF;
  IF NEW.principal_image_url IS DISTINCT FROM OLD.principal_image_url THEN changed_fields := array_append(changed_fields, 'principal_image_url'); END IF;
  IF NEW.admission_guidelines IS DISTINCT FROM OLD.admission_guidelines THEN changed_fields := array_append(changed_fields, 'admission_guidelines'); END IF;

  IF cardinality(changed_fields) > 0 THEN
    INSERT INTO public.institute_content_ownership (institute_id, managed_fields, updated_at, updated_by)
    VALUES (NEW.id, changed_fields, now(), auth.uid())
    ON CONFLICT (institute_id) DO UPDATE
    SET managed_fields = ARRAY(
          SELECT DISTINCT field FROM unnest(
            public.institute_content_ownership.managed_fields || EXCLUDED.managed_fields
          ) AS field ORDER BY field
        ),
        updated_at = now(),
        updated_by = auth.uid();
  END IF;
  RETURN NEW;
END;
$$;

COMMIT;
