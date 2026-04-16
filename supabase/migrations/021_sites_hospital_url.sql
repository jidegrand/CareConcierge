ALTER TABLE public.sites
  ADD COLUMN IF NOT EXISTS hospital_url TEXT;
