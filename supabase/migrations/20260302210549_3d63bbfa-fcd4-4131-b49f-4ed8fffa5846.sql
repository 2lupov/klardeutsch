
-- XP table to track total experience points per user
CREATE TABLE public.user_xp (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  total_xp integer NOT NULL DEFAULT 0,
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.user_xp ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view xp for leaderboard"
  ON public.user_xp FOR SELECT
  USING (true);

CREATE POLICY "Users can insert own xp"
  ON public.user_xp FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own xp"
  ON public.user_xp FOR UPDATE
  USING (auth.uid() = user_id);

-- Function to award XP (called alongside award_coins)
CREATE OR REPLACE FUNCTION public.award_xp(p_user_id uuid, p_amount integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_xp (user_id, total_xp)
  VALUES (p_user_id, p_amount)
  ON CONFLICT (user_id) DO UPDATE SET total_xp = user_xp.total_xp + p_amount, updated_at = now();
END;
$$;

-- Function to get leaderboard (top N users with display names)
CREATE OR REPLACE FUNCTION public.get_leaderboard(p_limit integer DEFAULT 50)
RETURNS TABLE(user_id uuid, display_name text, avatar_url text, total_xp integer, rank bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    x.user_id,
    p.display_name,
    p.avatar_url,
    x.total_xp,
    ROW_NUMBER() OVER (ORDER BY x.total_xp DESC) as rank
  FROM public.user_xp x
  LEFT JOIN public.profiles p ON p.user_id = x.user_id
  WHERE x.total_xp > 0
  ORDER BY x.total_xp DESC
  LIMIT p_limit;
$$;
