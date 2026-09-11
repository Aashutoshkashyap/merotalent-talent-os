BEGIN;

-- eSewa ePay sessions expire after five minutes.  Keep the checkout ledger
-- truthful even when the customer closes the eSewa page and never returns.
CREATE OR REPLACE FUNCTION public.run_platform_maintenance()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  expired_subscription_count integer := 0;
  expired_job_count integer := 0;
  completed_event_count integer := 0;
  expired_ad_count integer := 0;
  expired_checkout_count integer := 0;
  notification_count integer := 0;
  upload_intent_cleanup_count integer := 0;
BEGIN
  UPDATE public.subscriptions
  SET status = 'expired', updated_at = now()
  WHERE status IN ('trialing', 'active', 'past_due')
    AND expiry_date <= now() AND deleted_at IS NULL;
  GET DIAGNOSTICS expired_subscription_count = ROW_COUNT;

  INSERT INTO public.notifications(
    recipient_id, title, message, type, category, channel, status,
    entity_type, entity_id, action_url, metadata
  )
  SELECT s.user_id, 'Subscription expired',
    'Your MeroTalent subscription has expired. Renew it to restore premium access.',
    'warning', 'subscription', 'dashboard', 'queued', 'subscription', s.id,
    '/dashboard/subscription', jsonb_build_object('maintenance_event', 'expired')
  FROM public.subscriptions s
  WHERE s.status = 'expired' AND s.expiry_date <= now() AND s.deleted_at IS NULL
    AND NOT EXISTS (
      SELECT 1 FROM public.notifications n
      WHERE n.recipient_id = s.user_id AND n.entity_type = 'subscription'
        AND n.entity_id = s.id AND n.category = 'subscription'
        AND n.metadata ->> 'maintenance_event' = 'expired'
    );
  GET DIAGNOSTICS notification_count = ROW_COUNT;

  UPDATE public.jobs
  SET status = 'expired', is_active = false, updated_at = now()
  WHERE status = 'published' AND approval_status = 'approved' AND is_active = true AND deleted_at IS NULL
    AND COALESCE(expires_at, application_deadline) <= now();
  GET DIAGNOSTICS expired_job_count = ROW_COUNT;

  UPDATE public.events
  SET status = 'completed', is_active = false, updated_at = now()
  WHERE status IN ('approved', 'published') AND approval_status = 'approved'
    AND is_active = true AND deleted_at IS NULL AND end_date <= now();
  GET DIAGNOSTICS completed_event_count = ROW_COUNT;

  UPDATE public.advertisements
  SET status = 'expired', is_active = false, updated_at = now()
  WHERE status IN ('scheduled', 'active') AND is_active = true
    AND deleted_at IS NULL AND end_date <= now();
  GET DIAGNOSTICS expired_ad_count = ROW_COUNT;

  UPDATE public.payment_checkout_sessions
  SET status = 'expired', completed_at = COALESCE(completed_at, now()), updated_at = now()
  WHERE provider_name = 'esewa' AND status IN ('initiated', 'pending')
    AND expires_at IS NOT NULL AND expires_at <= now();
  GET DIAGNOSTICS expired_checkout_count = ROW_COUNT;

  DELETE FROM public.media_upload_intents WHERE created_at < now() - interval '7 days';
  GET DIAGNOSTICS upload_intent_cleanup_count = ROW_COUNT;

  RETURN jsonb_build_object(
    'expired_subscriptions', expired_subscription_count,
    'expired_jobs', expired_job_count,
    'completed_events', completed_event_count,
    'expired_advertisements', expired_ad_count,
    'expired_checkouts', expired_checkout_count,
    'notifications_enqueued', notification_count,
    'upload_intents_removed', upload_intent_cleanup_count,
    'ran_at', now()
  );
END;
$$;

REVOKE ALL ON FUNCTION public.run_platform_maintenance() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.run_platform_maintenance() TO service_role;

COMMIT;
