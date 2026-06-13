-- ============================================================
-- Allow the patient-facing room page (anon role) to read the
-- display name of the resident currently assigned to a room,
-- so it can show "Room 250 · West Wing · Margaret H." Mirrors
-- the existing rooms_public_select gating (active room + tenant
-- license active).
-- ============================================================

create policy residents_public_select on public.residents
  for select using (
    active = true
    and room_id in (select id from public.rooms where active = true)
    and public.tenant_license_active(tenant_id)
  );
