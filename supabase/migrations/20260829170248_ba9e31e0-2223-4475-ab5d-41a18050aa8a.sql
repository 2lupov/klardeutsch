ALTER TABLE public.student_assignments DROP CONSTRAINT IF EXISTS student_assignments_type_check;
ALTER TABLE public.student_assignments ADD CONSTRAINT student_assignments_type_check
  CHECK (type IN ('test','homework','writing','audio','modular'));

ALTER TABLE public.student_assignments DROP CONSTRAINT IF EXISTS student_assignments_status_check;
ALTER TABLE public.student_assignments ADD CONSTRAINT student_assignments_status_check
  CHECK (status IN ('assigned','in_progress','submitted','graded'));