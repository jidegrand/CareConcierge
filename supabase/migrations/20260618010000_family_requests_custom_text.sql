-- ============================================================
-- SURFACE CUSTOM REQUEST TEXT IN THE FAMILY ACTIVITY FEED
-- list_family_requests() has a fixed column list that predates
-- custom (open-ended) requests, so the family feed only ever saw
-- the literal type id ("custom") instead of what the resident
-- actually asked for. Add custom_text so the full message can be
-- shown in place of a generic label.
-- ============================================================

drop function if exists public.list_family_requests(uuid);

create function public.list_family_requests(target_resident_id uuid)
returns table (
  id                     uuid,
  type                   text,
  custom_text            text,
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
  select r.id, r.type, r.custom_text, r.status, r.is_urgent, r.source, r.created_at, r.acknowledged_at, r.resolved_at,
         up.full_name as resolved_by_name,
         public.staff_role_title(up.role) as resolved_by_role_title
  from public.requests r
  left join public.user_profiles up on up.id = r.resolved_by
  where r.resident_id = target_resident_id
    and target_resident_id in (select public.current_family_resident_ids())
  order by r.created_at desc
  limit 20;
$$;

grant execute on function public.list_family_requests(uuid) to authenticated;
