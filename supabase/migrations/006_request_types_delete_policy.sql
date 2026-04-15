-- Allow manager-level roles to delete non-system request types within their tenant.

DROP POLICY IF EXISTS "request_types_manager_delete" ON public.request_types;
CREATE POLICY "request_types_manager_delete" ON public.request_types
  FOR DELETE USING (
    current_user_role() = 'super_admin' OR (
      tenant_id = current_tenant_id()
      AND current_user_role() IN ('tenant_admin', 'site_manager', 'charge_nurse', 'nurse_manager')
      AND system = false
    )
  );
