-- Reconcile tenant_licenses.features keys with the new shared catalog in
-- src/lib/licenseFeatures.ts (LICENSING_ACTION_PLAN #5).
--
-- - 'global_reports' is renamed to 'reports' (matches the tenant-facing
--   "Reports & Analytics" feature and PlatformLicensingPage's entitlement key).
-- - 'audit_logs' is backfilled to true for all tenants that already have the
--   other entitlements enabled, since Audit Logs is a real, shipped feature
--   (src/pages/tenant-admin/AuditLogsPage) that every existing tenant already
--   has access to today.
--
-- 'api_access' is left as-is (still 'coming_soon' in the catalog, not yet a
-- real feature) and 'dedicated_support'/'analytics'/'sso' were never stored
-- in tenant_licenses.features, so there's nothing to migrate for those.

UPDATE public.tenant_licenses
SET features = (features - 'global_reports')
  || jsonb_build_object('reports', true, 'audit_logs', true)
WHERE features ? 'global_reports';
