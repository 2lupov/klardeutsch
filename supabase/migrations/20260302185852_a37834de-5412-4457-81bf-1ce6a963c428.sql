
-- User coins balance
CREATE TABLE public.user_coins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  balance integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.user_coins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own coins" ON public.user_coins FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own coins" ON public.user_coins FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own coins" ON public.user_coins FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- Coin transactions log
CREATE TABLE public.coin_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  amount integer NOT NULL,
  reason text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.coin_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own transactions" ON public.coin_transactions FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own transactions" ON public.coin_transactions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Shop items (admin-managed)
CREATE TABLE public.shop_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  price integer NOT NULL DEFAULT 100,
  image_url text,
  available boolean NOT NULL DEFAULT true,
  item_type text NOT NULL DEFAULT 'task',
  content text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.shop_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read shop items" ON public.shop_items FOR SELECT USING (true);
CREATE POLICY "Auth users can insert shop items" ON public.shop_items FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth users can update shop items" ON public.shop_items FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Auth users can delete shop items" ON public.shop_items FOR DELETE TO authenticated USING (true);

-- Purchases
CREATE TABLE public.purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  item_id uuid REFERENCES public.shop_items(id) ON DELETE CASCADE NOT NULL,
  purchased_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own purchases" ON public.purchases FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own purchases" ON public.purchases FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Function to award coins atomically
CREATE OR REPLACE FUNCTION public.award_coins(p_user_id uuid, p_amount integer, p_reason text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_coins (user_id, balance)
  VALUES (p_user_id, p_amount)
  ON CONFLICT (user_id) DO UPDATE SET balance = user_coins.balance + p_amount, updated_at = now();

  INSERT INTO public.coin_transactions (user_id, amount, reason)
  VALUES (p_user_id, p_amount, p_reason);
END;
$$;

-- Function to purchase item
CREATE OR REPLACE FUNCTION public.purchase_item(p_user_id uuid, p_item_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_price integer;
  v_balance integer;
BEGIN
  SELECT price INTO v_price FROM public.shop_items WHERE id = p_item_id AND available = true;
  IF v_price IS NULL THEN RETURN false; END IF;

  SELECT balance INTO v_balance FROM public.user_coins WHERE user_id = p_user_id;
  IF v_balance IS NULL OR v_balance < v_price THEN RETURN false; END IF;

  UPDATE public.user_coins SET balance = balance - v_price, updated_at = now() WHERE user_id = p_user_id;
  INSERT INTO public.purchases (user_id, item_id) VALUES (p_user_id, p_item_id);
  INSERT INTO public.coin_transactions (user_id, amount, reason) VALUES (p_user_id, -v_price, 'purchase:' || p_item_id);

  RETURN true;
END;
$$;
