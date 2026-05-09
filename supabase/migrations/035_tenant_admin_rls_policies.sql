-- Add RLS policies for tenant_admin role to manage their organization
-- Enables organization admins to independently manage users, settings, and data

-- ============================================================================
-- tenant_settings: tenant_admin can read/update their own settings
-- ============================================================================

DROP POLICY IF EXISTS "settings_tenant_admin_select" ON public.tenant_settings;
CREATE POLICY "settings_tenant_admin_select" ON public.tenant_settings
  FOR SELECT
  USING (tenant_id = public.current_tenant_id());

DROP POLICY IF EXISTS "settings_tenant_admin_update" ON public.tenant_settings;
CREATE POLICY "settings_tenant_admin_update" ON public.tenant_settings
  FOR UPDATE
  USING (
    tenant_id = public.current_tenant_id() AND
    public.current_user_role() IN ('tenant_admin', 'super_admin')
  )
  WITH CHECK (
    tenant_id = public.current_tenant_id() AND
    public.current_user_role() IN ('tenant_admin', 'super_admin')
  );

-- ============================================================================
-- onboarding_checklist: tenant_admin can read/update their checklist
-- ============================================================================

DROP POLICY IF EXISTS "onboarding_tenant_admin_select" ON public.onboarding_checklist;
CREATE POLICY "onboarding_tenant_admin_select" ON public.onboarding_checklist
  FOR SELECT
  USING (tenant_id = public.current_tenant_id());

DROP POLICY IF EXISTS "onboarding_tenant_admin_update" ON public.onboarding_checklist;
CREATE POLICY "onboarding_tenant_admin_update" ON public.onboarding_checklist
  FOR UPDATE
  USING (
    tenant_id = public.current_tenant_id() AND
    public.current_user_role() IN ('tenant_admin', 'super_admin')
  )
  WITH CHECK (
    tenant_id = public.current_tenant_id() AND
    public.current_user_role() IN ('tenant_admin', 'super_admin')
  );

DROP POLICY IF EXISTS "onboarding_tenant_admin_insert" ON public.onboarding_checklist;
CREATE POLICY "onboarding_tenant_admin_insert" ON public.onboarding_checklist
  FOR INSERT
  WITH CHECK (
    tenant_id = public.current_tenant_id() AND
    public.current_user_role() IN ('tenant_admin', 'super_admin')
  );

-- ============================================================================
-- user_profiles: tenant_admin can read all users in their tenant
-- ============================================================================

DROP POLICY IF EXISTS "profiles_tenant_admin_select" ON public.user_profiles;
CREATE POLICY "profiles_tenant_admin_select" ON public.user_profiles
  FOR SELECT
  USING (
    tenant_id = public.current_tenant_id() AND
    public.current_user_role() IN ('tenant_admin', 'super_admin', 'nurse_manager', 'site_manager')
  );

-- tenant_admin can update roles/assignments for users in their tenant (except super_admin)
DROP POLICY IF EXISTS "profiles_tenant_admin_update" ON public.user_profiles;
CREATE POLICY "profiles_tenant_admin_update" ON public.user_profiles
  FOR UPDATE
  USING (
    tenant_id = public.current_tenant_id() AND
    public.current_user_role() = 'tenant_admin' AND
    role != 'super_admin'  -- Can't modify super_admin users
  )
  WITH CHECK (
    tenant_id = public.current_tenant_id() AND
    role != 'super_admin'
  );

-- ============================================================================
-- pending_invites: tenant_admin can view and create invites for their tenant
-- ============================================================================

DROP POLICY IF EXISTS "pending_invites_tenant_admin_select" ON public.pending_invites;
CREATE POLICY "pending_invites_tenant_admin_select" ON public.pending_invites
  FOR SELECT
  USING (
    tenant_id = public.current_tenant_id() AND
    public.current_user_role() IN ('tenant_admin', 'super_admin')
  );

DROP POLICY IF EXISTS "pending_invites_tenant_admin_insert" ON public.pending_invites;
CREATE POLICY "pending_invites_tenant_admin_insert" ON public.pending_invites
  FOR INSERT
  WITH CHECK (
    tenant_id = public.current_tenant_id() AND
    public.current_user_role() IN ('tenant_admin', 'super_admin')
  );

DROP POLICY IF EXISTS "pending_invites_tenant_admin_delete" ON public.pending_invites;
CREATE POLICY "pending_invites_tenant_admin_delete" ON public.pending_invites
  FOR DELETE
  USING (
    tenant_id = public.current_tenant_id() AND
    public.current_user_role() IN ('tenant_admin', 'super_admin')
  );

-- ============================================================================
-- sites, units, rooms: tenant_admin can view all, but only super_admin can delete
-- (to prevent accidental loss of data)
-- ============================================================================

-- Note: Existing policies already allow tenant scoping via RLS.
-- These are additional tenant_admin-specific permissions.

DROP POLICY IF EXISTS "sites_tenant_admin_select" ON public.sites;
CREATE POLICY "sites_tenant_admin_select" ON public.sites
  FOR SELECT
  USING (
    tenant_id = public.current_tenant_id() AND
    public.current_user_role() IN ('tenant_admin', 'super_admin', 'nurse_manager')
  );

DROP POLICY IF EXISTS "units_tenant_admin_select" ON public.units;
CREATE POLICY "units_tenant_admin_select" ON public.units
  FOR SELECT
  USING (
    public.current_user_role() IN ('tenant_admin', 'super_admin', 'nurse_manager') AND
    EXISTS (
      SELECT 1 FROM public.sites
      WHERE sites.id = units.site_id
      AND sites.tenant_id = public.current_tenant_id()
    )
  );

DROP POLICY IF EXISTS "rooms_tenant_admin_select" ON public.rooms;
CREATE POLICY "rooms_tenant_admin_select" ON public.rooms
  FOR SELECT
  USING (
    public.current_user_role() IN ('tenant_admin', 'super_admin', 'nurse_manager') AND
    EXISTS (
      SELECT 1 FROM public.units
      LEFT JOIN public.sites ON units.site_id = sites.id
      WHERE units.id = rooms.unit_id
      AND sites.tenant_id = public.current_tenant_id()
    )
  );

-- ============================================================================
-- request_types: tenant_admin can read/create custom request types
-- ============================================================================

DROP POLICY IF EXISTS "request_types_tenant_admin_select" ON public.request_types;
CREATE POLICY "request_types_tenant_admin_select" ON public.request_types
  FOR SELECT
  USING (
    tenant_id = public.current_tenant_id() AND
    public.current_user_role() IN ('tenant_admin', 'super_admin', 'nurse_manager')
  );

DROP POLICY IF EXISTS "request_types_tenant_admin_insert" ON public.request_types;
CREATE POLICY "request_types_tenant_admin_insert" ON public.request_types
  FOR INSERT
  WITH CHECK (
    tenant_id = public.current_tenant_id() AND
    public.current_user_role() IN ('tenant_admin', 'super_admin')
  );

DROP POLICY IF EXISTS "request_types_tenant_admin_update" ON public.request_types;
CREATE POLICY "request_types_tenant_admin_update" ON public.request_types
  FOR UPDATE
  USING (
    tenant_id = public.current_tenant_id() AND
    public.current_user_role() IN ('tenant_admin', 'super_admin')
  )
  WITH CHECK (
    tenant_id = public.current_tenant_id()
  );

-- ============================================================================
-- request_audit_log: tenant_admin can view audit logs for their requests
-- ============================================================================

DROP POLICY IF EXISTS "audit_log_tenant_admin_select" ON public.request_audit_log;
CREATE POLICY "audit_log_tenant_admin_select" ON public.request_audit_log
  FOR SELECT
  USING (
    tenant_id = public.current_tenant_id() AND
    public.current_user_role() IN ('tenant_admin', 'super_admin')
  );

-- ============================================================================
-- tenant_licenses: tenant_admin can view their license info
-- ============================================================================

DROP POLICY IF EXISTS "licenses_tenant_admin_select" ON public.tenant_licenses;
CREATE POLICY "licenses_tenant_admin_select" ON public.tenant_licenses
  FOR SELECT
  USING (
    tenant_id = public.current_tenant_id() AND
    public.current_user_role() IN ('tenant_admin', 'super_admin')
  );
