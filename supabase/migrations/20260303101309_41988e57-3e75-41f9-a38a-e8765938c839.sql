
CREATE TABLE public.translation_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL,
  lang text NOT NULL,
  value text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(key, lang)
);

ALTER TABLE public.translation_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read translation_overrides"
ON public.translation_overrides FOR SELECT
USING (true);

CREATE POLICY "Admins can insert translation_overrides"
ON public.translation_overrides FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update translation_overrides"
ON public.translation_overrides FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete translation_overrides"
ON public.translation_overrides FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));
