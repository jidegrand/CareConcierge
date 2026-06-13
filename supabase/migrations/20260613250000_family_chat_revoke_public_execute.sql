-- Defense-in-depth: the family chat RPCs are SECURITY DEFINER and gate
-- access internally via current_family_resident_ids()/current_tenant_id()/
-- current_user_role(), but revoke the default PUBLIC execute grant so only
-- the explicitly-granted `authenticated` role can call them.

revoke execute on function public.list_family_chat_messages(uuid) from public;
revoke execute on function public.send_family_chat_message(uuid, text) from public;
revoke execute on function public.mark_family_chat_read(uuid) from public;
revoke execute on function public.list_family_chat_residents() from public;
revoke execute on function public.family_chat_unread_count(uuid) from public;
