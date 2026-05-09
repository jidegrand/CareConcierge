-- Expand tenant_settings to support branding, preferences, and onboarding tracking
-- Enables tenant admins to customize their organization's appearance and track setup progress

-- Add new columns to tenant_settings
ALTER TABLE public.tenant_settings
  ADD COLUMN IF NOT EXISTS logo_url TEXT,
  ADD COLUMN IF NOT EXISTS primary_color VARCHAR(7) DEFAULT '#2E75B6',
  ADD COLUMN IF NOT EXISTS secondary_color VARCHAR(7) DEFAULT '#1F4788',
  ADD COLUMN IF NOT EXISTS default_language VARCHAR(10) DEFAULT 'en',
  ADD COLUMN IF NOT EXISTS enable_patient_feedback BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS enable_qr_codes BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS onboarding_step VARCHAR(50),
  ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{}'::jsonb;

-- Add metadata used by tenant admins when managing sites and units
ALTER TABLE public.sites
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS city TEXT,
  ADD COLUMN IF NOT EXISTS state TEXT,
  ADD COLUMN IF NOT EXISTS zip TEXT,
  ADD COLUMN IF NOT EXISTS phone TEXT;

ALTER TABLE public.units
  ADD COLUMN IF NOT EXISTS capacity INTEGER DEFAULT 0
    CHECK (capacity >= 0);

-- Create onboarding_checklist table to track setup progress per organization
CREATE TABLE IF NOT EXISTS public.onboarding_checklist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL UNIQUE REFERENCES public.tenants(id) ON DELETE CASCADE,
  step_organization BOOLEAN DEFAULT false,
  step_organization_at TIMESTAMPTZ,
  step_create_site BOOLEAN DEFAULT false,
  step_create_site_at TIMESTAMPTZ,
  step_create_units BOOLEAN DEFAULT false,
  step_create_units_at TIMESTAMPTZ,
  step_invite_users BOOLEAN DEFAULT false,
  step_invite_users_at TIMESTAMPTZ,
  step_configure_requests BOOLEAN DEFAULT false,
  step_configure_requests_at TIMESTAMPTZ,
  step_print_qr BOOLEAN DEFAULT false,
  step_print_qr_at TIMESTAMPTZ,
  step_send_test_request BOOLEAN DEFAULT false,
  step_send_test_request_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on onboarding_checklist
ALTER TABLE public.onboarding_checklist ENABLE ROW LEVEL SECURITY;

-- Create RLS policy: only tenant_admin for the tenant can view/edit
DROP POLICY IF EXISTS "onboarding_tenant_access" ON public.onboarding_checklist;
CREATE POLICY "onboarding_tenant_access" ON public.onboarding_checklist
  FOR ALL
  USING (tenant_id = public.current_tenant_id())
  WITH CHECK (tenant_id = public.current_tenant_id());

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_onboarding_checklist_tenant
  ON public.onboarding_checklist(tenant_id);
