-- Fix the permissive RLS policy on contact_queries
DROP POLICY IF EXISTS "Anyone can submit contact queries" ON public.contact_queries;

CREATE POLICY "Anyone can submit contact queries" ON public.contact_queries
    FOR INSERT WITH CHECK (email IS NOT NULL AND name IS NOT NULL AND message IS NOT NULL);