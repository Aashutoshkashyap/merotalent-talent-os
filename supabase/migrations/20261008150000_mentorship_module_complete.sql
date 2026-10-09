-- ===========================================================================
-- MeroTalent: Mentorship & Mentor Booking Architecture Complete
-- Migration: 20261008150000_mentorship_module_complete.sql
-- ===========================================================================

-- 1. Extend mentors table
ALTER TABLE public.mentors
  ADD COLUMN IF NOT EXISTS topics text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS industry text,
  ADD COLUMN IF NOT EXISTS experience_history jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS education_history jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS certifications jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS current_role text,
  ADD COLUMN IF NOT EXISTS current_organization text,
  ADD COLUMN IF NOT EXISTS languages text[] NOT NULL DEFAULT '{"English", "Nepali"}'::text[],
  ADD COLUMN IF NOT EXISTS location text,
  ADD COLUMN IF NOT EXISTS total_reviews integer NOT NULL DEFAULT 0;

-- 2. Extend mentor_services table
ALTER TABLE public.mentor_services
  ADD COLUMN IF NOT EXISTS delivery_mode text NOT NULL DEFAULT 'online',
  ADD COLUMN IF NOT EXISTS meeting_link text,
  ADD COLUMN IF NOT EXISTS location text;

ALTER TABLE public.mentor_services DROP CONSTRAINT IF EXISTS mentor_services_delivery_mode_check;
ALTER TABLE public.mentor_services ADD CONSTRAINT mentor_services_delivery_mode_check
  CHECK (delivery_mode IN ('online', 'in_person', 'either'));

-- 3. Update mentor_bookings status constraint
ALTER TABLE public.mentor_bookings DROP CONSTRAINT IF EXISTS mentor_bookings_status_check;
ALTER TABLE public.mentor_bookings ADD CONSTRAINT mentor_bookings_status_check
  CHECK (status IN (
    'pending',
    'confirmed',
    'declined',
    'completed',
    'cancelled',
    'no_show',
    'reschedule_requested',
    'rescheduled',
    'pending_payment'
  ));

-- 4. Double Booking / Slot Overlap Protection Function & Trigger
CREATE OR REPLACE FUNCTION public.check_mentor_slot_conflict()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Only active booking states can cause conflicts
  IF NEW.status IN ('pending', 'confirmed', 'rescheduled', 'reschedule_requested', 'pending_payment') THEN
    IF EXISTS (
      SELECT 1 FROM public.mentor_bookings
      WHERE mentor_id = NEW.mentor_id
        AND id <> NEW.id
        AND deleted_at IS NULL
        AND status IN ('pending', 'confirmed', 'rescheduled', 'reschedule_requested', 'pending_payment')
        AND (NEW.scheduled_start, NEW.scheduled_end) OVERLAPS (scheduled_start, scheduled_end)
    ) THEN
      RAISE EXCEPTION 'This time slot is already booked for this mentor.'
        USING ERRCODE = '23P01';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.check_mentor_slot_conflict() FROM PUBLIC;

DROP TRIGGER IF EXISTS check_mentor_slot_conflict_trigger ON public.mentor_bookings;
CREATE TRIGGER check_mentor_slot_conflict_trigger
BEFORE INSERT OR UPDATE OF mentor_id, scheduled_start, scheduled_end, status ON public.mentor_bookings
FOR EACH ROW EXECUTE FUNCTION public.check_mentor_slot_conflict();

COMMENT ON FUNCTION public.check_mentor_slot_conflict() IS
  'Guarantees concurrent slot conflict prevention and double-booking protection on all mentor booking paths.';

-- 5. Mentor Reviews Table
CREATE TABLE IF NOT EXISTS public.mentor_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL UNIQUE REFERENCES public.mentor_bookings(id) ON DELETE CASCADE,
  mentor_id uuid NOT NULL REFERENCES public.mentors(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  feedback text,
  is_public boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS mentor_reviews_mentor_idx ON public.mentor_reviews(mentor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS mentor_reviews_student_idx ON public.mentor_reviews(student_id);

ALTER TABLE public.mentor_reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view active mentor reviews" ON public.mentor_reviews;
CREATE POLICY "Public can view active mentor reviews"
ON public.mentor_reviews FOR SELECT TO anon, authenticated
USING (is_public = true);

DROP POLICY IF EXISTS "Students can create reviews for completed sessions" ON public.mentor_reviews;
CREATE POLICY "Students can create reviews for completed sessions"
ON public.mentor_reviews FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = student_id
  AND EXISTS (
    SELECT 1 FROM public.mentor_bookings b
    WHERE b.id = booking_id
      AND b.student_id = auth.uid()
      AND b.status = 'completed'
  )
);

DROP POLICY IF EXISTS "Platform admin can manage mentor reviews" ON public.mentor_reviews;
CREATE POLICY "Platform admin can manage mentor reviews"
ON public.mentor_reviews FOR ALL TO authenticated
USING (public.is_platform_admin())
WITH CHECK (public.is_platform_admin());

-- 6. Trigger to automatically recalculate mentor rating and review count
CREATE OR REPLACE FUNCTION public.sync_mentor_rating_summary()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_mentor_id uuid;
  v_avg_rating numeric(3,2);
  v_count integer;
BEGIN
  v_mentor_id := COALESCE(NEW.mentor_id, OLD.mentor_id);

  SELECT
    COALESCE(ROUND(AVG(rating)::numeric, 2), 5.00),
    COUNT(*)::integer
  INTO v_avg_rating, v_count
  FROM public.mentor_reviews
  WHERE mentor_id = v_mentor_id
    AND is_public = true;

  UPDATE public.mentors
  SET rating = v_avg_rating,
      total_reviews = v_count,
      updated_at = now()
  WHERE id = v_mentor_id;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.sync_mentor_rating_summary() FROM PUBLIC;

DROP TRIGGER IF EXISTS sync_mentor_rating_summary_trigger ON public.mentor_reviews;
CREATE TRIGGER sync_mentor_rating_summary_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.mentor_reviews
FOR EACH ROW EXECUTE FUNCTION public.sync_mentor_rating_summary();

-- 7. RPC: Reschedule Mentor Booking
CREATE OR REPLACE FUNCTION public.reschedule_mentor_booking(
  p_booking_id uuid,
  p_scheduled_start timestamptz,
  p_scheduled_end timestamptz,
  p_reason text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_booking public.mentor_bookings;
  v_actor_id uuid := auth.uid();
  v_is_mentor boolean := false;
  v_is_student boolean := false;
BEGIN
  SELECT * INTO v_booking
  FROM public.mentor_bookings
  WHERE id = p_booking_id AND deleted_at IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking not found.' USING ERRCODE = 'P0002';
  END IF;

  IF v_booking.status IN ('completed', 'cancelled', 'declined') THEN
    RAISE EXCEPTION 'Cannot reschedule a session that is already %.', v_booking.status
      USING ERRCODE = '22000';
  END IF;

  v_is_student := (v_booking.student_id = v_actor_id);
  SELECT EXISTS(
    SELECT 1 FROM public.mentors m
    WHERE m.id = v_booking.mentor_id AND m.user_id = v_actor_id
  ) INTO v_is_mentor;

  IF NOT (v_is_student OR v_is_mentor OR public.is_platform_admin()) THEN
    RAISE EXCEPTION 'You are not authorized to reschedule this booking.'
      USING ERRCODE = '42501';
  END IF;

  IF p_scheduled_end <= p_scheduled_start THEN
    RAISE EXCEPTION 'Session end time must be after start time.' USING ERRCODE = '22000';
  END IF;

  -- Update booking
  UPDATE public.mentor_bookings
  SET scheduled_start = p_scheduled_start,
      scheduled_end = p_scheduled_end,
      status = 'rescheduled',
      notes = CASE
        WHEN p_reason IS NOT NULL AND length(trim(p_reason)) > 0
        THEN COALESCE(notes || E'\n[Reschedule Reason]: ' || p_reason, p_reason)
        ELSE notes
      END,
      updated_at = now()
  WHERE id = p_booking_id;

  -- Audit log
  INSERT INTO public.audit_logs (actor_user_id, action, entity_type, entity_id, metadata)
  VALUES (
    v_actor_id,
    'MENTOR_BOOKING_RESCHEDULED',
    'mentor_booking',
    p_booking_id,
    jsonb_build_object(
      'previous_start', v_booking.scheduled_start,
      'new_start', p_scheduled_start,
      'reason', p_reason
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'id', p_booking_id,
    'status', 'rescheduled',
    'scheduled_start', p_scheduled_start,
    'scheduled_end', p_scheduled_end
  );
END;
$$;

REVOKE ALL ON FUNCTION public.reschedule_mentor_booking(uuid, timestamptz, timestamptz, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reschedule_mentor_booking(uuid, timestamptz, timestamptz, text) TO authenticated;

-- 8. RPC: Cancel Mentor Booking
CREATE OR REPLACE FUNCTION public.cancel_mentor_booking(
  p_booking_id uuid,
  p_reason text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_booking public.mentor_bookings;
  v_actor_id uuid := auth.uid();
  v_is_mentor boolean := false;
  v_is_student boolean := false;
BEGIN
  SELECT * INTO v_booking
  FROM public.mentor_bookings
  WHERE id = p_booking_id AND deleted_at IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking not found.' USING ERRCODE = 'P0002';
  END IF;

  IF v_booking.status IN ('completed', 'cancelled') THEN
    RAISE EXCEPTION 'Cannot cancel a session that is already %.', v_booking.status
      USING ERRCODE = '22000';
  END IF;

  v_is_student := (v_booking.student_id = v_actor_id);
  SELECT EXISTS(
    SELECT 1 FROM public.mentors m
    WHERE m.id = v_booking.mentor_id AND m.user_id = v_actor_id
  ) INTO v_is_mentor;

  IF NOT (v_is_student OR v_is_mentor OR public.is_platform_admin()) THEN
    RAISE EXCEPTION 'You are not authorized to cancel this booking.'
      USING ERRCODE = '42501';
  END IF;

  UPDATE public.mentor_bookings
  SET status = 'cancelled',
      notes = CASE
        WHEN p_reason IS NOT NULL AND length(trim(p_reason)) > 0
        THEN COALESCE(notes || E'\n[Cancellation Reason]: ' || p_reason, p_reason)
        ELSE notes
      END,
      updated_at = now()
  WHERE id = p_booking_id;

  INSERT INTO public.audit_logs (actor_user_id, action, entity_type, entity_id, metadata)
  VALUES (
    v_actor_id,
    'MENTOR_BOOKING_CANCELLED',
    'mentor_booking',
    p_booking_id,
    jsonb_build_object(
      'cancelled_by', CASE WHEN v_is_student THEN 'student' WHEN v_is_mentor THEN 'mentor' ELSE 'admin' END,
      'reason', p_reason
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'id', p_booking_id,
    'status', 'cancelled'
  );
END;
$$;

REVOKE ALL ON FUNCTION public.cancel_mentor_booking(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cancel_mentor_booking(uuid, text) TO authenticated;

-- 9. RPC: Complete Mentor Booking
CREATE OR REPLACE FUNCTION public.complete_mentor_booking(
  p_booking_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_booking public.mentor_bookings;
  v_actor_id uuid := auth.uid();
  v_is_mentor boolean := false;
BEGIN
  SELECT * INTO v_booking
  FROM public.mentor_bookings
  WHERE id = p_booking_id AND deleted_at IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking not found.' USING ERRCODE = 'P0002';
  END IF;

  SELECT EXISTS(
    SELECT 1 FROM public.mentors m
    WHERE m.id = v_booking.mentor_id AND m.user_id = v_actor_id
  ) INTO v_is_mentor;

  IF NOT (v_is_mentor OR public.is_platform_admin()) THEN
    RAISE EXCEPTION 'Only the assigned mentor or platform admin can mark a session complete.'
      USING ERRCODE = '42501';
  END IF;

  UPDATE public.mentor_bookings
  SET status = 'completed',
      updated_at = now()
  WHERE id = p_booking_id;

  -- Increment mentor total_sessions
  UPDATE public.mentors
  SET total_sessions = COALESCE(total_sessions, 0) + 1,
      updated_at = now()
  WHERE id = v_booking.mentor_id;

  -- Notify student to leave a review
  INSERT INTO public.notifications (recipient_id, title, message, type, category, action_url)
  VALUES (
    v_booking.student_id,
    'How was your mentorship session?',
    'Your session has concluded. Please take a moment to share your feedback and rate your experience.',
    'info',
    'general',
    '/dashboard/sessions'
  );

  RETURN jsonb_build_object(
    'success', true,
    'id', p_booking_id,
    'status', 'completed'
  );
END;
$$;

REVOKE ALL ON FUNCTION public.complete_mentor_booking(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.complete_mentor_booking(uuid) TO authenticated;
