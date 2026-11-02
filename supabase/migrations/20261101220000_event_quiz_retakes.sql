-- Event retakes use the existing server-enforced max_attempts and one-open-attempt index.
-- Preserve the original uniqueness rule for historical course quizzes; no rows are changed.
CREATE UNIQUE INDEX IF NOT EXISTS legacy_course_quiz_attempt_owner_key
  ON public.quiz_attempts(quiz_id,user_id) WHERE activity_id IS NULL;
ALTER TABLE public.quiz_attempts DROP CONSTRAINT IF EXISTS quiz_attempts_quiz_id_user_id_key;
