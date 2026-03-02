CREATE POLICY "Users can delete challenges they received while pending"
ON public.challenges
FOR DELETE
USING (
  (auth.uid() = opponent_id AND status IN ('pending', 'challenger_done'))
  OR
  (auth.uid() = challenger_id AND status = 'pending')
);