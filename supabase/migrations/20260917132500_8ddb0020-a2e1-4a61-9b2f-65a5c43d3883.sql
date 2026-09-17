CREATE TABLE public.lesson_kits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Новий урок',
  level TEXT,
  book_id UUID REFERENCES public.books(id) ON DELETE SET NULL,
  lektion_id UUID REFERENCES public.book_lektionen(id) ON DELETE SET NULL,
  focus TEXT NOT NULL DEFAULT 'kursbuch',
  source TEXT NOT NULL DEFAULT 'pdf',
  page_paths JSONB NOT NULL DEFAULT '[]'::jsonb,
  blocks JSONB NOT NULL DEFAULT '[]'::jsonb,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.lesson_kits TO authenticated;
GRANT ALL ON public.lesson_kits TO service_role;

ALTER TABLE public.lesson_kits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "kits_select" ON public.lesson_kits FOR SELECT TO authenticated
USING (owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "kits_insert" ON public.lesson_kits FOR INSERT TO authenticated
WITH CHECK (owner_id = auth.uid() AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'teacher')));

CREATE POLICY "kits_update" ON public.lesson_kits FOR UPDATE TO authenticated
USING (owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "kits_delete" ON public.lesson_kits FOR DELETE TO authenticated
USING (owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_lesson_kits_updated_at BEFORE UPDATE ON public.lesson_kits
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_lesson_kits_owner ON public.lesson_kits (owner_id, created_at DESC);