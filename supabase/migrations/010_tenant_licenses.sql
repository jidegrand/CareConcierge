-- Platform licensing records for organization-level contract management.

CREATE TABLE IF NOT EXISTS tenant_licenses (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL UNIQUE REFERENCES tenants(id) ON DELETE CASCADE,
  status      TEXT NOT NULL DEFAULT 'trial'
              CHECK (status IN ('trial', 'active', 'suspended', 'archived')),
  plan        TEXT NOT NULL DEFAULT 'pilot'
              CHECK (plan IN ('pilot', 'standard', 'enterprise', 'custom')),
  site_limit  INTEGER,
  unit_limit  INTEGER,
  room_limit  INTEGER,
  user_limit  INTEGER,
  starts_at   DATE DEFAULT CURRENT_DATE,
  expires_at  DATE,
  features    JSONB NOT NULL DEFAULT '{}'::jsonb,
  notes       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE tenant_licenses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_licenses_select_super_admin" ON tenant_licenses;
CREATE POLICY "tenant_licenses_select_super_admin" ON tenant_licenses
  FOR SELECT
  USING (current_user_role() = 'super_admin');

DROP POLICY IF EXISTS "tenant_licenses_insert_super_admin" ON tenant_licenses;
CREATE POLICY "tenant_licenses_insert_super_admin" ON tenant_licenses
  FOR INSERT
  WITH CHECK (current_user_role() = 'super_admin');

DROP POLICY IF EXISTS "tenant_licenses_update_super_admin" ON tenant_licenses;
CREATE POLICY "tenant_licenses_update_super_admin" ON tenant_licenses
  FOR UPDATE
  USING (current_user_role() = 'super_admin')
  WITH CHECK (current_user_role() = 'super_admin');

DROP POLICY IF EXISTS "tenant_licenses_delete_super_admin" ON tenant_licenses;
CREATE POLICY "tenant_licenses_delete_super_admin" ON tenant_licenses
  FOR DELETE
  USING (current_user_role() = 'super_admin');

CREATE INDEX IF NOT EXISTS idx_tenant_licenses_status ON tenant_licenses(status);

INSERT INTO tenant_licenses (tenant_id, status, plan, starts_at, updated_at)
SELECT id, 'trial', 'pilot', CURRENT_DATE, now()
FROM tenants
ON CONFLICT (tenant_id) DO NOTHING;
