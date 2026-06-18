-- ============================================================
-- ALLOW FAMILY-SUBMITTED CUSTOM (OPEN-ENDED) REQUESTS
-- requests_insert_family only allowed `type` values that exist as an
-- active family-audience request_types row, since it was written
-- before custom requests existed. 'custom' is a reserved pseudo-type
-- (same as on the patient side) and isn't a request_types row, so it
-- needs an explicit carve-out here.
-- ============================================================

drop policy if exists requests_insert_family on public.requests;

create policy requests_insert_family on public.requests
  for insert with check (
    source = 'family'
    and resident_id in (select public.current_family_resident_ids())
    and (
      type = 'custom'
      or type in (
        select rt.id from public.request_types rt
        where rt.tenant_id = current_tenant_id()
          and rt.audience = 'family'
          and rt.active = true
      )
    )
  );
