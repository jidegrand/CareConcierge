-- ============================================================
-- FAMILY LAYER — allow family members to cancel their own
-- in-progress requests
--
-- requests_public_delete only matches when the request's room is
-- active, which is irrelevant for family-submitted requests and left
-- cancelRequest() silently deleting 0 rows (RLS no-op, no error) for
-- any resident whose room is inactive. Add a delete policy scoped the
-- same way as requests_select_family/requests_insert_family.
-- ============================================================

create policy requests_delete_family on public.requests
  for delete using (
    source = 'family'
    and resident_id in (select public.current_family_resident_ids())
    and status in ('pending', 'acknowledged')
  );
