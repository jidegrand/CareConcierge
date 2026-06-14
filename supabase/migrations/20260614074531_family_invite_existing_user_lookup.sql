-- ============================================================
-- FAMILY LAYER — link sibling invites to existing auth accounts
--
-- handle_new_user() only links a pending family invite when a brand
-- new auth.users row is created. If the invited email already has an
-- account (e.g. they're a revoked family member of a different
-- resident), inviteUserByEmail returns "already registered" and the
-- new family_members row is left stuck in status='invited' with no
-- auth_user_id forever. This helper lets the invite edge function
-- detect that case and link the existing account directly.
-- ============================================================

create or replace function public.find_auth_user_id_by_email(p_email text)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from auth.users where lower(email) = lower(p_email) limit 1
$$;

revoke all on function public.find_auth_user_id_by_email(text) from public;
grant execute on function public.find_auth_user_id_by_email(text) to service_role;
