
-- 1. Add new columns to courses table
ALTER TABLE courses 
  ADD COLUMN IF NOT EXISTS thumbnail_url text,
  ADD COLUMN IF NOT EXISTS trailer_url text,
  ADD COLUMN IF NOT EXISTS instructor_name text,
  ADD COLUMN IF NOT EXISTS instructor_avatar text,
  ADD COLUMN IF NOT EXISTS instructor_bio text,
  ADD COLUMN IF NOT EXISTS total_modules int DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_lessons int DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_hours numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS difficulty text DEFAULT 'A1',
  ADD COLUMN IF NOT EXISTS price_coins int,
  ADD COLUMN IF NOT EXISTS cohort_start_date date,
  ADD COLUMN IF NOT EXISTS is_featured boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS tags text[],
  ADD COLUMN IF NOT EXISTS outcomes text[];

-- 2. Create course_modules table
CREATE TABLE IF NOT EXISTS course_modules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid REFERENCES courses(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  description text,
  sort_order int NOT NULL DEFAULT 0,
  is_free_preview boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE course_modules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read modules" ON course_modules FOR SELECT USING (true);
CREATE POLICY "Admin write modules" ON course_modules FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin update modules" ON course_modules FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin delete modules" ON course_modules FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'));

-- 3. Add new columns to course_lessons
ALTER TABLE course_lessons
  ADD COLUMN IF NOT EXISTS module_id uuid REFERENCES course_modules(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS lesson_type text DEFAULT 'video',
  ADD COLUMN IF NOT EXISTS video_url text,
  ADD COLUMN IF NOT EXISTS video_duration_sec int,
  ADD COLUMN IF NOT EXISTS video_subtitles_url text,
  ADD COLUMN IF NOT EXISTS content jsonb,
  ADD COLUMN IF NOT EXISTS xp_reward int DEFAULT 20,
  ADD COLUMN IF NOT EXISTS coins_reward int DEFAULT 10,
  ADD COLUMN IF NOT EXISTS is_free_preview boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS estimated_minutes int DEFAULT 10;

-- 4. Course lesson progress
CREATE TABLE IF NOT EXISTS course_lesson_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  lesson_id uuid REFERENCES course_lessons(id) ON DELETE CASCADE,
  course_id uuid REFERENCES courses(id) ON DELETE CASCADE,
  status text DEFAULT 'not_started',
  score int,
  video_watched_seconds int DEFAULT 0,
  completed_at timestamptz,
  last_accessed_at timestamptz DEFAULT now(),
  user_answers jsonb,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, lesson_id)
);
ALTER TABLE course_lesson_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own progress" ON course_lesson_progress FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 5. Teacher chat messages
CREATE TABLE IF NOT EXISTS teacher_chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id uuid REFERENCES course_lessons(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  sender text NOT NULL,
  content text NOT NULL,
  audio_url text,
  video_timecode int,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE teacher_chat_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own teacher messages" ON teacher_chat_messages FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admin read teacher messages" ON teacher_chat_messages FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin insert teacher messages" ON teacher_chat_messages FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'));

-- 6. Course notebooks
CREATE TABLE IF NOT EXISTS course_notebooks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  lesson_id uuid REFERENCES course_lessons(id) ON DELETE CASCADE,
  course_id uuid REFERENCES courses(id) ON DELETE CASCADE,
  content text,
  auto_words jsonb,
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, lesson_id)
);
ALTER TABLE course_notebooks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own notebooks" ON course_notebooks FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 7. Course certificates
CREATE TABLE IF NOT EXISTS course_certificates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  course_id uuid REFERENCES courses(id) ON DELETE CASCADE,
  certificate_code text UNIQUE NOT NULL,
  final_score int,
  issued_at timestamptz DEFAULT now(),
  UNIQUE(user_id, course_id)
);
ALTER TABLE course_certificates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own certs" ON course_certificates FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admin read certs" ON course_certificates FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'));

-- 8. Cohort messages
CREATE TABLE IF NOT EXISTS course_cohort_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid REFERENCES courses(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  content text NOT NULL,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE course_cohort_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enrolled users read cohort" ON course_cohort_messages 
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM course_purchases WHERE course_id = course_cohort_messages.course_id AND user_id = auth.uid())
  );
CREATE POLICY "Own write cohort" ON course_cohort_messages FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- 9. Enable realtime for teacher chat and cohort
ALTER PUBLICATION supabase_realtime ADD TABLE teacher_chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE course_cohort_messages;

-- 10. RPC: get_course_progress
CREATE OR REPLACE FUNCTION get_course_progress(p_user_id uuid, p_course_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  total_lessons int;
  completed_lessons int;
BEGIN
  SELECT COUNT(*) INTO total_lessons FROM course_lessons WHERE course_id = p_course_id;
  SELECT COUNT(*) INTO completed_lessons 
  FROM course_lesson_progress 
  WHERE user_id = p_user_id AND course_id = p_course_id AND status = 'completed';
  
  RETURN jsonb_build_object(
    'total', total_lessons,
    'completed', completed_lessons,
    'percent', CASE WHEN total_lessons > 0 THEN ROUND((completed_lessons::numeric / total_lessons) * 100) ELSE 0 END
  );
END;
$$;

-- 11. RPC: complete_course_lesson
CREATE OR REPLACE FUNCTION complete_course_lesson(
  p_user_id uuid,
  p_lesson_id uuid,
  p_score int DEFAULT NULL,
  p_answers jsonb DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  lesson_rec record;
BEGIN
  SELECT xp_reward, coins_reward, course_id INTO lesson_rec FROM course_lessons WHERE id = p_lesson_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false); END IF;
  
  INSERT INTO course_lesson_progress (user_id, lesson_id, course_id, status, score, user_answers, completed_at)
  VALUES (p_user_id, p_lesson_id, lesson_rec.course_id, 'completed', p_score, p_answers, now())
  ON CONFLICT (user_id, lesson_id) DO UPDATE
    SET status = 'completed', score = p_score, user_answers = p_answers, completed_at = now();
  
  PERFORM award_xp(p_user_id, COALESCE(lesson_rec.xp_reward, 20));
  PERFORM award_coins(p_user_id, COALESCE(lesson_rec.coins_reward, 10), 'course_lesson');
  
  RETURN jsonb_build_object('success', true, 'xp', lesson_rec.xp_reward, 'coins', lesson_rec.coins_reward);
END;
$$;

-- 12. RPC: issue_certificate
CREATE OR REPLACE FUNCTION issue_certificate(p_user_id uuid, p_course_id uuid, p_score int)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cert_code text;
BEGIN
  cert_code := upper(substring(md5(p_user_id::text || p_course_id::text || now()::text) from 1 for 8));
  
  INSERT INTO course_certificates (user_id, course_id, certificate_code, final_score)
  VALUES (p_user_id, p_course_id, cert_code, p_score)
  ON CONFLICT (user_id, course_id) DO NOTHING;
  
  RETURN cert_code;
END;
$$;
