-- Real logo upload storage for tenant-admin org branding (review fix #1).
-- Previously, SettingsPage.tsx stored the logo as a base64 data URI directly
-- in tenant_settings.logo_url. This adds a proper Supabase Storage bucket and
-- scopes write access to each tenant's own admins.

INSERT INTO storage.buckets (id, name, public)
VALUES ('tenant-logos', 'tenant-logos', true)
ON CONFLICT (id) DO NOTHING;

-- Logos are shown on patient-facing pages, so anyone can read them.
DROP POLICY IF EXISTS "tenant_logos_public_select" ON storage.objects;
CREATE POLICY "tenant_logos_public_select" ON storage.objects
  FOR SELECT
  USING (bucket_id = 'tenant-logos');

-- Only a tenant's own tenant_admin can write to its folder, keyed by the
-- first path segment matching their tenant_id (e.g. tenant-logos/<tenant_id>/logo.png).
DROP POLICY IF EXISTS "tenant_logos_admin_insert" ON storage.objects;
CREATE POLICY "tenant_logos_admin_insert" ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'tenant-logos' AND
    public.current_user_role() = 'tenant_admin' AND
    (storage.foldername(name))[1] = public.current_tenant_id()::text
  );

DROP POLICY IF EXISTS "tenant_logos_admin_update" ON storage.objects;
CREATE POLICY "tenant_logos_admin_update" ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'tenant-logos' AND
    public.current_user_role() = 'tenant_admin' AND
    (storage.foldername(name))[1] = public.current_tenant_id()::text
  );

DROP POLICY IF EXISTS "tenant_logos_admin_delete" ON storage.objects;
CREATE POLICY "tenant_logos_admin_delete" ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'tenant-logos' AND
    public.current_user_role() = 'tenant_admin' AND
    (storage.foldername(name))[1] = public.current_tenant_id()::text
  );
