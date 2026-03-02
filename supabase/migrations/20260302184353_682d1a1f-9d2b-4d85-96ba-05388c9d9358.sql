
CREATE TABLE public.custom_words (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  german TEXT NOT NULL,
  russian TEXT NOT NULL,
  article TEXT,
  example TEXT,
  is_difficult BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.custom_words ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own custom words" ON public.custom_words FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own custom words" ON public.custom_words FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own custom words" ON public.custom_words FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own custom words" ON public.custom_words FOR DELETE TO authenticated USING (auth.uid() = user_id);
