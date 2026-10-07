-- `current_time` is also a SQL keyword, so use an unambiguous PL/pgSQL
-- variable name in the reservation function while preserving its behavior.
BEGIN;

DO $migration$
DECLARE
  function_definition text;
BEGIN
  SELECT pg_get_functiondef(
    'public.reserve_guest_college_verification(text,uuid,text,text,text,text)'::regprocedure
  ) INTO function_definition;

  function_definition := regexp_replace(
    function_definition,
    '\mcurrent_time\M',
    'verification_now',
    'g'
  );

  IF function_definition LIKE '%current_time%' THEN
    RAISE EXCEPTION 'Guest verification reservation timestamp rewrite was incomplete';
  END IF;

  EXECUTE function_definition;
END;
$migration$;

COMMIT;
