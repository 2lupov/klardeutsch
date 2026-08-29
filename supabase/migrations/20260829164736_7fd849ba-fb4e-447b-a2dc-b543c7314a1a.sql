CREATE POLICY "student_sub_upload_own" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'student-submissions' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "student_sub_read_own" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'student-submissions' AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'teacher')
  ));

CREATE POLICY "student_sub_delete_own" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'student-submissions' AND (
    (storage.foldername(name))[1] = auth.uid()::text OR public.has_role(auth.uid(), 'admin')
  ));