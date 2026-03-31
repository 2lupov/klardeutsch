
-- Module 1: Onboarding
CREATE TABLE placement_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_de text NOT NULL,
  options jsonb NOT NULL,
  correct int NOT NULL,
  level text NOT NULL,
  sort_order int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE placement_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read placement_questions" ON placement_questions FOR SELECT TO public USING (true);
CREATE POLICY "Admins can manage placement_questions" ON placement_questions FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));

-- New profile fields for onboarding
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS onboarding_completed boolean DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS recommended_level text DEFAULT 'A1';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS learning_goal text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS daily_goal_minutes int DEFAULT 15;

-- Module 2: SRS
CREATE TABLE srs_cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  vocab_card_id uuid REFERENCES vocab_cards(id),
  custom_word_id uuid REFERENCES custom_words(id),
  ease_factor numeric DEFAULT 2.5,
  interval_days int DEFAULT 1,
  repetitions int DEFAULT 0,
  next_review_at timestamptz DEFAULT now(),
  last_reviewed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_srs_cards_user_next ON srs_cards(user_id, next_review_at);
CREATE UNIQUE INDEX idx_srs_cards_vocab ON srs_cards(user_id, vocab_card_id) WHERE vocab_card_id IS NOT NULL;
CREATE UNIQUE INDEX idx_srs_cards_custom ON srs_cards(user_id, custom_word_id) WHERE custom_word_id IS NOT NULL;

ALTER TABLE srs_cards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own srs_cards" ON srs_cards FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Module 3: Streak enhancements
ALTER TABLE daily_bonuses ADD COLUMN IF NOT EXISTS streak_shields int DEFAULT 0;
ALTER TABLE daily_bonuses ADD COLUMN IF NOT EXISTS last_shield_used_at date;

CREATE TABLE streak_milestones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  milestone_days int NOT NULL,
  achieved_at timestamptz DEFAULT now(),
  coins_awarded int NOT NULL,
  UNIQUE(user_id, milestone_days)
);

ALTER TABLE streak_milestones ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own milestones" ON streak_milestones FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Module 4: Daily Summary - XP transactions
CREATE TABLE xp_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  amount int NOT NULL,
  reason text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_xp_transactions_user_date ON xp_transactions(user_id, created_at);

ALTER TABLE xp_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own xp_transactions" ON xp_transactions FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own xp_transactions" ON xp_transactions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- SM-2 review RPC
CREATE OR REPLACE FUNCTION review_srs_card(
  p_user_id uuid,
  p_card_id uuid,
  p_quality int
) RETURNS void AS $$
DECLARE
  v_ef numeric;
  v_interval int;
  v_reps int;
BEGIN
  SELECT ease_factor, interval_days, repetitions INTO v_ef, v_interval, v_reps
  FROM srs_cards WHERE id = p_card_id AND user_id = p_user_id;

  IF NOT FOUND THEN RETURN; END IF;

  IF p_quality < 3 THEN
    v_reps := 0;
    v_interval := 1;
  ELSE
    v_reps := v_reps + 1;
    IF v_reps = 1 THEN v_interval := 1;
    ELSIF v_reps = 2 THEN v_interval := 6;
    ELSE v_interval := CEIL(v_interval * v_ef);
    END IF;
  END IF;

  v_ef := v_ef + (0.1 - (5 - p_quality) * (0.08 + (5 - p_quality) * 0.02));
  IF v_ef < 1.3 THEN v_ef := 1.3; END IF;

  UPDATE srs_cards SET
    ease_factor = v_ef,
    interval_days = v_interval,
    repetitions = v_reps,
    next_review_at = now() + (v_interval || ' days')::interval,
    last_reviewed_at = now()
  WHERE id = p_card_id AND user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Update award_xp to also log to xp_transactions
CREATE OR REPLACE FUNCTION public.award_xp(p_user_id uuid, p_amount integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.user_xp (user_id, total_xp)
  VALUES (p_user_id, p_amount)
  ON CONFLICT (user_id) DO UPDATE SET total_xp = user_xp.total_xp + p_amount, updated_at = now();

  INSERT INTO public.xp_transactions (user_id, amount, reason)
  VALUES (p_user_id, p_amount, 'award');
END;
$$;

-- Streak reminder field
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_reminder_sent_at date;
