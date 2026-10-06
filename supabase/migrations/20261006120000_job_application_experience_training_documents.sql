-- Extend the existing job-application form contract without replacing the
-- submission, lead, authorization, or payment architecture.
BEGIN;

ALTER FUNCTION public.assert_module_form_payload(text, jsonb)
  RENAME TO assert_module_form_payload_before_job_details;
REVOKE ALL ON FUNCTION public.assert_module_form_payload_before_job_details(text, jsonb)
  FROM PUBLIC, anon, authenticated;

CREATE FUNCTION public.assert_module_form_payload(p_module text, p_payload jsonb)
RETURNS void
LANGUAGE plpgsql
STABLE
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  field_name text;
  document_path text;
BEGIN
  IF p_module <> 'job' THEN
    PERFORM public.assert_module_form_payload_before_job_details(p_module, p_payload);
    RETURN;
  END IF;

  IF p_payload IS NULL OR jsonb_typeof(p_payload) <> 'object'
    OR octet_length(p_payload::text) > 32768 THEN
    RAISE EXCEPTION 'Invalid job application payload' USING ERRCODE = '22023';
  END IF;

  -- The pre-existing validator remains authoritative for contact details,
  -- resume, salary, skills shape, and every other existing form field.
  PERFORM public.assert_module_form_payload_before_job_details(
    p_module,
    p_payload - 'experienceSummary' - 'experienceLetterUrl'
      - 'trainingSummary' - 'trainingDocumentUrl'
  );

  IF jsonb_typeof(p_payload -> 'skills') IS DISTINCT FROM 'array'
    OR jsonb_array_length(p_payload -> 'skills') < 1 THEN
    RAISE EXCEPTION 'Add at least one relevant skill' USING ERRCODE = '22023';
  END IF;

  FOREACH field_name IN ARRAY ARRAY['experienceSummary', 'trainingSummary'] LOOP
    IF p_payload ? field_name AND (
      jsonb_typeof(p_payload -> field_name) <> 'string'
      OR char_length(btrim(p_payload ->> field_name)) > 2000
    ) THEN
      RAISE EXCEPTION 'Experience or training description is invalid' USING ERRCODE = '22023';
    END IF;
  END LOOP;

  FOREACH field_name IN ARRAY ARRAY['experienceLetterUrl', 'trainingDocumentUrl'] LOOP
    IF p_payload ? field_name THEN
      document_path := p_payload ->> field_name;
      IF jsonb_typeof(p_payload -> field_name) <> 'string'
        OR char_length(document_path) NOT BETWEEN 1 AND 1024
        OR auth.uid() IS NULL
        OR NOT public.is_canonical_media_path(
          document_path, auth.uid(), 'job_attachment', p_payload ->> 'jobId'
        )
      THEN
        RAISE EXCEPTION 'Document must use an owned signed-upload object path' USING ERRCODE = '22023';
      END IF;
    END IF;
  END LOOP;
END;
$$;
REVOKE ALL ON FUNCTION public.assert_module_form_payload(text, jsonb)
  FROM PUBLIC, anon, authenticated;

COMMIT;
