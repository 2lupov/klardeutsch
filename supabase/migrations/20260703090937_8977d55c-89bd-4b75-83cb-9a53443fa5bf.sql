
CREATE TABLE IF NOT EXISTS public.library_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL CHECK (type IN ('slide_deck','exercise','video','audio','reading','dialogue','word_list','game')),
  title text NOT NULL,
  description text,
  level text,
  topic text,
  target_language text NOT NULL DEFAULT 'de',
  tags text[] NOT NULL DEFAULT '{}',
  cover_url text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  source text NOT NULL DEFAULT 'manual' CHECK (source IN ('ai','manual','imported')),
  is_published boolean NOT NULL DEFAULT true,
  owner_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS library_items_type_idx ON public.library_items(type);
CREATE INDEX IF NOT EXISTS library_items_level_idx ON public.library_items(level);
CREATE INDEX IF NOT EXISTS library_items_lang_idx ON public.library_items(target_language);
CREATE INDEX IF NOT EXISTS library_items_topic_idx ON public.library_items(topic);
CREATE INDEX IF NOT EXISTS library_items_owner_idx ON public.library_items(owner_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.library_items TO authenticated;
GRANT ALL ON public.library_items TO service_role;

ALTER TABLE public.library_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage all library items"
  ON public.library_items FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Teachers insert own"
  ON public.library_items FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'teacher') AND owner_id = auth.uid());

CREATE POLICY "Teachers update own"
  ON public.library_items FOR UPDATE
  USING (public.has_role(auth.uid(), 'teacher') AND owner_id = auth.uid())
  WITH CHECK (public.has_role(auth.uid(), 'teacher') AND owner_id = auth.uid());

CREATE POLICY "Teachers delete own"
  ON public.library_items FOR DELETE
  USING (public.has_role(auth.uid(), 'teacher') AND owner_id = auth.uid());

CREATE POLICY "Authenticated read published or own"
  ON public.library_items FOR SELECT
  USING (is_published = true OR owner_id = auth.uid());

CREATE TRIGGER update_library_items_updated_at
  BEFORE UPDATE ON public.library_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Backfill: course_lessons
INSERT INTO public.library_items (type, title, description, level, topic, target_language, payload, source, is_published)
SELECT
  'slide_deck',
  cl.title,
  cl.description,
  c.level,
  c.title,
  COALESCE(cl.target_language, c.target_language, 'de'),
  jsonb_build_object('lesson_id', cl.id, 'course_id', cl.course_id, 'content', cl.content, 'lesson_type', cl.lesson_type),
  'imported',
  true
FROM public.course_lessons cl
LEFT JOIN public.courses c ON c.id = cl.course_id;

-- Backfill: reading_texts
INSERT INTO public.library_items (type, title, level, topic, target_language, payload, source, is_published)
SELECT 'reading', rt.title, rt.level, rt.topic, COALESCE(rt.target_language,'de'),
       jsonb_build_object('reading_id', rt.id, 'text', rt.text),
       'imported', true
FROM public.reading_texts rt;

-- Backfill: listening_texts
INSERT INTO public.library_items (type, title, level, topic, target_language, payload, source, is_published)
SELECT 'audio', lt.title, lt.level, lt.topic, COALESCE(lt.target_language,'de'),
       jsonb_build_object('listening_id', lt.id, 'text', lt.text, 'audio_url', lt.audio_url),
       'imported', true
FROM public.listening_texts lt;

-- Backfill: cafe_scenarios
INSERT INTO public.library_items (type, title, level, topic, target_language, payload, source, is_published)
SELECT 'dialogue',
       LEFT(cs.barista_line, 80),
       cs.level,
       'cafe',
       COALESCE(cs.target_language,'de'),
       jsonb_build_object('scenario_id', cs.id, 'barista_line', cs.barista_line, 'options', cs.options),
       'imported', true
FROM public.cafe_scenarios cs;
