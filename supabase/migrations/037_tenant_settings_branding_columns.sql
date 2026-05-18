-- Add branding and feature columns missing from tenant_settings
ALTER TABLE public.tenant_settings
  ADD COLUMN IF NOT EXISTS logo_url         text,
  ADD COLUMN IF NOT EXISTS primary_color    text,
  ADD COLUMN IF NOT EXISTS secondary_color  text,
  ADD COLUMN IF NOT EXISTS default_language text DEFAULT 'en',
  ADD COLUMN IF NOT EXISTS enable_qr_codes  boolean NOT NULL DEFAULT true;
