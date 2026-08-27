CREATE POLICY "Admins can view all course purchases"
ON public.course_purchases FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can grant course access"
ON public.course_purchases FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can revoke course access"
ON public.course_purchases FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));