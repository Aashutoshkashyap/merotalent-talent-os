BEGIN;

-- Public institutional leadership content. These fields are intentionally
-- separate from generic contact_info so they can be rendered safely without
-- interpreting user supplied HTML.
ALTER TABLE public.institutes
  ADD COLUMN IF NOT EXISTS map_location text,
  ADD COLUMN IF NOT EXISTS chairperson_name text,
  ADD COLUMN IF NOT EXISTS chairperson_designation text,
  ADD COLUMN IF NOT EXISTS chairperson_message text,
  ADD COLUMN IF NOT EXISTS chairperson_image_url text,
  ADD COLUMN IF NOT EXISTS principal_name text,
  ADD COLUMN IF NOT EXISTS principal_designation text,
  ADD COLUMN IF NOT EXISTS principal_message text,
  ADD COLUMN IF NOT EXISTS principal_image_url text;

-- Verification is a calculated state. It cannot remain true merely because a
-- legacy boolean was once set. A public college must be approved, have an
-- accountable assigned/owning administrator, and be in an active paid plan or
-- trial. A default free plan deliberately does not create a paid verification
-- badge.
CREATE OR REPLACE FUNCTION public.is_college_effectively_verified(p_institute_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.institutes i
    WHERE i.id = p_institute_id
      AND i.status = 'approved'
      AND i.deleted_at IS NULL
      AND (
        i.owner_user_id IS NOT NULL OR EXISTS (
          SELECT 1 FROM public.entity_admin_assignments a
          JOIN public.user_module_capabilities umc ON umc.id = a.user_capability_id
          JOIN public.module_capabilities mc ON mc.id = umc.capability_id
          WHERE mc.module_key = 'college' AND a.entity_type = 'college'
            AND a.entity_id = i.id AND a.status = 'active' AND umc.status = 'active'
        )
      )
      AND EXISTS (
        SELECT 1
        FROM public.subscriptions s
        JOIN public.packages p ON p.id = s.package_id
        WHERE s.entity_type = 'college' AND s.entity_id = i.id
          AND s.deleted_at IS NULL AND p.deleted_at IS NULL AND p.is_active
          AND s.status IN ('trialing', 'active')
          AND s.payment_status IN ('success', 'not_required')
          AND s.start_date <= now() AND s.expiry_date > now()
          AND (s.status = 'trialing' OR COALESCE(p.price, 0) > 0)
      )
  );
$$;

-- The workspace function is the only browser-facing selector for private
-- college management. It supports many colleges per administrator and exposes
-- only records reachable through ownership or an active Phase 1 assignment.
CREATE OR REPLACE FUNCTION public.get_my_college_workspaces()
RETURNS TABLE (
  id uuid,
  name text,
  short_name text,
  description text,
  location text,
  map_location text,
  website text,
  contact_email text,
  contact_phone text,
  youtube_url text,
  logo_url text,
  type text,
  owner_user_id uuid,
  courses_offered jsonb,
  total_seats integer,
  available_seats integer,
  admission_status text,
  chairperson_name text,
  chairperson_designation text,
  chairperson_message text,
  principal_name text,
  principal_designation text,
  principal_message text,
  subscription_status text,
  payment_status text,
  package_name text,
  lead_access_mode text,
  expiry_date timestamptz,
  subscription_active boolean,
  effectively_verified boolean,
  can_edit_profile boolean,
  can_view_leads boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  WITH accessible AS (
    SELECT i.id, bool_or(i.owner_user_id = auth.uid()) AS is_owner
    FROM public.institutes i
    LEFT JOIN public.entity_admin_assignments a
      JOIN public.user_module_capabilities umc ON umc.id = a.user_capability_id
      JOIN public.module_capabilities mc ON mc.id = umc.capability_id
      ON a.entity_id = i.id AND a.entity_type = 'college' AND mc.module_key = 'college'
      AND a.user_id = auth.uid() AND a.status = 'active' AND umc.status = 'active'
    WHERE i.deleted_at IS NULL AND (i.owner_user_id = auth.uid() OR a.id IS NOT NULL)
    GROUP BY i.id
  )
  SELECT i.id, i.name, i.short_name, i.description, i.location, i.map_location,
    i.website, i.contact_email, i.contact_phone, i.youtube_url, i.logo_url, i.type,
    i.owner_user_id, i.courses_offered, i.total_seats, i.available_seats, i.admission_status,
    i.chairperson_name, i.chairperson_designation, i.chairperson_message,
    i.principal_name, i.principal_designation, i.principal_message,
    COALESCE(s.status, 'expired'), COALESCE(s.payment_status, 'pending'), p.name,
    COALESCE(p.lead_access_mode, 'none'), s.expiry_date,
    public.has_entity_entitlement(auth.uid(), 'college', i.id, NULL, 'read_only'),
    public.is_college_effectively_verified(i.id),
    public.has_entity_entitlement(auth.uid(), 'college', i.id, NULL, 'read_only')
      AND (a.is_owner OR public.has_permission(auth.uid(), 'college.manage')),
    public.has_entity_entitlement(auth.uid(), 'college', i.id, 'college_applications', 'read_only')
      AND public.has_permission(auth.uid(), 'lead.view')
  FROM accessible a
  JOIN public.institutes i ON i.id = a.id
  LEFT JOIN LATERAL (
    SELECT s.* FROM public.subscriptions s
    WHERE s.entity_type = 'college' AND s.entity_id = i.id AND s.deleted_at IS NULL
    ORDER BY (s.status IN ('trialing', 'active') AND s.start_date <= now() AND s.expiry_date > now()) DESC,
      s.expiry_date DESC NULLS LAST
    LIMIT 1
  ) s ON true
  LEFT JOIN public.packages p ON p.id = s.package_id;
$$;

CREATE OR REPLACE FUNCTION public.update_my_college_profile(p_institute_id uuid, p_profile jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE actor uuid := auth.uid();
DECLARE safe_youtube text := NULLIF(btrim(p_profile ->> 'youtube_url'), '');
DECLARE updated public.institutes%ROWTYPE;
BEGIN
  IF actor IS NULL OR NOT public.is_account_active(actor) THEN RAISE EXCEPTION 'An active account is required' USING ERRCODE = '42501'; END IF;
  IF NOT public.is_platform_admin(actor) AND NOT (
    public.has_entity_entitlement(actor, 'college', p_institute_id, NULL, 'read_only')
    AND (public.has_permission(actor, 'college.manage') OR EXISTS (SELECT 1 FROM public.institutes WHERE id = p_institute_id AND owner_user_id = actor))
  ) THEN RAISE EXCEPTION 'Your active college assignment and subscription are required to edit this profile' USING ERRCODE = '42501'; END IF;
  IF safe_youtube IS NOT NULL AND safe_youtube !~* '^https?://(www\\.)?(youtube\\.com|m\\.youtube\\.com|youtu\\.be|youtube-nocookie\\.com)/' THEN
    RAISE EXCEPTION 'Provide a valid YouTube URL' USING ERRCODE = '22023';
  END IF;
  IF char_length(btrim(COALESCE(p_profile ->> 'name', ''))) NOT BETWEEN 2 AND 180 THEN RAISE EXCEPTION 'College name must be 2 to 180 characters' USING ERRCODE = '22023'; END IF;
  UPDATE public.institutes SET
    name = btrim(p_profile ->> 'name'), short_name = NULLIF(btrim(p_profile ->> 'short_name'), ''),
    type = NULLIF(btrim(p_profile ->> 'type'), ''), location = NULLIF(btrim(p_profile ->> 'location'), ''),
    map_location = NULLIF(btrim(p_profile ->> 'map_location'), ''), website = NULLIF(btrim(p_profile ->> 'website'), ''),
    description = NULLIF(btrim(p_profile ->> 'description'), ''), contact_email = NULLIF(btrim(p_profile ->> 'contact_email'), ''),
    contact_phone = NULLIF(btrim(p_profile ->> 'contact_phone'), ''), youtube_url = safe_youtube,
    admission_status = COALESCE(NULLIF(btrim(p_profile ->> 'admission_status'), ''), admission_status),
    chairperson_name = NULLIF(btrim(p_profile ->> 'chairperson_name'), ''),
    chairperson_designation = NULLIF(btrim(p_profile ->> 'chairperson_designation'), ''),
    chairperson_message = NULLIF(btrim(p_profile ->> 'chairperson_message'), ''),
    principal_name = NULLIF(btrim(p_profile ->> 'principal_name'), ''),
    principal_designation = NULLIF(btrim(p_profile ->> 'principal_designation'), ''),
    principal_message = NULLIF(btrim(p_profile ->> 'principal_message'), ''),
    updated_at = now()
  WHERE id = p_institute_id AND deleted_at IS NULL
  RETURNING * INTO updated;
  IF updated.id IS NULL THEN RAISE EXCEPTION 'College was not found' USING ERRCODE = 'P0002'; END IF;
  INSERT INTO public.audit_logs(actor_user_id, action, entity_type, entity_id, metadata)
  VALUES (actor, 'update_college_profile', 'college', p_institute_id::text, jsonb_build_object('fields', p_profile - 'name'));
  RETURN jsonb_build_object('id', updated.id, 'updated_at', updated.updated_at);
END;
$$;

CREATE OR REPLACE VIEW public.institute_directory
WITH (security_invoker = true, security_barrier = true) AS
SELECT i.id, i.name, i.short_name, i.slug, i.type, i.institution_category, i.location, i.affiliation, i.level,
  i.website, i.logo_url, i.cover_image_url, i.gallery_urls, i.youtube_url, i.description, i.salient_features,
  i.scholarships, i.admission_guidelines, i.established_year, i.courses_offered, i.contact_info,
  i.contact_email, i.contact_phone, i.admission_status, i.admission_deadline, i.total_seats, i.available_seats,
  i.status, i.ranking, i.is_featured, i.applications_enabled, i.source_url, i.created_at, i.updated_at,
  public.is_college_effectively_verified(i.id) AS payment_verified,
  programs.program_names,
  tags.search_tags,
  lower(concat_ws(' ', i.name, i.short_name, i.location, i.affiliation, i.level, i.description,
    array_to_string(programs.program_names, ' '), array_to_string(i.salient_features, ' '), i.scholarships,
    i.admission_guidelines, array_to_string(tags.search_tags, ' '))) AS search_document,
  i.chairperson_name, i.chairperson_designation, i.chairperson_message, i.chairperson_image_url,
  i.principal_name, i.principal_designation, i.principal_message, i.principal_image_url
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

REVOKE ALL ON FUNCTION public.is_college_effectively_verified(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_college_effectively_verified(uuid) TO anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.get_my_college_workspaces() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_college_workspaces() TO authenticated;
REVOKE ALL ON FUNCTION public.update_my_college_profile(uuid, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_my_college_profile(uuid, jsonb) TO authenticated;

COMMIT;
