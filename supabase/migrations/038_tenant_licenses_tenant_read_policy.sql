-- Allow tenant members to read their own organization's license.
-- Previously only super_admin could SELECT from tenant_licenses, so
-- the tenant-admin licensing page always fell back to pilot/trial defaults.
CREATE POLICY tenant_licenses_select_own_tenant
  ON public.tenant_licenses
  FOR SELECT
  USING (
    tenant_id = current_tenant_id()
    OR current_user_role() = 'super_admin'
  );
