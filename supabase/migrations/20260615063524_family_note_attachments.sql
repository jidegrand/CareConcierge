-- ============================================================
-- ADD NOTE — surface attachment metadata in the family activity feed
--
-- list_family_notes() return shape needs attachment_path/type/name so
-- useFamilyPortal can generate signed URLs for staff-note-attachments.
-- ============================================================

drop function if exists public.list_family_notes(uuid);

create function public.list_family_notes(target_resident_id uuid)
returns table(
  id uuid,
  request_id uuid,
  body text,
  created_at timestamptz,
  author_name text,
  author_role_title text,
  attachment_path text,
  attachment_type text,
  attachment_name text
)
language sql
stable security definer
set search_path to 'public', 'auth'
as $$
  select n.id, n.request_id, n.body, n.created_at,
         up.full_name as author_name,
         public.staff_role_title(up.role) as author_role_title,
         n.attachment_path, n.attachment_type, n.attachment_name
  from public.staff_notes n
  left join public.user_profiles up on up.id = n.author_id
  where n.resident_id = target_resident_id
    and n.visible_to_family = true
    and target_resident_id in (select public.current_family_resident_ids())
  order by n.created_at desc
  limit 20;
$$;
