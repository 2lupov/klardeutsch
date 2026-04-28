-- Add submission_files column for student submissions with attachments
ALTER TABLE public.tutoring_homework
  ADD COLUMN IF NOT EXISTS submission_files jsonb NOT NULL DEFAULT '[]'::jsonb;

-- Ensure realtime works fully (full row data on updates)
ALTER TABLE public.tutoring_homework REPLICA IDENTITY FULL;

-- Add to realtime publication if not already
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'tutoring_homework'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.tutoring_homework';
  END IF;
END $$;

-- Storage policies: allow students of a lesson to upload/read/delete their own homework files
-- Path convention: homework/<lesson_id>/<user_id>/<filename>

CREATE POLICY "Students upload own homework files"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'tutoring-materials'
  AND (storage.foldername(name))[1] = 'homework'
  AND (storage.foldername(name))[3] = auth.uid()::text
  AND EXISTS (
    SELECT 1 FROM public.tutoring_lessons l
    WHERE l.id::text = (storage.foldername(name))[2]
      AND l.student_id = auth.uid()
  )
);

CREATE POLICY "Students read own homework files"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'tutoring-materials'
  AND (storage.foldername(name))[1] = 'homework'
  AND (storage.foldername(name))[3] = auth.uid()::text
);

CREATE POLICY "Students delete own homework files"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'tutoring-materials'
  AND (storage.foldername(name))[1] = 'homework'
  AND (storage.foldername(name))[3] = auth.uid()::text
);

-- Teachers also need to read student-submitted homework files for lessons they teach
CREATE POLICY "Teachers read student homework files"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'tutoring-materials'
  AND (storage.foldername(name))[1] = 'homework'
  AND EXISTS (
    SELECT 1 FROM public.tutoring_lessons l
    WHERE l.id::text = (storage.foldername(name))[2]
      AND l.teacher_id = auth.uid()
  )
);