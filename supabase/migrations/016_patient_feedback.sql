CREATE TABLE IF NOT EXISTS public.tenant_settings (
  tenant_id                 UUID PRIMARY KEY REFERENCES public.tenants(id) ON DELETE CASCADE,
  patient_feedback_enabled  BOOLEAN NOT NULL DEFAULT false,
  created_at                TIMESTAMPTZ DEFAULT now(),
  updated_at                TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.request_feedback (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id  UUID NOT NULL UNIQUE REFERENCES public.requests(id) ON DELETE CASCADE,
  rating      SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_request_feedback_created
  ON public.request_feedback(created_at DESC);

ALTER TABLE public.tenant_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.request_feedback ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_settings_public_select" ON public.tenant_settings;
CREATE POLICY "tenant_settings_public_select" ON public.tenant_settings
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "tenant_settings_manager_insert" ON public.tenant_settings;
CREATE POLICY "tenant_settings_manager_insert" ON public.tenant_settings
  FOR INSERT WITH CHECK (
    (
      tenant_id = current_tenant_id()
      AND current_user_role() IN ('tenant_admin', 'site_manager', 'charge_nurse', 'nurse_manager')
    )
    OR current_user_role() = 'super_admin'
  );

DROP POLICY IF EXISTS "tenant_settings_manager_update" ON public.tenant_settings;
CREATE POLICY "tenant_settings_manager_update" ON public.tenant_settings
  FOR UPDATE USING (
    (
      tenant_id = current_tenant_id()
      AND current_user_role() IN ('tenant_admin', 'site_manager', 'charge_nurse', 'nurse_manager')
    )
    OR current_user_role() = 'super_admin'
  )
  WITH CHECK (
    (
      tenant_id = current_tenant_id()
      AND current_user_role() IN ('tenant_admin', 'site_manager', 'charge_nurse', 'nurse_manager')
    )
    OR current_user_role() = 'super_admin'
  );

DROP POLICY IF EXISTS "request_feedback_public_insert" ON public.request_feedback;
CREATE POLICY "request_feedback_public_insert" ON public.request_feedback
  FOR INSERT WITH CHECK (
    request_id IN (
      SELECT req.id
      FROM public.requests req
      JOIN public.rooms r ON req.room_id = r.id
      JOIN public.units u ON r.unit_id = u.id
      JOIN public.sites s ON u.site_id = s.id
      LEFT JOIN public.tenant_settings ts ON ts.tenant_id = s.tenant_id
      WHERE req.status = 'resolved'
        AND r.active = true
        AND COALESCE(ts.patient_feedback_enabled, false) = true
    )
  );

DROP POLICY IF EXISTS "request_feedback_nurse_select" ON public.request_feedback;
CREATE POLICY "request_feedback_nurse_select" ON public.request_feedback
  FOR SELECT USING (
    request_id IN (
      SELECT r.id
      FROM public.requests r
      JOIN public.rooms rm ON r.room_id = rm.id
      JOIN public.units u  ON rm.unit_id = u.id
      JOIN public.sites s  ON u.site_id = s.id
      WHERE (
        s.tenant_id = current_tenant_id()
        AND (current_unit_id() IS NULL OR u.id = current_unit_id())
      )
      OR current_user_role() = 'super_admin'
    )
  );
