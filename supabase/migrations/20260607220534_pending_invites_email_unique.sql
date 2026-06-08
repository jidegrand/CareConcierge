-- The invite-user edge function upserts pending_invites with onConflict: 'email',
-- which requires a matching unique constraint. Without it, every upsert fails with
-- "there is no unique or exclusion constraint matching the ON CONFLICT specification",
-- so invites (including global admin invites) were never reaching inviteUserByEmail.
alter table public.pending_invites
  add constraint pending_invites_email_key unique (email);
