-- Bootstrap invited staff into public.user_profiles whether the invite
-- exists before auth signup or is created after the auth user already exists.

CREATE OR REPLACE FUNCTION private.bootstrap_profile_from_invite(
  target_user_id UUID,
  target_email TEXT,
  target_full_name TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  matched_invite public.pending_invites%ROWTYPE;
BEGIN
  IF target_user_id IS NULL OR target_email IS NULL THEN
    RETURN false;
  END IF;

  SELECT *
  INTO matched_invite
  FROM public.pending_invites
  WHERE lower(email) = lower(target_email)
  ORDER BY created_at DESC
  LIMIT 1;

  IF matched_invite.id IS NULL THEN
    RETURN false;
  END IF;

  INSERT INTO public.user_profiles (id, tenant_id, unit_id, role, full_name)
  VALUES (
    target_user_id,
    matched_invite.tenant_id,
    matched_invite.unit_id,
    matched_invite.role,
    NULLIF(target_full_name, '')
  )
  ON CONFLICT (id) DO UPDATE
  SET tenant_id = EXCLUDED.tenant_id,
      unit_id = EXCLUDED.unit_id,
      role = EXCLUDED.role,
      full_name = COALESCE(EXCLUDED.full_name, user_profiles.full_name);

  DELETE FROM public.pending_invites WHERE id = matched_invite.id;

  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION private.handle_invited_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  PERFORM private.bootstrap_profile_from_invite(
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name')
  );

  RETURN new;
END;
$$;

CREATE OR REPLACE FUNCTION private.handle_pending_invite()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  matched_user auth.users%ROWTYPE;
BEGIN
  SELECT *
  INTO matched_user
  FROM auth.users
  WHERE lower(email) = lower(new.email)
  ORDER BY created_at DESC
  LIMIT 1;

  IF matched_user.id IS NULL THEN
    RETURN new;
  END IF;

  PERFORM private.bootstrap_profile_from_invite(
    matched_user.id,
    matched_user.email,
    COALESCE(matched_user.raw_user_meta_data ->> 'full_name', matched_user.raw_user_meta_data ->> 'name')
  );

  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_profile ON auth.users;
CREATE TRIGGER on_auth_user_created_profile
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION private.handle_invited_user();

DROP TRIGGER IF EXISTS on_pending_invite_created_profile ON public.pending_invites;
CREATE TRIGGER on_pending_invite_created_profile
  AFTER INSERT OR UPDATE OF email, tenant_id, unit_id, role ON public.pending_invites
  FOR EACH ROW EXECUTE FUNCTION private.handle_pending_invite();

DO $$
DECLARE
  matched record;
BEGIN
  FOR matched IN
    SELECT DISTINCT ON (au.id)
      au.id AS user_id,
      au.email,
      COALESCE(au.raw_user_meta_data ->> 'full_name', au.raw_user_meta_data ->> 'name') AS full_name
    FROM auth.users au
    JOIN public.pending_invites pi
      ON lower(pi.email) = lower(au.email)
    ORDER BY au.id, pi.created_at DESC
  LOOP
    PERFORM private.bootstrap_profile_from_invite(
      matched.user_id,
      matched.email,
      matched.full_name
    );
  END LOOP;
END;
$$;
