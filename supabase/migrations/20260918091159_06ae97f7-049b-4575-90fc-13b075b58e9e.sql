ALTER TABLE public.lesson_kits
  ADD COLUMN IF NOT EXISTS kind TEXT NOT NULL DEFAULT 'lesson',
  ADD COLUMN IF NOT EXISTS presentation_id UUID,
  ADD COLUMN IF NOT EXISTS sections JSONB NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.student_assignments DROP CONSTRAINT IF EXISTS student_assignments_type_check;
ALTER TABLE public.student_assignments ADD CONSTRAINT student_assignments_type_check CHECK (type = ANY (ARRAY['test','homework','writing','audio','modular','book','book_plan','blocks','kit','minicourse']));