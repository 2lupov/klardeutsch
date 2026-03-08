-- Allow authenticated users to check if referral code exists (for validation)
CREATE POLICY "Anyone can check if referral code exists"
ON public.referral_codes FOR SELECT
TO authenticated
USING (true);