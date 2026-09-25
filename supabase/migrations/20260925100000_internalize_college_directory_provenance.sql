BEGIN;

-- Source provenance and field ownership are operational records, not public
-- college profile data.  Keeping them outside institutes prevents a future
-- SELECT * against the public table/view from turning them into visitor-facing
-- attribution or outbound links.
CREATE TABLE IF NOT EXISTS public.institute_ingestion_provenance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institute_id uuid NOT NULL UNIQUE REFERENCES public.institutes(id) ON DELETE CASCADE,
  source_name text NOT NULL,
  source_url text NOT NULL CHECK (source_url ~ '^https://[^[:space:]]+$'),
  source_record_id text,
  source_hash text,
  imported_at timestamptz NOT NULL DEFAULT now(),
  last_checked_at timestamptz NOT NULL DEFAULT now(),
  source_fields jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS institute_ingestion_provenance_source_record_idx
  ON public.institute_ingestion_provenance(source_name, source_record_id)
  WHERE source_record_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.institute_content_ownership (
  institute_id uuid PRIMARY KEY REFERENCES public.institutes(id) ON DELETE CASCADE,
  managed_fields text[] NOT NULL DEFAULT '{}'::text[],
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);

ALTER TABLE public.institute_ingestion_provenance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.institute_content_ownership ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Platform admins read institute provenance" ON public.institute_ingestion_provenance;
CREATE POLICY "Platform admins read institute provenance"
ON public.institute_ingestion_provenance FOR SELECT TO authenticated
USING (public.is_platform_admin());

DROP POLICY IF EXISTS "Platform admins read institute content ownership" ON public.institute_content_ownership;
CREATE POLICY "Platform admins read institute content ownership"
ON public.institute_content_ownership FOR SELECT TO authenticated
USING (public.is_platform_admin());

-- Move the legacy public source_url values to the protected provenance table.
-- Historical migrations remain untouched; this forward migration removes their
-- visitor-facing effect without discarding traceability.
INSERT INTO public.institute_ingestion_provenance (
  institute_id, source_name, source_url, source_record_id, source_hash, source_fields
)
SELECT
  i.id,
  CASE WHEN i.source_url ~* '^https://(www\\.)?edusanjal\\.com/' THEN 'Edusanjal' ELSE 'Legacy directory import' END,
  i.source_url,
  i.source_url,
  md5(i.source_url),
  jsonb_build_object('migrated_from_legacy_source_url', true)
FROM public.institutes i
WHERE i.source_url IS NOT NULL
ON CONFLICT (institute_id) DO NOTHING;

UPDATE public.institutes
SET source_url = NULL
WHERE source_url IS NOT NULL;

-- A claimed/assigned college is fully protected from automated refresh.  The
-- field ownership table is also extended automatically for future dashboard or
-- Super Admin profile edits by the trigger below.
INSERT INTO public.institute_content_ownership (institute_id, managed_fields, updated_at)
SELECT
  i.id,
  ARRAY[
    'name','short_name','slug','institution_category','type','affiliation','level','description',
    'location','contact_email','contact_phone','website','courses_offered','admission_status',
    'admission_deadline','scholarships','salient_features','established_year','logo_url',
    'cover_image_url','gallery_urls','youtube_url','map_location','chairperson_name',
    'chairperson_designation','chairperson_message','chairperson_image_url','principal_name',
    'principal_designation','principal_message','principal_image_url','admission_guidelines'
  ]::text[],
  now()
FROM public.institutes i
WHERE i.owner_user_id IS NOT NULL
ON CONFLICT (institute_id) DO UPDATE
SET managed_fields = ARRAY(
      SELECT DISTINCT field FROM unnest(
        public.institute_content_ownership.managed_fields || EXCLUDED.managed_fields
      ) AS field ORDER BY field
    ),
    updated_at = now();

CREATE OR REPLACE FUNCTION public.track_institute_content_ownership()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE changed_fields text[] := '{}'::text[];
BEGIN
  -- Service-role ingestion is the only automated writer and must never claim
  -- MeroTalent ownership. All authenticated admin/owner edits do.
  IF COALESCE(auth.role(), '') = 'service_role' THEN RETURN NEW; END IF;

  IF NEW.name IS DISTINCT FROM OLD.name THEN changed_fields := changed_fields || 'name'; END IF;
  IF NEW.short_name IS DISTINCT FROM OLD.short_name THEN changed_fields := changed_fields || 'short_name'; END IF;
  IF NEW.slug IS DISTINCT FROM OLD.slug THEN changed_fields := changed_fields || 'slug'; END IF;
  IF NEW.institution_category IS DISTINCT FROM OLD.institution_category THEN changed_fields := changed_fields || 'institution_category'; END IF;
  IF NEW.type IS DISTINCT FROM OLD.type THEN changed_fields := changed_fields || 'type'; END IF;
  IF NEW.affiliation IS DISTINCT FROM OLD.affiliation THEN changed_fields := changed_fields || 'affiliation'; END IF;
  IF NEW.level IS DISTINCT FROM OLD.level THEN changed_fields := changed_fields || 'level'; END IF;
  IF NEW.description IS DISTINCT FROM OLD.description THEN changed_fields := changed_fields || 'description'; END IF;
  IF NEW.location IS DISTINCT FROM OLD.location THEN changed_fields := changed_fields || 'location'; END IF;
  IF NEW.contact_email IS DISTINCT FROM OLD.contact_email THEN changed_fields := changed_fields || 'contact_email'; END IF;
  IF NEW.contact_phone IS DISTINCT FROM OLD.contact_phone THEN changed_fields := changed_fields || 'contact_phone'; END IF;
  IF NEW.website IS DISTINCT FROM OLD.website THEN changed_fields := changed_fields || 'website'; END IF;
  IF NEW.courses_offered IS DISTINCT FROM OLD.courses_offered THEN changed_fields := changed_fields || 'courses_offered'; END IF;
  IF NEW.admission_status IS DISTINCT FROM OLD.admission_status THEN changed_fields := changed_fields || 'admission_status'; END IF;
  IF NEW.admission_deadline IS DISTINCT FROM OLD.admission_deadline THEN changed_fields := changed_fields || 'admission_deadline'; END IF;
  IF NEW.scholarships IS DISTINCT FROM OLD.scholarships THEN changed_fields := changed_fields || 'scholarships'; END IF;
  IF NEW.salient_features IS DISTINCT FROM OLD.salient_features THEN changed_fields := changed_fields || 'salient_features'; END IF;
  IF NEW.established_year IS DISTINCT FROM OLD.established_year THEN changed_fields := changed_fields || 'established_year'; END IF;
  IF NEW.logo_url IS DISTINCT FROM OLD.logo_url THEN changed_fields := changed_fields || 'logo_url'; END IF;
  IF NEW.cover_image_url IS DISTINCT FROM OLD.cover_image_url THEN changed_fields := changed_fields || 'cover_image_url'; END IF;
  IF NEW.gallery_urls IS DISTINCT FROM OLD.gallery_urls THEN changed_fields := changed_fields || 'gallery_urls'; END IF;
  IF NEW.youtube_url IS DISTINCT FROM OLD.youtube_url THEN changed_fields := changed_fields || 'youtube_url'; END IF;
  IF NEW.map_location IS DISTINCT FROM OLD.map_location THEN changed_fields := changed_fields || 'map_location'; END IF;
  IF NEW.chairperson_name IS DISTINCT FROM OLD.chairperson_name THEN changed_fields := changed_fields || 'chairperson_name'; END IF;
  IF NEW.chairperson_designation IS DISTINCT FROM OLD.chairperson_designation THEN changed_fields := changed_fields || 'chairperson_designation'; END IF;
  IF NEW.chairperson_message IS DISTINCT FROM OLD.chairperson_message THEN changed_fields := changed_fields || 'chairperson_message'; END IF;
  IF NEW.chairperson_image_url IS DISTINCT FROM OLD.chairperson_image_url THEN changed_fields := changed_fields || 'chairperson_image_url'; END IF;
  IF NEW.principal_name IS DISTINCT FROM OLD.principal_name THEN changed_fields := changed_fields || 'principal_name'; END IF;
  IF NEW.principal_designation IS DISTINCT FROM OLD.principal_designation THEN changed_fields := changed_fields || 'principal_designation'; END IF;
  IF NEW.principal_message IS DISTINCT FROM OLD.principal_message THEN changed_fields := changed_fields || 'principal_message'; END IF;
  IF NEW.principal_image_url IS DISTINCT FROM OLD.principal_image_url THEN changed_fields := changed_fields || 'principal_image_url'; END IF;
  IF NEW.admission_guidelines IS DISTINCT FROM OLD.admission_guidelines THEN changed_fields := changed_fields || 'admission_guidelines'; END IF;

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

DROP TRIGGER IF EXISTS track_institute_content_ownership ON public.institutes;
CREATE TRIGGER track_institute_content_ownership
BEFORE UPDATE ON public.institutes
FOR EACH ROW EXECUTE FUNCTION public.track_institute_content_ownership();

CREATE OR REPLACE FUNCTION public.ingest_institute_source_record(p_record jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_name text := NULLIF(btrim(p_record ->> 'name'), '');
  v_slug text := NULLIF(btrim(p_record ->> 'slug'), '');
  v_location text := NULLIF(btrim(p_record ->> 'location'), '');
  v_source_name text := NULLIF(btrim(p_record ->> 'source_name'), '');
  v_source_url text := NULLIF(btrim(p_record ->> 'source_url'), '');
  v_source_record_id text := NULLIF(btrim(p_record ->> 'source_record_id'), '');
  v_source_hash text := NULLIF(btrim(p_record ->> 'source_hash'), '');
  v_count integer;
  v_target public.institutes%ROWTYPE;
  v_protected text[] := '{}'::text[];
  v_source_fields jsonb;
  v_changed_fields text[] := '{}'::text[];
  v_outcome text;
BEGIN
  IF COALESCE(auth.role(), '') <> 'service_role' THEN
    RAISE EXCEPTION 'Service role is required for directory ingestion' USING ERRCODE = '42501';
  END IF;
  IF jsonb_typeof(p_record) <> 'object' OR v_name IS NULL OR v_slug IS NULL
     OR v_source_name IS NULL OR v_source_url IS NULL OR v_source_hash IS NULL THEN
    RAISE EXCEPTION 'A normalized source record with name, slug, source metadata, and hash is required' USING ERRCODE = '22023';
  END IF;
  IF v_source_url !~ '^https://edusanjal\\.com/' AND v_source_url !~ '^https://www\\.edusanjal\\.com/' THEN
    RAISE EXCEPTION 'Only approved Edusanjal HTTPS provenance is accepted by this importer' USING ERRCODE = '22023';
  END IF;
  IF NULLIF(btrim(p_record ->> 'website'), '') ~* '(^https?://)?([^/]*\\.)?edusanjal\\.com' THEN
    RAISE EXCEPTION 'The source site cannot be saved as an institution official website' USING ERRCODE = '22023';
  END IF;

  SELECT count(*) INTO v_count
  FROM public.institutes i
  LEFT JOIN public.institute_ingestion_provenance provenance ON provenance.institute_id = i.id
  WHERE lower(i.slug) = lower(v_slug)
     OR (v_source_record_id IS NOT NULL AND provenance.source_name = v_source_name AND provenance.source_record_id = v_source_record_id)
     OR (lower(i.name) = lower(v_name) AND (v_location IS NULL OR lower(COALESCE(i.location, '')) = lower(v_location)));
  IF v_count > 1 THEN
    RAISE EXCEPTION 'Ambiguous college identity; resolve the matching record in Super Admin before importing' USING ERRCODE = 'P0001';
  END IF;

  IF v_count = 0 THEN
    INSERT INTO public.institutes (
      name, short_name, slug, institution_category, type, affiliation, level, location,
      contact_email, contact_phone, website, courses_offered, admission_status,
      admission_deadline, established_year, status, applications_enabled
    ) VALUES (
      v_name, NULLIF(btrim(p_record ->> 'short_name'), ''), v_slug,
      COALESCE(NULLIF(btrim(p_record ->> 'institution_category'), ''), 'college'),
      NULLIF(btrim(p_record ->> 'type'), ''), NULLIF(btrim(p_record ->> 'affiliation'), ''),
      NULLIF(btrim(p_record ->> 'level'), ''), v_location,
      NULLIF(btrim(p_record ->> 'contact_email'), ''), NULLIF(btrim(p_record ->> 'contact_phone'), ''),
      NULLIF(btrim(p_record ->> 'website'), ''), COALESCE(p_record -> 'courses_offered', '[]'::jsonb),
      NULLIF(btrim(p_record ->> 'admission_status'), ''), NULLIF(btrim(p_record ->> 'admission_deadline'), '')::date,
      NULLIF(btrim(p_record ->> 'established_year'), '')::integer, 'pending', false
    ) RETURNING * INTO v_target;
    v_outcome := 'added';
    v_changed_fields := ARRAY['bootstrap'];
  ELSE
    SELECT i.* INTO v_target
    FROM public.institutes i
    LEFT JOIN public.institute_ingestion_provenance provenance ON provenance.institute_id = i.id
    WHERE lower(i.slug) = lower(v_slug)
       OR (v_source_record_id IS NOT NULL AND provenance.source_name = v_source_name AND provenance.source_record_id = v_source_record_id)
       OR (lower(i.name) = lower(v_name) AND (v_location IS NULL OR lower(COALESCE(i.location, '')) = lower(v_location)))
    LIMIT 1;
    SELECT COALESCE(managed_fields, '{}'::text[]) INTO v_protected
    FROM public.institute_content_ownership WHERE institute_id = v_target.id;
    IF v_target.owner_user_id IS NOT NULL THEN
      v_protected := v_protected || ARRAY[
        'name','short_name','slug','institution_category','type','affiliation','level','description',
        'location','contact_email','contact_phone','website','courses_offered','admission_status',
        'admission_deadline','scholarships','salient_features','established_year'
      ];
    END IF;
    SELECT jsonb_build_object('source_hash', source_hash) INTO v_source_fields
    FROM public.institute_ingestion_provenance WHERE institute_id = v_target.id;
    IF COALESCE(v_source_fields ->> 'source_hash', '') = v_source_hash THEN
      v_outcome := 'unchanged';
    ELSE
      UPDATE public.institutes SET
        name = CASE WHEN 'name' = ANY(v_protected) THEN name ELSE v_name END,
        short_name = CASE WHEN 'short_name' = ANY(v_protected) THEN short_name ELSE COALESCE(NULLIF(btrim(p_record ->> 'short_name'), ''), short_name) END,
        slug = CASE WHEN 'slug' = ANY(v_protected) THEN slug ELSE v_slug END,
        institution_category = CASE WHEN 'institution_category' = ANY(v_protected) THEN institution_category ELSE COALESCE(NULLIF(btrim(p_record ->> 'institution_category'), ''), institution_category) END,
        type = CASE WHEN 'type' = ANY(v_protected) THEN type ELSE COALESCE(NULLIF(btrim(p_record ->> 'type'), ''), type) END,
        affiliation = CASE WHEN 'affiliation' = ANY(v_protected) THEN affiliation ELSE COALESCE(NULLIF(btrim(p_record ->> 'affiliation'), ''), affiliation) END,
        level = CASE WHEN 'level' = ANY(v_protected) THEN level ELSE COALESCE(NULLIF(btrim(p_record ->> 'level'), ''), level) END,
        location = CASE WHEN 'location' = ANY(v_protected) THEN location ELSE COALESCE(v_location, location) END,
        contact_email = CASE WHEN 'contact_email' = ANY(v_protected) THEN contact_email ELSE COALESCE(NULLIF(btrim(p_record ->> 'contact_email'), ''), contact_email) END,
        contact_phone = CASE WHEN 'contact_phone' = ANY(v_protected) THEN contact_phone ELSE COALESCE(NULLIF(btrim(p_record ->> 'contact_phone'), ''), contact_phone) END,
        website = CASE WHEN 'website' = ANY(v_protected) THEN website ELSE COALESCE(NULLIF(btrim(p_record ->> 'website'), ''), website) END,
        courses_offered = CASE WHEN 'courses_offered' = ANY(v_protected) THEN courses_offered ELSE COALESCE(p_record -> 'courses_offered', courses_offered) END,
        admission_status = CASE WHEN 'admission_status' = ANY(v_protected) THEN admission_status ELSE COALESCE(NULLIF(btrim(p_record ->> 'admission_status'), ''), admission_status) END,
        admission_deadline = CASE WHEN 'admission_deadline' = ANY(v_protected) THEN admission_deadline ELSE COALESCE(NULLIF(btrim(p_record ->> 'admission_deadline'), '')::date, admission_deadline) END,
        established_year = CASE WHEN 'established_year' = ANY(v_protected) THEN established_year ELSE COALESCE(NULLIF(btrim(p_record ->> 'established_year'), '')::integer, established_year) END,
        updated_at = now()
      WHERE id = v_target.id
      RETURNING * INTO v_target;
      v_outcome := 'updated';
      v_changed_fields := ARRAY(
        SELECT field FROM unnest(ARRAY['name','short_name','slug','institution_category','type','affiliation','level','location','contact_email','contact_phone','website','courses_offered','admission_status','admission_deadline','established_year']) AS field
        WHERE NOT (field = ANY(v_protected))
      );
    END IF;
  END IF;

  INSERT INTO public.institute_ingestion_provenance (
    institute_id, source_name, source_url, source_record_id, source_hash, imported_at, last_checked_at, source_fields, updated_at
  ) VALUES (
    v_target.id, v_source_name, v_source_url, v_source_record_id, v_source_hash, now(), now(),
    p_record - ARRAY['description','salient_features','scholarships'], now()
  ) ON CONFLICT (institute_id) DO UPDATE SET
    source_name = EXCLUDED.source_name, source_url = EXCLUDED.source_url,
    source_record_id = EXCLUDED.source_record_id, source_hash = EXCLUDED.source_hash,
    last_checked_at = now(), source_fields = EXCLUDED.source_fields, updated_at = now();

  RETURN jsonb_build_object(
    'outcome', v_outcome,
    'institute_id', v_target.id,
    'changed_fields', v_changed_fields,
    'protected_fields', v_protected
  );
END;
$$;

REVOKE ALL ON FUNCTION public.ingest_institute_source_record(jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ingest_institute_source_record(jsonb) TO service_role;

-- The public directory is a MeroTalent-only read model. It intentionally does
-- not expose the legacy source_url or either internal provenance/ownership
-- table, but retains each institution's own official website.
CREATE OR REPLACE VIEW public.institute_directory
WITH (security_invoker = true, security_barrier = true) AS
SELECT i.id, i.name, i.short_name, i.slug, i.type, i.institution_category, i.location, i.affiliation, i.level,
  i.website, i.logo_url, i.cover_image_url, i.gallery_urls, i.youtube_url, i.description, i.salient_features,
  i.scholarships, i.admission_guidelines, i.established_year, i.courses_offered, i.contact_info,
  i.contact_email, i.contact_phone, i.admission_status, i.admission_deadline, i.total_seats, i.available_seats,
  i.status, i.ranking, i.is_featured, i.applications_enabled, NULL::text AS source_url, i.created_at, i.updated_at,
  public.is_college_effectively_verified(i.id) AS payment_verified,
  programs.program_names,
  tags.search_tags,
  lower(concat_ws(' ', i.name, i.short_name, i.location, i.affiliation, i.level, i.description,
    array_to_string(programs.program_names, ' '), array_to_string(i.salient_features, ' '), i.scholarships,
    i.admission_guidelines, array_to_string(tags.search_tags, ' '))) AS search_document,
  i.chairperson_name, i.chairperson_designation, i.chairperson_message, i.chairperson_image_url,
  i.principal_name, i.principal_designation, i.principal_message, i.principal_image_url,
  i.map_location
FROM public.institutes i
LEFT JOIN LATERAL (
  SELECT COALESCE(array_agg(DISTINCT program_name ORDER BY program_name)
    FILTER (WHERE program_name IS NOT NULL), '{}'::text[]) AS program_names
  FROM (
    SELECT NULLIF(btrim(CASE jsonb_typeof(entry.value)
      WHEN 'string' THEN entry.value #>> '{}'
      WHEN 'object' THEN COALESCE(entry.value ->> 'name', entry.value ->> 'title', entry.value ->> 'program', entry.value ->> 'course')
      ELSE NULL END), '') AS program_name
    FROM jsonb_array_elements(CASE WHEN jsonb_typeof(i.courses_offered) = 'array' THEN i.courses_offered
      WHEN jsonb_typeof(i.courses_offered) = 'object' AND jsonb_typeof(i.courses_offered -> 'programs') = 'array' THEN i.courses_offered -> 'programs'
      ELSE '[]'::jsonb END) entry(value)
  ) extracted_programs
) programs ON true
LEFT JOIN LATERAL (
  SELECT COALESCE(array_agg(DISTINCT tag ORDER BY tag) FILTER (WHERE tag IS NOT NULL AND tag <> ''), '{}'::text[]) AS search_tags
  FROM unnest(ARRAY[CASE i.institution_category WHEN 'college' THEN 'College' WHEN 'school' THEN 'School' WHEN 'plus_two' THEN '+2' ELSE NULL END,
    NULLIF(btrim(i.location), ''), NULLIF(btrim(i.affiliation), ''), NULLIF(btrim(i.level), ''),
    CASE i.admission_status WHEN 'open' THEN 'Admissions open' WHEN 'upcoming' THEN 'Admissions upcoming' ELSE NULL END] || programs.program_names) tag
) tags ON true
WHERE i.deleted_at IS NULL AND i.status = 'approved';

REVOKE ALL ON public.institute_ingestion_provenance FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.institute_content_ownership FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.institute_ingestion_provenance, public.institute_content_ownership TO authenticated;
REVOKE ALL ON public.institute_directory FROM PUBLIC;
GRANT SELECT ON public.institute_directory TO anon, authenticated;

COMMIT;
