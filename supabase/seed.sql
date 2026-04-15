-- ─────────────────────────────────────────────────────────────────────────────
-- Care Concierge — Demo Seed Data
-- Run AFTER schema.sql
-- This creates a demo tenant, site, unit, and 6 bays for local testing.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Tenant: Scarborough Health Network ───────────────────────────────────────
INSERT INTO tenants (id, name, slug) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Scarborough Health Network', 'shn');

-- ── Site: Birchmount Campus ───────────────────────────────────────────────────
INSERT INTO sites (id, tenant_id, name, slug) VALUES
  ('00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000001', 'Birchmount Campus', 'birchmount');

-- ── Unit: Emergency Department ────────────────────────────────────────────────
INSERT INTO units (id, site_id, name, slug) VALUES
  ('00000000-0000-0000-0000-000000000100', '00000000-0000-0000-0000-000000000010', 'Emergency Department', 'ed');

-- ── Rooms: Bay 1–6 ───────────────────────────────────────────────────────────
INSERT INTO rooms (id, unit_id, name, label) VALUES
  ('00000000-0000-0000-0001-000000000001', '00000000-0000-0000-0000-000000000100', 'Bay 1', 'ED Bay 1'),
  ('00000000-0000-0000-0001-000000000002', '00000000-0000-0000-0000-000000000100', 'Bay 2', 'ED Bay 2'),
  ('00000000-0000-0000-0001-000000000003', '00000000-0000-0000-0000-000000000100', 'Bay 3', 'ED Bay 3'),
  ('00000000-0000-0000-0001-000000000004', '00000000-0000-0000-0000-000000000100', 'Bay 4', 'ED Bay 4'),
  ('00000000-0000-0000-0001-000000000005', '00000000-0000-0000-0000-000000000100', 'Bay 5', 'ED Bay 5'),
  ('00000000-0000-0000-0001-000000000006', '00000000-0000-0000-0000-000000000100', 'Bay 6', 'ED Bay 6');

-- ── Default patient request tiles ────────────────────────────────────────────
INSERT INTO request_types (tenant_id, id, label, icon, color, urgent, active, sort_order, system) VALUES
  ('00000000-0000-0000-0000-000000000001', 'water',       'Water',             '💧', '#3B82F6', false, true, 0, false),
  ('00000000-0000-0000-0000-000000000001', 'blanket',     'Blanket',           '🛏️', '#8B5CF6', false, true, 1, false),
  ('00000000-0000-0000-0000-000000000001', 'pain',        'Pain / Discomfort', '⚠️', '#EF4444', true,  true, 2, false),
  ('00000000-0000-0000-0000-000000000001', 'medication',  'Medication',        '💊', '#F59E0B', true,  true, 3, false),
  ('00000000-0000-0000-0000-000000000001', 'bathroom',    'Bathroom Help',     '🚶', '#10B981', false, true, 4, false),
  ('00000000-0000-0000-0000-000000000001', 'nurse',       'Call Nurse',        '🔔', '#EC4899', true,  true, 5, true),
  ('00000000-0000-0000-0000-000000000001', 'food',        'Food / Snack',      '🍽️', '#6366F1', false, true, 6, false),
  ('00000000-0000-0000-0000-000000000001', 'temperature', 'Too Hot / Cold',    '🌡️', '#14B8A6', false, true, 7, false);

-- ─────────────────────────────────────────────────────────────────────────────
-- After running this seed, patient QR URLs will look like:
--   http://localhost:5173/r/00000000-0000-0000-0001-000000000001  (Bay 1)
--   http://localhost:5173/r/00000000-0000-0000-0001-000000000002  (Bay 2)
--   etc.
-- ─────────────────────────────────────────────────────────────────────────────
