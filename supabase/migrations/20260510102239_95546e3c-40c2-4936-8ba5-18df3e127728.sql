-- 1) Tighten profiles visibility: hide teacher-created student profiles from other users
DROP POLICY IF EXISTS "Authenticated users can view all profiles" ON public.profiles;

CREATE POLICY "View non-student profiles or own/teacher/admin"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  created_by_teacher_id IS NULL
  OR auth.uid() = user_id
  OR auth.uid() = created_by_teacher_id
  OR public.has_role(auth.uid(), 'admin')
);

-- 2) Brute-force protection table for student-login (server-only)
CREATE TABLE IF NOT EXISTS public.student_login_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nickname text NOT NULL,
  failed_count integer NOT NULL DEFAULT 0,
  locked_until timestamptz,
  last_attempt_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS student_login_attempts_nick_idx
  ON public.student_login_attempts (lower(nickname));

ALTER TABLE public.student_login_attempts ENABLE ROW LEVEL SECURITY;
-- No policies = no client access; only service-role (edge function) reads/writes it.