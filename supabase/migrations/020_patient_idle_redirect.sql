ALTER TABLE public.tenant_settings
  ADD COLUMN IF NOT EXISTS patient_idle_redirect_url TEXT;
