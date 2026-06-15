-- ============================================================
-- PATIENT FEED — enable realtime for staff_notes
--
-- useFeed.ts subscribes to postgres_changes on public.staff_notes so
-- new notes appear in the Patient Feed live, but the table was never
-- added to the supabase_realtime publication (only `requests` was),
-- so inserts never reached an already-open feed page.
-- ============================================================

alter publication supabase_realtime add table public.staff_notes;
