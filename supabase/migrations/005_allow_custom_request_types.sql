-- Allow tenant-scoped custom request type IDs in public.requests.
-- The legacy requests_type_check constraint only allowed the original seeded types.

ALTER TABLE public.requests
  DROP CONSTRAINT IF EXISTS requests_type_check;
