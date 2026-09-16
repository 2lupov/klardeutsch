CREATE TABLE public.interactive_pages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  book_id UUID REFERENCES public.books(id) ON DELETE SET NULL,
  page_id UUID REFERENCES public.book_pages(id) ON DELETE SET NULL,
  owner_id UUID NOT NULL DEFAULT auth.uid(),
  title TEXT NOT NULL DEFAULT 'Interaktive Seite',
  level TEXT,
  scene JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'draft',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.interactive_pages TO authenticated;
GRANT ALL ON public.interactive_pages TO service_role;

ALTER TABLE public.interactive_pages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teachers manage their interactive pages"
  ON public.interactive_pages FOR ALL
  TO authenticated
  USING (
    owner_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin'::app_role)
  )
  WITH CHECK (
    (owner_id = auth.uid() AND (public.has_role(auth.uid(), 'teacher'::app_role) OR public.has_role(auth.uid(), 'admin'::app_role)))
    OR public.has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Anyone signed in can read published interactive pages"
  ON public.interactive_pages FOR SELECT
  TO authenticated
  USING (status = 'published');

CREATE TRIGGER interactive_pages_updated_at
  BEFORE UPDATE ON public.interactive_pages
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX interactive_pages_book_idx ON public.interactive_pages(book_id);
CREATE INDEX interactive_pages_page_idx ON public.interactive_pages(page_id);