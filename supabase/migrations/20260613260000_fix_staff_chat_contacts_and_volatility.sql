-- Two staff-chat bugs surfaced after family-portal accounts started
-- getting user_profiles rows (role='family'):
--
-- 1. private.list_chat_contacts() listed every user_profiles row in the
--    tenant, so family-portal accounts showed up as "Available Staff" in
--    Staff Chat. Exclude role='family'.
--
-- 2. public.start_or_get_direct_chat / public.mark_chat_thread_read were
--    declared STABLE but delegate to private.* functions that INSERT/UPDATE.
--    PostgREST runs STABLE RPCs in a read-only transaction, so those calls
--    failed with "cannot execute INSERT/UPDATE in a read-only transaction".
--    Drop STABLE so they run read-write.

create or replace function private.list_chat_contacts()
returns table (
  user_id UUID,
  full_name TEXT,
  role TEXT,
  site_id UUID,
  site_name TEXT,
  unit_id UUID,
  unit_name TEXT
)
language sql
stable
security definer
set search_path = public, auth, private
as $$
  SELECT
    profile.id AS user_id,
    profile.full_name,
    profile.role,
    profile.site_id,
    site.name AS site_name,
    profile.unit_id,
    unit.name AS unit_name
  FROM public.user_profiles AS profile
  LEFT JOIN public.sites AS site ON site.id = profile.site_id
  LEFT JOIN public.units AS unit ON unit.id = profile.unit_id
  WHERE profile.id <> auth.uid()
    AND COALESCE(profile.active, true) = true
    AND profile.role <> 'family'
    AND profile.tenant_id = private.current_tenant_id()
    AND (
      private.current_site_id() IS NULL
      OR profile.site_id IS NULL
      OR profile.site_id = private.current_site_id()
    )
  ORDER BY
    COALESCE(site.name, 'All Sites'),
    COALESCE(unit.name, 'All Units'),
    COALESCE(profile.full_name, profile.id::text);
$$;

create or replace function public.start_or_get_direct_chat(target_user_id UUID)
returns UUID
language sql
set search_path = public, auth, private
as $$
  SELECT private.start_or_get_direct_chat(target_user_id)
$$;

create or replace function public.mark_chat_thread_read(target_thread_id UUID)
returns VOID
language sql
set search_path = public, auth, private
as $$
  SELECT private.mark_chat_thread_read(target_thread_id)
$$;
