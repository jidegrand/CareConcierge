DROP POLICY IF EXISTS "requests_public_delete" ON public.requests;

CREATE POLICY "requests_public_delete" ON public.requests
  FOR DELETE USING (
    status IN ('pending', 'acknowledged')
    AND room_id IN (SELECT id FROM public.rooms WHERE active = true)
  );
