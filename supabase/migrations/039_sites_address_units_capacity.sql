-- Add address/contact columns to sites and capacity to units.
-- The tenant-admin Create Site form sends these fields but the columns
-- did not exist, causing "Could not find the 'address' column" errors.
ALTER TABLE public.sites
  ADD COLUMN IF NOT EXISTS address text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS city    text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS state   text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS zip     text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS phone   text NOT NULL DEFAULT '';

ALTER TABLE public.units
  ADD COLUMN IF NOT EXISTS capacity integer;
