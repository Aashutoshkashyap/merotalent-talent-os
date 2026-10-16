-- Isolated Neon staging repair: the copied bigint rate-ledger key lost its
-- source GENERATED identity/default. Call only after the staging branch guard.
-- No historical Supabase migration or production table is modified.
BEGIN;
LOCK TABLE public.guest_college_verification_sends IN ACCESS EXCLUSIVE MODE;
DO $repair$
BEGIN
  IF EXISTS(SELECT 1 FROM pg_attribute WHERE attrelid='public.guest_college_verification_sends'::regclass
    AND attname='id' AND attidentity='') THEN
    CREATE SEQUENCE IF NOT EXISTS public.guest_college_verification_sends_id_seq;
    PERFORM setval('public.guest_college_verification_sends_id_seq',
      GREATEST(COALESCE((SELECT max(id) FROM public.guest_college_verification_sends),0)+1,1),false);
    ALTER SEQUENCE public.guest_college_verification_sends_id_seq
      OWNED BY public.guest_college_verification_sends.id;
    ALTER TABLE public.guest_college_verification_sends ALTER COLUMN id
      SET DEFAULT nextval('public.guest_college_verification_sends_id_seq');
  END IF;
END;
$repair$;
COMMIT;
