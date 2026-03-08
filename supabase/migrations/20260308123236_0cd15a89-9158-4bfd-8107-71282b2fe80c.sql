
-- Drop the restrictive policies
DROP POLICY IF EXISTS "Anyone can check if referral code exists" ON public.referral_codes;
DROP POLICY IF EXISTS "Users can view own referral code" ON public.referral_codes;

-- Recreate as PERMISSIVE so anyone (even anon) can check codes exist
CREATE POLICY "Anyone can check referral codes"
  ON public.referral_codes FOR SELECT
  USING (true);
