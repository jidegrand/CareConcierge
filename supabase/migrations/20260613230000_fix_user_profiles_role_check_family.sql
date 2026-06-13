-- Fix: handle_new_user() inserts role='family' for family-portal signups,
-- but user_profiles_role_check did not allow 'family', causing
-- "Database error saving new user" (23514) and aborting inviteUserByEmail
-- before any email could be sent.

alter table public.user_profiles drop constraint if exists user_profiles_role_check;

alter table public.user_profiles
  add constraint user_profiles_role_check
  check (role = any (array['super_admin','tenant_admin','site_manager','nurse_manager','charge_nurse','nurse','volunteer','viewer','family']));
