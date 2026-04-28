-- Storage bucket для матеріалів уроків (фото/файли для AI-генерації)
INSERT INTO storage.buckets (id, name, public)
VALUES ('tutoring-materials', 'tutoring-materials', false)
ON CONFLICT (id) DO NOTHING;

-- Викладач керує своїми файлами (шлях: <teacher_id>/<lesson_id>/<filename>)
CREATE POLICY "Teachers upload own tutoring materials"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'tutoring-materials'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Teachers read own tutoring materials"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'tutoring-materials'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Teachers delete own tutoring materials"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'tutoring-materials'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Поля для профілів, створених викладачами
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS created_by_teacher_id uuid,
  ADD COLUMN IF NOT EXISTS must_change_password boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_profiles_created_by_teacher
  ON public.profiles(created_by_teacher_id)
  WHERE created_by_teacher_id IS NOT NULL;