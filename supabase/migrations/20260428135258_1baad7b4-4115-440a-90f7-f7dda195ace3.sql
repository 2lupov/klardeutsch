
ALTER TABLE public.tutoring_placement_assignments
  ADD COLUMN IF NOT EXISTS selected_levels jsonb DEFAULT '["A1","A2","B1","B2","C1"]'::jsonb,
  ADD COLUMN IF NOT EXISTS ai_analysis jsonb;
