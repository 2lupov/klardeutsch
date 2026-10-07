CREATE TABLE IF NOT EXISTS public.presentation_folders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  name text NOT NULL,
  emoji text NOT NULL DEFAULT '📁',
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.presentation_folders TO authenticated;
GRANT ALL ON public.presentation_folders TO service_role;
CREATE INDEX IF NOT EXISTS presentation_folders_owner_idx ON public.presentation_folders(owner_id, sort_order);
ALTER TABLE public.presentation_folders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "pres_folders_owner_all" ON public.presentation_folders;
CREATE POLICY "pres_folders_owner_all" ON public.presentation_folders
  FOR ALL TO authenticated
  USING (owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

ALTER TABLE public.presentations
  ADD COLUMN IF NOT EXISTS folder_id uuid REFERENCES public.presentation_folders(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'pdf',
  ADD COLUMN IF NOT EXISTS level text,
  ADD COLUMN IF NOT EXISTS skill text,
  ADD COLUMN IF NOT EXISTS tags text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS pinned boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS archived boolean NOT NULL DEFAULT false;

ALTER TABLE public.presentations DROP CONSTRAINT IF EXISTS presentations_kind_chk;
ALTER TABLE public.presentations ADD CONSTRAINT presentations_kind_chk CHECK (kind IN ('pdf','interactive','game','test'));
ALTER TABLE public.presentations DROP CONSTRAINT IF EXISTS presentations_level_chk;
ALTER TABLE public.presentations ADD CONSTRAINT presentations_level_chk CHECK (level IS NULL OR level IN ('A1','A2','B1','B2','C1','C2'));
CREATE INDEX IF NOT EXISTS presentations_folder_idx ON public.presentations(folder_id);

UPDATE public.presentations SET kind = 'interactive' WHERE html IS NOT NULL AND kind = 'pdf';