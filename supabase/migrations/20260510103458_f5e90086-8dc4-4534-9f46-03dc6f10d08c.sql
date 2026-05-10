ALTER TABLE public.tutoring_placement_assignments
ADD COLUMN IF NOT EXISTS is_kid_mode boolean NOT NULL DEFAULT false;