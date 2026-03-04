
CREATE TABLE public.topics (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  level text NOT NULL DEFAULT 'A1',
  name text NOT NULL,
  emoji text DEFAULT '📂',
  sort_order integer DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.topics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read topics" ON public.topics FOR SELECT USING (true);
CREATE POLICY "Admins can manage topics" ON public.topics FOR ALL USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Add unique constraint on level + name
ALTER TABLE public.topics ADD CONSTRAINT topics_level_name_unique UNIQUE (level, name);

-- Seed with default Allgemein topic for all levels
INSERT INTO public.topics (level, name, emoji, sort_order) VALUES
  ('A1', 'Allgemein', '📂', 0),
  ('A2', 'Allgemein', '📂', 0),
  ('B1', 'Allgemein', '📂', 0),
  ('B2', 'Allgemein', '📂', 0),
  ('C1', 'Allgemein', '📂', 0);
