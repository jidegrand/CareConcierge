-- Fix recursive RLS lookups on user_profiles by moving direct profile reads
-- behind private security-definer helpers.

CREATE SCHEMA IF NOT EXISTS private;

CREATE OR REPLACE FUNCTION private.current_tenant_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth, private
AS $$
  SELECT tenant_id
  FROM public.user_profiles
  WHERE id = auth.uid()
    AND COALESCE(active, true) = true
$$;

CREATE OR REPLACE FUNCTION private.current_user_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth, private
AS $$
  SELECT role
  FROM public.user_profiles
  WHERE id = auth.uid()
    AND COALESCE(active, true) = true
$$;

CREATE OR REPLACE FUNCTION private.current_unit_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth, private
AS $$
  SELECT unit_id
  FROM public.user_profiles
  WHERE id = auth.uid()
    AND COALESCE(active, true) = true
$$;

CREATE OR REPLACE FUNCTION private.is_manager_or_above()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth, private
AS $$
  SELECT role IN ('super_admin', 'tenant_admin', 'nurse_manager', 'site_manager', 'charge_nurse')
  FROM public.user_profiles
  WHERE id = auth.uid()
    AND COALESCE(active, true) = true
$$;

CREATE OR REPLACE FUNCTION private.is_super_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth, private
AS $$
  SELECT role = 'super_admin'
  FROM public.user_profiles
  WHERE id = auth.uid()
    AND COALESCE(active, true) = true
$$;

GRANT USAGE ON SCHEMA private TO anon, authenticated;
GRANT EXECUTE ON FUNCTION private.current_tenant_id() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION private.current_user_role() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION private.current_unit_id() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION private.is_manager_or_above() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION private.is_super_admin() TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.current_tenant_id()
RETURNS UUID
LANGUAGE sql
STABLE
SET search_path = public, auth, private
AS $$
  SELECT private.current_tenant_id()
$$;

CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SET search_path = public, auth, private
AS $$
  SELECT private.current_user_role()
$$;

CREATE OR REPLACE FUNCTION public.current_unit_id()
RETURNS UUID
LANGUAGE sql
STABLE
SET search_path = public, auth, private
AS $$
  SELECT private.current_unit_id()
$$;

CREATE OR REPLACE FUNCTION public.is_manager_or_above()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SET search_path = public, auth, private
AS $$
  SELECT private.is_manager_or_above()
$$;

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SET search_path = public, auth, private
AS $$
  SELECT private.is_super_admin()
$$;
