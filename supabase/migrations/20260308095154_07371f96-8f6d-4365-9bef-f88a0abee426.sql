ALTER TABLE public.shop_items 
  ADD COLUMN IF NOT EXISTS price_eur numeric(10,2) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS payment_link text DEFAULT NULL;