BEGIN;

ALTER TABLE public.job_applications
  ADD COLUMN IF NOT EXISTS interview_at timestamptz,
  ADD COLUMN IF NOT EXISTS interview_location text,
  ADD COLUMN IF NOT EXISTS interview_duration_minutes integer;

CREATE OR REPLACE FUNCTION public.can_review_job_applications(p_job_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_temp AS $$
  SELECT public.is_account_active(auth.uid()) AND (
    public.is_platform_admin() OR EXISTS (
      SELECT 1 FROM public.jobs j WHERE j.id = p_job_id AND j.deleted_at IS NULL
      AND (public.authorize_module_access(auth.uid(),'jobs','company',j.company_id,'job_applications')
        OR public.authorize_module_access(auth.uid(),'jobs','job',j.id,'job_applications'))
    )
  )
$$;
REVOKE ALL ON FUNCTION public.can_review_job_applications(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_review_job_applications(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.protect_job_application_update()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  requested public.job_applications := NEW;
BEGIN
  IF auth.role() = 'service_role' THEN RETURN NEW; END IF;
  IF NOT public.is_account_active(auth.uid()) THEN RAISE EXCEPTION 'Account inactive' USING ERRCODE='42501'; END IF;
  IF public.is_platform_admin() THEN RETURN NEW; END IF;
  NEW := OLD;
  IF public.can_review_job_applications(OLD.job_id) THEN
    IF OLD.status = 'withdrawn' OR requested.status NOT IN ('submitted','screening','follow_up','interview','offered','confirmed','rejected') THEN
      RAISE EXCEPTION 'Unsupported application status' USING ERRCODE='22023';
    END IF;
    NEW.status := requested.status;
    NEW.notes := requested.notes;
    NEW.interview_at := requested.interview_at;
    NEW.interview_location := requested.interview_location;
    NEW.interview_duration_minutes := requested.interview_duration_minutes;
  ELSIF OLD.user_id = auth.uid() AND OLD.status IN ('submitted','screening') AND requested.status = 'withdrawn' THEN
    NEW.status := 'withdrawn';
  ELSE
    RAISE EXCEPTION 'Application update not allowed' USING ERRCODE='42501';
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.review_job_application(
  p_id uuid, p_status text, p_notes text DEFAULT '', p_interview_at timestamptz DEFAULT NULL,
  p_interview_location text DEFAULT '', p_duration integer DEFAULT 30
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  application public.job_applications;
  notification_id uuid;
  job_title text;
  notification_title text;
  notification_text text;
BEGIN
  SELECT * INTO application FROM public.job_applications WHERE id=p_id AND deleted_at IS NULL FOR UPDATE;
  IF NOT FOUND OR NOT public.can_review_job_applications(application.job_id) THEN
    RAISE EXCEPTION 'Application access denied' USING ERRCODE='42501';
  END IF;
  IF application.status='withdrawn' OR p_status IS NULL OR p_status NOT IN ('submitted','screening','follow_up','interview','offered','confirmed','rejected')
    OR char_length(p_notes)>5000 OR char_length(p_interview_location)>1000 THEN
    RAISE EXCEPTION 'Invalid application update' USING ERRCODE='22023';
  END IF;
  IF p_status='interview' AND (p_interview_at IS NULL OR p_interview_at <= now() OR p_duration IS NULL OR p_duration NOT BETWEEN 5 AND 480 OR nullif(btrim(p_interview_location),'') IS NULL) THEN
    RAISE EXCEPTION 'Provide a future interview time, duration and location or meeting link' USING ERRCODE='22023';
  END IF;
  UPDATE public.job_applications SET status=p_status, notes=p_notes,
    interview_at=CASE WHEN p_status='interview' THEN p_interview_at ELSE interview_at END,
    interview_location=CASE WHEN p_status='interview' THEN p_interview_location ELSE interview_location END,
    interview_duration_minutes=CASE WHEN p_status='interview' THEN p_duration ELSE interview_duration_minutes END,
    updated_at=now() WHERE id=p_id;
  INSERT INTO public.audit_logs(actor_user_id,action,entity_type,entity_id,metadata)
  VALUES(auth.uid(),'job_application.review','job_application',p_id::text,
    jsonb_build_object('previous_status',application.status,'status',p_status,'interview_at',p_interview_at));
  IF p_status IN ('interview','offered','confirmed') AND (
    application.status IS DISTINCT FROM p_status OR
    (p_status='interview' AND (application.interview_at IS DISTINCT FROM p_interview_at
      OR application.interview_location IS DISTINCT FROM p_interview_location
      OR application.interview_duration_minutes IS DISTINCT FROM p_duration))
  ) THEN
    SELECT title INTO job_title FROM public.jobs WHERE id=application.job_id;
    notification_title := CASE WHEN p_status='interview' THEN 'Interview scheduled' ELSE 'Application selected' END;
    notification_text := CASE WHEN p_status='interview'
      THEN 'Your interview for ' || job_title || ' is scheduled for ' || to_char(p_interview_at AT TIME ZONE 'Asia/Kathmandu','YYYY-MM-DD HH24:MI') || ' (Asia/Kathmandu), ' || p_duration || ' minutes. Location / meeting: ' || p_interview_location
      ELSE 'Your application for ' || job_title || ' has been selected. The hiring team will contact you with the next steps.' END;
    INSERT INTO public.notifications(recipient_id,title,message,type,category,channel,status,entity_type,entity_id,action_url)
    VALUES(application.user_id,notification_title,notification_text,'info','job','dashboard','queued','job_application',p_id,'/dashboard/jobs');
    IF nullif(application.email,'') IS NOT NULL THEN
      INSERT INTO public.notifications(recipient_id,title,message,type,category,channel,status,email_to,entity_type,entity_id)
      VALUES(application.user_id,notification_title,notification_text,'info','job','email','queued',application.email,'job_application',p_id)
      RETURNING id INTO notification_id;
    END IF;
  END IF;
  RETURN jsonb_build_object('id',p_id,'status',p_status,'notificationId',notification_id);
END;
$$;
REVOKE ALL ON FUNCTION public.review_job_application(uuid,text,text,timestamptz,text,integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.review_job_application(uuid,text,text,timestamptz,text,integer) TO authenticated;

CREATE OR REPLACE FUNCTION public.list_job_applications_for_review(p_offset integer DEFAULT 0)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT coalesce(jsonb_agg(row_data ORDER BY applied_at DESC),'[]'::jsonb) FROM (
    SELECT to_jsonb(a) || jsonb_build_object('job_title',j.title) AS row_data, a.applied_at
    FROM public.job_applications a JOIN public.jobs j ON j.id=a.job_id
    WHERE a.deleted_at IS NULL AND public.can_review_job_applications(a.job_id)
    ORDER BY a.applied_at DESC LIMIT 50 OFFSET greatest(0,least(p_offset,100000))
  ) results
$$;
REVOKE ALL ON FUNCTION public.list_job_applications_for_review(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_job_applications_for_review(integer) TO authenticated;

ALTER FUNCTION public.authorize_media_access(text,text,uuid,uuid) RENAME TO authorize_media_access_before_job_review;
REVOKE ALL ON FUNCTION public.authorize_media_access_before_job_review(text,text,uuid,uuid) FROM PUBLIC, anon, authenticated;
CREATE FUNCTION public.authorize_media_access(p_action text,p_module text,p_resource_id uuid,p_owner_user_id uuid)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
  IF p_action='download' AND p_module='job_attachment' AND p_owner_user_id IS DISTINCT FROM auth.uid() THEN
    RETURN public.can_review_job_applications(p_resource_id) AND EXISTS (
      SELECT 1 FROM public.job_applications a WHERE a.job_id=p_resource_id AND a.user_id=p_owner_user_id AND a.deleted_at IS NULL
    );
  END IF;
  RETURN public.authorize_media_access_before_job_review(p_action,p_module,p_resource_id,p_owner_user_id);
END;
$$;
REVOKE ALL ON FUNCTION public.authorize_media_access(text,text,uuid,uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.authorize_media_access(text,text,uuid,uuid) TO authenticated, service_role;

COMMIT;
