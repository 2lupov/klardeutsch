
CREATE TABLE public.daily_bonuses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  last_claimed_at timestamp with time zone NOT NULL DEFAULT now(),
  streak integer NOT NULL DEFAULT 1,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.daily_bonuses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own daily bonus" ON public.daily_bonuses
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own daily bonus" ON public.daily_bonuses
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own daily bonus" ON public.daily_bonuses
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);
