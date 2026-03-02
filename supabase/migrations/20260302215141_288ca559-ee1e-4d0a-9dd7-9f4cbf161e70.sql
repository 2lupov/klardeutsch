
-- Drop restrictive policies
DROP POLICY IF EXISTS "Users can view own challenges" ON public.challenges;
DROP POLICY IF EXISTS "Users can create challenges" ON public.challenges;
DROP POLICY IF EXISTS "Users can update own challenges" ON public.challenges;

-- Recreate as PERMISSIVE
CREATE POLICY "Users can view own challenges"
ON public.challenges FOR SELECT
TO authenticated
USING ((auth.uid() = challenger_id) OR (auth.uid() = opponent_id));

CREATE POLICY "Users can create challenges"
ON public.challenges FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = challenger_id);

CREATE POLICY "Users can update own challenges"
ON public.challenges FOR UPDATE
TO authenticated
USING ((auth.uid() = challenger_id) OR (auth.uid() = opponent_id));
