-- ============================================================
-- FAMILY LAYER — PHASE 2: invite signup security
--
-- Without this, a family member completing a normal Supabase
-- signup would fall through handle_new_user()'s default branch
-- and become role='nurse' in the default tenant. This table lets
-- handle_new_user() recognize a family signup up front and assign
-- a zero-permission 'family' role scoped to the resident's tenant,
-- then link the family_members row.
-- ============================================================

create table public.pending_family_invites (
  id               uuid primary key default gen_random_uuid(),
  email            text not null,
  tenant_id        uuid not null references public.tenants(id) on delete cascade,
  family_member_id uuid not null references public.family_members(id) on delete cascade,
  created_at       timestamptz not null default now()
);
create index pending_family_invites_email_idx on public.pending_family_invites (lower(email));
alter table public.pending_family_invites add constraint pending_family_invites_email_key unique (email);

alter table public.pending_family_invites enable row level security;

create policy pending_family_invites_manage_staff on public.pending_family_invites
  for all using (
    tenant_id = current_tenant_id()
    and current_user_role() = any (array['tenant_admin','site_manager','nurse_manager','charge_nurse'])
  );

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
as $function$
DECLARE
  v_tenant_id UUID;
  v_role      TEXT;
  v_full_name TEXT;
  v_unit_id   UUID;
  v_invite    RECORD;
  v_family    RECORD;
BEGIN
  -- Family invite path takes precedence and never falls through to the
  -- staff defaults below.
  SELECT * INTO v_family
  FROM public.pending_family_invites
  WHERE lower(email) = lower(NEW.email)
  ORDER BY created_at DESC
  LIMIT 1;

  IF FOUND THEN
    INSERT INTO public.user_profiles (id, tenant_id, role, full_name)
    VALUES (NEW.id, v_family.tenant_id, 'family', NEW.raw_user_meta_data->>'full_name')
    ON CONFLICT (id) DO NOTHING;

    UPDATE public.family_members
    SET auth_user_id = NEW.id, status = 'active'
    WHERE id = v_family.family_member_id;

    DELETE FROM public.pending_family_invites WHERE id = v_family.id;

    RETURN NEW;
  END IF;

  -- Check for a pending invite matching this email
  SELECT * INTO v_invite
  FROM public.pending_invites
  WHERE lower(email) = lower(NEW.email)
  ORDER BY created_at DESC
  LIMIT 1;

  IF FOUND THEN
    -- Invite path: role is trusted as set by the inviting admin
    v_tenant_id := v_invite.tenant_id;
    v_role      := v_invite.role;
    v_unit_id   := v_invite.unit_id;
    v_full_name := NEW.raw_user_meta_data->>'full_name';
    DELETE FROM public.pending_invites WHERE id = v_invite.id;
  ELSE
    -- No invite: use metadata but block self-promotion to privileged roles
    v_tenant_id := COALESCE(
      (NEW.raw_user_meta_data->>'tenant_id')::uuid,
      '00000000-0000-0000-0000-000000000001'::uuid
    );
    v_role      := COALESCE(NEW.raw_user_meta_data->>'role', 'nurse');
    v_full_name := NEW.raw_user_meta_data->>'full_name';
    v_unit_id   := NULLIF(NEW.raw_user_meta_data->>'unit_id', '')::uuid;

    -- Block self-promotion to privileged roles via metadata
    IF v_role NOT IN ('nurse_manager', 'charge_nurse', 'nurse', 'volunteer', 'viewer') THEN
      v_role := 'nurse';
    END IF;
  END IF;

  INSERT INTO public.user_profiles (id, tenant_id, unit_id, role, full_name)
  VALUES (NEW.id, v_tenant_id, v_unit_id, v_role, v_full_name)
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$function$;
