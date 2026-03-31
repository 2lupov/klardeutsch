
-- Gift catalog
CREATE TABLE public.gift_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  emoji TEXT NOT NULL DEFAULT '🎁',
  image_url TEXT,
  price INTEGER NOT NULL DEFAULT 50,
  category TEXT NOT NULL DEFAULT 'panda',
  rarity TEXT NOT NULL DEFAULT 'common',
  description_ru TEXT,
  description_uk TEXT,
  sort_order INTEGER DEFAULT 0,
  available BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.gift_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read gift_items" ON public.gift_items FOR SELECT USING (true);
CREATE POLICY "Admins can manage gift_items" ON public.gift_items FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));

-- User gifts (sent/received)
CREATE TABLE public.user_gifts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  gift_id UUID NOT NULL REFERENCES public.gift_items(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL,
  receiver_id UUID NOT NULL,
  message TEXT,
  displayed BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.user_gifts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can see gifts they sent or received" ON public.user_gifts FOR SELECT TO authenticated USING (auth.uid() = sender_id OR auth.uid() = receiver_id);
CREATE POLICY "Authenticated users can send gifts" ON public.user_gifts FOR INSERT TO authenticated WITH CHECK (auth.uid() = sender_id);
CREATE POLICY "Receivers can update display setting" ON public.user_gifts FOR UPDATE TO authenticated USING (auth.uid() = receiver_id);

-- Function to send a gift (deducts coins)
CREATE OR REPLACE FUNCTION public.send_gift(p_sender_id UUID, p_receiver_id UUID, p_gift_id UUID, p_message TEXT DEFAULT NULL)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_price INTEGER;
  v_balance INTEGER;
BEGIN
  IF p_sender_id = p_receiver_id THEN RETURN false; END IF;

  SELECT price INTO v_price FROM public.gift_items WHERE id = p_gift_id AND available = true;
  IF v_price IS NULL THEN RETURN false; END IF;

  SELECT balance INTO v_balance FROM public.user_coins WHERE user_id = p_sender_id;
  IF v_balance IS NULL OR v_balance < v_price THEN RETURN false; END IF;

  UPDATE public.user_coins SET balance = balance - v_price, updated_at = now() WHERE user_id = p_sender_id;
  INSERT INTO public.coin_transactions (user_id, amount, reason) VALUES (p_sender_id, -v_price, 'gift:' || p_gift_id);
  INSERT INTO public.user_gifts (gift_id, sender_id, receiver_id, message) VALUES (p_gift_id, p_sender_id, p_receiver_id, p_message);

  RETURN true;
END;
$$;
