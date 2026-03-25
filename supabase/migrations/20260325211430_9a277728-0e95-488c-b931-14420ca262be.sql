
DROP FUNCTION IF EXISTS public.get_admin_users();

CREATE OR REPLACE FUNCTION public.get_admin_users()
 RETURNS TABLE(user_id uuid, email text, display_name text, avatar_url text, total_xp integer, coin_balance integer, roles text[], user_created_at timestamp with time zone, last_active timestamp with time zone, email_confirmed boolean, words_learned integer, lessons_completed integer, duels_played integer, duels_won integer)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied: admin role required';
  END IF;

  RETURN QUERY
  SELECT
    p.user_id,
    u.email::text,
    p.display_name,
    p.avatar_url,
    COALESCE(x.total_xp, 0)::integer,
    COALESCE(c.balance, 0)::integer,
    COALESCE(ARRAY_AGG(r.role::text) FILTER (WHERE r.role IS NOT NULL), '{}'),
    p.created_at,
    p.last_active,
    (u.email_confirmed_at IS NOT NULL) AS email_confirmed,
    COALESCE(sw.cnt, 0)::integer AS words_learned,
    COALESCE(lc.cnt, 0)::integer AS lessons_completed,
    COALESCE(dp.cnt, 0)::integer AS duels_played,
    COALESCE(dw.cnt, 0)::integer AS duels_won
  FROM public.profiles p
  LEFT JOIN auth.users u ON u.id = p.user_id
  LEFT JOIN public.user_xp x ON x.user_id = p.user_id
  LEFT JOIN public.user_coins c ON c.user_id = p.user_id
  LEFT JOIN public.user_roles r ON r.user_id = p.user_id
  LEFT JOIN LATERAL (SELECT count(*)::integer AS cnt FROM public.saved_words WHERE saved_words.user_id = p.user_id) sw ON true
  LEFT JOIN LATERAL (SELECT count(*)::integer AS cnt FROM public.user_progress WHERE user_progress.user_id = p.user_id AND user_progress.completed = true) lc ON true
  LEFT JOIN LATERAL (SELECT count(*)::integer AS cnt FROM public.challenges WHERE (challenges.challenger_id = p.user_id OR challenges.opponent_id = p.user_id) AND challenges.status = 'done') dp ON true
  LEFT JOIN LATERAL (SELECT count(*)::integer AS cnt FROM public.challenges WHERE challenges.winner_id = p.user_id AND challenges.status = 'done') dw ON true
  GROUP BY p.user_id, u.email, p.display_name, p.avatar_url, x.total_xp, c.balance, p.created_at, p.last_active, u.email_confirmed_at, sw.cnt, lc.cnt, dp.cnt, dw.cnt
  ORDER BY p.created_at DESC;
END;
$function$;
