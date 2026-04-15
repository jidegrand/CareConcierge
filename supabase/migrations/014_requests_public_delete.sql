CREATE POLICY "requests_public_delete" ON public.requests
  FOR DELETE USING (
    status = 'pending'
    AND room_id IN (SELECT id FROM public.rooms WHERE active = true)
  );
