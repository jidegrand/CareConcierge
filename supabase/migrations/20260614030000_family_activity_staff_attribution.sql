-- ============================================================
-- FAMILY ACTIVITY FEED — STAFF ATTRIBUTION
-- Families trust updates more when they know who completed a
-- request or wrote a note (e.g. "Sarah RN"). Add security-definer
-- RPCs that join resolver/author profiles for a resident's
-- activity feed, since family members cannot read user_profiles
-- directly via RLS.
-- ============================================================

create or replace function public.staff_role_title(role text)
returns text
language sql
immutable
as $$
  select case role
    when 'nurse'         then 'RN'
    when 'charge_nurse'  then 'Charge Nurse'
    when 'nurse_manager' then 'Nurse Manager'
    when 'site_manager'  then 'Site Manager'
    when 'tenant_admin'  then 'Admin'
    when 'super_admin'   then 'Admin'
    when 'volunteer'     then 'Volunteer'
    else 'Care Team'
  end;
$$;

-- Recent requests for a resident, with the resolving staff member's name
-- and short role title (for family-facing attribution).
create or replace function public.list_family_requests(target_resident_id uuid)
returns table (
  id                     uuid,
  type                   text,
  status                 text,
  is_urgent              boolean,
  source                 text,
  created_at             timestamptz,
  acknowledged_at        timestamptz,
  resolved_at            timestamptz,
  resolved_by_name       text,
  resolved_by_role_title text
)
language sql
stable
security definer
set search_path = public, auth
as $$
  select r.id, r.type, r.status, r.is_urgent, r.source, r.created_at, r.acknowledged_at, r.resolved_at,
         up.full_name as resolved_by_name,
         public.staff_role_title(up.role) as resolved_by_role_title
  from public.requests r
  left join public.user_profiles up on up.id = r.resolved_by
  where r.resident_id = target_resident_id
    and target_resident_id in (select public.current_family_resident_ids())
  order by r.created_at desc
  limit 20;
$$;

-- Recent family-visible staff notes for a resident, with the authoring
-- staff member's name and short role title.
create or replace function public.list_family_notes(target_resident_id uuid)
returns table (
  id                uuid,
  request_id        uuid,
  body              text,
  created_at        timestamptz,
  author_name       text,
  author_role_title text
)
language sql
stable
security definer
set search_path = public, auth
as $$
  select n.id, n.request_id, n.body, n.created_at,
         up.full_name as author_name,
         public.staff_role_title(up.role) as author_role_title
  from public.staff_notes n
  left join public.user_profiles up on up.id = n.author_id
  where n.resident_id = target_resident_id
    and n.visible_to_family = true
    and target_resident_id in (select public.current_family_resident_ids())
  order by n.created_at desc
  limit 20;
$$;

grant execute on function public.staff_role_title(text) to authenticated;
grant execute on function public.list_family_requests(uuid) to authenticated;
grant execute on function public.list_family_notes(uuid) to authenticated;
