CREATE TABLE IF NOT EXISTS public.teacher_ai_chats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id uuid NOT NULL,
  student_id uuid NOT NULL,
  title text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (teacher_id, student_id)
);

CREATE TABLE IF NOT EXISTS public.teacher_ai_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id uuid NOT NULL REFERENCES public.teacher_ai_chats(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('user','assistant','system')),
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_teacher_ai_messages_chat ON public.teacher_ai_messages(chat_id, created_at);
CREATE INDEX IF NOT EXISTS idx_teacher_ai_chats_teacher ON public.teacher_ai_chats(teacher_id, updated_at DESC);

ALTER TABLE public.teacher_ai_chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_ai_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teacher can view own ai chats"
  ON public.teacher_ai_chats FOR SELECT
  TO authenticated
  USING (auth.uid() = teacher_id);

CREATE POLICY "Teacher can insert own ai chats"
  ON public.teacher_ai_chats FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = teacher_id);

CREATE POLICY "Teacher can update own ai chats"
  ON public.teacher_ai_chats FOR UPDATE
  TO authenticated
  USING (auth.uid() = teacher_id);

CREATE POLICY "Teacher can delete own ai chats"
  ON public.teacher_ai_chats FOR DELETE
  TO authenticated
  USING (auth.uid() = teacher_id);

CREATE POLICY "Teacher can view own ai messages"
  ON public.teacher_ai_messages FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.teacher_ai_chats c
    WHERE c.id = teacher_ai_messages.chat_id AND c.teacher_id = auth.uid()
  ));

CREATE POLICY "Teacher can insert own ai messages"
  ON public.teacher_ai_messages FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.teacher_ai_chats c
    WHERE c.id = teacher_ai_messages.chat_id AND c.teacher_id = auth.uid()
  ));

CREATE POLICY "Teacher can delete own ai messages"
  ON public.teacher_ai_messages FOR DELETE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.teacher_ai_chats c
    WHERE c.id = teacher_ai_messages.chat_id AND c.teacher_id = auth.uid()
  ));

CREATE TRIGGER teacher_ai_chats_updated_at
  BEFORE UPDATE ON public.teacher_ai_chats
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();