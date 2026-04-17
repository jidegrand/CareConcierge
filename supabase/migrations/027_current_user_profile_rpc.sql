-- Expose a stable, security-definer profile lookup for the signed-in user so
-- the client can resolve tenant assignment without depending on direct table RLS.

CREATE OR REPLACE FUNCTION public.get_current_user_profile()
RETURNS JSONB
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth, private
AS $$
  SELECT to_jsonb(profile_row)
  FROM (
    SELECT id, tenant_id, unit_id, role, full_name, active
    FROM public.user_profiles
    WHERE id = auth.uid()
    LIMIT 1
  ) profile_row
$$;

GRANT EXECUTE ON FUNCTION public.get_current_user_profile() TO anon, authenticated;
