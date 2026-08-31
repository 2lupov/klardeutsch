-- BOOKS
CREATE TABLE public.books (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid,
  title text NOT NULL,
  kind text NOT NULL DEFAULT 'kursbuch',
  level text,
  language text NOT NULL DEFAULT 'de',
  publisher text,
  total_pages integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.books TO authenticated;
GRANT ALL ON public.books TO service_role;
ALTER TABLE public.books ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.book_lektionen (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id uuid NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  number integer NOT NULL,
  title text,
  page_from integer NOT NULL DEFAULT 1,
  page_to integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.book_lektionen TO authenticated;
GRANT ALL ON public.book_lektionen TO service_role;
ALTER TABLE public.book_lektionen ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.book_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id uuid NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  lektion_id uuid REFERENCES public.book_lektionen(id) ON DELETE SET NULL,
  page_number integer NOT NULL,
  image_path text NOT NULL,
  ocr_status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (book_id, page_number)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.book_pages TO authenticated;
GRANT ALL ON public.book_pages TO service_role;
ALTER TABLE public.book_pages ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.book_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id uuid NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  page_id uuid NOT NULL REFERENCES public.book_pages(id) ON DELETE CASCADE,
  code text,
  kind text NOT NULL DEFAULT 'gap',
  title text,
  instructions text,
  content jsonb NOT NULL DEFAULT '{}'::jsonb,
  bbox jsonb,
  source text NOT NULL DEFAULT 'ai',
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.book_tasks TO authenticated;
GRANT ALL ON public.book_tasks TO service_role;
ALTER TABLE public.book_tasks ENABLE ROW LEVEL SECURITY;

-- helper: student has an assignment referencing this book
CREATE OR REPLACE FUNCTION public.student_has_book_access(_book_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.student_assignments sa
    WHERE sa.student_id = auth.uid()
      AND sa.type = 'book'
      AND (sa.payload->>'book_id')::uuid = _book_id
  )
$$;

-- POLICIES: books
CREATE POLICY "Teachers manage books" ON public.books FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'teacher'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'teacher'));
CREATE POLICY "Students read assigned books" ON public.books FOR SELECT TO authenticated
  USING (public.student_has_book_access(id));

CREATE POLICY "Teachers manage book lektionen" ON public.book_lektionen FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'teacher'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'teacher'));
CREATE POLICY "Students read assigned lektionen" ON public.book_lektionen FOR SELECT TO authenticated
  USING (public.student_has_book_access(book_id));

CREATE POLICY "Teachers manage book pages" ON public.book_pages FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'teacher'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'teacher'));
CREATE POLICY "Students read assigned pages" ON public.book_pages FOR SELECT TO authenticated
  USING (public.student_has_book_access(book_id));

CREATE POLICY "Teachers manage book tasks" ON public.book_tasks FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'teacher'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'teacher'));
CREATE POLICY "Students read assigned tasks" ON public.book_tasks FOR SELECT TO authenticated
  USING (public.student_has_book_access(book_id));

CREATE INDEX book_pages_book_idx ON public.book_pages(book_id, page_number);
CREATE INDEX book_tasks_page_idx ON public.book_tasks(page_id);
CREATE INDEX book_tasks_book_idx ON public.book_tasks(book_id);
CREATE INDEX book_lektionen_book_idx ON public.book_lektionen(book_id, number);

CREATE TRIGGER update_books_updated_at BEFORE UPDATE ON public.books
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_book_lektionen_updated_at BEFORE UPDATE ON public.book_lektionen
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_book_pages_updated_at BEFORE UPDATE ON public.book_pages
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_book_tasks_updated_at BEFORE UPDATE ON public.book_tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
