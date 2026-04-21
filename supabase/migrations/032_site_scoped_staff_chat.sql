-- Add optional site-level staff scope and direct staff chat.

ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS site_id UUID REFERENCES public.sites(id) ON DELETE SET NULL;

ALTER TABLE public.pending_invites
  ADD COLUMN IF NOT EXISTS site_id UUID REFERENCES public.sites(id) ON DELETE SET NULL;

UPDATE public.user_profiles AS profile
SET site_id = unit.site_id
FROM public.units AS unit
WHERE profile.unit_id = unit.id
  AND profile.site_id IS DISTINCT FROM unit.site_id;

UPDATE public.pending_invites AS invite
SET site_id = unit.site_id
FROM public.units AS unit
WHERE invite.unit_id = unit.id
  AND invite.site_id IS DISTINCT FROM unit.site_id;

CREATE INDEX IF NOT EXISTS idx_profiles_tenant_site_active
  ON public.user_profiles(tenant_id, site_id, active);

CREATE INDEX IF NOT EXISTS idx_pending_invites_tenant_site
  ON public.pending_invites(tenant_id, site_id, created_at DESC);

CREATE OR REPLACE FUNCTION private.sync_profile_site_scope()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
DECLARE
  scoped_site_id UUID;
BEGIN
  IF NEW.unit_id IS NOT NULL THEN
    SELECT site_id
    INTO scoped_site_id
    FROM public.units
    WHERE id = NEW.unit_id;

    IF scoped_site_id IS NULL THEN
      RAISE EXCEPTION 'Assigned unit does not exist.';
    END IF;

    IF NEW.site_id IS NULL THEN
      NEW.site_id := scoped_site_id;
    ELSIF NEW.site_id <> scoped_site_id THEN
      RAISE EXCEPTION 'Assigned unit must belong to the selected site.';
    END IF;
  END IF;

  IF NEW.site_id IS NOT NULL AND NOT EXISTS (
    SELECT 1
    FROM public.sites
    WHERE id = NEW.site_id
      AND tenant_id = NEW.tenant_id
  ) THEN
    RAISE EXCEPTION 'Assigned site must belong to the selected organization.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_user_profiles_site_scope ON public.user_profiles;
CREATE TRIGGER sync_user_profiles_site_scope
  BEFORE INSERT OR UPDATE OF tenant_id, site_id, unit_id ON public.user_profiles
  FOR EACH ROW EXECUTE FUNCTION private.sync_profile_site_scope();

DROP TRIGGER IF EXISTS sync_pending_invites_site_scope ON public.pending_invites;
CREATE TRIGGER sync_pending_invites_site_scope
  BEFORE INSERT OR UPDATE OF tenant_id, site_id, unit_id ON public.pending_invites
  FOR EACH ROW EXECUTE FUNCTION private.sync_profile_site_scope();

CREATE OR REPLACE FUNCTION private.current_site_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth, private
AS $$
  SELECT site_id
  FROM public.user_profiles
  WHERE id = auth.uid()
    AND COALESCE(active, true) = true
$$;

CREATE OR REPLACE FUNCTION public.current_site_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth, private
AS $$
  SELECT private.current_site_id()
$$;

GRANT EXECUTE ON FUNCTION private.current_site_id() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.current_site_id() TO anon, authenticated;

CREATE OR REPLACE FUNCTION private.profile_site_id(target_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth, private
AS $$
  SELECT site_id
  FROM public.user_profiles
  WHERE id = target_user_id
    AND COALESCE(active, true) = true
$$;

CREATE OR REPLACE FUNCTION private.users_share_site_scope(target_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth, private
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_profiles AS current_profile
    JOIN public.user_profiles AS target_profile
      ON target_profile.id = target_user_id
    WHERE current_profile.id = auth.uid()
      AND COALESCE(current_profile.active, true) = true
      AND COALESCE(target_profile.active, true) = true
      AND current_profile.tenant_id = target_profile.tenant_id
      AND (
        current_profile.site_id IS NULL
        OR target_profile.site_id IS NULL
        OR current_profile.site_id = target_profile.site_id
      )
  )
$$;

CREATE OR REPLACE FUNCTION public.get_current_user_profile()
RETURNS JSONB
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth, private
AS $$
  SELECT to_jsonb(profile_row)
  FROM (
    SELECT id, tenant_id, site_id, unit_id, role, full_name, active
    FROM public.user_profiles
    WHERE id = auth.uid()
    LIMIT 1
  ) profile_row
$$;

CREATE OR REPLACE FUNCTION private.bootstrap_profile_from_invite(
  target_user_id UUID,
  target_email TEXT,
  target_full_name TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  matched_invite public.pending_invites%ROWTYPE;
BEGIN
  IF target_user_id IS NULL OR target_email IS NULL THEN
    RETURN false;
  END IF;

  SELECT *
  INTO matched_invite
  FROM public.pending_invites
  WHERE lower(email) = lower(target_email)
  ORDER BY created_at DESC
  LIMIT 1;

  IF matched_invite.id IS NULL THEN
    RETURN false;
  END IF;

  INSERT INTO public.user_profiles (id, tenant_id, site_id, unit_id, role, full_name)
  VALUES (
    target_user_id,
    matched_invite.tenant_id,
    matched_invite.site_id,
    matched_invite.unit_id,
    matched_invite.role,
    NULLIF(target_full_name, '')
  )
  ON CONFLICT (id) DO UPDATE
  SET tenant_id = EXCLUDED.tenant_id,
      site_id = EXCLUDED.site_id,
      unit_id = EXCLUDED.unit_id,
      role = EXCLUDED.role,
      full_name = COALESCE(EXCLUDED.full_name, user_profiles.full_name);

  DELETE FROM public.pending_invites WHERE id = matched_invite.id;

  RETURN true;
END;
$$;

DROP TRIGGER IF EXISTS on_pending_invite_created_profile ON public.pending_invites;
CREATE TRIGGER on_pending_invite_created_profile
  AFTER INSERT OR UPDATE OF email, tenant_id, site_id, unit_id, role ON public.pending_invites
  FOR EACH ROW EXECUTE FUNCTION private.handle_pending_invite();

DROP POLICY IF EXISTS "sites_select" ON public.sites;
CREATE POLICY "sites_select" ON public.sites
  FOR SELECT USING (
    tenant_id = current_tenant_id()
    AND (
      current_site_id() IS NULL
      OR id = current_site_id()
    )
  );

DROP POLICY IF EXISTS "units_select" ON public.units;
CREATE POLICY "units_select" ON public.units
  FOR SELECT USING (
    site_id IN (
      SELECT id
      FROM public.sites
      WHERE tenant_id = current_tenant_id()
        AND (
          current_site_id() IS NULL
          OR id = current_site_id()
        )
    )
    AND (
      current_unit_id() IS NULL
      OR id = current_unit_id()
    )
  );

DROP POLICY IF EXISTS "rooms_select_staff" ON public.rooms;
CREATE POLICY "rooms_select_staff" ON public.rooms
  FOR SELECT USING (
    unit_id IN (
      SELECT u.id
      FROM public.units AS u
      JOIN public.sites AS s ON s.id = u.site_id
      WHERE s.tenant_id = current_tenant_id()
        AND (
          current_site_id() IS NULL
          OR s.id = current_site_id()
        )
        AND (
          current_unit_id() IS NULL
          OR u.id = current_unit_id()
        )
    )
    AND current_user_role() IN (
      'tenant_admin', 'site_manager', 'nurse_manager',
      'charge_nurse', 'nurse', 'volunteer', 'viewer'
    )
  );

DROP POLICY IF EXISTS "requests_nurse_select" ON public.requests;
CREATE POLICY "requests_nurse_select" ON public.requests
  FOR SELECT USING (
    room_id IN (
      SELECT r.id
      FROM public.rooms AS r
      JOIN public.units AS u ON u.id = r.unit_id
      JOIN public.sites AS s ON s.id = u.site_id
      WHERE s.tenant_id = current_tenant_id()
        AND (
          current_site_id() IS NULL
          OR s.id = current_site_id()
        )
        AND (
          current_unit_id() IS NULL
          OR u.id = current_unit_id()
        )
    )
  );

DROP POLICY IF EXISTS "requests_nurse_update" ON public.requests;
CREATE POLICY "requests_nurse_update" ON public.requests
  FOR UPDATE USING (
    room_id IN (
      SELECT r.id
      FROM public.rooms AS r
      JOIN public.units AS u ON u.id = r.unit_id
      JOIN public.sites AS s ON s.id = u.site_id
      WHERE s.tenant_id = current_tenant_id()
        AND (
          current_site_id() IS NULL
          OR s.id = current_site_id()
        )
        AND (
          current_unit_id() IS NULL
          OR u.id = current_unit_id()
        )
    )
  );

DROP POLICY IF EXISTS "request_feedback_nurse_select" ON public.request_feedback;
CREATE POLICY "request_feedback_nurse_select" ON public.request_feedback
  FOR SELECT USING (
    request_id IN (
      SELECT r.id
      FROM public.requests AS r
      JOIN public.rooms AS rm ON rm.id = r.room_id
      JOIN public.units AS u ON u.id = rm.unit_id
      JOIN public.sites AS s ON s.id = u.site_id
      WHERE (
        s.tenant_id = current_tenant_id()
        AND (
          current_site_id() IS NULL
          OR s.id = current_site_id()
        )
        AND (
          current_unit_id() IS NULL
          OR u.id = current_unit_id()
        )
      )
      OR current_user_role() = 'super_admin'
    )
  );

DROP POLICY IF EXISTS "profiles_select_admin" ON public.user_profiles;
CREATE POLICY "profiles_select_admin" ON public.user_profiles
  FOR SELECT USING (
    current_user_role() = 'super_admin'
    OR id = auth.uid()
    OR (
      tenant_id = current_tenant_id()
      AND current_user_role() = 'tenant_admin'
    )
    OR (
      tenant_id = current_tenant_id()
      AND current_user_role() IN ('nurse_manager', 'site_manager')
      AND (
        current_site_id() IS NULL
        OR site_id IS NULL
        OR site_id = current_site_id()
      )
      AND (
        current_unit_id() IS NULL
        OR unit_id IS NULL
        OR unit_id = current_unit_id()
      )
    )
  );

DROP POLICY IF EXISTS "profiles_update_admin" ON public.user_profiles;
CREATE POLICY "profiles_update_admin" ON public.user_profiles
  FOR UPDATE USING (
    current_user_role() = 'super_admin'
    OR (
      tenant_id = current_tenant_id()
      AND id <> auth.uid()
      AND current_user_role() = 'tenant_admin'
    )
    OR (
      tenant_id = current_tenant_id()
      AND id <> auth.uid()
      AND current_user_role() IN ('nurse_manager', 'site_manager')
      AND (
        current_site_id() IS NULL
        OR site_id IS NULL
        OR site_id = current_site_id()
      )
      AND (
        current_unit_id() IS NULL
        OR unit_id IS NULL
        OR unit_id = current_unit_id()
      )
    )
  )
  WITH CHECK (
    current_user_role() = 'super_admin'
    OR (
      tenant_id = current_tenant_id()
      AND id <> auth.uid()
      AND current_user_role() = 'tenant_admin'
      AND role <> 'super_admin'
    )
    OR (
      tenant_id = current_tenant_id()
      AND id <> auth.uid()
      AND current_user_role() IN ('nurse_manager', 'site_manager')
      AND role NOT IN ('super_admin', 'tenant_admin')
      AND (
        current_site_id() IS NULL
        OR site_id IS NULL
        OR site_id = current_site_id()
      )
      AND (
        current_unit_id() IS NULL
        OR unit_id IS NULL
        OR unit_id = current_unit_id()
      )
    )
  );

DROP POLICY IF EXISTS "pending_invites_select_admin" ON public.pending_invites;
CREATE POLICY "pending_invites_select_admin" ON public.pending_invites
  FOR SELECT USING (
    current_user_role() = 'super_admin'
    OR (
      tenant_id = current_tenant_id()
      AND current_user_role() = 'tenant_admin'
    )
    OR (
      tenant_id = current_tenant_id()
      AND current_user_role() IN ('site_manager', 'nurse_manager')
      AND (
        current_site_id() IS NULL
        OR site_id IS NULL
        OR site_id = current_site_id()
      )
      AND (
        current_unit_id() IS NULL
        OR unit_id IS NULL
        OR unit_id = current_unit_id()
      )
    )
  );

DROP POLICY IF EXISTS "pending_invites_insert_admin" ON public.pending_invites;
CREATE POLICY "pending_invites_insert_admin" ON public.pending_invites
  FOR INSERT WITH CHECK (
    current_user_role() = 'super_admin'
    OR (
      tenant_id = current_tenant_id()
      AND current_user_role() = 'tenant_admin'
    )
    OR (
      tenant_id = current_tenant_id()
      AND current_user_role() IN ('site_manager', 'nurse_manager')
      AND (
        current_site_id() IS NULL
        OR site_id IS NULL
        OR site_id = current_site_id()
      )
      AND (
        current_unit_id() IS NULL
        OR unit_id IS NULL
        OR unit_id = current_unit_id()
      )
    )
  );

DROP POLICY IF EXISTS "pending_invites_delete_admin" ON public.pending_invites;
CREATE POLICY "pending_invites_delete_admin" ON public.pending_invites
  FOR DELETE USING (
    current_user_role() = 'super_admin'
    OR (
      tenant_id = current_tenant_id()
      AND current_user_role() = 'tenant_admin'
    )
    OR (
      tenant_id = current_tenant_id()
      AND current_user_role() IN ('site_manager', 'nurse_manager')
      AND (
        current_site_id() IS NULL
        OR site_id IS NULL
        OR site_id = current_site_id()
      )
      AND (
        current_unit_id() IS NULL
        OR unit_id IS NULL
        OR unit_id = current_unit_id()
      )
    )
  );

CREATE TABLE IF NOT EXISTS public.chat_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  site_id UUID REFERENCES public.sites(id) ON DELETE SET NULL,
  created_by UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_message_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.chat_thread_participants (
  thread_id UUID NOT NULL REFERENCES public.chat_threads(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_read_at TIMESTAMPTZ,
  PRIMARY KEY (thread_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID NOT NULL REFERENCES public.chat_threads(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  body TEXT NOT NULL CHECK (length(btrim(body)) BETWEEN 1 AND 2000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chat_threads_tenant_last_message
  ON public.chat_threads(tenant_id, last_message_at DESC NULLS LAST, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_chat_threads_site
  ON public.chat_threads(site_id);

CREATE INDEX IF NOT EXISTS idx_chat_thread_participants_user
  ON public.chat_thread_participants(user_id, thread_id);

CREATE INDEX IF NOT EXISTS idx_chat_messages_thread_created
  ON public.chat_messages(thread_id, created_at ASC);

CREATE OR REPLACE FUNCTION private.sync_chat_thread_scope()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
BEGIN
  IF NEW.site_id IS NOT NULL AND NOT EXISTS (
    SELECT 1
    FROM public.sites
    WHERE id = NEW.site_id
      AND tenant_id = NEW.tenant_id
  ) THEN
    RAISE EXCEPTION 'Chat thread site must belong to the selected organization.';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.user_profiles
    WHERE id = NEW.created_by
      AND tenant_id = NEW.tenant_id
      AND COALESCE(active, true) = true
  ) THEN
    RAISE EXCEPTION 'Chat thread creator must belong to the selected organization.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_chat_thread_scope ON public.chat_threads;
CREATE TRIGGER sync_chat_thread_scope
  BEFORE INSERT OR UPDATE OF tenant_id, site_id, created_by ON public.chat_threads
  FOR EACH ROW EXECUTE FUNCTION private.sync_chat_thread_scope();

CREATE OR REPLACE FUNCTION private.sync_chat_participant_scope()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
DECLARE
  thread_row public.chat_threads%ROWTYPE;
  participant_site_id UUID;
  participant_tenant_id UUID;
BEGIN
  SELECT *
  INTO thread_row
  FROM public.chat_threads
  WHERE id = NEW.thread_id;

  IF thread_row.id IS NULL THEN
    RAISE EXCEPTION 'Chat thread does not exist.';
  END IF;

  SELECT tenant_id, site_id
  INTO participant_tenant_id, participant_site_id
  FROM public.user_profiles
  WHERE id = NEW.user_id
    AND COALESCE(active, true) = true;

  IF participant_tenant_id IS NULL THEN
    RAISE EXCEPTION 'Chat participant must have an active staff profile.';
  END IF;

  IF participant_tenant_id <> thread_row.tenant_id THEN
    RAISE EXCEPTION 'Chat participant must belong to the same organization as the thread.';
  END IF;

  IF thread_row.site_id IS NULL THEN
    IF participant_site_id IS NOT NULL THEN
      RAISE EXCEPTION 'Only organization-wide users can join organization-wide chat threads.';
    END IF;
  ELSIF participant_site_id IS NOT NULL AND participant_site_id <> thread_row.site_id THEN
    RAISE EXCEPTION 'Chat participant does not have access to this site.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_chat_participant_scope ON public.chat_thread_participants;
CREATE TRIGGER sync_chat_participant_scope
  BEFORE INSERT OR UPDATE OF thread_id, user_id ON public.chat_thread_participants
  FOR EACH ROW EXECUTE FUNCTION private.sync_chat_participant_scope();

CREATE OR REPLACE FUNCTION private.touch_chat_thread_last_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
BEGIN
  UPDATE public.chat_threads
  SET last_message_at = NEW.created_at
  WHERE id = NEW.thread_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS touch_chat_thread_last_message ON public.chat_messages;
CREATE TRIGGER touch_chat_thread_last_message
  AFTER INSERT ON public.chat_messages
  FOR EACH ROW EXECUTE FUNCTION private.touch_chat_thread_last_message();

ALTER TABLE public.chat_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_thread_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION private.can_access_chat_thread(target_thread_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth, private
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.chat_threads AS thread
    JOIN public.chat_thread_participants AS participant
      ON participant.thread_id = thread.id
    WHERE thread.id = target_thread_id
      AND participant.user_id = auth.uid()
      AND thread.tenant_id = private.current_tenant_id()
      AND (
        (thread.site_id IS NULL AND private.current_site_id() IS NULL)
        OR private.current_site_id() IS NULL
        OR thread.site_id = private.current_site_id()
      )
  )
$$;

GRANT EXECUTE ON FUNCTION private.can_access_chat_thread(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION private.profile_site_id(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION private.users_share_site_scope(UUID) TO anon, authenticated;

CREATE POLICY "chat_threads_select_participant" ON public.chat_threads
  FOR SELECT USING (private.can_access_chat_thread(id));

CREATE POLICY "chat_participants_select_participant" ON public.chat_thread_participants
  FOR SELECT USING (private.can_access_chat_thread(thread_id));

CREATE POLICY "chat_participants_update_self" ON public.chat_thread_participants
  FOR UPDATE USING (
    user_id = auth.uid()
    AND private.can_access_chat_thread(thread_id)
  )
  WITH CHECK (
    user_id = auth.uid()
    AND private.can_access_chat_thread(thread_id)
  );

CREATE POLICY "chat_messages_select_participant" ON public.chat_messages
  FOR SELECT USING (private.can_access_chat_thread(thread_id));

CREATE POLICY "chat_messages_insert_participant" ON public.chat_messages
  FOR INSERT WITH CHECK (
    sender_id = auth.uid()
    AND private.can_access_chat_thread(thread_id)
    AND EXISTS (
      SELECT 1
      FROM public.chat_thread_participants
      WHERE thread_id = chat_messages.thread_id
        AND user_id = auth.uid()
    )
  );

CREATE OR REPLACE FUNCTION private.list_chat_contacts()
RETURNS TABLE (
  user_id UUID,
  full_name TEXT,
  role TEXT,
  site_id UUID,
  site_name TEXT,
  unit_id UUID,
  unit_name TEXT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth, private
AS $$
  SELECT
    profile.id AS user_id,
    profile.full_name,
    profile.role,
    profile.site_id,
    site.name AS site_name,
    profile.unit_id,
    unit.name AS unit_name
  FROM public.user_profiles AS profile
  LEFT JOIN public.sites AS site ON site.id = profile.site_id
  LEFT JOIN public.units AS unit ON unit.id = profile.unit_id
  WHERE profile.id <> auth.uid()
    AND COALESCE(profile.active, true) = true
    AND profile.tenant_id = private.current_tenant_id()
    AND (
      private.current_site_id() IS NULL
      OR profile.site_id IS NULL
      OR profile.site_id = private.current_site_id()
    )
  ORDER BY
    COALESCE(site.name, 'All Sites'),
    COALESCE(unit.name, 'All Units'),
    COALESCE(profile.full_name, profile.id::text);
$$;

CREATE OR REPLACE FUNCTION public.list_chat_contacts()
RETURNS TABLE (
  user_id UUID,
  full_name TEXT,
  role TEXT,
  site_id UUID,
  site_name TEXT,
  unit_id UUID,
  unit_name TEXT
)
LANGUAGE sql
STABLE
SET search_path = public, auth, private
AS $$
  SELECT * FROM private.list_chat_contacts()
$$;

CREATE OR REPLACE FUNCTION private.list_chat_threads()
RETURNS TABLE (
  thread_id UUID,
  site_id UUID,
  site_name TEXT,
  counterpart_user_id UUID,
  counterpart_full_name TEXT,
  counterpart_role TEXT,
  counterpart_site_name TEXT,
  counterpart_unit_name TEXT,
  last_message_at TIMESTAMPTZ,
  last_message_body TEXT,
  last_message_sender_id UUID,
  unread_count BIGINT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth, private
AS $$
  SELECT
    thread.id AS thread_id,
    thread.site_id,
    scope_site.name AS site_name,
    counterpart.user_id AS counterpart_user_id,
    counterpart_profile.full_name AS counterpart_full_name,
    counterpart_profile.role AS counterpart_role,
    counterpart_site.name AS counterpart_site_name,
    counterpart_unit.name AS counterpart_unit_name,
    COALESCE(last_message.created_at, thread.created_at) AS last_message_at,
    last_message.body AS last_message_body,
    last_message.sender_id AS last_message_sender_id,
    COALESCE(unread_messages.count, 0) AS unread_count
  FROM public.chat_threads AS thread
  JOIN public.chat_thread_participants AS me
    ON me.thread_id = thread.id
   AND me.user_id = auth.uid()
  JOIN public.chat_thread_participants AS counterpart
    ON counterpart.thread_id = thread.id
   AND counterpart.user_id <> auth.uid()
  JOIN public.user_profiles AS counterpart_profile
    ON counterpart_profile.id = counterpart.user_id
  LEFT JOIN public.sites AS scope_site ON scope_site.id = thread.site_id
  LEFT JOIN public.sites AS counterpart_site ON counterpart_site.id = counterpart_profile.site_id
  LEFT JOIN public.units AS counterpart_unit ON counterpart_unit.id = counterpart_profile.unit_id
  LEFT JOIN LATERAL (
    SELECT body, sender_id, created_at
    FROM public.chat_messages
    WHERE thread_id = thread.id
    ORDER BY created_at DESC
    LIMIT 1
  ) AS last_message ON true
  LEFT JOIN LATERAL (
    SELECT count(*) AS count
    FROM public.chat_messages AS message
    WHERE message.thread_id = thread.id
      AND message.sender_id <> auth.uid()
      AND message.created_at > COALESCE(me.last_read_at, 'epoch'::timestamptz)
  ) AS unread_messages ON true
  WHERE private.can_access_chat_thread(thread.id)
  ORDER BY COALESCE(thread.last_message_at, thread.created_at) DESC;
$$;

CREATE OR REPLACE FUNCTION public.list_chat_threads()
RETURNS TABLE (
  thread_id UUID,
  site_id UUID,
  site_name TEXT,
  counterpart_user_id UUID,
  counterpart_full_name TEXT,
  counterpart_role TEXT,
  counterpart_site_name TEXT,
  counterpart_unit_name TEXT,
  last_message_at TIMESTAMPTZ,
  last_message_body TEXT,
  last_message_sender_id UUID,
  unread_count BIGINT
)
LANGUAGE sql
STABLE
SET search_path = public, auth, private
AS $$
  SELECT * FROM private.list_chat_threads()
$$;

CREATE OR REPLACE FUNCTION private.list_chat_messages(target_thread_id UUID)
RETURNS TABLE (
  message_id UUID,
  thread_id UUID,
  sender_id UUID,
  sender_name TEXT,
  body TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth, private
AS $$
  SELECT
    message.id AS message_id,
    message.thread_id,
    message.sender_id,
    profile.full_name AS sender_name,
    message.body,
    message.created_at
  FROM public.chat_messages AS message
  JOIN public.user_profiles AS profile ON profile.id = message.sender_id
  WHERE message.thread_id = target_thread_id
    AND private.can_access_chat_thread(target_thread_id)
  ORDER BY message.created_at ASC;
$$;

CREATE OR REPLACE FUNCTION public.list_chat_messages(target_thread_id UUID)
RETURNS TABLE (
  message_id UUID,
  thread_id UUID,
  sender_id UUID,
  sender_name TEXT,
  body TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SET search_path = public, auth, private
AS $$
  SELECT * FROM private.list_chat_messages(target_thread_id)
$$;

CREATE OR REPLACE FUNCTION private.start_or_get_direct_chat(target_user_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, private
AS $$
DECLARE
  current_profile public.user_profiles%ROWTYPE;
  target_profile public.user_profiles%ROWTYPE;
  scoped_site_id UUID;
  existing_thread_id UUID;
BEGIN
  SELECT *
  INTO current_profile
  FROM public.user_profiles
  WHERE id = auth.uid()
    AND COALESCE(active, true) = true;

  IF current_profile.id IS NULL THEN
    RAISE EXCEPTION 'You must have an active staff profile to start a chat.';
  END IF;

  SELECT *
  INTO target_profile
  FROM public.user_profiles
  WHERE id = target_user_id
    AND COALESCE(active, true) = true;

  IF target_profile.id IS NULL THEN
    RAISE EXCEPTION 'The selected staff member is no longer available for chat.';
  END IF;

  IF current_profile.tenant_id <> target_profile.tenant_id THEN
    RAISE EXCEPTION 'Direct chats are limited to the same organization.';
  END IF;

  IF NOT private.users_share_site_scope(target_user_id) THEN
    RAISE EXCEPTION 'Direct chats are limited to staff who share site access.';
  END IF;

  scoped_site_id := COALESCE(current_profile.site_id, target_profile.site_id);

  SELECT thread.id
  INTO existing_thread_id
  FROM public.chat_threads AS thread
  JOIN public.chat_thread_participants AS me
    ON me.thread_id = thread.id
   AND me.user_id = auth.uid()
  JOIN public.chat_thread_participants AS counterpart
    ON counterpart.thread_id = thread.id
   AND counterpart.user_id = target_user_id
  WHERE thread.tenant_id = current_profile.tenant_id
    AND thread.site_id IS NOT DISTINCT FROM scoped_site_id
    AND (
      SELECT count(*)
      FROM public.chat_thread_participants
      WHERE thread_id = thread.id
    ) = 2
  LIMIT 1;

  IF existing_thread_id IS NOT NULL THEN
    RETURN existing_thread_id;
  END IF;

  INSERT INTO public.chat_threads (tenant_id, site_id, created_by)
  VALUES (current_profile.tenant_id, scoped_site_id, auth.uid())
  RETURNING id INTO existing_thread_id;

  INSERT INTO public.chat_thread_participants (thread_id, user_id, last_read_at)
  VALUES
    (existing_thread_id, auth.uid(), now()),
    (existing_thread_id, target_user_id, NULL);

  RETURN existing_thread_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.start_or_get_direct_chat(target_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SET search_path = public, auth, private
AS $$
  SELECT private.start_or_get_direct_chat(target_user_id)
$$;

CREATE OR REPLACE FUNCTION private.mark_chat_thread_read(target_thread_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, private
AS $$
BEGIN
  IF NOT private.can_access_chat_thread(target_thread_id) THEN
    RAISE EXCEPTION 'Chat thread not available in your current scope.';
  END IF;

  UPDATE public.chat_thread_participants
  SET last_read_at = now()
  WHERE thread_id = target_thread_id
    AND user_id = auth.uid();
END;
$$;

CREATE OR REPLACE FUNCTION public.mark_chat_thread_read(target_thread_id UUID)
RETURNS VOID
LANGUAGE sql
STABLE
SET search_path = public, auth, private
AS $$
  SELECT private.mark_chat_thread_read(target_thread_id)
$$;

GRANT EXECUTE ON FUNCTION public.list_chat_contacts() TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_chat_threads() TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_chat_messages(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.start_or_get_direct_chat(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_chat_thread_read(UUID) TO authenticated;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END;
$$;
