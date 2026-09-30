CREATE TABLE public.student_folders (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id uuid NOT NULL,
  teacher_id uuid,
  name text NOT NULL,
  emoji text,
  color text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.student_folders TO authenticated;
GRANT ALL ON public.student_folders TO service_role;

ALTER TABLE public.student_folders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Student and teacher manage folders"
ON public.student_folders FOR ALL TO authenticated
USING (
  student_id = auth.uid()
  OR teacher_id = auth.uid()
  OR public.has_role(auth.uid(), 'admin'::app_role)
  OR EXISTS (SELECT 1 FROM public.tutoring_relationships r WHERE r.student_id = student_folders.student_id AND r.teacher_id = auth.uid())
)
WITH CHECK (
  student_id = auth.uid()
  OR teacher_id = auth.uid()
  OR public.has_role(auth.uid(), 'admin'::app_role)
  OR EXISTS (SELECT 1 FROM public.tutoring_relationships r WHERE r.student_id = student_folders.student_id AND r.teacher_id = auth.uid())
);

CREATE TRIGGER student_folders_updated_at
BEFORE UPDATE ON public.student_folders
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX student_folders_student_idx ON public.student_folders (student_id);

CREATE TABLE public.student_folder_pages (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id uuid NOT NULL,
  teacher_id uuid,
  folder_id uuid NOT NULL REFERENCES public.student_folders(id) ON DELETE CASCADE,
  book_id uuid,
  book_title text,
  page_number integer,
  image_path text NOT NULL,
  caption text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.student_folder_pages TO authenticated;
GRANT ALL ON public.student_folder_pages TO service_role;

ALTER TABLE public.student_folder_pages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Student and teacher manage folder pages"
ON public.student_folder_pages FOR ALL TO authenticated
USING (
  student_id = auth.uid()
  OR teacher_id = auth.uid()
  OR public.has_role(auth.uid(), 'admin'::app_role)
  OR EXISTS (SELECT 1 FROM public.tutoring_relationships r WHERE r.student_id = student_folder_pages.student_id AND r.teacher_id = auth.uid())
)
WITH CHECK (
  student_id = auth.uid()
  OR teacher_id = auth.uid()
  OR public.has_role(auth.uid(), 'admin'::app_role)
  OR EXISTS (SELECT 1 FROM public.tutoring_relationships r WHERE r.student_id = student_folder_pages.student_id AND r.teacher_id = auth.uid())
);

CREATE TRIGGER student_folder_pages_updated_at
BEFORE UPDATE ON public.student_folder_pages
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX student_folder_pages_folder_idx ON public.student_folder_pages (folder_id);

ALTER TABLE public.books ADD COLUMN IF NOT EXISTS folder text;