-- 1) Таблица записей уроков
CREATE TABLE public.tutoring_lesson_recordings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id uuid NOT NULL REFERENCES public.tutoring_lessons(id) ON DELETE CASCADE,
  teacher_id uuid NOT NULL,
  student_id uuid NOT NULL,
  video_url text,
  audio_url text,
  duration_seconds integer DEFAULT 0,
  file_size_bytes bigint DEFAULT 0,
  visibility text NOT NULL DEFAULT 'private', -- private | student | shared
  status text NOT NULL DEFAULT 'uploading',   -- uploading | ready | processing | analyzed | failed
  transcript text,
  ai_summary text,
  ai_new_words jsonb DEFAULT '[]'::jsonb,
  ai_errors jsonb DEFAULT '[]'::jsonb,
  ai_processed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_tlr_lesson ON public.tutoring_lesson_recordings(lesson_id);
CREATE INDEX idx_tlr_student ON public.tutoring_lesson_recordings(student_id);

ALTER TABLE public.tutoring_lesson_recordings ENABLE ROW LEVEL SECURITY;

-- Учитель видит/управляет своими; ученик видит, если visibility != 'private'
CREATE POLICY "tlr_teacher_all" ON public.tutoring_lesson_recordings
  FOR ALL TO authenticated
  USING (auth.uid() = teacher_id OR has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (auth.uid() = teacher_id OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "tlr_student_select" ON public.tutoring_lesson_recordings
  FOR SELECT TO authenticated
  USING (auth.uid() = student_id AND visibility IN ('student', 'shared'));

CREATE TRIGGER trg_tlr_updated
  BEFORE UPDATE ON public.tutoring_lesson_recordings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2) Storage bucket для записей
INSERT INTO storage.buckets (id, name, public)
VALUES ('tutoring-recordings', 'tutoring-recordings', false)
ON CONFLICT (id) DO NOTHING;

-- Учитель загружает в свою папку: teacher_id/lesson_id/file
CREATE POLICY "Teachers upload own recordings" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'tutoring-recordings'
    AND auth.uid()::text = (storage.foldername(name))[1]
    AND has_role(auth.uid(), 'teacher'::app_role)
  );

CREATE POLICY "Teachers manage own recordings" ON storage.objects
  FOR ALL TO authenticated
  USING (
    bucket_id = 'tutoring-recordings'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Ученик читает запись если есть строка в tutoring_lesson_recordings
CREATE POLICY "Students read shared recordings" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'tutoring-recordings'
    AND EXISTS (
      SELECT 1 FROM public.tutoring_lesson_recordings r
      WHERE (r.video_url LIKE '%' || storage.objects.name || '%'
             OR r.audio_url LIKE '%' || storage.objects.name || '%')
      AND r.student_id = auth.uid()
      AND r.visibility IN ('student', 'shared')
    )
  );