-- ============================================================
-- ADD NOTE — photo/file attachments on staff_notes
--
-- Adds attachment metadata columns to staff_notes and a private
-- storage bucket with RLS scoped the same way as staff_notes itself:
-- staff (nurse and above) can upload/read within their own tenant's
-- folder, and family members can read an attachment only when the
-- owning note has visible_to_family = true and the resident is one
-- of theirs.
-- ============================================================

alter table public.staff_notes
  add column attachment_path text,
  add column attachment_type text,
  add column attachment_name text;

insert into storage.buckets (id, name, public)
values ('staff-note-attachments', 'staff-note-attachments', false)
on conflict (id) do nothing;

-- Staff (nurse and above) can upload into their tenant's folder
create policy "staff_note_attachments_staff_insert"
on storage.objects for insert
with check (
  bucket_id = 'staff-note-attachments'
  and current_user_role() = ANY (ARRAY['tenant_admin','site_manager','nurse_manager','charge_nurse','nurse'])
  and (storage.foldername(name))[1] = current_tenant_id()::text
);

-- Staff (nurse and above) can read attachments within their tenant's folder
create policy "staff_note_attachments_staff_select"
on storage.objects for select
using (
  bucket_id = 'staff-note-attachments'
  and current_user_role() = ANY (ARRAY['tenant_admin','site_manager','nurse_manager','charge_nurse','nurse'])
  and (storage.foldername(name))[1] = current_tenant_id()::text
);

-- Staff (nurse and above) can remove attachments within their tenant's folder
create policy "staff_note_attachments_staff_delete"
on storage.objects for delete
using (
  bucket_id = 'staff-note-attachments'
  and current_user_role() = ANY (ARRAY['tenant_admin','site_manager','nurse_manager','charge_nurse','nurse'])
  and (storage.foldername(name))[1] = current_tenant_id()::text
);

-- Family members can read an attachment if its note is shared with them
create policy "staff_note_attachments_family_select"
on storage.objects for select
using (
  bucket_id = 'staff-note-attachments'
  and exists (
    select 1 from public.staff_notes sn
    where sn.attachment_path = storage.objects.name
      and sn.visible_to_family = true
      and sn.resident_id in (select current_family_resident_ids())
  )
);
