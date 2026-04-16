-- Add user deactivation so staff access can be revoked without deleting
-- their historical request activity.

ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT true;

UPDATE public.user_profiles
SET active = true
WHERE active IS NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_tenant_active
  ON public.user_profiles(tenant_id, active);

CREATE OR REPLACE FUNCTION public.current_tenant_id()
RETURNS UUID
LANGUAGE sql
STABLE
SET search_path = public, auth
AS $$
  SELECT tenant_id
  FROM public.user_profiles
  WHERE id = auth.uid()
    AND active = true
$$;

CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SET search_path = public, auth
AS $$
  SELECT role
  FROM public.user_profiles
  WHERE id = auth.uid()
    AND active = true
$$;

CREATE OR REPLACE FUNCTION public.current_unit_id()
RETURNS UUID
LANGUAGE sql
STABLE
SET search_path = public, auth
AS $$
  SELECT unit_id
  FROM public.user_profiles
  WHERE id = auth.uid()
    AND active = true
$$;

CREATE OR REPLACE FUNCTION public.is_manager_or_above()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SET search_path = public, auth
AS $$
  SELECT role IN ('super_admin', 'tenant_admin', 'nurse_manager', 'site_manager', 'charge_nurse')
  FROM public.user_profiles
  WHERE id = auth.uid()
    AND active = true
$$;

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SET search_path = public, auth
AS $$
  SELECT role = 'super_admin'
  FROM public.user_profiles
  WHERE id = auth.uid()
    AND active = true
$$;

DROP POLICY IF EXISTS "profiles_update_admin" ON public.user_profiles;
CREATE POLICY "profiles_update_admin" ON public.user_profiles
  FOR UPDATE
  USING (
    current_user_role() = 'super_admin'
    OR (
      tenant_id = current_tenant_id()
      AND id <> auth.uid()
      AND current_user_role() = 'tenant_admin'
    )
    OR (
      tenant_id = current_tenant_id()
      AND id <> auth.uid()
      AND current_user_role() IN ('nurse_manager', 'site_manager')
      AND (
        current_unit_id() IS NULL
        OR unit_id IS NULL
        OR unit_id = current_unit_id()
      )
    )
  )
  WITH CHECK (
    current_user_role() = 'super_admin'
    OR (
      tenant_id = current_tenant_id()
      AND id <> auth.uid()
      AND current_user_role() = 'tenant_admin'
      AND role <> 'super_admin'
    )
    OR (
      tenant_id = current_tenant_id()
      AND id <> auth.uid()
      AND current_user_role() IN ('nurse_manager', 'site_manager')
      AND role NOT IN ('super_admin', 'tenant_admin')
      AND (
        current_unit_id() IS NULL
        OR unit_id IS NULL
        OR unit_id = current_unit_id()
      )
    )
  );
