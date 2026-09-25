BEGIN;

-- A review queue is intentionally separate from institutes: uncertain source
-- matches must not create a second college record merely to await a decision.
CREATE TABLE IF NOT EXISTS public.institute_ingestion_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_name text NOT NULL,
  source_key text NOT NULL,
  source_url text NOT NULL CHECK (source_url ~ '^https://[^[:space:]]+$'),
  source_record_id text,
  source_hash text NOT NULL,
  source_record jsonb NOT NULL,
  candidate_institute_ids uuid[] NOT NULL DEFAULT '{}'::uuid[],
  match_reason text NOT NULL,
  status text NOT NULL DEFAULT 'needs_review' CHECK (status IN ('needs_review', 'resolved', 'dismissed')),
  reviewed_by uuid,
  reviewed_at timestamptz,
  resolution_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (source_name, source_key)
);

ALTER TABLE public.institute_ingestion_reviews ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Platform admins manage institute ingestion reviews" ON public.institute_ingestion_reviews;
CREATE POLICY "Platform admins manage institute ingestion reviews"
ON public.institute_ingestion_reviews FOR ALL TO authenticated
USING (public.is_platform_admin())
WITH CHECK (public.is_platform_admin());

CREATE OR REPLACE FUNCTION public.resolve_institute_source_match(p_record jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_source_name text := NULLIF(btrim(p_record ->> 'source_name'), '');
  v_source_record_id text := NULLIF(btrim(p_record ->> 'source_record_id'), '');
  v_slug text := regexp_replace(lower(COALESCE(p_record ->> 'slug', '')), '[^a-z0-9]+', '', 'g');
  v_website text := regexp_replace(lower(COALESCE(p_record ->> 'website', '')), '/+$', '');
  v_name text := regexp_replace(lower(COALESCE(p_record ->> 'name', '')), '[^a-z0-9]+', '', 'g');
  v_location text := regexp_replace(lower(COALESCE(p_record ->> 'location', '')), '[^a-z0-9]+', '', 'g');
  v_affiliation text := regexp_replace(lower(COALESCE(p_record ->> 'affiliation', '')), '[^a-z0-9]+', '', 'g');
  v_ids uuid[] := '{}'::uuid[];
  v_reason text;
BEGIN
  IF COALESCE(auth.role(), '') <> 'service_role' THEN
    RAISE EXCEPTION 'Service role is required for directory reconciliation' USING ERRCODE = '42501';
  END IF;

  -- Strongest identity: prior internal provenance for this source record.
  IF v_source_name IS NOT NULL AND v_source_record_id IS NOT NULL THEN
    SELECT COALESCE(array_agg(institute_id), '{}'::uuid[]) INTO v_ids
    FROM public.institute_ingestion_provenance
    WHERE source_name = v_source_name AND source_record_id = v_source_record_id;
    v_reason := 'provenance';
  END IF;

  IF cardinality(v_ids) = 0 AND v_slug <> '' THEN
    SELECT COALESCE(array_agg(id), '{}'::uuid[]) INTO v_ids
    FROM public.institutes
    WHERE deleted_at IS NULL
      AND regexp_replace(lower(COALESCE(slug, '')), '[^a-z0-9]+', '', 'g') = v_slug;
    v_reason := 'source_slug';
  END IF;

  IF cardinality(v_ids) = 0 AND v_website <> '' THEN
    SELECT COALESCE(array_agg(id), '{}'::uuid[]) INTO v_ids
    FROM public.institutes
    WHERE deleted_at IS NULL
      AND regexp_replace(lower(COALESCE(website, '')), '/+$', '') = v_website;
    v_reason := 'official_website';
  END IF;

  IF cardinality(v_ids) = 0 AND v_name <> '' AND v_location <> '' AND v_affiliation <> '' THEN
    SELECT COALESCE(array_agg(id), '{}'::uuid[]) INTO v_ids
    FROM public.institutes
    WHERE deleted_at IS NULL
      AND regexp_replace(lower(name), '[^a-z0-9]+', '', 'g') = v_name
      AND regexp_replace(lower(COALESCE(location, '')), '[^a-z0-9]+', '', 'g') = v_location
      AND regexp_replace(lower(COALESCE(affiliation, '')), '[^a-z0-9]+', '', 'g') = v_affiliation;
    v_reason := 'name_location_affiliation';
  END IF;

  IF cardinality(v_ids) = 0 AND v_name <> '' THEN
    SELECT COALESCE(array_agg(id), '{}'::uuid[]) INTO v_ids
    FROM public.institutes
    WHERE deleted_at IS NULL
      AND regexp_replace(lower(name), '[^a-z0-9]+', '', 'g') = v_name;
    v_reason := 'normalized_name';
  END IF;

  IF cardinality(v_ids) = 1 THEN
    RETURN jsonb_build_object('status', 'matched', 'reason', v_reason, 'institute_id', v_ids[1], 'candidate_ids', v_ids);
  END IF;
  IF cardinality(v_ids) > 1 THEN
    RETURN jsonb_build_object('status', 'needs_review', 'reason', v_reason || '_ambiguous', 'candidate_ids', v_ids);
  END IF;

  -- Controlled fuzzy matching is review-only. It deliberately cannot produce
  -- a matched result, so an uncertain source cannot modify or duplicate data.
  IF char_length(v_name) >= 6 THEN
    SELECT COALESCE(array_agg(id), '{}'::uuid[]) INTO v_ids
    FROM (
      SELECT id FROM public.institutes
      WHERE deleted_at IS NULL
        AND (regexp_replace(lower(name), '[^a-z0-9]+', '', 'g') LIKE '%' || v_name || '%'
          OR v_name LIKE '%' || regexp_replace(lower(name), '[^a-z0-9]+', '', 'g') || '%')
      ORDER BY name
      LIMIT 10
    ) possible;
  END IF;
  IF cardinality(v_ids) > 0 THEN
    RETURN jsonb_build_object('status', 'needs_review', 'reason', 'name_similarity', 'candidate_ids', v_ids);
  END IF;
  RETURN jsonb_build_object('status', 'new', 'reason', 'no_existing_match', 'candidate_ids', '[]'::jsonb);
END;
$$;

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
  v_resolution jsonb;
  v_status text;
  v_target public.institutes%ROWTYPE;
  v_protected text[] := '{}'::text[];
  v_existing_hash text;
  v_changed_fields text[] := '{}'::text[];
  v_outcome text;
BEGIN
  IF COALESCE(auth.role(), '') <> 'service_role' THEN RAISE EXCEPTION 'Service role is required for directory ingestion' USING ERRCODE = '42501'; END IF;
  IF jsonb_typeof(p_record) <> 'object' OR v_name IS NULL OR v_slug IS NULL OR v_source_name IS NULL OR v_source_url IS NULL OR v_source_hash IS NULL THEN
    RAISE EXCEPTION 'A normalized source record with name, slug, source metadata, and hash is required' USING ERRCODE = '22023';
  END IF;
  IF v_source_url !~ '^https://edusanjal\\.com/' AND v_source_url !~ '^https://www\\.edusanjal\\.com/' THEN RAISE EXCEPTION 'Only approved Edusanjal HTTPS provenance is accepted by this importer' USING ERRCODE = '22023'; END IF;
  IF NULLIF(btrim(p_record ->> 'website'), '') ~* '(^https?://)?([^/]*\\.)?edusanjal\\.com' THEN RAISE EXCEPTION 'The source site cannot be saved as an institution official website' USING ERRCODE = '22023'; END IF;

  v_resolution := public.resolve_institute_source_match(p_record);
  v_status := v_resolution ->> 'status';
  IF v_status = 'needs_review' THEN
    INSERT INTO public.institute_ingestion_reviews (source_name, source_key, source_url, source_record_id, source_hash, source_record, candidate_institute_ids, match_reason)
    VALUES (v_source_name, COALESCE(v_source_record_id, v_source_url), v_source_url, v_source_record_id, v_source_hash, p_record,
      ARRAY(SELECT jsonb_array_elements_text(v_resolution -> 'candidate_ids')::uuid), v_resolution ->> 'reason')
    ON CONFLICT (source_name, source_key) DO UPDATE SET
      source_url = EXCLUDED.source_url, source_record_id = EXCLUDED.source_record_id, source_hash = EXCLUDED.source_hash,
      source_record = EXCLUDED.source_record, candidate_institute_ids = EXCLUDED.candidate_institute_ids,
      match_reason = EXCLUDED.match_reason, status = 'needs_review', updated_at = now();
    RETURN jsonb_build_object('outcome', 'needs_review', 'reason', v_resolution ->> 'reason', 'candidate_ids', v_resolution -> 'candidate_ids');
  END IF;

  IF v_status = 'new' THEN
    INSERT INTO public.institutes (name, short_name, slug, institution_category, type, affiliation, level, location, contact_email, contact_phone, website, courses_offered, admission_status, admission_deadline, established_year, status, applications_enabled)
    VALUES (v_name, NULLIF(btrim(p_record ->> 'short_name'), ''), v_slug, COALESCE(NULLIF(btrim(p_record ->> 'institution_category'), ''), 'college'), NULLIF(btrim(p_record ->> 'type'), ''), NULLIF(btrim(p_record ->> 'affiliation'), ''), NULLIF(btrim(p_record ->> 'level'), ''), v_location, NULLIF(btrim(p_record ->> 'contact_email'), ''), NULLIF(btrim(p_record ->> 'contact_phone'), ''), NULLIF(btrim(p_record ->> 'website'), ''), COALESCE(p_record -> 'courses_offered', '[]'::jsonb), NULLIF(btrim(p_record ->> 'admission_status'), ''), NULLIF(btrim(p_record ->> 'admission_deadline'), '')::date, NULLIF(btrim(p_record ->> 'established_year'), '')::integer, 'pending', false)
    RETURNING * INTO v_target;
    v_outcome := 'added';
    v_changed_fields := ARRAY['bootstrap'];
  ELSE
    SELECT * INTO v_target FROM public.institutes WHERE id = (v_resolution ->> 'institute_id')::uuid;
    SELECT COALESCE(managed_fields, '{}'::text[]) INTO v_protected FROM public.institute_content_ownership WHERE institute_id = v_target.id;
    IF v_target.owner_user_id IS NOT NULL THEN
      v_protected := v_protected || ARRAY['name','short_name','slug','institution_category','type','affiliation','level','description','location','contact_email','contact_phone','website','courses_offered','admission_status','admission_deadline','scholarships','salient_features','established_year'];
    END IF;
    SELECT source_hash INTO v_existing_hash FROM public.institute_ingestion_provenance WHERE institute_id = v_target.id;
    IF COALESCE(v_existing_hash, '') = v_source_hash THEN
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
        updated_at = now() WHERE id = v_target.id RETURNING * INTO v_target;
      v_outcome := 'updated';
      v_changed_fields := ARRAY(SELECT field FROM unnest(ARRAY['name','short_name','slug','institution_category','type','affiliation','level','location','contact_email','contact_phone','website','courses_offered','admission_status','admission_deadline','established_year']) AS field WHERE NOT (field = ANY(v_protected)));
    END IF;
  END IF;

  INSERT INTO public.institute_ingestion_provenance (institute_id, source_name, source_url, source_record_id, source_hash, imported_at, last_checked_at, source_fields, updated_at)
  VALUES (v_target.id, v_source_name, v_source_url, v_source_record_id, v_source_hash, now(), now(), p_record - ARRAY['description','salient_features','scholarships'], now())
  ON CONFLICT (institute_id) DO UPDATE SET source_name = EXCLUDED.source_name, source_url = EXCLUDED.source_url, source_record_id = EXCLUDED.source_record_id, source_hash = EXCLUDED.source_hash, last_checked_at = now(), source_fields = EXCLUDED.source_fields, updated_at = now();
  RETURN jsonb_build_object('outcome', v_outcome, 'institute_id', v_target.id, 'match_reason', v_resolution ->> 'reason', 'changed_fields', v_changed_fields, 'protected_fields', v_protected);
END;
$$;

REVOKE ALL ON FUNCTION public.resolve_institute_source_match(jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_institute_source_match(jsonb) TO service_role;
REVOKE ALL ON FUNCTION public.ingest_institute_source_record(jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ingest_institute_source_record(jsonb) TO service_role;

COMMIT;
