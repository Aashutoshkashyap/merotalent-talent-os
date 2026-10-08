BEGIN;

-- Keep application-generated transactional email on the existing notifications
-- table while making delivery claimable, retryable and auditable. Historical
-- queued rows predate provider activation and remain disabled so deployment
-- cannot unexpectedly send stale messages.
ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS email_delivery_enabled boolean,
  ADD COLUMN IF NOT EXISTS delivery_attempt_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS next_delivery_attempt_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_delivery_attempt_at timestamptz;

UPDATE public.notifications
SET email_delivery_enabled = false
WHERE email_delivery_enabled IS NULL;

ALTER TABLE public.notifications
  ALTER COLUMN email_delivery_enabled SET DEFAULT true,
  ALTER COLUMN email_delivery_enabled SET NOT NULL;

ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_status_check;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_status_check
  CHECK (status IN ('queued', 'processing', 'sent', 'failed', 'read')) NOT VALID;

CREATE INDEX IF NOT EXISTS notifications_email_delivery_queue_idx
  ON public.notifications(next_delivery_attempt_at, created_at)
  WHERE channel = 'email'
    AND status = 'queued'
    AND email_delivery_enabled = true
    AND deleted_at IS NULL;

CREATE OR REPLACE FUNCTION public.claim_email_notifications(p_limit integer DEFAULT 25)
RETURNS TABLE (
  id uuid,
  title text,
  message text,
  email_to text,
  category text,
  entity_type text,
  entity_id uuid,
  metadata jsonb,
  delivery_attempt_count integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Recover a worker that claimed rows but stopped before recording a result.
  UPDATE public.notifications AS notification
  SET status = CASE WHEN notification.delivery_attempt_count >= 5 THEN 'failed' ELSE 'queued' END,
      next_delivery_attempt_at = CASE WHEN notification.delivery_attempt_count >= 5 THEN NULL ELSE now() END,
      metadata = notification.metadata || jsonb_build_object('delivery_status', 'worker_interrupted')
  WHERE notification.channel = 'email'
    AND notification.status = 'processing'
    AND notification.last_delivery_attempt_at < now() - interval '15 minutes';

  RETURN QUERY
  WITH candidates AS (
    SELECT notification.id
    FROM public.notifications AS notification
    WHERE notification.channel = 'email'
      AND notification.status = 'queued'
      AND notification.email_delivery_enabled = true
      AND notification.email_to IS NOT NULL
      AND notification.deleted_at IS NULL
      AND notification.delivery_attempt_count < 5
      AND COALESCE(notification.next_delivery_attempt_at, notification.created_at) <= now()
    ORDER BY notification.created_at, notification.id
    FOR UPDATE SKIP LOCKED
    LIMIT greatest(1, least(COALESCE(p_limit, 25), 100))
  )
  UPDATE public.notifications AS notification
  SET status = 'processing',
      delivery_attempt_count = notification.delivery_attempt_count + 1,
      last_delivery_attempt_at = now()
  FROM candidates
  WHERE notification.id = candidates.id
  RETURNING notification.id, notification.title, notification.message,
    notification.email_to, notification.category, notification.entity_type,
    notification.entity_id, notification.metadata,
    notification.delivery_attempt_count;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_email_notifications(integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_email_notifications(integer) TO service_role;

COMMIT;
