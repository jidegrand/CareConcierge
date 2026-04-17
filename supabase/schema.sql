-- ─────────────────────────────────────────────────────────────────────────────
-- BayRequest — Supabase Schema
-- Run this entire file in: Supabase Dashboard → SQL Editor → New Query
-- ─────────────────────────────────────────────────────────────────────────────

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── 1. TENANTS ────────────────────────────────────────────────────────────────
CREATE TABLE tenants (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  slug        TEXT NOT NULL UNIQUE,
  organization_url TEXT,
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE tenant_settings (
  tenant_id                 UUID PRIMARY KEY REFERENCES tenants(id) ON DELETE CASCADE,
  patient_feedback_enabled  BOOLEAN NOT NULL DEFAULT false,
  patient_idle_redirect_url TEXT,
  created_at                TIMESTAMPTZ DEFAULT now(),
  updated_at                TIMESTAMPTZ DEFAULT now()
);

-- ── 2. SITES ──────────────────────────────────────────────────────────────────
CREATE TABLE sites (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  slug        TEXT NOT NULL,
  hospital_url TEXT,
  created_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE (tenant_id, slug)
);

-- ── 3. UNITS ──────────────────────────────────────────────────────────────────
CREATE TABLE units (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id     UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  slug        TEXT NOT NULL,
  room_naming_template TEXT NOT NULL DEFAULT 'Room {n}',
  created_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE (site_id, slug)
);

-- ── 4. ROOMS ──────────────────────────────────────────────────────────────────
CREATE TABLE rooms (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id     UUID NOT NULL REFERENCES units(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,          -- Display name, e.g. "Bay 3"
  label       TEXT,                   -- Optional override label for QR print
  active      BOOLEAN DEFAULT true,   -- Set false to deactivate without deleting
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- ── 5. REQUESTS ───────────────────────────────────────────────────────────────
CREATE TABLE requests (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id         UUID NOT NULL REFERENCES rooms(id),
  type            TEXT NOT NULL,       -- water | blanket | pain | medication | bathroom | nurse | food | temperature
  status          TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'acknowledged', 'resolved')),
  is_urgent       BOOLEAN DEFAULT false,
  created_at      TIMESTAMPTZ DEFAULT now(),
  acknowledged_at TIMESTAMPTZ,
  resolved_at     TIMESTAMPTZ,
  resolved_by     UUID REFERENCES auth.users(id)
);

CREATE TABLE request_feedback (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id  UUID NOT NULL UNIQUE REFERENCES requests(id) ON DELETE CASCADE,
  rating      SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- ── 6. REQUEST TYPES ──────────────────────────────────────────────────────────
CREATE TABLE request_types (
  id          TEXT NOT NULL,
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  label       TEXT NOT NULL,
  icon        TEXT NOT NULL,
  color       TEXT NOT NULL DEFAULT '#1D6FA8',
  urgent      BOOLEAN NOT NULL DEFAULT false,
  active      BOOLEAN NOT NULL DEFAULT true,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  system      BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (tenant_id, id)
);

-- ── 7. USER PROFILES ──────────────────────────────────────────────────────────
-- Extends Supabase auth.users with app-level role and tenant assignment
CREATE TABLE user_profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  unit_id     UUID REFERENCES units(id),    -- NULL = access to all units in tenant
  role        TEXT NOT NULL DEFAULT 'nurse'
              CHECK (role IN ('super_admin', 'tenant_admin', 'nurse_manager', 'site_manager', 'charge_nurse', 'nurse', 'volunteer', 'viewer')),
  full_name   TEXT,
  active      BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE pending_invites (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email       TEXT NOT NULL UNIQUE,
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  unit_id     UUID REFERENCES units(id) ON DELETE SET NULL,
  role        TEXT NOT NULL
              CHECK (role IN ('super_admin', 'tenant_admin', 'nurse_manager', 'site_manager', 'charge_nurse', 'nurse', 'volunteer', 'viewer')),
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- INDEXES
-- ─────────────────────────────────────────────────────────────────────────────

CREATE INDEX idx_requests_room_id   ON requests(room_id);
CREATE INDEX idx_requests_status    ON requests(status);
CREATE INDEX idx_requests_created   ON requests(created_at DESC);
CREATE INDEX idx_request_feedback_created ON request_feedback(created_at DESC);
CREATE INDEX idx_request_types_tenant ON request_types(tenant_id, active, sort_order);
CREATE INDEX idx_rooms_unit_id      ON rooms(unit_id);
CREATE INDEX idx_units_site_id      ON units(site_id);
CREATE INDEX idx_sites_tenant_id    ON sites(tenant_id);
CREATE INDEX idx_profiles_tenant_id ON user_profiles(tenant_id);
CREATE INDEX idx_profiles_tenant_active ON user_profiles(tenant_id, active);
CREATE INDEX idx_pending_invites_tenant ON pending_invites(tenant_id, created_at DESC);

-- ─────────────────────────────────────────────────────────────────────────────
-- ROW LEVEL SECURITY
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE tenants       ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE sites         ENABLE ROW LEVEL SECURITY;
ALTER TABLE units         ENABLE ROW LEVEL SECURITY;
ALTER TABLE rooms         ENABLE ROW LEVEL SECURITY;
ALTER TABLE requests      ENABLE ROW LEVEL SECURITY;
ALTER TABLE request_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE request_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE pending_invites ENABLE ROW LEVEL SECURITY;

-- Helper function: get current user's tenant_id
CREATE SCHEMA IF NOT EXISTS private;

CREATE OR REPLACE FUNCTION private.current_tenant_id()
RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, auth, private AS $$
  SELECT tenant_id FROM public.user_profiles WHERE id = auth.uid() AND COALESCE(active, true) = true
$$;

CREATE OR REPLACE FUNCTION current_tenant_id()
RETURNS UUID LANGUAGE sql STABLE SET search_path = public, auth AS $$
  SELECT private.current_tenant_id()
$$;

-- Helper function: get current user's role
CREATE OR REPLACE FUNCTION private.current_user_role()
RETURNS TEXT LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, auth, private AS $$
  SELECT role FROM public.user_profiles WHERE id = auth.uid() AND COALESCE(active, true) = true
$$;

CREATE OR REPLACE FUNCTION current_user_role()
RETURNS TEXT LANGUAGE sql STABLE SET search_path = public, auth AS $$
  SELECT private.current_user_role()
$$;

-- Helper function: get current user's unit_id
CREATE OR REPLACE FUNCTION private.current_unit_id()
RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, auth, private AS $$
  SELECT unit_id FROM public.user_profiles WHERE id = auth.uid() AND COALESCE(active, true) = true
$$;

CREATE OR REPLACE FUNCTION current_unit_id()
RETURNS UUID LANGUAGE sql STABLE SET search_path = public, auth AS $$
  SELECT private.current_unit_id()
$$;

-- Helper function: manager and super admin checks
CREATE OR REPLACE FUNCTION private.is_manager_or_above()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, auth, private AS $$
  SELECT role IN ('super_admin', 'tenant_admin', 'nurse_manager', 'site_manager', 'charge_nurse')
  FROM public.user_profiles
  WHERE id = auth.uid() AND COALESCE(active, true) = true
$$;

CREATE OR REPLACE FUNCTION private.is_super_admin()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, auth, private AS $$
  SELECT role = 'super_admin'
  FROM public.user_profiles
  WHERE id = auth.uid() AND COALESCE(active, true) = true
$$;

GRANT USAGE ON SCHEMA private TO anon, authenticated;
GRANT EXECUTE ON FUNCTION private.current_tenant_id() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION private.current_user_role() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION private.current_unit_id() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION private.is_manager_or_above() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION private.is_super_admin() TO anon, authenticated;

CREATE OR REPLACE FUNCTION is_manager_or_above()
RETURNS BOOLEAN LANGUAGE sql STABLE SET search_path = public, auth AS $$
  SELECT private.is_manager_or_above()
$$;

CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS BOOLEAN LANGUAGE sql STABLE SET search_path = public, auth AS $$
  SELECT private.is_super_admin()
$$;

CREATE OR REPLACE FUNCTION public.handle_invited_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  matched_invite public.pending_invites%ROWTYPE;
BEGIN
  SELECT *
  INTO matched_invite
  FROM public.pending_invites
  WHERE lower(email) = lower(new.email)
  ORDER BY created_at DESC
  LIMIT 1;

  IF matched_invite.id IS NULL THEN
    RETURN new;
  END IF;

  INSERT INTO public.user_profiles (id, tenant_id, unit_id, role, full_name)
  VALUES (
    new.id,
    matched_invite.tenant_id,
    matched_invite.unit_id,
    matched_invite.role,
    COALESCE(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name')
  )
  ON CONFLICT (id) DO UPDATE
  SET tenant_id = EXCLUDED.tenant_id,
      unit_id = EXCLUDED.unit_id,
      role = EXCLUDED.role;

  DELETE FROM public.pending_invites WHERE id = matched_invite.id;

  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_profile ON auth.users;
CREATE TRIGGER on_auth_user_created_profile
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_invited_user();

-- ── Tenants: users can only see their own tenant ──────────────────────────────
CREATE POLICY "tenant_select" ON tenants
  FOR SELECT USING (id = current_tenant_id());

CREATE POLICY "tenant_settings_public_select" ON tenant_settings
  FOR SELECT USING (true);

CREATE POLICY "tenant_settings_manager_insert" ON tenant_settings
  FOR INSERT WITH CHECK (
    (
      tenant_id = current_tenant_id()
      AND current_user_role() IN ('tenant_admin', 'site_manager', 'charge_nurse', 'nurse_manager')
    )
    OR current_user_role() = 'super_admin'
  );

CREATE POLICY "tenant_settings_manager_update" ON tenant_settings
  FOR UPDATE USING (
    (
      tenant_id = current_tenant_id()
      AND current_user_role() IN ('tenant_admin', 'site_manager', 'charge_nurse', 'nurse_manager')
    )
    OR current_user_role() = 'super_admin'
  )
  WITH CHECK (
    (
      tenant_id = current_tenant_id()
      AND current_user_role() IN ('tenant_admin', 'site_manager', 'charge_nurse', 'nurse_manager')
    )
    OR current_user_role() = 'super_admin'
  );

-- ── Sites: scoped to tenant ───────────────────────────────────────────────────
CREATE POLICY "sites_select" ON sites
  FOR SELECT USING (tenant_id = current_tenant_id());

CREATE POLICY "sites_insert_admin" ON sites
  FOR INSERT WITH CHECK (
    tenant_id = current_tenant_id()
    AND current_user_role() IN ('tenant_admin')
  );

CREATE POLICY "sites_insert_super_admin" ON sites
  FOR INSERT WITH CHECK (current_user_role() = 'super_admin');

-- ── Units: scoped to tenant via site ─────────────────────────────────────────
CREATE POLICY "units_select" ON units
  FOR SELECT USING (
    site_id IN (SELECT id FROM sites WHERE tenant_id = current_tenant_id())
  );

CREATE POLICY "units_insert_admin" ON units
  FOR INSERT WITH CHECK (
    site_id IN (SELECT id FROM sites WHERE tenant_id = current_tenant_id())
    AND current_user_role() IN ('tenant_admin', 'site_manager')
  );

CREATE POLICY "units_insert_super_admin" ON units
  FOR INSERT WITH CHECK (current_user_role() = 'super_admin');

-- ── Rooms: publicly readable by room UUID (patient QR access) ─────────────────
-- Patients access rooms via UUID — no auth — so we allow public SELECT on rooms.
-- No PHI is exposed: only room name, unit name, site name, tenant name.
CREATE POLICY "rooms_public_select" ON rooms
  FOR SELECT USING (active = true);

CREATE POLICY "rooms_insert_admin" ON rooms
  FOR INSERT WITH CHECK (
    unit_id IN (
      SELECT u.id FROM units u
      JOIN sites s ON u.site_id = s.id
      WHERE s.tenant_id = current_tenant_id()
    )
    AND current_user_role() IN ('tenant_admin', 'site_manager', 'charge_nurse', 'nurse_manager')
  );

CREATE POLICY "rooms_insert_super_admin" ON rooms
  FOR INSERT WITH CHECK (current_user_role() = 'super_admin');

CREATE POLICY "rooms_update_staff" ON rooms
  FOR UPDATE USING (
    unit_id IN (
      SELECT u.id FROM units u
      JOIN sites s ON u.site_id = s.id
      WHERE s.tenant_id = current_tenant_id()
    )
    AND current_user_role() IN ('tenant_admin', 'site_manager', 'charge_nurse', 'nurse_manager')
  )
  WITH CHECK (
    unit_id IN (
      SELECT u.id FROM units u
      JOIN sites s ON u.site_id = s.id
      WHERE s.tenant_id = current_tenant_id()
    )
  );

CREATE POLICY "rooms_delete_admin" ON rooms
  FOR DELETE USING (
    unit_id IN (
      SELECT u.id FROM units u
      JOIN sites s ON u.site_id = s.id
      WHERE s.tenant_id = current_tenant_id()
    )
    AND current_user_role() IN ('tenant_admin', 'site_manager', 'charge_nurse', 'nurse_manager')
  );

-- ── Requests: public INSERT (patients), tenant-scoped SELECT ──────────────────
-- Patients (unauthenticated) can insert requests for any active room.
-- Patients also need SELECT on active-room requests so the QR page can
-- de-duplicate requests and show live status transitions after insert.
-- Patients can also delete still-active requests for their active room if
-- they no longer need the request, even after staff has acknowledged it.
-- Nurses can only read requests belonging to their tenant (+ optionally their unit).
CREATE POLICY "requests_public_insert" ON requests
  FOR INSERT WITH CHECK (
    room_id IN (SELECT id FROM rooms WHERE active = true)
  );

CREATE POLICY "requests_public_select" ON requests
  FOR SELECT USING (
    room_id IN (SELECT id FROM rooms WHERE active = true)
  );

CREATE POLICY "requests_public_delete" ON requests
  FOR DELETE USING (
    status IN ('pending', 'acknowledged')
    AND room_id IN (SELECT id FROM rooms WHERE active = true)
  );

CREATE POLICY "requests_nurse_select" ON requests
  FOR SELECT USING (
    room_id IN (
      SELECT r.id FROM rooms r
      JOIN units u  ON r.unit_id  = u.id
      JOIN sites s  ON u.site_id  = s.id
      WHERE s.tenant_id = current_tenant_id()
      -- If user has a unit_id assigned, scope to that unit only
      AND (current_unit_id() IS NULL OR u.id = current_unit_id())
    )
  );

CREATE POLICY "requests_nurse_update" ON requests
  FOR UPDATE USING (
    room_id IN (
      SELECT r.id FROM rooms r
      JOIN units u  ON r.unit_id  = u.id
      JOIN sites s  ON u.site_id  = s.id
      WHERE s.tenant_id = current_tenant_id()
      AND (current_unit_id() IS NULL OR u.id = current_unit_id())
    )
  );

CREATE POLICY "request_feedback_public_insert" ON request_feedback
  FOR INSERT WITH CHECK (
    request_id IN (
      SELECT req.id
      FROM public.requests req
      JOIN public.rooms r ON req.room_id = r.id
      JOIN public.units u ON r.unit_id = u.id
      JOIN public.sites s ON u.site_id = s.id
      LEFT JOIN public.tenant_settings ts ON ts.tenant_id = s.tenant_id
      WHERE req.status = 'resolved'
        AND r.active = true
        AND COALESCE(ts.patient_feedback_enabled, false) = true
    )
  );

CREATE POLICY "request_feedback_nurse_select" ON request_feedback
  FOR SELECT USING (
    request_id IN (
      SELECT r.id
      FROM public.requests r
      JOIN public.rooms rm ON r.room_id = rm.id
      JOIN public.units u  ON rm.unit_id = u.id
      JOIN public.sites s  ON u.site_id = s.id
      WHERE (
        s.tenant_id = current_tenant_id()
        AND (current_unit_id() IS NULL OR u.id = current_unit_id())
      )
      OR current_user_role() = 'super_admin'
    )
  );

-- ── Request types: public read for patient QR page, manager write per tenant ──
CREATE POLICY "request_types_public_select" ON request_types
  FOR SELECT USING (active = true);

CREATE POLICY "request_types_admin_select" ON request_types
  FOR SELECT USING (
    tenant_id = current_tenant_id()
    AND current_user_role() IN ('tenant_admin', 'site_manager', 'charge_nurse', 'super_admin', 'nurse_manager')
  );

CREATE POLICY "request_types_manager_insert" ON request_types
  FOR INSERT WITH CHECK (
    tenant_id = current_tenant_id()
    AND current_user_role() IN ('tenant_admin', 'site_manager', 'charge_nurse', 'super_admin', 'nurse_manager')
  );

CREATE POLICY "request_types_manager_update" ON request_types
  FOR UPDATE USING (
    tenant_id = current_tenant_id()
    AND current_user_role() IN ('tenant_admin', 'site_manager', 'charge_nurse', 'super_admin', 'nurse_manager')
  );

-- ── User profiles: own profile only (nurses read their own) ──────────────────
CREATE POLICY "profiles_select_own" ON user_profiles
  FOR SELECT USING (id = auth.uid());

CREATE POLICY "profiles_select_admin" ON user_profiles
  FOR SELECT USING (
    tenant_id = current_tenant_id()
    AND current_user_role() = 'tenant_admin'
  );

CREATE POLICY "profiles_update_admin" ON user_profiles
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
        current_unit_id() IS NULL
        OR unit_id IS NULL
        OR unit_id = current_unit_id()
      )
    )
  );

CREATE POLICY "pending_invites_select_admin" ON pending_invites
  FOR SELECT USING (
    current_user_role() = 'super_admin'
    OR (
      tenant_id = current_tenant_id()
      AND current_user_role() IN ('tenant_admin', 'site_manager', 'nurse_manager')
    )
  );

CREATE POLICY "pending_invites_insert_admin" ON pending_invites
  FOR INSERT WITH CHECK (
    current_user_role() = 'super_admin'
    OR (
      tenant_id = current_tenant_id()
      AND current_user_role() IN ('tenant_admin', 'site_manager', 'nurse_manager')
    )
  );

CREATE POLICY "pending_invites_delete_admin" ON pending_invites
  FOR DELETE USING (
    current_user_role() = 'super_admin'
    OR (
      tenant_id = current_tenant_id()
      AND current_user_role() IN ('tenant_admin', 'site_manager', 'nurse_manager')
    )
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- REALTIME
-- Enable real-time on requests table so nurse dashboard updates instantly
-- ─────────────────────────────────────────────────────────────────────────────
ALTER PUBLICATION supabase_realtime ADD TABLE requests;
