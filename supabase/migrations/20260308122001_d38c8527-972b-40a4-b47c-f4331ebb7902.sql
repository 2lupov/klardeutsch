
CREATE OR REPLACE FUNCTION public.get_user_learning_stats(p_user_id uuid)
RETURNS TABLE(words_learned integer, lessons_completed integer)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT
    (SELECT count(*)::integer FROM public.saved_words WHERE user_id = p_user_id) AS words_learned,
    (SELECT count(*)::integer FROM public.user_progress WHERE user_id = p_user_id AND completed = true) AS lessons_completed;
$$;
