-- Phase 1: reviewed entity claims/additions and private messaging attachments.

BEGIN;

CREATE TABLE IF NOT EXISTS public.entity_scope_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  module_key text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  request_kind text NOT NULL,
  request_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  reason text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  decision_note text,
  decided_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  decided_at timestamptz,
  assignment_id uuid REFERENCES public.entity_admin_assignments(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (entity_type IN ('college', 'mentor', 'company', 'event', 'job', 'course')),
  CHECK (request_kind IN ('claim', 'create')),
  CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
  CHECK ((request_kind = 'claim' AND entity_id IS NOT NULL) OR (request_kind = 'create' AND entity_id IS NULL)),
  CHECK (char_length(btrim(reason)) BETWEEN 10 AND 2000)
);

CREATE UNIQUE INDEX IF NOT EXISTS entity_scope_requests_one_pending_idx
ON public.entity_scope_requests(user_id, module_key, entity_type, COALESCE(entity_id, '00000000-0000-0000-0000-000000000000'::uuid), request_kind)
WHERE status = 'pending';

ALTER TABLE public.entity_scope_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own entity scope requests"
ON public.entity_scope_requests FOR SELECT TO authenticated
USING (user_id = auth.uid() OR public.is_platform_admin());
CREATE POLICY "Super Admin manages entity scope requests"
ON public.entity_scope_requests FOR ALL TO authenticated
USING (public.is_platform_admin()) WITH CHECK (public.is_platform_admin());

CREATE OR REPLACE FUNCTION public.request_entity_scope(
  p_module_key text,
  p_entity_type text,
  p_entity_id uuid DEFAULT NULL,
  p_request_kind text DEFAULT 'claim',
  p_request_data jsonb DEFAULT '{}'::jsonb,
  p_reason text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE actor uuid := auth.uid();
DECLARE module_key text := public.normalize_module_capability_key(p_module_key);
DECLARE request_record public.entity_scope_requests%ROWTYPE;
DECLARE safe_kind text := lower(btrim(COALESCE(p_request_kind, '')));
DECLARE safe_data jsonb := COALESCE(p_request_data, '{}'::jsonb);
BEGIN
  IF actor IS NULL OR NOT public.is_account_active(actor) THEN RAISE EXCEPTION 'An active verified account is required' USING ERRCODE = '42501'; END IF;
  IF module_key IS NULL OR NOT public.has_active_module_capability(actor, module_key) THEN
    RAISE EXCEPTION 'An approved module capability is required before requesting an entity scope' USING ERRCODE = '42501';
  END IF;
  IF safe_kind NOT IN ('claim', 'create') OR p_entity_type <> 'college' OR module_key <> 'college' THEN
    RAISE EXCEPTION 'Only college claim and college creation requests are available in this phase' USING ERRCODE = '22023';
  END IF;
  IF safe_kind = 'claim' AND NOT EXISTS (SELECT 1 FROM public.institutes WHERE id = p_entity_id AND deleted_at IS NULL) THEN
    RAISE EXCEPTION 'The college is no longer available to claim' USING ERRCODE = 'P0002';
  END IF;
  IF safe_kind = 'create' AND char_length(btrim(COALESCE(safe_data->>'name', ''))) NOT BETWEEN 2 AND 180 THEN
    RAISE EXCEPTION 'A college name between 2 and 180 characters is required' USING ERRCODE = '22023';
  END IF;
  INSERT INTO public.entity_scope_requests(user_id, module_key, entity_type, entity_id, request_kind, request_data, reason)
  VALUES (actor, module_key, 'college', CASE WHEN safe_kind = 'claim' THEN p_entity_id ELSE NULL END, safe_kind, safe_data, btrim(p_reason))
  ON CONFLICT (user_id, module_key, entity_type, COALESCE(entity_id, '00000000-0000-0000-0000-000000000000'::uuid), request_kind) WHERE status = 'pending'
  DO UPDATE SET reason = EXCLUDED.reason, request_data = EXCLUDED.request_data, updated_at = now()
  RETURNING * INTO request_record;
  INSERT INTO public.audit_logs(actor_user_id, action, entity_type, entity_id, metadata)
  VALUES (actor, 'request_entity_scope', 'entity_scope_requests', request_record.id::text, jsonb_build_object('module_key', module_key, 'request_kind', safe_kind, 'entity_id', p_entity_id));
  INSERT INTO public.notifications(recipient_id, title, message, type, category, channel, status, entity_type, entity_id, action_url, metadata)
  SELECT DISTINCT p.user_id, 'College scope request', 'A college claim or addition request requires review.', 'info', 'entity_scope_request', 'dashboard', 'queued', 'entity_scope_request', request_record.id, '/admin/access-requests', jsonb_build_object('requester_id', actor)
  FROM public.profiles p JOIN public.user_roles ur ON ur.user_id = p.user_id
  WHERE p.account_status = 'active' AND p.deleted_at IS NULL AND ur.role IN ('admin', 'super_admin');
  RETURN jsonb_build_object('id', request_record.id, 'status', request_record.status, 'request_kind', request_record.request_kind);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_decide_entity_scope_request(
  p_request_id uuid,
  p_approve boolean,
  p_note text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE request_record public.entity_scope_requests%ROWTYPE;
DECLARE college_id uuid;
DECLARE assignment jsonb;
BEGIN
  IF NOT public.is_platform_admin(auth.uid()) THEN RAISE EXCEPTION 'Only Super Admin can decide entity scope requests' USING ERRCODE = '42501'; END IF;
  SELECT * INTO request_record FROM public.entity_scope_requests WHERE id = p_request_id FOR UPDATE;
  IF request_record.id IS NULL OR request_record.status <> 'pending' THEN RAISE EXCEPTION 'The pending entity request was not found' USING ERRCODE = 'P0002'; END IF;
  IF p_approve THEN
    IF request_record.request_kind = 'create' THEN
      INSERT INTO public.institutes(name, slug, location, contact_email, contact_phone, description, owner_user_id, status, applications_enabled)
      VALUES (
        btrim(request_record.request_data->>'name'),
        lower(regexp_replace(btrim(request_record.request_data->>'name'), '[^a-zA-Z0-9]+', '-', 'g')) || '-' || substr(request_record.id::text, 1, 8),
        NULLIF(btrim(request_record.request_data->>'location'), ''),
        NULLIF(lower(btrim(request_record.request_data->>'email')), ''),
        NULLIF(btrim(request_record.request_data->>'phone'), ''),
        NULLIF(btrim(request_record.request_data->>'description'), ''),
        request_record.user_id, 'pending', false
      ) RETURNING id INTO college_id;
    ELSE
      college_id := request_record.entity_id;
    END IF;
    assignment := public.admin_assign_entity_scope(request_record.user_id, 'college', 'college', college_id, NULL, jsonb_build_object('source', 'entity_scope_request'));
    UPDATE public.entity_scope_requests
    SET status = 'approved', decision_note = NULLIF(btrim(p_note), ''), decided_by = auth.uid(), decided_at = now(),
      assignment_id = (assignment->>'id')::uuid, updated_at = now()
    WHERE id = request_record.id RETURNING * INTO request_record;
  ELSE
    UPDATE public.entity_scope_requests
    SET status = 'rejected', decision_note = NULLIF(btrim(p_note), ''), decided_by = auth.uid(), decided_at = now(), updated_at = now()
    WHERE id = request_record.id RETURNING * INTO request_record;
  END IF;
  INSERT INTO public.audit_logs(actor_user_id, action, entity_type, entity_id, metadata)
  VALUES (auth.uid(), CASE WHEN p_approve THEN 'approve_entity_scope' ELSE 'reject_entity_scope' END, 'entity_scope_requests', request_record.id::text, jsonb_build_object('user_id', request_record.user_id, 'college_id', college_id, 'note', request_record.decision_note));
  INSERT INTO public.notifications(recipient_id, title, message, type, category, channel, status, entity_type, entity_id, action_url, metadata)
  VALUES (request_record.user_id,
    CASE WHEN p_approve THEN 'College access approved' ELSE 'College access request rejected' END,
    CASE WHEN p_approve THEN 'Your college administration scope is active. A valid subscription or trial is required to access protected college data.' ELSE COALESCE(request_record.decision_note, 'Your college scope request was not approved.') END,
    'info', 'entity_scope_request', 'dashboard', 'queued', 'entity_scope_request', request_record.id, '/institute', jsonb_build_object('status', request_record.status, 'assignment_id', request_record.assignment_id));
  RETURN jsonb_build_object('id', request_record.id, 'status', request_record.status, 'assignment_id', request_record.assignment_id, 'college_id', college_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.cancel_entity_scope_request(p_request_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE request_record public.entity_scope_requests%ROWTYPE;
BEGIN
  UPDATE public.entity_scope_requests SET status = 'cancelled', updated_at = now()
  WHERE id = p_request_id AND user_id = auth.uid() AND status = 'pending' RETURNING * INTO request_record;
  IF request_record.id IS NULL THEN RAISE EXCEPTION 'Only your pending request can be cancelled' USING ERRCODE = '42501'; END IF;
  RETURN jsonb_build_object('id', request_record.id, 'status', request_record.status);
END;
$$;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'chat-attachments', 'chat-attachments', false, 5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']::text[]
)
ON CONFLICT (id) DO UPDATE SET public = false, file_size_limit = EXCLUDED.file_size_limit, allowed_mime_types = EXCLUDED.allowed_mime_types;

ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS attachment_path text,
  ADD COLUMN IF NOT EXISTS attachment_mime_type text;

CREATE POLICY "Message participants upload attachments"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'chat-attachments'
  AND (storage.foldername(name))[1] = auth.uid()::text
  AND lower(regexp_replace(name, '^.*\\.', '')) IN ('jpg', 'jpeg', 'png', 'webp', 'pdf')
);
CREATE POLICY "Message participants read attachments"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'chat-attachments'
  AND EXISTS (
    SELECT 1 FROM public.messages m
    JOIN public.conversations c ON c.id = m.conversation_id
    WHERE m.attachment_path = storage.objects.name
      AND (c.mentee_id = auth.uid() OR EXISTS (
        SELECT 1 FROM public.mentors mentor WHERE mentor.id = c.mentor_id AND mentor.user_id = auth.uid()
      ) OR public.is_platform_admin())
  )
);
CREATE POLICY "Message uploaders delete attachments"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'chat-attachments' AND (storage.foldername(name))[1] = auth.uid()::text);

REVOKE ALL ON FUNCTION public.request_entity_scope(text, text, uuid, text, jsonb, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.request_entity_scope(text, text, uuid, text, jsonb, text) TO authenticated;
REVOKE ALL ON FUNCTION public.admin_decide_entity_scope_request(uuid, boolean, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_decide_entity_scope_request(uuid, boolean, text) TO authenticated;
REVOKE ALL ON FUNCTION public.cancel_entity_scope_request(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cancel_entity_scope_request(uuid) TO authenticated;

COMMIT;
