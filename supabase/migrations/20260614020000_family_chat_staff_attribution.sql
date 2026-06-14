-- ============================================================
-- FAMILY CHAT — STAFF ATTRIBUTION
-- Families trust updates more when they know who sent them and
-- in what capacity (e.g. "— Sarah RN, 4:55 PM"). Store a short
-- role title alongside staff messages and surface it through
-- list_family_chat_messages.
-- ============================================================

alter table public.family_chat_messages
  add column sender_role_title text;

-- Backfill existing staff messages from the sender's current role.
update public.family_chat_messages m
set sender_role_title = case up.role
  when 'nurse'         then 'RN'
  when 'charge_nurse'  then 'Charge Nurse'
  when 'nurse_manager' then 'Nurse Manager'
  when 'site_manager'  then 'Site Manager'
  when 'tenant_admin'  then 'Admin'
  when 'super_admin'   then 'Admin'
  when 'volunteer'     then 'Volunteer'
  else 'Care Team'
end
from public.user_profiles up
where m.sender_id = up.id
  and m.sender_role = 'staff'
  and m.sender_role_title is null;

-- Send a message into a resident's thread. Sender role/name (and, for
-- staff, a short role title) are derived server-side from who is calling.
create or replace function public.send_family_chat_message(target_resident_id uuid, message_body text)
returns public.family_chat_messages
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  result public.family_chat_messages;
  v_sender_role text;
  v_sender_name text;
  v_sender_title text;
  v_staff_role text;
begin
  if target_resident_id in (select public.current_family_resident_ids()) then
    v_sender_role := 'family';
    select full_name into v_sender_name
    from public.family_members
    where auth_user_id = auth.uid()
      and resident_id = target_resident_id
      and status = 'active'
    limit 1;
  elsif current_user_role() = any (array['tenant_admin','site_manager','nurse_manager','charge_nurse','nurse'])
    and target_resident_id in (select id from public.residents where tenant_id = current_tenant_id())
  then
    v_sender_role := 'staff';
    select full_name, role into v_sender_name, v_staff_role from public.user_profiles where id = auth.uid();
    v_sender_title := case v_staff_role
      when 'nurse'         then 'RN'
      when 'charge_nurse'  then 'Charge Nurse'
      when 'nurse_manager' then 'Nurse Manager'
      when 'site_manager'  then 'Site Manager'
      when 'tenant_admin'  then 'Admin'
      when 'super_admin'   then 'Admin'
      when 'volunteer'     then 'Volunteer'
      else 'Care Team'
    end;
  else
    raise exception 'You do not have access to message this resident.';
  end if;

  insert into public.family_chat_messages (resident_id, sender_role, sender_id, sender_name, sender_role_title, body)
  values (target_resident_id, v_sender_role, auth.uid(), coalesce(v_sender_name, 'Unknown'), v_sender_title, message_body)
  returning * into result;

  return result;
end;
$$;

-- Messages for one resident's thread, now including the staff sender's
-- short role title (e.g. "RN", "Charge Nurse") for family-facing attribution.
drop function if exists public.list_family_chat_messages(uuid);

create function public.list_family_chat_messages(target_resident_id uuid)
returns table (
  id                 uuid,
  resident_id        uuid,
  sender_role        text,
  sender_id          uuid,
  sender_name        text,
  sender_role_title  text,
  body               text,
  created_at         timestamptz
)
language sql
stable
security definer
set search_path = public, auth
as $$
  select m.id, m.resident_id, m.sender_role, m.sender_id, m.sender_name, m.sender_role_title, m.body, m.created_at
  from public.family_chat_messages m
  where m.resident_id = target_resident_id
    and (
      target_resident_id in (select public.current_family_resident_ids())
      or (
        target_resident_id in (select r.id from public.residents r where r.tenant_id = current_tenant_id())
        and current_user_role() = any (array['tenant_admin','site_manager','nurse_manager','charge_nurse','nurse'])
      )
    )
  order by m.created_at asc;
$$;

grant execute on function public.list_family_chat_messages(uuid) to authenticated;
