CREATE POLICY "requests_public_select" ON public.requests
  FOR SELECT USING (
    room_id IN (SELECT id FROM public.rooms WHERE active = true)
  );
