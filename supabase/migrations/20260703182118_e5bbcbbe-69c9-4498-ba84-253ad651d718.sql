
-- 1) Narrow profiles SELECT policy: only self, linked teacher, or admin
DROP POLICY IF EXISTS "View non-student profiles or own/teacher/admin" ON public.profiles;
CREATE POLICY "Users view own or linked profile"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id
    OR auth.uid() = created_by_teacher_id
    OR public.has_role(auth.uid(), 'admin'::app_role)
  );

-- 2) Safe public view of profiles for social/leaderboard usage (no telegram_chat_id, age, learning_goal, last_active, etc.)
CREATE OR REPLACE VIEW public.public_profiles
WITH (security_invoker = true) AS
SELECT
  user_id,
  display_name,
  avatar_url,
  nickname,
  preferred_lang,
  active_target_language,
  created_at
FROM public.profiles;

GRANT SELECT ON public.public_profiles TO anon, authenticated;

-- 3) Remove telegram_chat_id from the public demo_leaderboard table
ALTER TABLE public.demo_leaderboard DROP COLUMN IF EXISTS telegram_chat_id;

-- 4) Lock down SECURITY DEFINER functions: revoke from PUBLIC/anon, grant only to authenticated where needed
REVOKE EXECUTE ON FUNCTION public.activate_referral(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.activate_referral(uuid) FROM anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.apply_referral_code(uuid, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.apply_referral_code(uuid, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.apply_referral_code(uuid, text) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.award_coins(uuid, integer, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.award_coins(uuid, integer, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.award_coins(uuid, integer, text) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.award_xp(uuid, integer) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.award_xp(uuid, integer) FROM anon;
GRANT EXECUTE ON FUNCTION public.award_xp(uuid, integer) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.complete_course_lesson(uuid, uuid, integer, jsonb) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.complete_course_lesson(uuid, uuid, integer, jsonb) FROM anon;
GRANT EXECUTE ON FUNCTION public.complete_course_lesson(uuid, uuid, integer, jsonb) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.generate_referral_code(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.generate_referral_code(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.generate_referral_code(uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.get_admin_users() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_admin_users() FROM anon;
GRANT EXECUTE ON FUNCTION public.get_admin_users() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.get_course_progress(uuid, uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_course_progress(uuid, uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_course_progress(uuid, uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.get_leaderboard(integer) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_leaderboard(integer) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_leaderboard(integer) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.get_referral_stats(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_referral_stats(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_referral_stats(uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.get_user_duel_stats(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_user_duel_stats(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_user_duel_stats(uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.get_user_learning_stats(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_user_learning_stats(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_user_learning_stats(uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.increment_daily_usage(uuid, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.increment_daily_usage(uuid, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.increment_daily_usage(uuid, text) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.is_premium(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_premium(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.is_premium(uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.issue_certificate(uuid, uuid, integer) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.issue_certificate(uuid, uuid, integer) FROM anon;
GRANT EXECUTE ON FUNCTION public.issue_certificate(uuid, uuid, integer) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.purchase_course(uuid, uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.purchase_course(uuid, uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.purchase_course(uuid, uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.purchase_item(uuid, uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.purchase_item(uuid, uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.purchase_item(uuid, uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.referral_code_exists(text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.referral_code_exists(text) FROM anon;
GRANT EXECUTE ON FUNCTION public.referral_code_exists(text) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.review_srs_card(uuid, uuid, integer) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.review_srs_card(uuid, uuid, integer) FROM anon;
GRANT EXECUTE ON FUNCTION public.review_srs_card(uuid, uuid, integer) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.search_teachers(text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.search_teachers(text) FROM anon;
GRANT EXECUTE ON FUNCTION public.search_teachers(text) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.send_gift(uuid, uuid, uuid, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.send_gift(uuid, uuid, uuid, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.send_gift(uuid, uuid, uuid, text) TO authenticated;
