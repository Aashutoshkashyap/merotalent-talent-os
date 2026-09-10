-- Public pages need to know that a component is intentionally hidden without
-- exposing the hidden component's editable CMS content.  The regular SELECT
-- policy deliberately returns only visible rows, so this narrow RPC exposes
-- only the keys, order, and visibility of top-level sections.

BEGIN;

CREATE OR REPLACE FUNCTION public.get_public_page_section_visibility(requested_page text)
RETURNS TABLE (
  section_key text,
  display_order integer,
  is_visible boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT
    section.section_key,
    section.display_order,
    section.is_visible
  FROM public.page_sections AS section
  WHERE section.page = requested_page
    AND section.parent_id IS NULL;
$$;

REVOKE ALL ON FUNCTION public.get_public_page_section_visibility(text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_page_section_visibility(text)
  TO anon, authenticated, service_role;

COMMIT;
