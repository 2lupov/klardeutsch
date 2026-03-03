
-- Create a demo_leaderboard_entries table for fake leaderboard users (no FK to auth.users)
CREATE TABLE IF NOT EXISTS public.demo_leaderboard (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  display_name text NOT NULL,
  avatar_url text,
  total_xp integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.demo_leaderboard ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read demo_leaderboard" ON public.demo_leaderboard
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage demo_leaderboard" ON public.demo_leaderboard
  FOR ALL USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Update get_leaderboard to include demo entries
CREATE OR REPLACE FUNCTION public.get_leaderboard(p_limit integer DEFAULT 50)
 RETURNS TABLE(user_id uuid, display_name text, avatar_url text, total_xp integer, rank bigint)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $$
  SELECT user_id, display_name, avatar_url, total_xp, ROW_NUMBER() OVER (ORDER BY total_xp DESC) as rank
  FROM (
    SELECT x.user_id, p.display_name, p.avatar_url, x.total_xp
    FROM public.user_xp x
    LEFT JOIN public.profiles p ON p.user_id = x.user_id
    WHERE x.total_xp > 0
    UNION ALL
    SELECT d.id as user_id, d.display_name, d.avatar_url, d.total_xp
    FROM public.demo_leaderboard d
    WHERE d.total_xp > 0
  ) combined
  ORDER BY total_xp DESC
  LIMIT p_limit;
$$;

-- Function to admin-set XP for real users
CREATE OR REPLACE FUNCTION public.admin_set_xp(p_user_id uuid, p_xp integer)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.user_xp (user_id, total_xp)
  VALUES (p_user_id, p_xp)
  ON CONFLICT (user_id) DO UPDATE SET total_xp = p_xp, updated_at = now();
END;
$$;
