-- Server-owned navigation and policy snapshots preserve the rules under which
-- each attempt began, even when an organizer later edits the activity.
ALTER TABLE public.quiz_attempts ADD COLUMN IF NOT EXISTS policy_snapshot jsonb NOT NULL DEFAULT '{}';
ALTER TABLE public.quiz_attempts ADD COLUMN IF NOT EXISTS navigation_index integer NOT NULL DEFAULT 0 CHECK(navigation_index>=0);
ALTER TABLE public.event_assignment_submissions ADD COLUMN IF NOT EXISTS is_late boolean NOT NULL DEFAULT false;
