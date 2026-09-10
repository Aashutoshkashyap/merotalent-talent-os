BEGIN;

-- Preserve the existing authorization implementation for every non-college
-- media type, then extend only college media to the Phase 1 assignment model.
ALTER FUNCTION public.authorize_media_access(text, text, uuid, uuid)
  RENAME TO authorize_media_access_legacy_phase3;

CREATE OR REPLACE FUNCTION public.authorize_media_access(
  p_action text,
  p_module text,
  p_resource_id uuid,
  p_owner_user_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE actor uuid := auth.uid();
BEGIN
  IF p_module NOT IN ('college_logo', 'college_cover', 'college_gallery') THEN
    RETURN public.authorize_media_access_legacy_phase3(p_action, p_module, p_resource_id, p_owner_user_id);
  END IF;
  IF actor IS NULL OR p_action NOT IN ('upload', 'download') OR p_resource_id IS NULL THEN RETURN false; END IF;
  IF public.is_platform_admin(actor) THEN RETURN true; END IF;
  RETURN public.is_account_active(actor)
    AND public.has_permission(actor, 'college.manage')
    AND public.has_entity_entitlement(actor, 'college', p_resource_id, NULL, 'read_only')
    AND (
      EXISTS (SELECT 1 FROM public.institutes i WHERE i.id = p_resource_id AND i.owner_user_id = actor AND i.deleted_at IS NULL)
      OR public.has_active_entity_assignment(actor, 'college', 'college', p_resource_id)
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.update_my_college_media(
  p_institute_id uuid,
  p_logo_path text DEFAULT NULL,
  p_cover_path text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE actor uuid := auth.uid();
BEGIN
  IF actor IS NULL OR NOT public.is_account_active(actor) THEN RAISE EXCEPTION 'An active account is required' USING ERRCODE = '42501'; END IF;
  IF NOT public.authorize_media_access('upload', 'college_logo', p_institute_id, actor) THEN
    RAISE EXCEPTION 'Your active assigned college access is required' USING ERRCODE = '42501';
  END IF;
  IF p_logo_path IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.media_upload_intents m WHERE m.user_id = actor AND m.resource_id = p_institute_id
      AND m.module = 'college_logo' AND m.object_path = p_logo_path
  ) THEN RAISE EXCEPTION 'The logo upload was not authorized for this college' USING ERRCODE = '42501'; END IF;
  IF p_cover_path IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.media_upload_intents m WHERE m.user_id = actor AND m.resource_id = p_institute_id
      AND m.module = 'college_cover' AND m.object_path = p_cover_path
  ) THEN RAISE EXCEPTION 'The cover upload was not authorized for this college' USING ERRCODE = '42501'; END IF;
  UPDATE public.institutes SET logo_url = COALESCE(p_logo_path, logo_url), cover_image_url = COALESCE(p_cover_path, cover_image_url), updated_at = now()
  WHERE id = p_institute_id AND deleted_at IS NULL;
  IF NOT FOUND THEN RAISE EXCEPTION 'College was not found' USING ERRCODE = 'P0002'; END IF;
  INSERT INTO public.audit_logs(actor_user_id, action, entity_type, entity_id, metadata)
  VALUES (actor, 'update_college_media', 'college', p_institute_id::text, jsonb_build_object('logo_updated', p_logo_path IS NOT NULL, 'cover_updated', p_cover_path IS NOT NULL));
  RETURN jsonb_build_object('id', p_institute_id, 'logo_path', p_logo_path, 'cover_path', p_cover_path);
END;
$$;

REVOKE ALL ON FUNCTION public.authorize_media_access(text, text, uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.authorize_media_access(text, text, uuid, uuid) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.update_my_college_media(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_my_college_media(uuid, text, text) TO authenticated;

COMMIT;
