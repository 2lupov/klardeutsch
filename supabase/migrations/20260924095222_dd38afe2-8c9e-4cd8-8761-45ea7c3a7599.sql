CREATE TABLE IF NOT EXISTS public.student_boards (
  user_id uuid PRIMARY KEY,
  elements jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.student_boards TO authenticated;
GRANT ALL ON public.student_boards TO service_role;
ALTER TABLE public.student_boards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own board" ON public.student_boards FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_student_boards_updated BEFORE UPDATE ON public.student_boards FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS academy_bg text;

CREATE OR REPLACE FUNCTION public.reward_student_submission()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status = 'submitted' AND COALESCE(OLD.status,'') NOT IN ('submitted','graded') THEN
    PERFORM public.award_coins(NEW.student_id, 10, 'Виконане завдання');
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_reward_assignment ON public.student_assignments;
CREATE TRIGGER trg_reward_assignment AFTER UPDATE OF status ON public.student_assignments FOR EACH ROW EXECUTE FUNCTION public.reward_student_submission();