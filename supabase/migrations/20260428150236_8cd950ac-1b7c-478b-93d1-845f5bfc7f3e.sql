
-- Live presenter sessions for tutoring lessons
CREATE TABLE public.tutoring_live_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id uuid NOT NULL,
  teacher_id uuid NOT NULL,
  student_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'active', -- active | ended
  current_view jsonb NOT NULL DEFAULT '{"type":"welcome"}'::jsonb,
  -- view types: welcome | theory | exercise | word | whiteboard | text
  highlight jsonb,        -- {x,y,visible,label?}
  whiteboard jsonb NOT NULL DEFAULT '[]'::jsonb,  -- [{type:'path'|'text', ...}]
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz
);

ALTER TABLE public.tutoring_live_sessions ENABLE ROW LEVEL SECURITY;

-- Teacher full access
CREATE POLICY "Teacher manages own live sessions"
ON public.tutoring_live_sessions
FOR ALL
TO authenticated
USING (auth.uid() = teacher_id)
WITH CHECK (auth.uid() = teacher_id);

-- Student can view + be in session
CREATE POLICY "Student can view own live session"
ON public.tutoring_live_sessions
FOR SELECT
TO authenticated
USING (auth.uid() = student_id);

-- Public read for /student-view via session id token (anon allowed only when knowing UUID — we keep auth required)
-- Add to realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.tutoring_live_sessions;
ALTER TABLE public.tutoring_live_sessions REPLICA IDENTITY FULL;

CREATE INDEX idx_tls_lesson ON public.tutoring_live_sessions(lesson_id);
CREATE INDEX idx_tls_student ON public.tutoring_live_sessions(student_id, status);

CREATE TRIGGER trg_tls_updated
BEFORE UPDATE ON public.tutoring_live_sessions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
