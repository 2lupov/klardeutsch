-- Allow admins to create/manage placement assignments alongside teachers
DROP POLICY IF EXISTS "Teacher can create assignments" ON public.tutoring_placement_assignments;
CREATE POLICY "Teacher or admin can create assignments"
ON public.tutoring_placement_assignments
FOR INSERT
WITH CHECK (
  auth.uid() = teacher_id
  AND (has_role(auth.uid(), 'teacher'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
);

DROP POLICY IF EXISTS "Teacher can delete own assignments" ON public.tutoring_placement_assignments;
CREATE POLICY "Teacher or admin can delete assignments"
ON public.tutoring_placement_assignments
FOR DELETE
USING (
  auth.uid() = teacher_id OR has_role(auth.uid(), 'admin'::app_role)
);