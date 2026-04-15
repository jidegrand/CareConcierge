-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 003: Update role system to four-role hierarchy
-- Run in Supabase SQL Editor
-- ─────────────────────────────────────────────────────────────────────────────

-- Step 1: Drop existing role CHECK constraint
ALTER TABLE user_profiles DROP CONSTRAINT IF EXISTS user_profiles_role_check;

-- Step 2: Migrate existing role values to new system
UPDATE user_profiles SET role = 'super_admin'   WHERE role = 'tenant_admin';
UPDATE user_profiles SET role = 'nurse_manager' WHERE role IN ('site_manager', 'charge_nurse');
UPDATE user_profiles SET role = 'nurse'         WHERE role = 'nurse';
UPDATE user_profiles SET role = 'volunteer'     WHERE role = 'viewer';

-- Step 3: Add new CHECK constraint
ALTER TABLE user_profiles
  ADD CONSTRAINT user_profiles_role_check
  CHECK (role IN ('super_admin', 'nurse_manager', 'nurse', 'volunteer'));

-- Step 4: Update default
ALTER TABLE user_profiles ALTER COLUMN role SET DEFAULT 'nurse';

-- Step 5: Update RLS helper functions

-- Super admin bypasses tenant scoping — they see all
CREATE OR REPLACE FUNCTION current_user_role()
RETURNS TEXT LANGUAGE sql STABLE AS $$
  SELECT role FROM user_profiles WHERE id = auth.uid()
$$;

-- Nurse managers and above can access admin features
CREATE OR REPLACE FUNCTION is_manager_or_above()
RETURNS BOOLEAN LANGUAGE sql STABLE AS $$
  SELECT role IN ('super_admin', 'nurse_manager')
  FROM user_profiles WHERE id = auth.uid()
$$;

-- Super admin check
CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS BOOLEAN LANGUAGE sql STABLE AS $$
  SELECT role = 'super_admin'
  FROM user_profiles WHERE id = auth.uid()
$$;

-- Step 6: Update RLS policies

-- Requests: volunteers can acknowledge but not resolve
-- (Resolve is enforced at app layer — DB allows update for simplicity)

-- Tenants: super_admin can see all tenants, others scoped to their own
DROP POLICY IF EXISTS "tenant_select" ON tenants;
CREATE POLICY "tenant_select" ON tenants
  FOR SELECT USING (
    is_super_admin() OR id = current_tenant_id()
  );

-- Sites: super_admin sees all
DROP POLICY IF EXISTS "sites_select" ON sites;
CREATE POLICY "sites_select" ON sites
  FOR SELECT USING (
    is_super_admin() OR tenant_id = current_tenant_id()
  );

DROP POLICY IF EXISTS "sites_insert_admin" ON sites;
CREATE POLICY "sites_insert_admin" ON sites
  FOR INSERT WITH CHECK (
    is_super_admin() OR (
      tenant_id = current_tenant_id()
      AND current_user_role() = 'nurse_manager'
    )
  );

-- Units
DROP POLICY IF EXISTS "units_insert_admin" ON units;
CREATE POLICY "units_insert_admin" ON units
  FOR INSERT WITH CHECK (
    is_super_admin() OR (
      site_id IN (SELECT id FROM sites WHERE tenant_id = current_tenant_id())
      AND current_user_role() IN ('nurse_manager')
    )
  );

-- Rooms
DROP POLICY IF EXISTS "rooms_insert_admin" ON rooms;
CREATE POLICY "rooms_insert_admin" ON rooms
  FOR INSERT WITH CHECK (
    is_super_admin() OR (
      unit_id IN (
        SELECT u.id FROM units u
        JOIN sites s ON u.site_id = s.id
        WHERE s.tenant_id = current_tenant_id()
      )
      AND current_user_role() IN ('nurse_manager')
    )
  );

-- User profiles: manager can manage own unit users
DROP POLICY IF EXISTS "profiles_select_admin" ON user_profiles;
CREATE POLICY "profiles_select_admin" ON user_profiles
  FOR SELECT USING (
    is_super_admin()
    OR id = auth.uid()
    OR (
      tenant_id = current_tenant_id()
      AND current_user_role() IN ('nurse_manager')
    )
  );

-- Step 7: Index for role lookups
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON user_profiles(role);

-- ─────────────────────────────────────────────────────────────────────────────
-- SEED: Update a bootstrap user to super_admin (run separately after setup)
-- Replace 'your@email.com' with your actual login email
-- ─────────────────────────────────────────────────────────────────────────────
-- UPDATE user_profiles
-- SET role = 'super_admin', full_name = 'Jide Grand'
-- FROM auth.users
-- WHERE user_profiles.id = auth.users.id
-- AND auth.users.email = 'your@email.com';
