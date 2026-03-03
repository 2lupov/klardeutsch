
-- Courses table
CREATE TABLE public.courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  level text NOT NULL DEFAULT 'A1',
  image_url text,
  price integer NOT NULL DEFAULT 200,
  available boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Course lessons table
CREATE TABLE public.course_lessons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  title text NOT NULL,
  theory text NOT NULL DEFAULT '',
  exercises jsonb NOT NULL DEFAULT '[]'::jsonb,
  sort_order integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Course purchases (link to user)
CREATE TABLE public.course_purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  purchased_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, course_id)
);

-- RLS for courses
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read available courses" ON public.courses FOR SELECT USING (true);
CREATE POLICY "Admins can insert courses" ON public.courses FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update courses" ON public.courses FOR UPDATE USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete courses" ON public.courses FOR DELETE USING (has_role(auth.uid(), 'admin'));

-- RLS for course_lessons
ALTER TABLE public.course_lessons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read course lessons" ON public.course_lessons FOR SELECT USING (true);
CREATE POLICY "Admins can insert course_lessons" ON public.course_lessons FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update course_lessons" ON public.course_lessons FOR UPDATE USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete course_lessons" ON public.course_lessons FOR DELETE USING (has_role(auth.uid(), 'admin'));

-- RLS for course_purchases
ALTER TABLE public.course_purchases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own course purchases" ON public.course_purchases FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own course purchases" ON public.course_purchases FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Purchase course function
CREATE OR REPLACE FUNCTION public.purchase_course(p_user_id uuid, p_course_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_price integer;
  v_balance integer;
BEGIN
  SELECT price INTO v_price FROM public.courses WHERE id = p_course_id AND available = true;
  IF v_price IS NULL THEN RETURN false; END IF;

  SELECT balance INTO v_balance FROM public.user_coins WHERE user_id = p_user_id;
  IF v_balance IS NULL OR v_balance < v_price THEN RETURN false; END IF;

  -- Check already purchased
  IF EXISTS(SELECT 1 FROM public.course_purchases WHERE user_id = p_user_id AND course_id = p_course_id) THEN RETURN false; END IF;

  UPDATE public.user_coins SET balance = balance - v_price, updated_at = now() WHERE user_id = p_user_id;
  INSERT INTO public.course_purchases (user_id, course_id) VALUES (p_user_id, p_course_id);
  INSERT INTO public.coin_transactions (user_id, amount, reason) VALUES (p_user_id, -v_price, 'course:' || p_course_id);

  RETURN true;
END;
$$;
