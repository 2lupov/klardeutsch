CREATE POLICY "Teachers manage student custom words" ON public.custom_words
FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.tutoring_relationships r WHERE r.student_id = custom_words.user_id AND r.teacher_id = auth.uid()) OR public.has_role(auth.uid(), 'admin'))
WITH CHECK (EXISTS (SELECT 1 FROM public.tutoring_relationships r WHERE r.student_id = custom_words.user_id AND r.teacher_id = auth.uid()) OR public.has_role(auth.uid(), 'admin'));