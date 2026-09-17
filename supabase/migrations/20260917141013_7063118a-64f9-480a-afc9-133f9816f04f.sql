CREATE TABLE public.presentations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id uuid NOT NULL,
  title text NOT NULL,
  slide_paths text[] NOT NULL DEFAULT '{}',
  page_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.presentations TO authenticated;
GRANT ALL ON public.presentations TO service_role;

ALTER TABLE public.presentations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teachers and admins read presentations"
ON public.presentations FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'teacher'::app_role) OR public.has_role(auth.uid(), 'admin'::app_role) OR owner_id = auth.uid());

CREATE POLICY "Owner creates presentations"
ON public.presentations FOR INSERT TO authenticated
WITH CHECK (owner_id = auth.uid() AND (public.has_role(auth.uid(), 'teacher'::app_role) OR public.has_role(auth.uid(), 'admin'::app_role)));

CREATE POLICY "Owner or admin updates presentations"
ON public.presentations FOR UPDATE TO authenticated
USING (owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Owner or admin deletes presentations"
ON public.presentations FOR DELETE TO authenticated
USING (owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_presentations_updated
BEFORE UPDATE ON public.presentations
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();