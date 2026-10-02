CREATE TABLE public.dutch_html_docs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL DEFAULT 'Документ',
  html text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.dutch_html_docs TO authenticated;
GRANT ALL ON public.dutch_html_docs TO service_role;
ALTER TABLE public.dutch_html_docs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own html docs" ON public.dutch_html_docs FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER dutch_html_docs_updated BEFORE UPDATE ON public.dutch_html_docs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();