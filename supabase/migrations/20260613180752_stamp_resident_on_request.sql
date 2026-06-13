-- ============================================================
-- STAMP RESIDENT ON REQUEST INSERT
-- Resolves resident_id automatically when resident profiles are
-- enabled for the request's tenant, so the patient page (anon)
-- never needs to read the residents table directly.
-- ============================================================

create or replace function public.stamp_resident_on_request()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tenant_id uuid;
  v_enabled   boolean;
begin
  if new.resident_id is not null then
    return new;
  end if;

  select s.tenant_id into v_tenant_id
  from public.rooms rm
  join public.units u on u.id = rm.unit_id
  join public.sites s on s.id = u.site_id
  where rm.id = new.room_id;

  if v_tenant_id is null then
    return new;
  end if;

  select resident_profiles_enabled into v_enabled
  from public.tenant_settings
  where tenant_id = v_tenant_id;

  if not coalesce(v_enabled, false) then
    return new;
  end if;

  select id into new.resident_id
  from public.residents
  where room_id = new.room_id
    and active = true
  limit 1;

  return new;
end;
$$;

drop trigger if exists trg_stamp_resident_on_request on public.requests;
create trigger trg_stamp_resident_on_request
  before insert on public.requests
  for each row
  execute function public.stamp_resident_on_request();
