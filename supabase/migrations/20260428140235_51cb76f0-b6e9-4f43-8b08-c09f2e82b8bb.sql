DROP POLICY IF EXISTS "tl_teacher_insert" ON public.tutoring_lessons;
CREATE POLICY "tl_teacher_or_admin_insert"
ON public.tutoring_lessons
FOR INSERT
WITH CHECK (
  auth.uid() = teacher_id
  AND (has_role(auth.uid(), 'teacher'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
);