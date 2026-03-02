DROP POLICY "Users can delete challenges they received while pending" ON public.challenges;

CREATE POLICY "Users can delete own challenges"
ON public.challenges
FOR DELETE
USING (
  (auth.uid() = challenger_id AND status IN ('pending', 'challenger_done'))
  OR
  (auth.uid() = opponent_id AND status IN ('pending', 'challenger_done'))
);