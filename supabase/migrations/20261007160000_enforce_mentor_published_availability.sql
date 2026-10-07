CREATE OR REPLACE FUNCTION public.enforce_mentor_published_availability()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  schedule jsonb;
  schedule_days jsonb;
  schedule_timezone text;
  local_start timestamp;
  local_day text;
  local_time time;
  starts_at time;
  ends_at time;
BEGIN
  SELECT COALESCE(m.availability, '{}'::jsonb)
  INTO schedule
  FROM public.mentors m
  WHERE m.id = NEW.mentor_id
    AND m.deleted_at IS NULL;

  schedule_days := COALESCE(schedule -> 'days', '[]'::jsonb);
  IF jsonb_typeof(schedule_days) <> 'array' OR jsonb_array_length(schedule_days) = 0 THEN
    RETURN NEW;
  END IF;

  schedule_timezone := COALESCE(NULLIF(schedule ->> 'timezone', ''), 'Asia/Kathmandu');
  local_start := NEW.scheduled_start AT TIME ZONE schedule_timezone;
  local_day := trim(to_char(local_start, 'FMDay'));
  local_time := local_start::time;
  starts_at := COALESCE(NULLIF(schedule ->> 'startTime', '')::time, '00:00'::time);
  ends_at := COALESCE(NULLIF(schedule ->> 'endTime', '')::time, '23:59:59'::time);

  IF NOT (schedule_days ? local_day) OR local_time < starts_at OR local_time >= ends_at THEN
    RAISE EXCEPTION 'The mentor is not available at the selected time'
      USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.enforce_mentor_published_availability() FROM PUBLIC;

DROP TRIGGER IF EXISTS enforce_mentor_published_availability_trigger ON public.mentor_bookings;
CREATE TRIGGER enforce_mentor_published_availability_trigger
BEFORE INSERT OR UPDATE OF mentor_id, scheduled_start ON public.mentor_bookings
FOR EACH ROW EXECUTE FUNCTION public.enforce_mentor_published_availability();

COMMENT ON FUNCTION public.enforce_mentor_published_availability() IS
  'Enforces the mentor-owned published day and time window for all booking write paths.';
