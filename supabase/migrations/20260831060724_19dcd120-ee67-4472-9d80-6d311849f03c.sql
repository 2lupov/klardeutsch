CREATE TABLE public.book_audio (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  book_id uuid NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  lektion_id uuid REFERENCES public.book_lektionen(id) ON DELETE SET NULL,
  track_no integer,
  title text NOT NULL,
  file_path text NOT NULL,
  duration_seconds integer,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX book_audio_book_id_idx ON public.book_audio(book_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.book_audio TO authenticated;
GRANT ALL ON public.book_audio TO service_role;

ALTER TABLE public.book_audio ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teachers manage book audio" ON public.book_audio FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'teacher'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'teacher'));

CREATE POLICY "Students read assigned book audio" ON public.book_audio FOR SELECT TO authenticated
  USING (public.student_has_book_access(book_id));

CREATE TRIGGER update_book_audio_updated_at BEFORE UPDATE ON public.book_audio
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();