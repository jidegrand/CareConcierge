-- ============================================================
-- FAMILY CHAT
-- Direct messaging between a family member and facility staff,
-- scoped to the family member's resident. One thread per
-- resident — any active family member of that resident and any
-- staff member in the tenant (with the right role) can read and
-- post into it.
-- ============================================================

create table public.family_chat_messages (
  id          uuid primary key default gen_random_uuid(),
  resident_id uuid not null references public.residents(id) on delete cascade,
  sender_role text not null check (sender_role in ('family','staff')),
  sender_id   uuid not null,
  sender_name text not null,
  body        text not null check (length(btrim(body)) between 1 and 1000),
  created_at  timestamptz not null default now()
);
create index family_chat_messages_resident_idx on public.family_chat_messages(resident_id, created_at);

create table public.family_chat_reads (
  resident_id  uuid not null references public.residents(id) on delete cascade,
  reader_id    uuid not null,
  last_read_at timestamptz not null default now(),
  primary key (resident_id, reader_id)
);

alter table public.family_chat_messages enable row level security;
alter table public.family_chat_reads    enable row level security;

-- ---- family_chat_messages ----
create policy family_chat_messages_select_family on public.family_chat_messages
  for select using (resident_id in (select public.current_family_resident_ids()));

create policy family_chat_messages_select_staff on public.family_chat_messages
  for select using (
    resident_id in (select r.id from public.residents r where r.tenant_id = current_tenant_id())
    and current_user_role() = any (array['tenant_admin','site_manager','nurse_manager','charge_nurse','nurse'])
  );

create policy family_chat_messages_insert_family on public.family_chat_messages
  for insert with check (
    sender_role = 'family'
    and sender_id = auth.uid()
    and resident_id in (select public.current_family_resident_ids())
  );

create policy family_chat_messages_insert_staff on public.family_chat_messages
  for insert with check (
    sender_role = 'staff'
    and sender_id = auth.uid()
    and resident_id in (select r.id from public.residents r where r.tenant_id = current_tenant_id())
    and current_user_role() = any (array['tenant_admin','site_manager','nurse_manager','charge_nurse','nurse'])
  );

-- ---- family_chat_reads (own read marker only) ----
create policy family_chat_reads_own on public.family_chat_reads
  for all using (
    reader_id = auth.uid()
    and (
      resident_id in (select public.current_family_resident_ids())
      or (
        resident_id in (select r.id from public.residents r where r.tenant_id = current_tenant_id())
        and current_user_role() = any (array['tenant_admin','site_manager','nurse_manager','charge_nurse','nurse'])
      )
    )
  )
  with check (
    reader_id = auth.uid()
    and (
      resident_id in (select public.current_family_resident_ids())
      or (
        resident_id in (select r.id from public.residents r where r.tenant_id = current_tenant_id())
        and current_user_role() = any (array['tenant_admin','site_manager','nurse_manager','charge_nurse','nurse'])
      )
    )
  );

-- ============================================================
-- RPCs
-- ============================================================

-- Messages for one resident's thread (family member of that resident, or in-scope staff)
create or replace function public.list_family_chat_messages(target_resident_id uuid)
returns table (
  id          uuid,
  resident_id uuid,
  sender_role text,
  sender_id   uuid,
  sender_name text,
  body        text,
  created_at  timestamptz
)
language sql
stable
security definer
set search_path = public, auth
as $$
  select m.id, m.resident_id, m.sender_role, m.sender_id, m.sender_name, m.body, m.created_at
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

-- Send a message into a resident's thread. Sender role/name are derived
-- server-side from who is calling — family member vs in-scope staff.
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
    select full_name into v_sender_name from public.user_profiles where id = auth.uid();
  else
    raise exception 'You do not have access to message this resident.';
  end if;

  insert into public.family_chat_messages (resident_id, sender_role, sender_id, sender_name, body)
  values (target_resident_id, v_sender_role, auth.uid(), coalesce(v_sender_name, 'Unknown'), message_body)
  returning * into result;

  return result;
end;
$$;

-- Mark a resident's thread read up to now for the current user
create or replace function public.mark_family_chat_read(target_resident_id uuid)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if not (
    target_resident_id in (select public.current_family_resident_ids())
    or (
      target_resident_id in (select r.id from public.residents r where r.tenant_id = current_tenant_id())
      and current_user_role() = any (array['tenant_admin','site_manager','nurse_manager','charge_nurse','nurse'])
    )
  ) then
    raise exception 'You do not have access to this resident chat.';
  end if;

  insert into public.family_chat_reads (resident_id, reader_id, last_read_at)
  values (target_resident_id, auth.uid(), now())
  on conflict (resident_id, reader_id) do update set last_read_at = excluded.last_read_at;
end;
$$;

-- Staff inbox: residents with an active family member, most recent message first
create or replace function public.list_family_chat_residents()
returns table (
  resident_id          uuid,
  resident_name        text,
  room_label           text,
  last_message_at      timestamptz,
  last_message_body    text,
  last_message_role    text,
  unread_count         bigint
)
language sql
stable
security definer
set search_path = public, auth
as $$
  select
    r.id as resident_id,
    r.display_name as resident_name,
    coalesce(rm.label, rm.name) as room_label,
    last_msg.created_at as last_message_at,
    last_msg.body as last_message_body,
    last_msg.sender_role as last_message_role,
    coalesce(unread.count, 0) as unread_count
  from public.residents r
  left join public.rooms rm on rm.id = r.room_id
  left join lateral (
    select body, sender_role, created_at
    from public.family_chat_messages
    where resident_id = r.id
    order by created_at desc
    limit 1
  ) last_msg on true
  left join lateral (
    select count(*) as count
    from public.family_chat_messages m
    where m.resident_id = r.id
      and m.sender_role = 'family'
      and m.created_at > coalesce(
        (select last_read_at from public.family_chat_reads where resident_id = r.id and reader_id = auth.uid()),
        'epoch'::timestamptz
      )
  ) unread on true
  where r.tenant_id = current_tenant_id()
    and current_user_role() = any (array['tenant_admin','site_manager','nurse_manager','charge_nurse','nurse'])
    and exists (
      select 1 from public.family_members fm
      where fm.resident_id = r.id and fm.status = 'active'
    )
  order by last_msg.created_at desc nulls last, r.display_name asc;
$$;

-- Unread count of staff replies for the signed-in family member's resident
create or replace function public.family_chat_unread_count(target_resident_id uuid)
returns bigint
language sql
stable
security definer
set search_path = public, auth
as $$
  select count(*)
  from public.family_chat_messages m
  where m.resident_id = target_resident_id
    and target_resident_id in (select public.current_family_resident_ids())
    and m.sender_role = 'staff'
    and m.created_at > coalesce(
      (select last_read_at from public.family_chat_reads where resident_id = target_resident_id and reader_id = auth.uid()),
      'epoch'::timestamptz
    );
$$;

grant execute on function public.list_family_chat_messages(uuid) to authenticated;
grant execute on function public.send_family_chat_message(uuid, text) to authenticated;
grant execute on function public.mark_family_chat_read(uuid) to authenticated;
grant execute on function public.list_family_chat_residents() to authenticated;
grant execute on function public.family_chat_unread_count(uuid) to authenticated;

do $$
begin
  alter publication supabase_realtime add table public.family_chat_messages;
exception
  when duplicate_object then null;
end;
$$;
