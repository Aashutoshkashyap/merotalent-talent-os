-- Drop NOT NULL constraint on package_id to support non-subscription checkouts (e.g. mentor bookings)
ALTER TABLE public.payment_checkout_sessions ALTER COLUMN package_id DROP NOT NULL;
