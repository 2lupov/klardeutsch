CREATE TABLE public.material_folders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  name text NOT NULL,
  category text NOT NULL DEFAULT 'grammar' CHECK (category IN ('grammar','reading','listening','tasks','vocab','theory')),
  level text,
  description text,
  tags text[] NOT NULL DEFAULT '{}',
  is_published boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.material_folders TO authenticated;
GRANT ALL ON public.material_folders TO service_role;
ALTER TABLE public.material_folders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage all material folders" ON public.material_folders FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Teachers insert own material folders" ON public.material_folders FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'teacher') AND owner_id = auth.uid());
CREATE POLICY "Teachers update own material folders" ON public.material_folders FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'teacher') AND owner_id = auth.uid())
  WITH CHECK (public.has_role(auth.uid(), 'teacher') AND owner_id = auth.uid());
CREATE POLICY "Teachers delete own material folders" ON public.material_folders FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'teacher') AND owner_id = auth.uid());
CREATE POLICY "Authenticated read material folders" ON public.material_folders FOR SELECT TO authenticated
  USING (is_published = true OR owner_id = auth.uid());

CREATE TABLE public.material_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  folder_id uuid NOT NULL REFERENCES public.material_folders(id) ON DELETE CASCADE,
  owner_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  kind text NOT NULL DEFAULT 'text' CHECK (kind IN ('text','question','audio','word')),
  title text,
  content jsonb NOT NULL DEFAULT '{}'::jsonb,
  level text,
  tags text[] NOT NULL DEFAULT '{}',
  source text NOT NULL DEFAULT 'manual' CHECK (source IN ('manual','ai','book')),
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.material_items TO authenticated;
GRANT ALL ON public.material_items TO service_role;
ALTER TABLE public.material_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage all material items" ON public.material_items FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Teachers insert own material items" ON public.material_items FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'teacher') AND owner_id = auth.uid());
CREATE POLICY "Teachers update own material items" ON public.material_items FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'teacher') AND owner_id = auth.uid())
  WITH CHECK (public.has_role(auth.uid(), 'teacher') AND owner_id = auth.uid());
CREATE POLICY "Teachers delete own material items" ON public.material_items FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'teacher') AND owner_id = auth.uid());
CREATE POLICY "Authenticated read material items" ON public.material_items FOR SELECT TO authenticated
  USING (
    owner_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.material_folders f WHERE f.id = folder_id AND f.is_published = true)
  );

CREATE INDEX material_items_folder_idx ON public.material_items(folder_id);
CREATE INDEX material_items_level_idx ON public.material_items(level);
CREATE INDEX material_items_tags_idx ON public.material_items USING gin(tags);
CREATE INDEX material_items_title_idx ON public.material_items(title);
CREATE INDEX material_folders_category_idx ON public.material_folders(category);

CREATE TRIGGER update_material_folders_updated_at BEFORE UPDATE ON public.material_folders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_material_items_updated_at BEFORE UPDATE ON public.material_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();