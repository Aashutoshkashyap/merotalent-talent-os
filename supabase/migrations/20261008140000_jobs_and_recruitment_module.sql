-- ============================================================================
-- Generalized Jobs & Recruitment Module: Profile Reuse, Applications, Matching & Interviews
-- ============================================================================

BEGIN;

-- 1. Enhance Profiles Table for Reusable Candidate Profile & Preferences
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS job_preferences jsonb NOT NULL DEFAULT '{
    "preferred_categories": [],
    "preferred_industries": [],
    "preferred_job_titles": [],
    "preferred_locations": [],
    "preferred_job_levels": [],
    "preferred_job_types": [],
    "min_salary": null,
    "max_salary": null,
    "is_salary_negotiable": true
  }'::jsonb,
  ADD COLUMN IF NOT EXISTS skills text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS education_history jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS experience_history jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS certifications jsonb DEFAULT '[]'::jsonb;

-- 2. Enhance Jobs Table with Classification and Lifecycle
ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS category text,
  ADD COLUMN IF NOT EXISTS industry text,
  ADD COLUMN IF NOT EXISTS vacancies_count integer DEFAULT 1,
  ADD COLUMN IF NOT EXISTS education_requirements text,
  ADD COLUMN IF NOT EXISTS experience_years_min numeric(4,1),
  ADD COLUMN IF NOT EXISTS responsibilities text,
  ADD COLUMN IF NOT EXISTS benefits text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS contact_email text,
  ADD COLUMN IF NOT EXISTS contact_phone text,
  ADD COLUMN IF NOT EXISTS lifecycle_status text NOT NULL DEFAULT 'published';

-- Add check constraint for job lifecycle status
ALTER TABLE public.jobs DROP CONSTRAINT IF EXISTS jobs_lifecycle_status_check;
ALTER TABLE public.jobs ADD CONSTRAINT jobs_lifecycle_status_check
  CHECK (lifecycle_status IN ('draft', 'published', 'application_open', 'application_closed', 'filled', 'expired', 'cancelled'));

-- 3. Enhance Job Applications for Immutable Submitted Profile Snapshots & Interview Tracking
ALTER TABLE public.job_applications
  ADD COLUMN IF NOT EXISTS profile_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS education_snapshot jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS experience_snapshot jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS skills_snapshot text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS training_snapshot jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS resume_url_snapshot text,
  ADD COLUMN IF NOT EXISTS answers jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS timeline jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS interview_type text DEFAULT 'online',
  ADD COLUMN IF NOT EXISTS interview_notes text,
  ADD COLUMN IF NOT EXISTS interview_status text DEFAULT 'none';

ALTER TABLE public.job_applications DROP CONSTRAINT IF EXISTS job_applications_interview_type_check;
ALTER TABLE public.job_applications ADD CONSTRAINT job_applications_interview_type_check
  CHECK (interview_type IN ('in_person', 'online', 'phone', 'other'));

ALTER TABLE public.job_applications DROP CONSTRAINT IF EXISTS job_applications_interview_status_check;
ALTER TABLE public.job_applications ADD CONSTRAINT job_applications_interview_status_check
  CHECK (interview_status IN ('none', 'scheduled', 'completed', 'rescheduled', 'cancelled'));

-- 4. Ensure Saved Jobs Table Exists
CREATE TABLE IF NOT EXISTS public.saved_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  job_id uuid NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, job_id)
);

CREATE INDEX IF NOT EXISTS saved_jobs_user_idx ON public.saved_jobs(user_id);
CREATE INDEX IF NOT EXISTS saved_jobs_job_idx ON public.saved_jobs(job_id);

ALTER TABLE public.saved_jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage their own saved jobs" ON public.saved_jobs;
CREATE POLICY "Users manage their own saved jobs"
  ON public.saved_jobs FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- 5. Updated RPC for Reviewing Job Applications, Setting Interviews, and Recording Timeline
CREATE OR REPLACE FUNCTION public.review_job_application_v2(
  p_id uuid,
  p_status text,
  p_notes text DEFAULT '',
  p_interview_at timestamptz DEFAULT NULL,
  p_interview_location text DEFAULT '',
  p_duration integer DEFAULT 30,
  p_interview_type text DEFAULT 'online'
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  application public.job_applications;
  notification_id uuid;
  job_record public.jobs;
  notification_title text;
  notification_text text;
  timeline_entry jsonb;
  new_timeline jsonb;
BEGIN
  SELECT * INTO application FROM public.job_applications WHERE id = p_id AND deleted_at IS NULL FOR UPDATE;
  IF NOT FOUND OR NOT public.can_review_job_applications(application.job_id) THEN
    RAISE EXCEPTION 'Application access denied' USING ERRCODE = '42501';
  END IF;

  IF application.status = 'withdrawn' OR p_status IS NULL OR
     p_status NOT IN ('submitted', 'applied', 'screening', 'shortlisted', 'interview', 'selected', 'offered', 'confirmed', 'rejected', 'withdrawn') THEN
    RAISE EXCEPTION 'Invalid application status' USING ERRCODE = '22023';
  END IF;

  IF p_status = 'interview' AND (p_interview_at IS NULL OR p_interview_at <= now() OR p_duration IS NULL OR p_duration NOT BETWEEN 5 AND 480 OR nullif(btrim(p_interview_location), '') IS NULL) THEN
    RAISE EXCEPTION 'Provide a future interview time, duration and location/meeting link' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO job_record FROM public.jobs WHERE id = application.job_id;

  -- Build timeline entry
  timeline_entry := jsonb_build_object(
    'status', p_status,
    'timestamp', now(),
    'note', NULLIF(btrim(p_notes), ''),
    'actor_id', auth.uid()
  );

  new_timeline := coalesce(application.timeline, '[]'::jsonb) || jsonb_build_array(timeline_entry);

  UPDATE public.job_applications
  SET status = p_status,
      notes = p_notes,
      timeline = new_timeline,
      interview_at = CASE WHEN p_status = 'interview' THEN p_interview_at ELSE interview_at END,
      interview_location = CASE WHEN p_status = 'interview' THEN p_interview_location ELSE interview_location END,
      interview_duration_minutes = CASE WHEN p_status = 'interview' THEN p_duration ELSE interview_duration_minutes END,
      interview_type = CASE WHEN p_status = 'interview' THEN p_interview_type ELSE interview_type END,
      interview_status = CASE WHEN p_status = 'interview' THEN 'scheduled' ELSE interview_status END,
      updated_at = now()
  WHERE id = p_id;

  -- Record in audit logs
  INSERT INTO public.audit_logs(actor_user_id, action, entity_type, entity_id, metadata)
  VALUES (
    auth.uid(),
    'job_application.review',
    'job_application',
    p_id::text,
    jsonb_build_object(
      'previous_status', application.status,
      'status', p_status,
      'interview_at', p_interview_at,
      'interview_type', p_interview_type
    )
  );

  -- Send notification if status changed or interview scheduled/rescheduled
  IF p_status IN ('screening', 'shortlisted', 'interview', 'selected', 'offered', 'confirmed', 'rejected') AND (
    application.status IS DISTINCT FROM p_status OR
    (p_status = 'interview' AND (application.interview_at IS DISTINCT FROM p_interview_at OR application.interview_location IS DISTINCT FROM p_interview_location))
  ) THEN
    IF p_status = 'interview' THEN
      notification_title := 'Interview Scheduled: ' || job_record.title;
      notification_text := 'Your interview for ' || job_record.title || ' is scheduled for ' || to_char(p_interview_at AT TIME ZONE 'Asia/Kathmandu', 'YYYY-MM-DD HH24:MI') || ' (' || p_duration || ' mins). Location / Meeting: ' || p_interview_location;
    ELSIF p_status IN ('selected', 'offered', 'confirmed') THEN
      notification_title := 'Congratulations! Application Selected: ' || job_record.title;
      notification_text := 'Your application for ' || job_record.title || ' has been selected. The hiring team will contact you with the offer details.';
    ELSIF p_status = 'shortlisted' THEN
      notification_title := 'Application Shortlisted: ' || job_record.title;
      notification_text := 'Great news! Your profile was shortlisted for ' || job_record.title || '.';
    ELSIF p_status = 'screening' THEN
      notification_title := 'Application in Review: ' || job_record.title;
      notification_text := 'Your application for ' || job_record.title || ' has moved to the screening stage.';
    ELSIF p_status = 'rejected' THEN
      notification_title := 'Update on your application for ' || job_record.title;
      notification_text := 'Thank you for applying for ' || job_record.title || '. The team has decided to proceed with other candidates at this time.';
    END IF;

    -- In-app notification
    INSERT INTO public.notifications(recipient_id, title, message, type, category, channel, status, entity_type, entity_id, action_url)
    VALUES (
      application.user_id,
      notification_title,
      notification_text,
      CASE WHEN p_status IN ('selected', 'offered', 'confirmed', 'shortlisted') THEN 'success' WHEN p_status = 'rejected' THEN 'info' ELSE 'info' END,
      'job',
      'dashboard',
      'queued',
      'job_application',
      p_id,
      '/dashboard/jobs'
    );
  END IF;

  RETURN jsonb_build_object('id', p_id, 'status', p_status, 'interview_status', CASE WHEN p_status = 'interview' THEN 'scheduled' ELSE application.interview_status END);
END;
$$;

REVOKE ALL ON FUNCTION public.review_job_application_v2(uuid, text, text, timestamptz, text, integer, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.review_job_application_v2(uuid, text, text, timestamptz, text, integer, text) TO authenticated, service_role;

COMMIT;
