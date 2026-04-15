ALTER TABLE public.units
  ADD COLUMN IF NOT EXISTS room_naming_template TEXT NOT NULL DEFAULT 'Room {n}';
