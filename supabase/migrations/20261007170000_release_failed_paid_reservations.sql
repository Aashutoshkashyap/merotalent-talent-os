CREATE OR REPLACE FUNCTION public.release_failed_paid_reservations()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.status IS NOT DISTINCT FROM OLD.status THEN
    RETURN NEW;
  END IF;

  IF NEW.payment_type = 'mentor_booking' AND NEW.status = 'failed' THEN
    UPDATE public.mentor_bookings
    SET payment_status = 'failed', status = 'cancelled', updated_at = now()
    WHERE id = NEW.reference_id AND payment_status <> 'success';
  ELSIF NEW.payment_type = 'event_ticket' AND NEW.status = 'failed' THEN
    UPDATE public.event_registrations
    SET payment_status = 'failed', status = 'cancelled', updated_at = now()
    WHERE id = NEW.reference_id AND payment_status <> 'success';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.release_failed_paid_reservations() FROM PUBLIC;

DROP TRIGGER IF EXISTS release_failed_paid_reservations_trigger ON public.payments;
CREATE TRIGGER release_failed_paid_reservations_trigger
AFTER UPDATE OF status ON public.payments
FOR EACH ROW EXECUTE FUNCTION public.release_failed_paid_reservations();

COMMENT ON FUNCTION public.release_failed_paid_reservations() IS
  'Releases mentor slots and paid event capacity after a verified failed payment.';

CREATE OR REPLACE FUNCTION public.release_expired_checkout_reservation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.status <> 'expired' OR OLD.status = 'expired' THEN
    RETURN NEW;
  END IF;

  IF NEW.entity_type = 'mentor_booking' THEN
    UPDATE public.mentor_bookings
    SET payment_status = 'failed', status = 'cancelled', updated_at = now()
    WHERE id = NEW.entity_id AND payment_status = 'pending';
  ELSIF NEW.entity_type = 'event_registration' THEN
    UPDATE public.event_registrations
    SET payment_status = 'failed', status = 'cancelled', updated_at = now()
    WHERE id = NEW.entity_id AND payment_status = 'pending';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.release_expired_checkout_reservation() FROM PUBLIC;

DROP TRIGGER IF EXISTS release_expired_checkout_reservation_trigger ON public.payment_checkout_sessions;
CREATE TRIGGER release_expired_checkout_reservation_trigger
AFTER UPDATE OF status ON public.payment_checkout_sessions
FOR EACH ROW EXECUTE FUNCTION public.release_expired_checkout_reservation();
