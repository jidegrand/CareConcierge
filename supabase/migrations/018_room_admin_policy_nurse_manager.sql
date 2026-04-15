DROP POLICY IF EXISTS "rooms_insert_admin" ON public.rooms;
CREATE POLICY "rooms_insert_admin" ON public.rooms
  FOR INSERT WITH CHECK (
    unit_id IN (
      SELECT u.id
      FROM public.units u
      JOIN public.sites s ON u.site_id = s.id
      WHERE s.tenant_id = current_tenant_id()
    )
    AND current_user_role() IN ('tenant_admin', 'site_manager', 'charge_nurse', 'nurse_manager')
  );

DROP POLICY IF EXISTS "rooms_update_staff" ON public.rooms;
CREATE POLICY "rooms_update_staff" ON public.rooms
  FOR UPDATE USING (
    unit_id IN (
      SELECT u.id
      FROM public.units u
      JOIN public.sites s ON u.site_id = s.id
      WHERE s.tenant_id = current_tenant_id()
    )
    AND current_user_role() IN ('tenant_admin', 'site_manager', 'charge_nurse', 'nurse_manager')
  )
  WITH CHECK (
    unit_id IN (
      SELECT u.id
      FROM public.units u
      JOIN public.sites s ON u.site_id = s.id
      WHERE s.tenant_id = current_tenant_id()
    )
  );

DROP POLICY IF EXISTS "rooms_delete_admin" ON public.rooms;
CREATE POLICY "rooms_delete_admin" ON public.rooms
  FOR DELETE USING (
    unit_id IN (
      SELECT u.id
      FROM public.units u
      JOIN public.sites s ON u.site_id = s.id
      WHERE s.tenant_id = current_tenant_id()
    )
    AND current_user_role() IN ('tenant_admin', 'site_manager', 'charge_nurse', 'nurse_manager')
  );
