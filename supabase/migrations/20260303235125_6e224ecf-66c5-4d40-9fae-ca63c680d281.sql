CREATE OR REPLACE FUNCTION public.get_admin_users()
 RETURNS TABLE(user_id uuid, email text, display_name text, avatar_url text, total_xp integer, coin_balance integer, roles text[], user_created_at timestamp with time zone, last_active timestamp with time zone, email_confirmed boolean)
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
    (u.email_confirmed_at IS NOT NULL) AS email_confirmed
  FROM public.profiles p
  LEFT JOIN auth.users u ON u.id = p.user_id
  LEFT JOIN public.user_xp x ON x.user_id = p.user_id
  LEFT JOIN public.user_coins c ON c.user_id = p.user_id
  LEFT JOIN public.user_roles r ON r.user_id = p.user_id
  GROUP BY p.user_id, u.email, p.display_name, p.avatar_url, x.total_xp, c.balance, p.created_at, p.last_active, u.email_confirmed_at
  ORDER BY p.created_at DESC;
END;
$function$;