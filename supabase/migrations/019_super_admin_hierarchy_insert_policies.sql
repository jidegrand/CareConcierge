-- Restore super admin create access across the tenant hierarchy.
-- The platform UI already exposes Sites & Rooms management to super admins,
-- but the RLS bundle only granted select/update/delete on these tables.

DROP POLICY IF EXISTS "sites_insert_super_admin" ON public.sites;
CREATE POLICY "sites_insert_super_admin" ON public.sites
  FOR INSERT
  WITH CHECK (current_user_role() = 'super_admin');

DROP POLICY IF EXISTS "units_insert_super_admin" ON public.units;
CREATE POLICY "units_insert_super_admin" ON public.units
  FOR INSERT
  WITH CHECK (current_user_role() = 'super_admin');

DROP POLICY IF EXISTS "rooms_insert_super_admin" ON public.rooms;
CREATE POLICY "rooms_insert_super_admin" ON public.rooms
  FOR INSERT
  WITH CHECK (current_user_role() = 'super_admin');
