-- Create pending invites and automatically bootstrap invited staff into
-- public.user_profiles when their auth user is first created.

CREATE TABLE IF NOT EXISTS public.pending_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  unit_id UUID REFERENCES public.units(id) ON DELETE SET NULL,
  role TEXT NOT NULL
    CHECK (role IN ('super_admin', 'tenant_admin', 'nurse_manager', 'site_manager', 'charge_nurse', 'nurse', 'volunteer', 'viewer')),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pending_invites_tenant
  ON public.pending_invites(tenant_id, created_at DESC);

ALTER TABLE public.pending_invites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pending_invites_select_admin" ON public.pending_invites;
CREATE POLICY "pending_invites_select_admin" ON public.pending_invites
  FOR SELECT USING (
    current_user_role() = 'super_admin'
    OR (
      tenant_id = current_tenant_id()
      AND current_user_role() IN ('tenant_admin', 'site_manager', 'nurse_manager')
    )
  );

DROP POLICY IF EXISTS "pending_invites_insert_admin" ON public.pending_invites;
CREATE POLICY "pending_invites_insert_admin" ON public.pending_invites
  FOR INSERT WITH CHECK (
    current_user_role() = 'super_admin'
    OR (
      tenant_id = current_tenant_id()
      AND current_user_role() IN ('tenant_admin', 'site_manager', 'nurse_manager')
    )
  );

DROP POLICY IF EXISTS "pending_invites_delete_admin" ON public.pending_invites;
CREATE POLICY "pending_invites_delete_admin" ON public.pending_invites
  FOR DELETE USING (
    current_user_role() = 'super_admin'
    OR (
      tenant_id = current_tenant_id()
      AND current_user_role() IN ('tenant_admin', 'site_manager', 'nurse_manager')
    )
  );

CREATE OR REPLACE FUNCTION public.handle_invited_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  matched_invite public.pending_invites%ROWTYPE;
BEGIN
  SELECT *
  INTO matched_invite
  FROM public.pending_invites
  WHERE lower(email) = lower(new.email)
  ORDER BY created_at DESC
  LIMIT 1;

  IF matched_invite.id IS NULL THEN
    RETURN new;
  END IF;

  INSERT INTO public.user_profiles (id, tenant_id, unit_id, role, full_name)
  VALUES (
    new.id,
    matched_invite.tenant_id,
    matched_invite.unit_id,
    matched_invite.role,
    COALESCE(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name')
  )
  ON CONFLICT (id) DO UPDATE
  SET tenant_id = EXCLUDED.tenant_id,
      unit_id = EXCLUDED.unit_id,
      role = EXCLUDED.role;

  DELETE FROM public.pending_invites WHERE id = matched_invite.id;

  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_profile ON auth.users;
CREATE TRIGGER on_auth_user_created_profile
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_invited_user();

INSERT INTO public.user_profiles (id, tenant_id, unit_id, role, full_name)
SELECT
  au.id,
  pi.tenant_id,
  pi.unit_id,
  pi.role,
  COALESCE(au.raw_user_meta_data ->> 'full_name', au.raw_user_meta_data ->> 'name')
FROM auth.users au
JOIN public.pending_invites pi
  ON lower(pi.email) = lower(au.email)
LEFT JOIN public.user_profiles up
  ON up.id = au.id
WHERE up.id IS NULL;

DELETE FROM public.pending_invites pi
USING auth.users au
WHERE lower(pi.email) = lower(au.email)
  AND EXISTS (
    SELECT 1
    FROM public.user_profiles up
    WHERE up.id = au.id
  );
