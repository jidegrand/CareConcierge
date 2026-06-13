-- ============================================================
-- FAMILY LAYER — PHASE 3: family-initiated requests
--
-- Family members can submit a small, tenant-configurable set of
-- request types for their resident (e.g. "Check on resident",
-- "Call with nurse"). These land in the SAME `requests` queue
-- staff already triage, tagged source='family' so staff can tell
-- them apart from patient/QR-originated requests.
-- ============================================================

-- 1) Tag request origin
alter table public.requests
  add column source text not null default 'patient'
  check (source in ('patient','staff','family'));
create index requests_source_idx on public.requests(source);

-- 2) Tag which audience a request type is offered to
alter table public.request_types
  add column audience text not null default 'patient'
  check (audience in ('patient','family'));

-- 3) Seed family request types for existing tenants
insert into public.request_types (tenant_id, id, label, icon, color, urgent, active, sort_order, system, audience)
select
  t.id,
  v.id, v.label, v.icon, v.color, v.urgent, true, v.sort_order, false, 'family'
from public.tenants t
cross join (
  values
    ('family_check_in',         'Check on resident', '👁️', '#3B82F6', false, 100),
    ('family_call_nurse',        'Call with nurse',   '📞', '#EC4899', true,  101),
    ('family_comfort_items',     'Comfort items',     '🛏️', '#8B5CF6', false, 102),
    ('family_activity_schedule', 'Activity schedule', '🗓️', '#10B981', false, 103),
    ('family_visitor_notice',    'Visitor coming',    '🔔', '#F59E0B', false, 104)
) as v(id, label, icon, color, urgent, sort_order)
on conflict (tenant_id, id) do nothing;

-- 4) Extend the new-tenant seed to include family request types
create or replace function private.seed_default_request_types_for_tenant()
returns trigger
language plpgsql
security definer
set search_path = public, private
as $$
begin
  insert into public.request_types (tenant_id, id, label, icon, color, urgent, active, sort_order, system, audience)
  values
    (new.id, 'water',       'Water',             '💧', '#3B82F6', false, true, 0, false, 'patient'),
    (new.id, 'blanket',     'Blanket',           '🛏️', '#8B5CF6', false, true, 1, false, 'patient'),
    (new.id, 'pain',        'Pain / Discomfort', '⚠️', '#EF4444', true,  true, 2, false, 'patient'),
    (new.id, 'medication',  'Medication',        '💊', '#F59E0B', true,  true, 3, false, 'patient'),
    (new.id, 'bathroom',    'Bathroom Help',     '🚶', '#10B981', false, true, 4, false, 'patient'),
    (new.id, 'nurse',       'Call Nurse',        '🔔', '#EC4899', true,  true, 5, true,  'patient'),
    (new.id, 'food',        'Food / Snack',      '🍽️', '#6366F1', false, true, 6, false, 'patient'),
    (new.id, 'temperature', 'Too Hot / Cold',    '🌡️', '#14B8A6', false, true, 7, false, 'patient'),
    (new.id, 'family_check_in',         'Check on resident', '👁️', '#3B82F6', false, true, 100, false, 'family'),
    (new.id, 'family_call_nurse',       'Call with nurse',   '📞', '#EC4899', true,  true, 101, false, 'family'),
    (new.id, 'family_comfort_items',    'Comfort items',     '🛏️', '#8B5CF6', false, true, 102, false, 'family'),
    (new.id, 'family_activity_schedule','Activity schedule', '🗓️', '#10B981', false, true, 103, false, 'family'),
    (new.id, 'family_visitor_notice',   'Visitor coming',    '🔔', '#F59E0B', false, true, 104, false, 'family')
  on conflict (tenant_id, id) do nothing;

  return new;
end;
$$;

-- 5) Allow active family members to submit requests for their resident,
-- restricted to the tenant's active family-audience request types.
create policy requests_insert_family on public.requests
  for insert with check (
    source = 'family'
    and resident_id in (select public.current_family_resident_ids())
    and type in (
      select rt.id from public.request_types rt
      where rt.tenant_id = current_tenant_id()
        and rt.audience = 'family'
        and rt.active = true
    )
  );
