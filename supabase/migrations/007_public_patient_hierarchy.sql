-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 007: Allow patient/mobile routes to resolve active room hierarchy
-- ─────────────────────────────────────────────────────────────────────────────

CREATE SCHEMA IF NOT EXISTS private;

CREATE OR REPLACE FUNCTION private.unit_has_active_room(target_unit_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM rooms
    WHERE unit_id = target_unit_id
      AND active = true
  );
$$;

CREATE OR REPLACE FUNCTION private.site_has_active_room(target_site_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM units
    JOIN rooms ON rooms.unit_id = units.id
    WHERE units.site_id = target_site_id
      AND rooms.active = true
  );
$$;

CREATE OR REPLACE FUNCTION private.tenant_has_active_room(target_tenant_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM sites
    JOIN units ON units.site_id = sites.id
    JOIN rooms ON rooms.unit_id = units.id
    WHERE sites.tenant_id = target_tenant_id
      AND rooms.active = true
  );
$$;

GRANT USAGE ON SCHEMA private TO anon, authenticated;
GRANT EXECUTE ON FUNCTION private.unit_has_active_room(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION private.site_has_active_room(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION private.tenant_has_active_room(UUID) TO anon, authenticated;

DROP POLICY IF EXISTS "units_public_room_select" ON units;
CREATE POLICY "units_public_room_select" ON units
  FOR SELECT USING (private.unit_has_active_room(id));

DROP POLICY IF EXISTS "sites_public_room_select" ON sites;
CREATE POLICY "sites_public_room_select" ON sites
  FOR SELECT USING (private.site_has_active_room(id));

DROP POLICY IF EXISTS "tenants_public_room_select" ON tenants;
CREATE POLICY "tenants_public_room_select" ON tenants
  FOR SELECT USING (private.tenant_has_active_room(id));
