ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS organization_url TEXT;
