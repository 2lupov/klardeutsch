ALTER TABLE public.tutoring_lesson_exercises ADD COLUMN IF NOT EXISTS payload jsonb NOT NULL DEFAULT '{}'::jsonb;

DROP POLICY IF EXISTS "Authenticated can read exercise images" ON storage.objects;
CREATE POLICY "Authenticated can read exercise images"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'exercise-images');

DROP POLICY IF EXISTS "Teachers upload exercise images" ON storage.objects;
CREATE POLICY "Teachers upload exercise images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'exercise-images'
  AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'teacher'))
);