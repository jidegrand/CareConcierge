-- ============================================================
-- CUSTOM (OPEN-ENDED) REQUESTS
-- Lets patients submit a free-text request (typed or spoken) that
-- doesn't fit a predefined tile, stored under type = 'custom'.
-- The existing public insert/select/delete policies on requests
-- already cover this — `type` has no FK/CHECK constraint tying it
-- to request_types, so no RLS change is needed.
-- ============================================================

alter table public.requests
  add column custom_text text;

alter table public.requests
  add constraint requests_custom_text_length check (
    custom_text is null or char_length(custom_text) <= 500
  );

alter table public.requests
  add constraint requests_custom_text_required_for_type check (
    type <> 'custom' or char_length(trim(coalesce(custom_text, ''))) > 0
  );
