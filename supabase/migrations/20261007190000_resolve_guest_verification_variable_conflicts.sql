-- Resolve two PL/pgSQL identifier conflicts in the already deployed guest
-- verification functions without rewriting historical migrations. The stored
-- definitions remain otherwise identical, including their SECURITY DEFINER,
-- search_path, authorization, throttling, and attempt-limit protections.
BEGIN;

DO $migration$
DECLARE
  function_definition text;
BEGIN
  SELECT pg_get_functiondef(
    'public.reserve_guest_college_verification(text,uuid,text,text,text,text)'::regprocedure
  ) INTO function_definition;

  function_definition := replace(function_definition, '  destination text;', '  requested_destination text;');
  function_definition := replace(function_definition, '  destination := CASE', '  requested_destination := CASE');
  function_definition := replace(function_definition, '|| destination, 0', '|| requested_destination, 0');
  function_definition := replace(function_definition, 's.destination = destination', 's.destination = requested_destination');
  function_definition := replace(
    function_definition,
    'VALUES (p_channel, destination, token_hash)',
    'VALUES (p_channel, requested_destination, token_hash)'
  );

  IF function_definition LIKE '% destination text;%'
    OR function_definition LIKE '%s.destination = destination%'
  THEN
    RAISE EXCEPTION 'Guest verification destination rewrite was incomplete';
  END IF;

  EXECUTE function_definition;

  SELECT pg_get_functiondef(
    'public.check_guest_college_verification(uuid,text,text,text)'::regprocedure
  ) INTO function_definition;

  function_definition := regexp_replace(
    function_definition,
    '\mcurrent_time\M',
    'verification_now',
    'g'
  );

  IF function_definition LIKE '%current_time%' THEN
    RAISE EXCEPTION 'Guest verification timestamp rewrite was incomplete';
  END IF;

  EXECUTE function_definition;
END;
$migration$;

COMMIT;
