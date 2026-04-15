-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 004: Tenant-scoped request types for patient/common-request tiles
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS request_types (
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

CREATE INDEX IF NOT EXISTS idx_request_types_tenant
  ON request_types(tenant_id, active, sort_order);

ALTER TABLE request_types ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "request_types_public_select" ON request_types;
CREATE POLICY "request_types_public_select" ON request_types
  FOR SELECT USING (active = true);

DROP POLICY IF EXISTS "request_types_admin_select" ON request_types;
CREATE POLICY "request_types_admin_select" ON request_types
  FOR SELECT USING (
    current_user_role() = 'super_admin' OR (
      tenant_id = current_tenant_id()
      AND current_user_role() IN ('tenant_admin', 'site_manager', 'charge_nurse', 'nurse_manager')
    )
  );

DROP POLICY IF EXISTS "request_types_manager_insert" ON request_types;
CREATE POLICY "request_types_manager_insert" ON request_types
  FOR INSERT WITH CHECK (
    current_user_role() = 'super_admin' OR (
      tenant_id = current_tenant_id()
      AND current_user_role() IN ('tenant_admin', 'site_manager', 'charge_nurse', 'nurse_manager')
    )
  );

DROP POLICY IF EXISTS "request_types_manager_update" ON request_types;
CREATE POLICY "request_types_manager_update" ON request_types
  FOR UPDATE USING (
    current_user_role() = 'super_admin' OR (
      tenant_id = current_tenant_id()
      AND current_user_role() IN ('tenant_admin', 'site_manager', 'charge_nurse', 'nurse_manager')
    )
  );

INSERT INTO request_types (tenant_id, id, label, icon, color, urgent, active, sort_order, system)
SELECT
  t.id,
  v.id,
  v.label,
  v.icon,
  v.color,
  v.urgent,
  true,
  v.sort_order,
  (v.id = 'nurse') AS system
FROM tenants t
CROSS JOIN (
  VALUES
    ('water',       'Water',               '💧', '#3B82F6', false, 0),
    ('blanket',     'Blanket',             '🛏️', '#8B5CF6', false, 1),
    ('pain',        'Pain / Discomfort',   '⚠️', '#EF4444', true,  2),
    ('medication',  'Medication',          '💊', '#F59E0B', true,  3),
    ('bathroom',    'Bathroom Help',       '🚶', '#10B981', false, 4),
    ('nurse',       'Call Nurse',          '🔔', '#EC4899', true,  5),
    ('food',        'Food / Snack',        '🍽️', '#6366F1', false, 6),
    ('temperature', 'Too Hot / Cold',      '🌡️', '#14B8A6', false, 7)
) AS v(id, label, icon, color, urgent, sort_order)
ON CONFLICT (tenant_id, id) DO NOTHING;
