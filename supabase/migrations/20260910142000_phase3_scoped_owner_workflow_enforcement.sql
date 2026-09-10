-- Phase 3: bring the legacy Jobs, Mentor, and Events owner workflows under
-- the Phase 1 capability/entity-assignment model.  This is deliberately a
-- forward policy migration; it does not alter historical migrations or make
-- private workflow tables public.

BEGIN;

-- Assignment rows can outlive an account suspension.  Keep the Phase 1
-- helpers as the shared gate and require an active account before any module
-- capability or entity scope is considered usable.
CREATE OR REPLACE FUNCTION public.has_active_module_capability(
  p_user_id uuid,
  p_module_key text
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
  SELECT public.is_account_active(p_user_id) AND (
    public.is_platform_admin(p_user_id)
    OR EXISTS (
      SELECT 1
      FROM public.user_module_capabilities umc
      JOIN public.module_capabilities mc ON mc.id = umc.capability_id
      WHERE umc.user_id = p_user_id
        AND mc.module_key = public.normalize_module_capability_key(p_module_key)
        AND mc.is_active
        AND umc.status = 'active'
        AND (umc.expires_at IS NULL OR umc.expires_at > now())
    )
  )
$$;

CREATE OR REPLACE FUNCTION public.has_active_entity_assignment(
  p_user_id uuid,
  p_module_key text,
  p_entity_type text,
  p_entity_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
  SELECT public.is_account_active(p_user_id) AND (
    public.is_platform_admin(p_user_id)
    OR EXISTS (
      SELECT 1
      FROM public.entity_admin_assignments ea
      JOIN public.user_module_capabilities umc ON umc.id = ea.user_capability_id
      JOIN public.module_capabilities mc ON mc.id = umc.capability_id
      WHERE ea.user_id = p_user_id
        AND ea.entity_type = p_entity_type
        AND ea.entity_id = p_entity_id
        AND ea.status = 'active'
        AND umc.status = 'active'
        AND mc.is_active
        AND mc.module_key = public.normalize_module_capability_key(p_module_key)
        AND (umc.expires_at IS NULL OR umc.expires_at > now())
    )
  )
$$;

-- Return active capabilities with the existing self access context. This is a
-- navigation convenience only; RLS/RPC checks above remain authoritative.
CREATE OR REPLACE FUNCTION public.get_my_access_context()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  WITH actor AS (
    SELECT p.account_status, p.deleted_at
    FROM public.profiles p WHERE p.user_id = auth.uid()
  ), roles AS (
    SELECT COALESCE(jsonb_agg(ur.role::text ORDER BY ur.role::text), '[]'::jsonb) value
    FROM public.user_roles ur WHERE ur.user_id = auth.uid()
  ), capabilities AS (
    SELECT COALESCE(jsonb_agg(mc.module_key ORDER BY mc.module_key), '[]'::jsonb) value
    FROM public.user_module_capabilities umc
    JOIN public.module_capabilities mc ON mc.id = umc.capability_id
    WHERE umc.user_id = auth.uid()
      AND umc.status = 'active'
      AND mc.is_active
      AND (umc.expires_at IS NULL OR umc.expires_at > now())
  ), effective_permissions AS (
    SELECT DISTINCT p.code
    FROM public.permissions p
    WHERE public.is_platform_admin(auth.uid())
       OR EXISTS (
         SELECT 1 FROM public.user_roles ur
         JOIN public.role_permissions rp ON rp.role = ur.role
         WHERE ur.user_id = auth.uid() AND rp.permission_id = p.id
       )
       OR EXISTS (
         SELECT 1 FROM public.user_permissions up
         WHERE up.user_id = auth.uid() AND up.permission_id = p.id
           AND (up.expires_at IS NULL OR up.expires_at > now())
       )
  )
  SELECT jsonb_build_object(
    'account_status', CASE
      WHEN auth.uid() IS NULL THEN 'unauthenticated'
      WHEN (SELECT deleted_at FROM actor) IS NOT NULL THEN 'deactivated'
      ELSE COALESCE((SELECT account_status FROM actor), 'pending')
    END,
    'roles', (SELECT value FROM roles),
    'capabilities', (SELECT value FROM capabilities),
    'permissions', COALESCE((SELECT jsonb_agg(code ORDER BY code) FROM effective_permissions), '[]'::jsonb)
  )
$$;

REVOKE ALL ON FUNCTION public.get_my_access_context() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_access_context() TO authenticated, service_role;

-- Entitlement belongs to the managed entity, not to every individual who has
-- been assigned to administer it.  Callers must still satisfy a module
-- capability and entity-scope policy below before this helper can grant lead
-- access.
CREATE OR REPLACE FUNCTION public.has_active_entity_subscription(
  p_entity_type text,
  p_entity_id uuid,
  p_feature text DEFAULT NULL,
  p_required_mode text DEFAULT 'read_only'
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.subscriptions s
    JOIN public.packages p ON p.id = s.package_id
    WHERE s.entity_type = p_entity_type
      AND s.entity_id = p_entity_id
      AND s.status IN ('trialing', 'active')
      AND s.payment_status IN ('success', 'not_required')
      AND s.start_date <= now()
      AND s.expiry_date > now()
      AND s.deleted_at IS NULL
      AND p.is_active
      AND p.deleted_at IS NULL
      AND (p_feature IS NULL OR p.features @> jsonb_build_object(p_feature, true))
      AND CASE p_required_mode
        WHEN 'read_only' THEN p.lead_access_mode IN ('read_only', 'full')
        WHEN 'full' THEN p.lead_access_mode = 'full'
        ELSE false
      END
  )
$$;

REVOKE ALL ON FUNCTION public.has_active_entity_subscription(text, uuid, text, text)
FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_active_entity_subscription(text, uuid, text, text)
TO authenticated, service_role;

-- Job managers may be assigned to a company or to an individual job.  Public
-- jobs retain their existing public listing policy; these policies add only
-- the private management/read surfaces for assigned administrators.
CREATE POLICY "Scoped managers view non-public jobs"
ON public.jobs FOR SELECT TO authenticated
USING (
  public.is_platform_admin()
  OR public.has_active_entity_assignment(auth.uid(), 'jobs', 'company', company_id)
  OR public.has_active_entity_assignment(auth.uid(), 'jobs', 'job', id)
);

CREATE POLICY "Scoped managers create company jobs"
ON public.jobs FOR INSERT TO authenticated
WITH CHECK (
  public.is_account_active()
  AND owner_user_id = auth.uid()
  AND company_id IS NOT NULL
  AND public.has_active_entity_assignment(auth.uid(), 'jobs', 'company', company_id)
  AND status IN ('draft', 'pending_approval')
);

CREATE POLICY "Scoped managers update jobs"
ON public.jobs FOR UPDATE TO authenticated
USING (
  public.has_active_entity_assignment(auth.uid(), 'jobs', 'company', company_id)
  OR public.has_active_entity_assignment(auth.uid(), 'jobs', 'job', id)
)
WITH CHECK (
  public.has_active_entity_assignment(auth.uid(), 'jobs', 'company', company_id)
  OR public.has_active_entity_assignment(auth.uid(), 'jobs', 'job', id)
);

CREATE POLICY "Scoped managers view job applications"
ON public.job_applications FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.jobs j
    WHERE j.id = job_applications.job_id
      AND j.company_id IS NOT NULL
      AND public.has_permission(auth.uid(), 'lead.view')
      AND public.has_active_entity_assignment(auth.uid(), 'jobs', 'company', j.company_id)
      AND public.has_active_entity_subscription('company', j.company_id, 'job_applications', 'read_only')
  )
);

CREATE POLICY "Scoped managers update job applications"
ON public.job_applications FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.jobs j
    WHERE j.id = job_applications.job_id
      AND j.company_id IS NOT NULL
      AND public.has_permission(auth.uid(), 'lead.view')
      AND public.has_active_entity_assignment(auth.uid(), 'jobs', 'company', j.company_id)
      AND public.has_active_entity_subscription('company', j.company_id, 'job_applications', 'full')
  )
)
WITH CHECK (deleted_at IS NULL);

-- A mentor assignment is sufficient for profile/service/booking operations;
-- paid lead access remains entitlement-gated.
CREATE POLICY "Scoped mentor managers view services"
ON public.mentor_services FOR SELECT TO authenticated
USING (public.has_active_entity_assignment(auth.uid(), 'mentor', 'mentor', mentor_id));

CREATE POLICY "Scoped mentor managers create services"
ON public.mentor_services FOR INSERT TO authenticated
WITH CHECK (public.has_active_entity_assignment(auth.uid(), 'mentor', 'mentor', mentor_id));

CREATE POLICY "Scoped mentor managers update services"
ON public.mentor_services FOR UPDATE TO authenticated
USING (public.has_active_entity_assignment(auth.uid(), 'mentor', 'mentor', mentor_id))
WITH CHECK (public.has_active_entity_assignment(auth.uid(), 'mentor', 'mentor', mentor_id));

CREATE POLICY "Scoped mentor managers view bookings"
ON public.mentor_bookings FOR SELECT TO authenticated
USING (
  public.has_active_entity_assignment(auth.uid(), 'mentor', 'mentor', mentor_id)
  AND public.has_permission(auth.uid(), 'lead.view')
  AND public.has_active_entity_subscription('mentor', mentor_id, 'mentor_bookings', 'read_only')
);

CREATE POLICY "Scoped mentor managers update bookings"
ON public.mentor_bookings FOR UPDATE TO authenticated
USING (
  public.has_active_entity_assignment(auth.uid(), 'mentor', 'mentor', mentor_id)
  AND public.has_permission(auth.uid(), 'lead.view')
  AND public.has_active_entity_subscription('mentor', mentor_id, 'mentor_bookings', 'full')
)
WITH CHECK (deleted_at IS NULL);

-- Event management is scoped to an event after it exists.  Creation remains
-- capability/permission based because there is no entity to assign yet.
CREATE POLICY "Scoped organizers view events"
ON public.events FOR SELECT TO authenticated
USING (public.has_active_entity_assignment(auth.uid(), 'events', 'event', id));

CREATE POLICY "Scoped organizers update events"
ON public.events FOR UPDATE TO authenticated
USING (public.has_active_entity_assignment(auth.uid(), 'events', 'event', id))
WITH CHECK (public.has_active_entity_assignment(auth.uid(), 'events', 'event', id));

CREATE POLICY "Scoped organizers view registrations"
ON public.event_registrations FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.events e
    WHERE e.id = event_registrations.event_id
      AND public.has_permission(auth.uid(), 'lead.view')
      AND public.has_active_entity_assignment(auth.uid(), 'events', 'event', e.id)
      AND (
        public.has_active_entity_subscription('organizer', e.id, 'event_registrations', 'read_only')
        OR (
          e.organizer_id IS NOT NULL
          AND public.has_active_entity_subscription(e.organizer_type, e.organizer_id, 'event_registrations', 'read_only')
        )
      )
  )
);

CREATE POLICY "Scoped organizers update registrations"
ON public.event_registrations FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.events e
    WHERE e.id = event_registrations.event_id
      AND public.has_permission(auth.uid(), 'lead.view')
      AND public.has_active_entity_assignment(auth.uid(), 'events', 'event', e.id)
      AND (
        public.has_active_entity_subscription('organizer', e.id, 'event_registrations', 'full')
        OR (
          e.organizer_id IS NOT NULL
          AND public.has_active_entity_subscription(e.organizer_type, e.organizer_id, 'event_registrations', 'full')
        )
      )
  )
)
WITH CHECK (deleted_at IS NULL);

COMMIT;
