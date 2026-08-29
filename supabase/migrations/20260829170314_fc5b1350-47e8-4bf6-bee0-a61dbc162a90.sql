CREATE POLICY "assignment_audio_read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'assignment-audio');

CREATE POLICY "assignment_audio_write" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'assignment-audio'
    AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'teacher'))
  );

CREATE POLICY "assignment_audio_delete" ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'assignment-audio'
    AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'teacher'))
  );