-- ============================================================
-- FAMILY LAYER — PHASE 1
-- Residents, family members, invites, privacy settings,
-- staff notes, notification prefs, access audit + RLS
--
-- ALSO: tenant_settings toggle to gate the entire feature
-- ============================================================

-- 0) TENANT SETTINGS TOGGLE ----------------------------------
alter table public.tenant_settings
  add column resident_profiles_enabled boolean not null default false;

-- 1) RESIDENTS ------------------------------------------------
-- Requests currently attach to rooms; the family layer needs a
-- person. room_id = current room; history follows the resident.
create table public.residents (
  id           uuid primary key default gen_random_uuid(),
  tenant_id    uuid not null references public.tenants(id) on delete cascade,
  room_id      uuid references public.rooms(id) on delete set null,
  display_name text not null,
  active       boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index residents_tenant_idx on public.residents(tenant_id);
create index residents_room_idx   on public.residents(room_id);

-- 2) LINK REQUESTS TO RESIDENTS ------------------------------
-- App stamps this at request creation (active resident of room).
alter table public.requests
  add column resident_id uuid references public.residents(id) on delete set null;
create index requests_resident_idx on public.requests(resident_id);

-- 3) FAMILY MEMBERS ------------------------------------------
-- auth_user_id is filled when the invite magic link is accepted
-- (Supabase email OTP / magic-link auth). Family members never
-- get a user_profiles row, so staff role checks are unaffected.
create table public.family_members (
  id                  uuid primary key default gen_random_uuid(),
  resident_id         uuid not null references public.residents(id) on delete cascade,
  auth_user_id        uuid unique references auth.users(id) on delete set null,
  full_name           text not null,
  relationship        text,
  email               text,
  phone               text,
  access_level        text not null default 'digest'
                      check (access_level in ('full','digest')),
  status              text not null default 'invited'
                      check (status in ('invited','active','revoked')),
  consent_recorded_at timestamptz,
  consent_recorded_by uuid references public.user_profiles(id),
  invited_by          uuid references public.user_profiles(id),
  created_at          timestamptz not null default now()
);
create index family_members_resident_idx on public.family_members(resident_id);
create index family_members_auth_idx     on public.family_members(auth_user_id);

-- 4) FAMILY INVITES ------------------------------------------
-- Store a hash of the token, never the raw token.
create table public.family_invites (
  id               uuid primary key default gen_random_uuid(),
  family_member_id uuid not null references public.family_members(id) on delete cascade,
  token_hash       text not null unique,
  expires_at       timestamptz not null,
  accepted_at      timestamptz,
  created_by       uuid references public.user_profiles(id),
  created_at       timestamptz not null default now()
);

-- 5) PRIVACY SETTINGS ----------------------------------------
-- Visible by default; a row with visible_to_family = false hides
-- one category for one resident (e.g. bathroom_help).
create table public.resident_privacy_settings (
  resident_id       uuid not null references public.residents(id) on delete cascade,
  request_type_id   text not null,
  visible_to_family boolean not null default true,
  primary key (resident_id, request_type_id)
);

-- 6) STAFF NOTES ---------------------------------------------
create table public.staff_notes (
  id                uuid primary key default gen_random_uuid(),
  resident_id       uuid not null references public.residents(id) on delete cascade,
  request_id        uuid references public.requests(id) on delete set null,
  author_id         uuid not null references public.user_profiles(id),
  body              text not null check (length(btrim(body)) between 1 and 1000),
  visible_to_family boolean not null default false,
  created_at        timestamptz not null default now()
);
create index staff_notes_resident_idx on public.staff_notes(resident_id);

-- 7) NOTIFICATION PREFERENCES --------------------------------
create table public.family_notification_prefs (
  family_member_id uuid primary key references public.family_members(id) on delete cascade,
  digest_frequency text not null default 'daily'
                   check (digest_frequency in ('daily','weekly','off')),
  urgent_alerts    boolean not null default false,
  channel          text not null default 'email'
                   check (channel in ('email','sms')),
  updated_at       timestamptz not null default now()
);

-- 8) FAMILY ACCESS AUDIT LOG ---------------------------------
create table public.family_access_logs (
  id               uuid primary key default gen_random_uuid(),
  family_member_id uuid references public.family_members(id) on delete set null,
  resident_id      uuid references public.residents(id) on delete set null,
  action           text not null,           -- 'viewed_feed','viewed_digest','accepted_invite',...
  details          jsonb not null default '{}'::jsonb,
  created_at       timestamptz not null default now()
);
create index family_access_logs_resident_idx on public.family_access_logs(resident_id);

-- ============================================================
-- HELPER (mirrors current_tenant_id() pattern)
-- ============================================================
create or replace function public.current_family_resident_ids()
returns setof uuid
language sql stable security definer
set search_path = public
as $$
  select resident_id
  from public.family_members
  where auth_user_id = auth.uid()
    and status = 'active'
$$;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
alter table public.residents                 enable row level security;
alter table public.family_members            enable row level security;
alter table public.family_invites            enable row level security;
alter table public.resident_privacy_settings enable row level security;
alter table public.staff_notes               enable row level security;
alter table public.family_notification_prefs enable row level security;
alter table public.family_access_logs        enable row level security;

-- ---- residents ----
create policy residents_select_staff on public.residents
  for select using (
    tenant_id = current_tenant_id()
    and current_user_role() = any (array[
      'tenant_admin','site_manager','nurse_manager','charge_nurse','nurse','viewer'])
  );
create policy residents_manage_staff on public.residents
  for all using (
    tenant_id = current_tenant_id()
    and current_user_role() = any (array[
      'tenant_admin','site_manager','nurse_manager','charge_nurse'])
  );
create policy residents_select_super_admin on public.residents
  for select using (current_user_role() = 'super_admin');
create policy residents_select_family on public.residents
  for select using (id in (select public.current_family_resident_ids()));

-- ---- family_members ----
create policy family_members_manage_staff on public.family_members
  for all using (
    resident_id in (select r.id from public.residents r
                    where r.tenant_id = current_tenant_id())
    and current_user_role() = any (array[
      'tenant_admin','site_manager','nurse_manager','charge_nurse'])
  );
create policy family_members_select_own on public.family_members
  for select using (auth_user_id = auth.uid());

-- ---- family_invites (staff only; acceptance runs via edge fn) ----
create policy family_invites_manage_staff on public.family_invites
  for all using (
    family_member_id in (
      select fm.id from public.family_members fm
      join public.residents r on r.id = fm.resident_id
      where r.tenant_id = current_tenant_id())
    and current_user_role() = any (array[
      'tenant_admin','site_manager','nurse_manager','charge_nurse'])
  );

-- ---- resident_privacy_settings (staff only) ----
create policy privacy_manage_staff on public.resident_privacy_settings
  for all using (
    resident_id in (select r.id from public.residents r
                    where r.tenant_id = current_tenant_id())
    and current_user_role() = any (array[
      'tenant_admin','site_manager','nurse_manager','charge_nurse'])
  );

-- ---- staff_notes ----
create policy staff_notes_manage_staff on public.staff_notes
  for all using (
    resident_id in (select r.id from public.residents r
                    where r.tenant_id = current_tenant_id())
    and current_user_role() = any (array[
      'tenant_admin','site_manager','nurse_manager','charge_nurse','nurse'])
  );
create policy staff_notes_select_family on public.staff_notes
  for select using (
    visible_to_family = true
    and resident_id in (select public.current_family_resident_ids())
  );

-- ---- family_notification_prefs ----
create policy notif_prefs_own on public.family_notification_prefs
  for all using (
    family_member_id in (
      select id from public.family_members
      where auth_user_id = auth.uid() and status = 'active')
  );
create policy notif_prefs_select_staff on public.family_notification_prefs
  for select using (
    family_member_id in (
      select fm.id from public.family_members fm
      join public.residents r on r.id = fm.resident_id
      where r.tenant_id = current_tenant_id())
    and current_user_role() = any (array[
      'tenant_admin','site_manager','nurse_manager','charge_nurse'])
  );

-- ---- family_access_logs ----
create policy access_logs_insert_family on public.family_access_logs
  for insert with check (
    family_member_id in (
      select id from public.family_members
      where auth_user_id = auth.uid() and status = 'active')
  );
create policy access_logs_select_staff on public.family_access_logs
  for select using (
    resident_id in (select r.id from public.residents r
                    where r.tenant_id = current_tenant_id())
    and current_user_role() = any (array[
      'tenant_admin','site_manager','nurse_manager'])
  );

-- ---- FAMILY READ ACCESS TO REQUESTS ----
-- Resident must belong to the family member, AND the request type
-- must not be hidden by a privacy setting (visible by default).
create policy requests_select_family on public.requests
  for select using (
    resident_id in (select public.current_family_resident_ids())
    and not exists (
      select 1 from public.resident_privacy_settings p
      where p.resident_id = requests.resident_id
        and p.request_type_id = requests.type
        and p.visible_to_family = false)
  );
