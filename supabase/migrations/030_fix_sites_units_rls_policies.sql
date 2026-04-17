-- Migration 030: Fix missing RLS policies for sites and units
--
-- Problem: super_admin has no SELECT policy on sites/units (current_tenant_id()
-- returns NULL for super_admin, so the tenant-scoped SELECT never matches).
-- Inserts succeed but the subsequent refresh SELECT returns empty results,
-- making new entries appear unsaved.
--
-- Also adds missing UPDATE and DELETE policies for sites and units that were
-- never created (all edits/deletes were silently rejected by RLS).

-- ── Sites: add super_admin SELECT, and UPDATE/DELETE for admins ───────────────

CREATE POLICY "sites_select_super_admin" ON sites
  FOR SELECT USING (current_user_role() = 'super_admin');

CREATE POLICY "sites_update_admin" ON sites
  FOR UPDATE
  USING (
    tenant_id = current_tenant_id()
    AND current_user_role() IN ('tenant_admin')
  )
  WITH CHECK (
    tenant_id = current_tenant_id()
    AND current_user_role() IN ('tenant_admin')
  );

CREATE POLICY "sites_update_super_admin" ON sites
  FOR UPDATE
  USING (current_user_role() = 'super_admin')
  WITH CHECK (current_user_role() = 'super_admin');

CREATE POLICY "sites_delete_admin" ON sites
  FOR DELETE USING (
    tenant_id = current_tenant_id()
    AND current_user_role() IN ('tenant_admin')
  );

CREATE POLICY "sites_delete_super_admin" ON sites
  FOR DELETE USING (current_user_role() = 'super_admin');

-- ── Units: add super_admin SELECT, and UPDATE/DELETE for admins ───────────────

CREATE POLICY "units_select_super_admin" ON units
  FOR SELECT USING (current_user_role() = 'super_admin');

CREATE POLICY "units_update_admin" ON units
  FOR UPDATE
  USING (
    site_id IN (SELECT id FROM sites WHERE tenant_id = current_tenant_id())
    AND current_user_role() IN ('tenant_admin', 'site_manager', 'nurse_manager')
  )
  WITH CHECK (
    site_id IN (SELECT id FROM sites WHERE tenant_id = current_tenant_id())
    AND current_user_role() IN ('tenant_admin', 'site_manager', 'nurse_manager')
  );

CREATE POLICY "units_update_super_admin" ON units
  FOR UPDATE
  USING (current_user_role() = 'super_admin')
  WITH CHECK (current_user_role() = 'super_admin');

CREATE POLICY "units_delete_admin" ON units
  FOR DELETE USING (
    site_id IN (SELECT id FROM sites WHERE tenant_id = current_tenant_id())
    AND current_user_role() IN ('tenant_admin', 'site_manager', 'nurse_manager')
  );

CREATE POLICY "units_delete_super_admin" ON units
  FOR DELETE USING (current_user_role() = 'super_admin');

-- ── Rooms: add staff SELECT so inactive rooms are visible in admin panel ──────
-- rooms_public_select only covers active=true (for patients).
-- Staff need to see inactive rooms in the admin panel.

CREATE POLICY "rooms_select_staff" ON rooms
  FOR SELECT USING (
    unit_id IN (
      SELECT u.id FROM units u
      JOIN sites s ON u.site_id = s.id
      WHERE s.tenant_id = current_tenant_id()
    )
    AND current_user_role() IN (
      'tenant_admin', 'site_manager', 'nurse_manager',
      'charge_nurse', 'nurse', 'volunteer', 'viewer'
    )
  );

CREATE POLICY "rooms_select_super_admin" ON rooms
  FOR SELECT USING (current_user_role() = 'super_admin');
