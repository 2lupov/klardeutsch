
CREATE TABLE public.saved_words (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  vocab_card_id UUID REFERENCES public.vocab_cards(id) ON DELETE CASCADE NOT NULL,
  is_difficult BOOLEAN NOT NULL DEFAULT false,
  learned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, vocab_card_id)
);

ALTER TABLE public.saved_words ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own saved words"
  ON public.saved_words FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own saved words"
  ON public.saved_words FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own saved words"
  ON public.saved_words FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own saved words"
  ON public.saved_words FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
