-- Forward-only Event expansion. Reuse registrations, quizzes, questions,
-- attempts and certificates; no new identity, payment or role system.
ALTER TABLE public.quizzes ADD COLUMN IF NOT EXISTS event_id uuid REFERENCES public.events(id);
ALTER TABLE public.quiz_questions ADD COLUMN IF NOT EXISTS event_id uuid REFERENCES public.events(id);
ALTER TABLE public.quiz_questions ALTER COLUMN quiz_id DROP NOT NULL;
ALTER TABLE public.quiz_questions ADD COLUMN IF NOT EXISTS answer_rules jsonb NOT NULL DEFAULT '{}';
ALTER TABLE public.quiz_questions ADD COLUMN IF NOT EXISTS media_file_id uuid;
ALTER TABLE public.quiz_questions ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'draft';
ALTER TABLE public.quiz_questions ADD COLUMN IF NOT EXISTS event_points numeric(12,2);
CREATE UNIQUE INDEX IF NOT EXISTS event_question_scope_key ON public.quiz_questions(event_id,id);
CREATE UNIQUE INDEX IF NOT EXISTS event_ticket_scope_key ON public.event_ticket_types(event_id,id);

CREATE TABLE IF NOT EXISTS public.event_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id),
  kind text NOT NULL CHECK(kind IN ('quiz','assignment')),
  quiz_id uuid REFERENCES public.quizzes(id),
  title text NOT NULL CHECK(length(title) BETWEEN 1 AND 240),
  instructions text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','published','paused','closed')),
  opens_at timestamptz NOT NULL, closes_at timestamptz NOT NULL,
  duration_seconds integer NOT NULL DEFAULT 1800 CHECK(duration_seconds BETWEEN 60 AND 86400),
  max_attempts integer NOT NULL DEFAULT 1 CHECK(max_attempts BETWEEN 1 AND 10),
  max_marks numeric(12,2) NOT NULL DEFAULT 100 CHECK(max_marks>0),
  results_publish_at timestamptz, review_answers boolean NOT NULL DEFAULT false,
  settings jsonb NOT NULL DEFAULT '{}', created_by uuid NOT NULL REFERENCES public.profiles(user_id),
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK(closes_at>opens_at), CHECK((kind='quiz')=(quiz_id IS NOT NULL)),
  UNIQUE(event_id,id)
);
CREATE TABLE IF NOT EXISTS public.event_activity_ticket_access (
  event_id uuid NOT NULL REFERENCES public.events(id), activity_id uuid NOT NULL,
  ticket_type_id uuid NOT NULL,
  PRIMARY KEY(activity_id,ticket_type_id),
  FOREIGN KEY(event_id,activity_id) REFERENCES public.event_activities(event_id,id),
  FOREIGN KEY(event_id,ticket_type_id) REFERENCES public.event_ticket_types(event_id,id)
);
CREATE TABLE IF NOT EXISTS public.event_activity_questions (
  event_id uuid NOT NULL REFERENCES public.events(id), activity_id uuid NOT NULL,
  question_id uuid NOT NULL,
  position integer NOT NULL DEFAULT 0 CHECK(position>=0),
  PRIMARY KEY(activity_id,question_id), UNIQUE(activity_id,position),
  FOREIGN KEY(event_id,activity_id) REFERENCES public.event_activities(event_id,id),
  FOREIGN KEY(event_id,question_id) REFERENCES public.quiz_questions(event_id,id)
);
ALTER TABLE public.event_registrations ADD COLUMN IF NOT EXISTS activity_access uuid[] NOT NULL DEFAULT '{}';
ALTER TABLE public.event_registrations ADD COLUMN IF NOT EXISTS access_expires_at timestamptz;
ALTER TABLE public.event_registrations ADD COLUMN IF NOT EXISTS access_suspended boolean NOT NULL DEFAULT false;
ALTER TABLE public.event_registrations ADD COLUMN IF NOT EXISTS enrollment_source text NOT NULL DEFAULT 'checkout';
ALTER TABLE public.event_registrations ADD COLUMN IF NOT EXISTS enrolled_by uuid REFERENCES public.profiles(user_id);
ALTER TABLE public.event_registrations ADD COLUMN IF NOT EXISTS enrollment_notes text;
ALTER TABLE public.event_registrations ADD COLUMN IF NOT EXISTS manual_request_key uuid;
ALTER TABLE public.event_registrations ADD COLUMN IF NOT EXISTS manual_request_hash text;
CREATE UNIQUE INDEX IF NOT EXISTS event_manual_enrollment_idempotency ON public.event_registrations(manual_request_key) WHERE manual_request_key IS NOT NULL;
ALTER TABLE public.quiz_attempts ADD COLUMN IF NOT EXISTS activity_id uuid REFERENCES public.event_activities(id);
ALTER TABLE public.quiz_attempts ADD COLUMN IF NOT EXISTS registration_id uuid REFERENCES public.event_registrations(id);
ALTER TABLE public.quiz_attempts ADD COLUMN IF NOT EXISTS deadline_at timestamptz;
ALTER TABLE public.quiz_attempts ADD COLUMN IF NOT EXISTS state text NOT NULL DEFAULT 'in_progress';
ALTER TABLE public.quiz_attempts ADD COLUMN IF NOT EXISTS question_snapshot jsonb;
ALTER TABLE public.quiz_attempts ADD COLUMN IF NOT EXISTS total_score numeric(12,2);
ALTER TABLE public.quiz_attempts ADD COLUMN IF NOT EXISTS total_marks numeric(12,2);
CREATE UNIQUE INDEX IF NOT EXISTS event_one_open_quiz_attempt ON public.quiz_attempts(activity_id,user_id)
  WHERE activity_id IS NOT NULL AND completed_at IS NULL;
CREATE INDEX IF NOT EXISTS event_attempt_owner ON public.quiz_attempts(activity_id,user_id,started_at);

CREATE TABLE IF NOT EXISTS public.event_activity_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), event_id uuid NOT NULL REFERENCES public.events(id),
  activity_id uuid REFERENCES public.event_activities(id), user_id uuid NOT NULL REFERENCES public.profiles(user_id),
  purpose text NOT NULL CHECK(purpose IN ('question','assignment','certificate_template','certificate')),
  object_path text NOT NULL UNIQUE, file_name text NOT NULL, content_type text NOT NULL,
  size_bytes integer NOT NULL CHECK(size_bytes BETWEEN 1 AND 20971520),
  sha256 text NOT NULL CHECK(sha256~'^[a-f0-9]{64}$'), created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.event_assignment_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), activity_id uuid NOT NULL REFERENCES public.event_activities(id),
  registration_id uuid NOT NULL REFERENCES public.event_registrations(id), user_id uuid NOT NULL REFERENCES public.profiles(user_id),
  revision integer NOT NULL CHECK(revision>0), file_ids uuid[] NOT NULL, comments text NOT NULL DEFAULT '',
  state text NOT NULL DEFAULT 'submitted' CHECK(state IN ('submitted','under_review','resubmit_requested','evaluated','published','withheld')),
  marks numeric(12,2), feedback text, graded_by uuid REFERENCES public.profiles(user_id), graded_at timestamptz,
  submitted_at timestamptz NOT NULL DEFAULT now(), published_at timestamptz,
  UNIQUE(activity_id,user_id,revision), CHECK(cardinality(file_ids) BETWEEN 1 AND 10)
);
CREATE INDEX IF NOT EXISTS event_submission_owner ON public.event_assignment_submissions(activity_id,user_id,submitted_at);
CREATE TABLE IF NOT EXISTS public.event_assignment_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), submission_id uuid NOT NULL REFERENCES public.event_assignment_submissions(id),
  actor_user_id uuid NOT NULL REFERENCES public.profiles(user_id), state text NOT NULL, marks numeric(12,2),
  feedback text, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.event_certificate_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), event_id uuid NOT NULL REFERENCES public.events(id),
  title text NOT NULL, kind text NOT NULL CHECK(kind IN ('participation','completion','achievement')),
  background_file_id uuid REFERENCES public.event_activity_files(id), layout jsonb NOT NULL DEFAULT '{}',
  eligibility jsonb NOT NULL DEFAULT '{}', auto_issue boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true, created_by uuid NOT NULL REFERENCES public.profiles(user_id),
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.certificates ALTER COLUMN course_id DROP NOT NULL;
ALTER TABLE public.certificates ADD COLUMN IF NOT EXISTS event_id uuid REFERENCES public.events(id);
ALTER TABLE public.certificates ADD COLUMN IF NOT EXISTS template_id uuid REFERENCES public.event_certificate_templates(id);
ALTER TABLE public.certificates ADD COLUMN IF NOT EXISTS registration_id uuid REFERENCES public.event_registrations(id);
ALTER TABLE public.certificates ADD COLUMN IF NOT EXISTS revoked_at timestamptz;
CREATE UNIQUE INDEX IF NOT EXISTS event_certificate_once ON public.certificates(template_id,registration_id) WHERE template_id IS NOT NULL;

-- New Event rows are server-only, including answer keys and attempt snapshots.
-- Preserve historical course policies and data. Owner connections still require
-- the application's verified identity + entity/entitlement transaction guards.
DO $$ DECLARE name text; BEGIN
  FOREACH name IN ARRAY ARRAY['event_activities','event_activity_ticket_access','event_activity_questions','event_activity_files','event_assignment_submissions','event_assignment_reviews','event_certificate_templates'] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',name);
    EXECUTE format('REVOKE ALL ON public.%I FROM PUBLIC',name);
  END LOOP;
  IF NOT EXISTS(SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='quiz_questions' AND policyname='event_questions_server_only') THEN
    CREATE POLICY event_questions_server_only ON public.quiz_questions AS RESTRICTIVE FOR ALL TO PUBLIC USING(event_id IS NULL) WITH CHECK(event_id IS NULL);
  END IF;
  IF NOT EXISTS(SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='quiz_attempts' AND policyname='event_attempts_server_only') THEN
    CREATE POLICY event_attempts_server_only ON public.quiz_attempts AS RESTRICTIVE FOR ALL TO PUBLIC USING(activity_id IS NULL) WITH CHECK(activity_id IS NULL);
  END IF;
END $$;
