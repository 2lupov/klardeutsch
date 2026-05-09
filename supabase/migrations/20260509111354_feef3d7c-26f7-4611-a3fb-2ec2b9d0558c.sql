
-- Add live student feedback fields to tutoring_live_sessions
ALTER TABLE public.tutoring_live_sessions
  ADD COLUMN IF NOT EXISTS student_response jsonb,
  ADD COLUMN IF NOT EXISTS student_reaction jsonb;

-- Allow student to update only their own session row (RLS row-level — column restriction
-- enforced in client; the row already belongs to one student so this is safe).
DROP POLICY IF EXISTS "Student can update own live session feedback" ON public.tutoring_live_sessions;
CREATE POLICY "Student can update own live session feedback"
ON public.tutoring_live_sessions
FOR UPDATE
TO authenticated
USING (auth.uid() = student_id)
WITH CHECK (auth.uid() = student_id);
