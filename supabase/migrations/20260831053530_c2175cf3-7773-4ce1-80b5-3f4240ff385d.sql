CREATE POLICY "Teachers upload board images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'board-images' AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'teacher')));

CREATE POLICY "Teachers update board images"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'board-images' AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'teacher')));

CREATE POLICY "Teachers delete board images"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'board-images' AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'teacher')));

CREATE POLICY "Authenticated read board images"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'board-images');