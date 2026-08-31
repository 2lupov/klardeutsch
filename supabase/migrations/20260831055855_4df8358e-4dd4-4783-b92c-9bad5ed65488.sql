CREATE POLICY "Teachers upload book pages" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'book-pages' AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'teacher')));
CREATE POLICY "Teachers update book pages" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'book-pages' AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'teacher')));
CREATE POLICY "Teachers delete book pages" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'book-pages' AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'teacher')));
CREATE POLICY "Authenticated read book pages" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'book-pages');