CREATE POLICY "Authenticated read presentation slides"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'presentation-slides');

CREATE POLICY "Teachers upload presentation slides"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'presentation-slides' AND (public.has_role(auth.uid(), 'teacher'::app_role) OR public.has_role(auth.uid(), 'admin'::app_role)));

CREATE POLICY "Teachers update presentation slides"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'presentation-slides' AND (public.has_role(auth.uid(), 'teacher'::app_role) OR public.has_role(auth.uid(), 'admin'::app_role)));

CREATE POLICY "Teachers delete presentation slides"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'presentation-slides' AND (public.has_role(auth.uid(), 'teacher'::app_role) OR public.has_role(auth.uid(), 'admin'::app_role)));