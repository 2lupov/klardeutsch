DROP TABLE IF EXISTS public.direct_messages CASCADE;

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_synthetic boolean NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS idx_community_messages_created_at ON public.community_messages (created_at DESC);

CREATE POLICY "Admins can delete community messages" ON public.community_messages
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.synthetic_personas (
  user_id uuid PRIMARY KEY,
  display_name text NOT NULL,
  username text NOT NULL UNIQUE,
  avatar_url text,
  writing_style text NOT NULL,
  interests text[] NOT NULL DEFAULT '{}',
  activity_level numeric NOT NULL DEFAULT 1,
  emoji_frequency numeric NOT NULL DEFAULT 0.2,
  typo_frequency numeric NOT NULL DEFAULT 0.05,
  average_message_length int NOT NULL DEFAULT 40,
  active_hours int[] NOT NULL DEFAULT '{9,10,11,12,13,14,15,16,17,18,19,20,21,22}',
  personality_notes text,
  language text NOT NULL DEFAULT 'ru',
  enabled boolean NOT NULL DEFAULT true,
  last_message_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.synthetic_personas TO authenticated;
GRANT ALL ON public.synthetic_personas TO service_role;
ALTER TABLE public.synthetic_personas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage personas" ON public.synthetic_personas FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER trg_synthetic_personas_updated BEFORE UPDATE ON public.synthetic_personas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.synthetic_settings (
  id int PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  enabled boolean NOT NULL DEFAULT false,
  activity_level text NOT NULL DEFAULT 'medium' CHECK (activity_level IN ('low','medium','high')),
  max_messages_per_hour int NOT NULL DEFAULT 5,
  quiet_hours_start int NOT NULL DEFAULT 1,
  quiet_hours_end int NOT NULL DEFAULT 7,
  min_delay_minutes int NOT NULL DEFAULT 4,
  max_delay_minutes int NOT NULL DEFAULT 40,
  active_personas int NOT NULL DEFAULT 25,
  next_run_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.synthetic_settings TO authenticated;
GRANT ALL ON public.synthetic_settings TO service_role;
ALTER TABLE public.synthetic_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage synthetic settings" ON public.synthetic_settings FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER trg_synthetic_settings_updated BEFORE UPDATE ON public.synthetic_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
INSERT INTO public.synthetic_settings (id) VALUES (1) ON CONFLICT DO NOTHING;

CREATE OR REPLACE FUNCTION public.get_admin_users()
 RETURNS TABLE(user_id uuid, email text, display_name text, avatar_url text, total_xp integer, coin_balance integer, roles text[], user_created_at timestamp with time zone, last_active timestamp with time zone, email_confirmed boolean, words_learned integer, lessons_completed integer, duels_played integer, duels_won integer)
 LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied: admin role required';
  END IF;
  RETURN QUERY
  SELECT p.user_id, u.email::text, p.display_name, p.avatar_url,
    COALESCE(x.total_xp, 0)::integer, COALESCE(c.balance, 0)::integer,
    COALESCE(ARRAY_AGG(r.role::text) FILTER (WHERE r.role IS NOT NULL), '{}'),
    p.created_at, p.last_active, (u.email_confirmed_at IS NOT NULL),
    COALESCE(sw.cnt, 0)::integer, COALESCE(lc.cnt, 0)::integer, COALESCE(dp.cnt, 0)::integer, COALESCE(dw.cnt, 0)::integer
  FROM public.profiles p
  LEFT JOIN auth.users u ON u.id = p.user_id
  LEFT JOIN public.user_xp x ON x.user_id = p.user_id
  LEFT JOIN public.user_coins c ON c.user_id = p.user_id
  LEFT JOIN public.user_roles r ON r.user_id = p.user_id
  LEFT JOIN LATERAL (SELECT count(*)::integer AS cnt FROM public.saved_words WHERE saved_words.user_id = p.user_id) sw ON true
  LEFT JOIN LATERAL (SELECT count(*)::integer AS cnt FROM public.user_progress WHERE user_progress.user_id = p.user_id AND user_progress.completed = true) lc ON true
  LEFT JOIN LATERAL (SELECT count(*)::integer AS cnt FROM public.challenges WHERE (challenges.challenger_id = p.user_id OR challenges.opponent_id = p.user_id) AND challenges.status = 'done') dp ON true
  LEFT JOIN LATERAL (SELECT count(*)::integer AS cnt FROM public.challenges WHERE challenges.winner_id = p.user_id AND challenges.status = 'done') dw ON true
  WHERE NOT p.is_synthetic
  GROUP BY p.user_id, u.email, p.display_name, p.avatar_url, x.total_xp, c.balance, p.created_at, p.last_active, u.email_confirmed_at, sw.cnt, lc.cnt, dp.cnt, dw.cnt
  ORDER BY p.created_at DESC;
END;
$function$;