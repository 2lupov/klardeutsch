
-- Referral codes table
CREATE TABLE public.referral_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  code text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.referral_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own referral code"
  ON public.referral_codes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own referral code"
  ON public.referral_codes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Referrals table (who invited whom)
CREATE TABLE public.referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id uuid NOT NULL,
  referred_id uuid NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'pending',
  activated_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own referrals as referrer"
  ON public.referrals FOR SELECT
  USING (auth.uid() = referrer_id OR auth.uid() = referred_id);

CREATE POLICY "Users can insert referral for themselves"
  ON public.referrals FOR INSERT
  WITH CHECK (auth.uid() = referred_id);

CREATE POLICY "System can update referral status"
  ON public.referrals FOR UPDATE
  USING (auth.uid() = referrer_id OR auth.uid() = referred_id);

-- Referral challenges (joint tasks between referrer and referred)
CREATE TABLE public.referral_challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id uuid NOT NULL,
  referred_id uuid NOT NULL,
  challenge_type text NOT NULL,
  target_value integer NOT NULL DEFAULT 1,
  current_value integer NOT NULL DEFAULT 0,
  completed boolean NOT NULL DEFAULT false,
  reward_type text NOT NULL,
  reward_value text NOT NULL,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.referral_challenges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own referral challenges"
  ON public.referral_challenges FOR SELECT
  USING (auth.uid() = referrer_id OR auth.uid() = referred_id);

CREATE POLICY "Users can update own referral challenges"
  ON public.referral_challenges FOR UPDATE
  USING (auth.uid() = referrer_id OR auth.uid() = referred_id);

-- Function to generate a unique referral code
CREATE OR REPLACE FUNCTION public.generate_referral_code(p_user_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_code text;
  v_exists boolean;
BEGIN
  -- Check if user already has a code
  SELECT code INTO v_code FROM public.referral_codes WHERE user_id = p_user_id;
  IF v_code IS NOT NULL THEN RETURN v_code; END IF;

  -- Generate unique code
  LOOP
    v_code := 'KLAR-' || upper(substr(md5(random()::text), 1, 4));
    SELECT EXISTS(SELECT 1 FROM public.referral_codes WHERE code = v_code) INTO v_exists;
    EXIT WHEN NOT v_exists;
  END LOOP;

  INSERT INTO public.referral_codes (user_id, code) VALUES (p_user_id, v_code);
  RETURN v_code;
END;
$$;

-- Function to apply referral code (called by referred user)
CREATE OR REPLACE FUNCTION public.apply_referral_code(p_referred_id uuid, p_code text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_referrer_id uuid;
BEGIN
  -- Find referrer by code
  SELECT user_id INTO v_referrer_id FROM public.referral_codes WHERE code = upper(p_code);
  IF v_referrer_id IS NULL THEN RETURN false; END IF;
  IF v_referrer_id = p_referred_id THEN RETURN false; END IF;

  -- Check if already referred
  IF EXISTS(SELECT 1 FROM public.referrals WHERE referred_id = p_referred_id) THEN RETURN false; END IF;

  -- Create referral
  INSERT INTO public.referrals (referrer_id, referred_id, status) VALUES (v_referrer_id, p_referred_id, 'pending');

  RETURN true;
END;
$$;

-- Function to activate referral (called when referred user completes first lesson)
CREATE OR REPLACE FUNCTION public.activate_referral(p_referred_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_referrer_id uuid;
  v_referral_id uuid;
BEGIN
  -- Find pending referral
  SELECT id, referrer_id INTO v_referral_id, v_referrer_id
  FROM public.referrals
  WHERE referred_id = p_referred_id AND status = 'pending';

  IF v_referral_id IS NULL THEN RETURN; END IF;

  -- Activate
  UPDATE public.referrals SET status = 'active', activated_at = now() WHERE id = v_referral_id;

  -- Award both users
  PERFORM public.award_coins(v_referrer_id, 50, 'referral_bonus');
  PERFORM public.award_coins(p_referred_id, 50, 'referral_welcome');
  PERFORM public.award_xp(v_referrer_id, 20);
  PERFORM public.award_xp(p_referred_id, 20);

  -- Create joint challenges
  INSERT INTO public.referral_challenges (referrer_id, referred_id, challenge_type, target_value, reward_type, reward_value)
  VALUES
    (v_referrer_id, p_referred_id, 'duels_together', 3, 'course', 'living_german_7day'),
    (v_referrer_id, p_referred_id, 'words_together', 50, 'premium_audio', 'premium_listening'),
    (v_referrer_id, p_referred_id, 'level_together', 1, 'theme', 'exclusive_theme');
END;
$$;

-- Function to get referral stats for milestone rewards
CREATE OR REPLACE FUNCTION public.get_referral_stats(p_user_id uuid)
RETURNS TABLE(total_referrals integer, active_referrals integer)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    count(*)::integer as total_referrals,
    count(*) FILTER (WHERE status = 'active')::integer as active_referrals
  FROM public.referrals
  WHERE referrer_id = p_user_id;
$$;
