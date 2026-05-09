-- Allow deleting an organization to remove its request history with its rooms.
-- request_feedback already cascades from requests, so feedback rows are removed
-- when the owning request is deleted.

set lock_timeout = '10s';

alter table public.requests
  drop constraint if exists requests_room_id_fkey,
  add constraint requests_room_id_fkey
    foreign key (room_id)
    references public.rooms(id)
    on delete cascade;
