CREATE TABLE public.student_books (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id uuid NOT NULL,
  student_id uuid NOT NULL,
  book_file_id uuid NOT NULL REFERENCES public.book_files(id) ON DELETE CASCADE,
  current_page integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (student_id, book_file_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.student_books TO authenticated;
GRANT ALL ON public.student_books TO service_role;
ALTER TABLE public.student_books ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Teacher manages student books" ON public.student_books FOR ALL TO authenticated
  USING (teacher_id = auth.uid() OR has_role(auth.uid(),'admin'))
  WITH CHECK (teacher_id = auth.uid() OR has_role(auth.uid(),'admin'));
CREATE POLICY "Student reads own books" ON public.student_books FOR SELECT TO authenticated
  USING (student_id = auth.uid());

CREATE TABLE public.student_book_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_book_id uuid NOT NULL REFERENCES public.student_books(id) ON DELETE CASCADE,
  page_number integer NOT NULL,
  strokes jsonb NOT NULL DEFAULT '[]'::jsonb,
  homework_note text,
  homework_status text NOT NULL DEFAULT 'none',
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (student_book_id, page_number)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.student_book_pages TO authenticated;
GRANT ALL ON public.student_book_pages TO service_role;
ALTER TABLE public.student_book_pages ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.can_access_student_book(_sb uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.student_books
    WHERE id = _sb AND (student_id = auth.uid() OR teacher_id = auth.uid() OR has_role(auth.uid(),'admin')))
$$;

CREATE POLICY "Book pages access" ON public.student_book_pages FOR ALL TO authenticated
  USING (public.can_access_student_book(student_book_id))
  WITH CHECK (public.can_access_student_book(student_book_id));

CREATE POLICY "Students read assigned library books" ON public.book_files FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.student_books sb WHERE sb.book_file_id = book_files.id AND sb.student_id = auth.uid()));

CREATE POLICY "Students read assigned library files" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'book-library' AND EXISTS (
    SELECT 1 FROM public.student_books sb JOIN public.book_files bf ON bf.id = sb.book_file_id
    WHERE sb.student_id = auth.uid() AND bf.file_path = storage.objects.name));

ALTER TABLE public.student_book_pages REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.student_book_pages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.student_books;