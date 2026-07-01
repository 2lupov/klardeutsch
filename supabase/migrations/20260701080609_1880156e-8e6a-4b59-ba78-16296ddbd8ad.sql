
-- ============ 1. Harden award / admin_set_xp ============
CREATE OR REPLACE FUNCTION public.award_coins(p_user_id uuid, p_amount integer, p_reason text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR (auth.uid() <> p_user_id AND NOT public.has_role(auth.uid(), 'admin'::app_role)) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;
  INSERT INTO public.user_coins (user_id, balance)
  VALUES (p_user_id, p_amount)
  ON CONFLICT (user_id) DO UPDATE SET balance = user_coins.balance + p_amount, updated_at = now();
  INSERT INTO public.coin_transactions (user_id, amount, reason) VALUES (p_user_id, p_amount, p_reason);
END;
$$;

CREATE OR REPLACE FUNCTION public.award_xp(p_user_id uuid, p_amount integer)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR (auth.uid() <> p_user_id AND NOT public.has_role(auth.uid(), 'admin'::app_role)) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;
  INSERT INTO public.user_xp (user_id, total_xp)
  VALUES (p_user_id, p_amount)
  ON CONFLICT (user_id) DO UPDATE SET total_xp = user_xp.total_xp + p_amount, updated_at = now();
  INSERT INTO public.xp_transactions (user_id, amount, reason) VALUES (p_user_id, p_amount, 'award');
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_set_xp(p_user_id uuid, p_xp integer)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;
  INSERT INTO public.user_xp (user_id, total_xp)
  VALUES (p_user_id, p_xp)
  ON CONFLICT (user_id) DO UPDATE SET total_xp = p_xp, updated_at = now();
END;
$$;

-- ============ 2. Caller checks on RPCs ============
CREATE OR REPLACE FUNCTION public.purchase_item(p_user_id uuid, p_item_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_price integer; v_balance integer;
BEGIN
  IF auth.uid() IS NULL OR (auth.uid() <> p_user_id AND NOT public.has_role(auth.uid(), 'admin'::app_role)) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;
  SELECT price INTO v_price FROM public.shop_items WHERE id = p_item_id AND available = true;
  IF v_price IS NULL THEN RETURN false; END IF;
  SELECT balance INTO v_balance FROM public.user_coins WHERE user_id = p_user_id;
  IF v_balance IS NULL OR v_balance < v_price THEN RETURN false; END IF;
  UPDATE public.user_coins SET balance = balance - v_price, updated_at = now() WHERE user_id = p_user_id;
  INSERT INTO public.purchases (user_id, item_id) VALUES (p_user_id, p_item_id);
  INSERT INTO public.coin_transactions (user_id, amount, reason) VALUES (p_user_id, -v_price, 'purchase:' || p_item_id);
  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.issue_certificate(p_user_id uuid, p_course_id uuid, p_score integer)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE cert_code text;
BEGIN
  IF auth.uid() IS NULL OR (auth.uid() <> p_user_id AND NOT public.has_role(auth.uid(), 'admin'::app_role)) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;
  cert_code := upper(substring(md5(p_user_id::text || p_course_id::text || now()::text) from 1 for 8));
  INSERT INTO course_certificates (user_id, course_id, certificate_code, final_score)
  VALUES (p_user_id, p_course_id, cert_code, p_score)
  ON CONFLICT (user_id, course_id) DO NOTHING;
  RETURN cert_code;
END;
$$;

CREATE OR REPLACE FUNCTION public.complete_course_lesson(p_user_id uuid, p_lesson_id uuid, p_score integer DEFAULT NULL, p_answers jsonb DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE lesson_rec record;
BEGIN
  IF auth.uid() IS NULL OR (auth.uid() <> p_user_id AND NOT public.has_role(auth.uid(), 'admin'::app_role)) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;
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

-- ============ 3. Lock user_xp direct writes ============
DROP POLICY IF EXISTS "Users can insert own xp" ON public.user_xp;
DROP POLICY IF EXISTS "Users can update own xp" ON public.user_xp;
-- SELECT policy for leaderboard remains; writes now go through award_xp / admin_set_xp

-- ============ 4. referral_codes SELECT hardening ============
DROP POLICY IF EXISTS "Anyone can check referral codes" ON public.referral_codes;
CREATE POLICY "Users can view own referral code" ON public.referral_codes
  FOR SELECT USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.referral_code_exists(p_code text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.referral_codes WHERE code = upper(p_code));
$$;
GRANT EXECUTE ON FUNCTION public.referral_code_exists(text) TO anon, authenticated;

-- ============ 5. Storage policies ============
DROP POLICY IF EXISTS "Auth users upload chat files" ON storage.objects;
CREATE POLICY "Auth users upload own chat files" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'chat-files' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Teachers delete own tutoring materials" ON storage.objects;
CREATE POLICY "Teachers delete own tutoring materials" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'tutoring-materials'
    AND auth.uid()::text = (storage.foldername(name))[1]
    AND (storage.foldername(name))[1] <> 'homework'
  );

-- Narrow public bucket listing policies to authenticated users only; public URL fetching is unaffected
DROP POLICY IF EXISTS "Anyone can read shop files" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can read tts-audio" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can read voice messages" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view chat images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view gift images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view shop images" ON storage.objects;
DROP POLICY IF EXISTS "Public can view avatars" ON storage.objects;
DROP POLICY IF EXISTS "Public read chat files" ON storage.objects;

CREATE POLICY "Auth read shop files" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'shop-files');
CREATE POLICY "Auth read tts-audio" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'tts-audio');
CREATE POLICY "Auth read voice messages" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'voice-messages');
CREATE POLICY "Auth read chat images" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'chat-images');
CREATE POLICY "Auth read gift images" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'gift-images');
CREATE POLICY "Auth read shop images" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'shop-images');
CREATE POLICY "Auth read avatars" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'avatars');
CREATE POLICY "Auth read chat files" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'chat-files');

-- ============ 6. Rotate default admin password ============
UPDATE public.admin_settings
SET admin_password = extensions.crypt(
  encode(extensions.gen_random_bytes(24), 'base64'),
  extensions.gen_salt('bf')
);

-- ============ 7. Set search_path on email helpers ============
ALTER FUNCTION public.delete_email(text, bigint) SET search_path = public, pgmq;
ALTER FUNCTION public.enqueue_email(text, jsonb) SET search_path = public, pgmq;
ALTER FUNCTION public.move_to_dlq(text, text, bigint, jsonb) SET search_path = public, pgmq;
ALTER FUNCTION public.read_email_batch(text, integer, integer) SET search_path = public, pgmq;

-- ============ 8. Revoke EXECUTE on internal SECURITY DEFINER helpers ============
REVOKE EXECUTE ON FUNCTION public.delete_email(text, bigint) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.enqueue_email(text, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.move_to_dlq(text, text, bigint, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.read_email_batch(text, integer, integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.email_queue_dispatch() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.email_queue_wake() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_set_xp(uuid, integer) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_admin_users() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.check_admin_password(text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
