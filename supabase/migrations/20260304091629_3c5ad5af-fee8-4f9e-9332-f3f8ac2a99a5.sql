CREATE OR REPLACE FUNCTION public.get_user_duel_stats(p_user_id uuid)
RETURNS TABLE(duels_played integer, duels_won integer)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT
    (SELECT count(*)::integer FROM public.challenges
     WHERE (challenger_id = p_user_id OR opponent_id = p_user_id)
     AND status = 'done') AS duels_played,
    (SELECT count(*)::integer FROM public.challenges
     WHERE winner_id = p_user_id
     AND status = 'done') AS duels_won;
$$;