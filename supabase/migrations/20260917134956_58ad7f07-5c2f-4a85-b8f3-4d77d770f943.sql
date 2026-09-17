CREATE TABLE public.book_files (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id uuid NOT NULL,
  title text NOT NULL,
  kind text NOT NULL DEFAULT 'kursbuch',
  level text,
  publisher text,
  total_pages integer NOT NULL DEFAULT 0,
  size_bytes bigint NOT NULL DEFAULT 0,
  file_path text NOT NULL,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.book_files TO authenticated;
GRANT ALL ON public.book_files TO service_role;

ALTER TABLE public.book_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teachers read book library"
ON public.book_files FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'teacher'::app_role) OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Teachers add books"
ON public.book_files FOR INSERT TO authenticated
WITH CHECK (
  owner_id = auth.uid()
  AND (public.has_role(auth.uid(), 'teacher'::app_role) OR public.has_role(auth.uid(), 'admin'::app_role))
);

CREATE POLICY "Owners update books"
ON public.book_files FOR UPDATE TO authenticated
USING (owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Owners delete books"
ON public.book_files FOR DELETE TO authenticated
USING (owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_book_files_updated
BEFORE UPDATE ON public.book_files
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE POLICY "Teachers upload library files"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'book-library'
  AND (public.has_role(auth.uid(), 'teacher'::app_role) OR public.has_role(auth.uid(), 'admin'::app_role))
);

CREATE POLICY "Teachers read library files"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'book-library'
  AND (public.has_role(auth.uid(), 'teacher'::app_role) OR public.has_role(auth.uid(), 'admin'::app_role))
);

CREATE POLICY "Teachers delete library files"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'book-library'
  AND (public.has_role(auth.uid(), 'teacher'::app_role) OR public.has_role(auth.uid(), 'admin'::app_role))
);