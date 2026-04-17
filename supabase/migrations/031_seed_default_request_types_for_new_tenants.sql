-- Seed the common patient request catalog for every tenant.
-- This fixes existing organizations that were created without request_types
-- and ensures future tenant inserts receive the default request tiles.

CREATE OR REPLACE FUNCTION private.seed_default_request_types_for_tenant()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
BEGIN
  INSERT INTO public.request_types (tenant_id, id, label, icon, color, urgent, active, sort_order, system)
  VALUES
    (NEW.id, 'water',       'Water',             '💧', '#3B82F6', false, true, 0, false),
    (NEW.id, 'blanket',     'Blanket',           '🛏️', '#8B5CF6', false, true, 1, false),
    (NEW.id, 'pain',        'Pain / Discomfort', '⚠️', '#EF4444', true,  true, 2, false),
    (NEW.id, 'medication',  'Medication',        '💊', '#F59E0B', true,  true, 3, false),
    (NEW.id, 'bathroom',    'Bathroom Help',     '🚶', '#10B981', false, true, 4, false),
    (NEW.id, 'nurse',       'Call Nurse',        '🔔', '#EC4899', true,  true, 5, true),
    (NEW.id, 'food',        'Food / Snack',      '🍽️', '#6366F1', false, true, 6, false),
    (NEW.id, 'temperature', 'Too Hot / Cold',    '🌡️', '#14B8A6', false, true, 7, false)
  ON CONFLICT (tenant_id, id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS seed_default_request_types_on_tenant_insert ON public.tenants;
CREATE TRIGGER seed_default_request_types_on_tenant_insert
  AFTER INSERT ON public.tenants
  FOR EACH ROW
  EXECUTE FUNCTION private.seed_default_request_types_for_tenant();

INSERT INTO public.request_types (tenant_id, id, label, icon, color, urgent, active, sort_order, system)
SELECT
  t.id,
  seeded.id,
  seeded.label,
  seeded.icon,
  seeded.color,
  seeded.urgent,
  true,
  seeded.sort_order,
  seeded.system
FROM public.tenants t
CROSS JOIN (
  VALUES
    ('water',       'Water',             '💧', '#3B82F6', false, 0, false),
    ('blanket',     'Blanket',           '🛏️', '#8B5CF6', false, 1, false),
    ('pain',        'Pain / Discomfort', '⚠️', '#EF4444', true,  2, false),
    ('medication',  'Medication',        '💊', '#F59E0B', true,  3, false),
    ('bathroom',    'Bathroom Help',     '🚶', '#10B981', false, 4, false),
    ('nurse',       'Call Nurse',        '🔔', '#EC4899', true,  5, true),
    ('food',        'Food / Snack',      '🍽️', '#6366F1', false, 6, false),
    ('temperature', 'Too Hot / Cold',    '🌡️', '#14B8A6', false, 7, false)
) AS seeded(id, label, icon, color, urgent, sort_order, system)
ON CONFLICT (tenant_id, id) DO NOTHING;
