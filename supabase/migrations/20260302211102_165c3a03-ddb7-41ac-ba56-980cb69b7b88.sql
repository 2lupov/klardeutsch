
-- Challenges table
CREATE TABLE public.challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  challenger_id uuid NOT NULL,
  opponent_id uuid NOT NULL,
  challenge_type text NOT NULL DEFAULT 'vocab', -- 'vocab' or 'grammar'
  level text NOT NULL DEFAULT 'A1',
  status text NOT NULL DEFAULT 'pending', -- pending, challenger_done, completed, declined
  challenger_score integer NOT NULL DEFAULT 0,
  opponent_score integer NOT NULL DEFAULT 0,
  winner_id uuid,
  questions jsonb NOT NULL DEFAULT '[]'::jsonb,
  challenger_answers jsonb DEFAULT '[]'::jsonb,
  opponent_answers jsonb DEFAULT '[]'::jsonb,
  xp_reward integer NOT NULL DEFAULT 50,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;

-- Both challenger and opponent can see challenges they're part of
CREATE POLICY "Users can view own challenges"
  ON public.challenges FOR SELECT
  USING (auth.uid() = challenger_id OR auth.uid() = opponent_id);

-- Any authenticated user can create a challenge
CREATE POLICY "Users can create challenges"
  ON public.challenges FOR INSERT
  WITH CHECK (auth.uid() = challenger_id);

-- Both players can update (to submit answers)
CREATE POLICY "Users can update own challenges"
  ON public.challenges FOR UPDATE
  USING (auth.uid() = challenger_id OR auth.uid() = opponent_id);

-- Trigger for updated_at
CREATE TRIGGER update_challenges_updated_at
  BEFORE UPDATE ON public.challenges
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for challenges
ALTER PUBLICATION supabase_realtime ADD TABLE public.challenges;
