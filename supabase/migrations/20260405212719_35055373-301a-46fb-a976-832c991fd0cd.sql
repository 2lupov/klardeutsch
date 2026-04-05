
-- Subscriptions table
CREATE TABLE public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  stripe_customer_id text,
  stripe_subscription_id text,
  plan text NOT NULL DEFAULT 'free',
  status text NOT NULL DEFAULT 'active',
  current_period_start timestamp with time zone,
  current_period_end timestamp with time zone,
  cancel_at_period_end boolean DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own subscription"
  ON public.subscriptions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage subscriptions"
  ON public.subscriptions FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Daily usage tracking
CREATE TABLE public.daily_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  usage_date date NOT NULL DEFAULT CURRENT_DATE,
  lessons_used integer NOT NULL DEFAULT 0,
  games_used integer NOT NULL DEFAULT 0,
  ai_requests_used integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, usage_date)
);

ALTER TABLE public.daily_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own daily usage"
  ON public.daily_usage FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own daily usage"
  ON public.daily_usage FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own daily usage"
  ON public.daily_usage FOR UPDATE
  USING (auth.uid() = user_id);

-- Function to check if user is premium
CREATE OR REPLACE FUNCTION public.is_premium(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.subscriptions
    WHERE user_id = p_user_id
      AND plan = 'premium'
      AND status = 'active'
      AND (current_period_end IS NULL OR current_period_end > now())
  )
$$;

-- Function to increment daily usage
CREATE OR REPLACE FUNCTION public.increment_daily_usage(p_user_id uuid, p_type text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_premium boolean;
  v_lessons integer;
  v_games integer;
  v_ai integer;
  v_limit_lessons integer := 3;
  v_limit_games integer := 1;
  v_limit_ai integer := 3;
BEGIN
  v_premium := public.is_premium(p_user_id);
  
  -- Premium users have no limits
  IF v_premium THEN
    INSERT INTO daily_usage (user_id, usage_date, lessons_used, games_used, ai_requests_used)
    VALUES (p_user_id, CURRENT_DATE, 
      CASE WHEN p_type = 'lesson' THEN 1 ELSE 0 END,
      CASE WHEN p_type = 'game' THEN 1 ELSE 0 END,
      CASE WHEN p_type = 'ai' THEN 1 ELSE 0 END)
    ON CONFLICT (user_id, usage_date) DO UPDATE SET
      lessons_used = daily_usage.lessons_used + CASE WHEN p_type = 'lesson' THEN 1 ELSE 0 END,
      games_used = daily_usage.games_used + CASE WHEN p_type = 'game' THEN 1 ELSE 0 END,
      ai_requests_used = daily_usage.ai_requests_used + CASE WHEN p_type = 'ai' THEN 1 ELSE 0 END;
    RETURN jsonb_build_object('allowed', true, 'premium', true);
  END IF;

  -- Get current usage
  SELECT COALESCE(du.lessons_used, 0), COALESCE(du.games_used, 0), COALESCE(du.ai_requests_used, 0)
  INTO v_lessons, v_games, v_ai
  FROM daily_usage du
  WHERE du.user_id = p_user_id AND du.usage_date = CURRENT_DATE;

  IF NOT FOUND THEN
    v_lessons := 0; v_games := 0; v_ai := 0;
  END IF;

  -- Check limits
  IF (p_type = 'lesson' AND v_lessons >= v_limit_lessons) OR
     (p_type = 'game' AND v_games >= v_limit_games) OR
     (p_type = 'ai' AND v_ai >= v_limit_ai) THEN
    RETURN jsonb_build_object('allowed', false, 'premium', false, 
      'lessons_used', v_lessons, 'games_used', v_games, 'ai_used', v_ai,
      'limit_lessons', v_limit_lessons, 'limit_games', v_limit_games, 'limit_ai', v_limit_ai);
  END IF;

  -- Increment
  INSERT INTO daily_usage (user_id, usage_date, lessons_used, games_used, ai_requests_used)
  VALUES (p_user_id, CURRENT_DATE,
    CASE WHEN p_type = 'lesson' THEN 1 ELSE 0 END,
    CASE WHEN p_type = 'game' THEN 1 ELSE 0 END,
    CASE WHEN p_type = 'ai' THEN 1 ELSE 0 END)
  ON CONFLICT (user_id, usage_date) DO UPDATE SET
    lessons_used = daily_usage.lessons_used + CASE WHEN p_type = 'lesson' THEN 1 ELSE 0 END,
    games_used = daily_usage.games_used + CASE WHEN p_type = 'game' THEN 1 ELSE 0 END,
    ai_requests_used = daily_usage.ai_requests_used + CASE WHEN p_type = 'ai' THEN 1 ELSE 0 END;

  RETURN jsonb_build_object('allowed', true, 'premium', false,
    'lessons_used', v_lessons + CASE WHEN p_type = 'lesson' THEN 1 ELSE 0 END,
    'games_used', v_games + CASE WHEN p_type = 'game' THEN 1 ELSE 0 END,
    'ai_used', v_ai + CASE WHEN p_type = 'ai' THEN 1 ELSE 0 END,
    'limit_lessons', v_limit_lessons, 'limit_games', v_limit_games, 'limit_ai', v_limit_ai);
END;
$$;
