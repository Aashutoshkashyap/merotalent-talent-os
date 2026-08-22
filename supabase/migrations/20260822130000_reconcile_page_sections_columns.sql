-- Reconcile page_sections with its own declaration.
--
-- parent_id and extra_data are declared inside the CREATE TABLE IF NOT EXISTS
-- block in 20260812000000_page_sections_cms.sql, but they were added by editing
-- that file in commit d6d24c4 after the migration had already been applied.
--
-- Two things then guarantee the columns never arrive:
--   1. the migration is recorded as applied, so it never runs again; and
--   2. even if it did, CREATE TABLE IF NOT EXISTS is a no-op on an existing
--      table — it reconciles nothing.
--
-- The result is the classic "works locally, broken in production" split: a local
-- `supabase db reset` replays from empty and creates the table with both
-- columns, while production keeps the original shape forever. Applying every
-- pending migration does NOT fix this; only an explicit ALTER does.
--
-- Verified against production on 2026-08-22: the table exists and both columns
-- are absent, which is why AdminPageEditor carries a runtime fallback that drops
-- the parent when the column is missing.

BEGIN;

ALTER TABLE public.page_sections
  ADD COLUMN IF NOT EXISTS parent_id uuid
    REFERENCES public.page_sections(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS extra_data jsonb DEFAULT '{}'::jsonb;

-- Nested sections are always fetched by parent.
CREATE INDEX IF NOT EXISTS page_sections_parent_idx
  ON public.page_sections (parent_id)
  WHERE parent_id IS NOT NULL;

COMMIT;
