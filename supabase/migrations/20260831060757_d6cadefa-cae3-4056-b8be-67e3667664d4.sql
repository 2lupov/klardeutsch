CREATE POLICY "Teachers manage book audio files" ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'book-audio' AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'teacher')))
  WITH CHECK (bucket_id = 'book-audio' AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'teacher')));

CREATE POLICY "Students read assigned book audio files" ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'book-audio'
    AND EXISTS (
      SELECT 1 FROM public.book_audio ba
      WHERE ba.file_path = storage.objects.name
        AND public.student_has_book_access(ba.book_id)
    )
  );