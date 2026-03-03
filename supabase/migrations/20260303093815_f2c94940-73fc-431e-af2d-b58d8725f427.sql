
-- Table for café game scenarios (editable via admin panel)
CREATE TABLE public.cafe_scenarios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  barista_line text NOT NULL,
  hint_ru text NOT NULL DEFAULT '',
  hint_uk text NOT NULL DEFAULT '',
  options jsonb NOT NULL DEFAULT '[]',
  timer_sec integer NOT NULL DEFAULT 10,
  level text NOT NULL DEFAULT 'A1',
  sort_order integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.cafe_scenarios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read cafe_scenarios" ON public.cafe_scenarios FOR SELECT USING (true);
CREATE POLICY "Admins can insert cafe_scenarios" ON public.cafe_scenarios FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update cafe_scenarios" ON public.cafe_scenarios FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete cafe_scenarios" ON public.cafe_scenarios FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

-- Admin function to get all users overview
CREATE OR REPLACE FUNCTION public.get_admin_users()
RETURNS TABLE(
  user_id uuid,
  email text,
  display_name text,
  avatar_url text,
  total_xp integer,
  coin_balance integer,
  roles text[],
  user_created_at timestamptz,
  last_active timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.user_id,
    u.email::text,
    p.display_name,
    p.avatar_url,
    COALESCE(x.total_xp, 0)::integer,
    COALESCE(c.balance, 0)::integer,
    COALESCE(ARRAY_AGG(r.role::text) FILTER (WHERE r.role IS NOT NULL), '{}'),
    p.created_at,
    p.last_active
  FROM public.profiles p
  LEFT JOIN auth.users u ON u.id = p.user_id
  LEFT JOIN public.user_xp x ON x.user_id = p.user_id
  LEFT JOIN public.user_coins c ON c.user_id = p.user_id
  LEFT JOIN public.user_roles r ON r.user_id = p.user_id
  GROUP BY p.user_id, u.email, p.display_name, p.avatar_url, x.total_xp, c.balance, p.created_at, p.last_active
  ORDER BY p.created_at DESC;
$$;
