-- Allow ExtendiHealth super admins to manage tenant organizations directly
-- and operate across the tenant hierarchy from the platform control plane.

DROP POLICY IF EXISTS "tenant_insert_super_admin" ON tenants;
CREATE POLICY "tenant_insert_super_admin" ON tenants
  FOR INSERT
  WITH CHECK (current_user_role() = 'super_admin');

DROP POLICY IF EXISTS "tenant_update_super_admin" ON tenants;
CREATE POLICY "tenant_update_super_admin" ON tenants
  FOR UPDATE
  USING (current_user_role() = 'super_admin')
  WITH CHECK (current_user_role() = 'super_admin');

DROP POLICY IF EXISTS "tenant_delete_super_admin" ON tenants;
CREATE POLICY "tenant_delete_super_admin" ON tenants
  FOR DELETE
  USING (current_user_role() = 'super_admin');

DROP POLICY IF EXISTS "sites_update_super_admin" ON sites;
CREATE POLICY "sites_update_super_admin" ON sites
  FOR UPDATE
  USING (current_user_role() = 'super_admin')
  WITH CHECK (current_user_role() = 'super_admin');

DROP POLICY IF EXISTS "sites_delete_super_admin" ON sites;
CREATE POLICY "sites_delete_super_admin" ON sites
  FOR DELETE
  USING (current_user_role() = 'super_admin');

DROP POLICY IF EXISTS "units_select_super_admin" ON units;
CREATE POLICY "units_select_super_admin" ON units
  FOR SELECT
  USING (current_user_role() = 'super_admin');

DROP POLICY IF EXISTS "units_update_super_admin" ON units;
CREATE POLICY "units_update_super_admin" ON units
  FOR UPDATE
  USING (current_user_role() = 'super_admin')
  WITH CHECK (current_user_role() = 'super_admin');

DROP POLICY IF EXISTS "units_delete_super_admin" ON units;
CREATE POLICY "units_delete_super_admin" ON units
  FOR DELETE
  USING (current_user_role() = 'super_admin');

DROP POLICY IF EXISTS "rooms_select_super_admin" ON rooms;
CREATE POLICY "rooms_select_super_admin" ON rooms
  FOR SELECT
  USING (current_user_role() = 'super_admin');

DROP POLICY IF EXISTS "rooms_update_super_admin" ON rooms;
CREATE POLICY "rooms_update_super_admin" ON rooms
  FOR UPDATE
  USING (current_user_role() = 'super_admin')
  WITH CHECK (current_user_role() = 'super_admin');

DROP POLICY IF EXISTS "rooms_delete_super_admin" ON rooms;
CREATE POLICY "rooms_delete_super_admin" ON rooms
  FOR DELETE
  USING (current_user_role() = 'super_admin');

DROP POLICY IF EXISTS "requests_select_super_admin" ON requests;
CREATE POLICY "requests_select_super_admin" ON requests
  FOR SELECT
  USING (current_user_role() = 'super_admin');

DROP POLICY IF EXISTS "requests_update_super_admin" ON requests;
CREATE POLICY "requests_update_super_admin" ON requests
  FOR UPDATE
  USING (current_user_role() = 'super_admin')
  WITH CHECK (current_user_role() = 'super_admin');

DROP POLICY IF EXISTS "profiles_update_super_admin" ON user_profiles;
CREATE POLICY "profiles_update_super_admin" ON user_profiles
  FOR UPDATE
  USING (current_user_role() = 'super_admin')
  WITH CHECK (current_user_role() = 'super_admin');

DROP POLICY IF EXISTS "profiles_delete_super_admin" ON user_profiles;
CREATE POLICY "profiles_delete_super_admin" ON user_profiles
  FOR DELETE
  USING (current_user_role() = 'super_admin');
