-- Phase 4: keep public advertisement eligibility consistent with the admin
-- campaign state. The public renderer additionally evaluates the schedule, so
-- a future scheduled campaign is safe to mark eligible here.

CREATE OR REPLACE FUNCTION public.sync_advertisement_active_state()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.is_active := NEW.status IN ('scheduled', 'active')
    AND NEW.deleted_at IS NULL
    AND NEW.end_date > now();
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS advertisements_sync_active_state ON public.advertisements;
CREATE TRIGGER advertisements_sync_active_state
BEFORE INSERT OR UPDATE OF status, start_date, end_date, deleted_at
ON public.advertisements
FOR EACH ROW EXECUTE FUNCTION public.sync_advertisement_active_state();

-- Reconcile rows that predate the trigger. The maintenance job remains
-- responsible for marking elapsed campaigns expired; this only prevents a
-- newly-created active/scheduled campaign from being permanently invisible.
UPDATE public.advertisements
SET is_active = status IN ('scheduled', 'active')
  AND deleted_at IS NULL
  AND end_date > now(),
  updated_at = now()
WHERE is_active IS DISTINCT FROM (
  status IN ('scheduled', 'active') AND deleted_at IS NULL AND end_date > now()
);
