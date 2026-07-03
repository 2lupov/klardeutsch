
-- Create tables first
CREATE TABLE public.school_groups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  teacher_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  level TEXT,
  language TEXT DEFAULT 'de',
  description TEXT,
  color TEXT DEFAULT 'indigo',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.school_group_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL REFERENCES public.school_groups(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(group_id, student_id)
);

CREATE TABLE public.school_schedule (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  teacher_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  group_id UUID REFERENCES public.school_groups(id) ON DELETE SET NULL,
  student_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  lesson_id UUID,
  title TEXT NOT NULL,
  notes TEXT,
  starts_at TIMESTAMPTZ NOT NULL,
  duration_min INT NOT NULL DEFAULT 45,
  status TEXT NOT NULL DEFAULT 'planned',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON public.school_groups TO authenticated;
GRANT ALL ON public.school_groups TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.school_group_members TO authenticated;
GRANT ALL ON public.school_group_members TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.school_schedule TO authenticated;
GRANT ALL ON public.school_schedule TO service_role;

-- Enable RLS
ALTER TABLE public.school_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_schedule ENABLE ROW LEVEL SECURITY;

-- Policies: groups
CREATE POLICY "Teachers manage own groups" ON public.school_groups
  FOR ALL USING (auth.uid() = teacher_id) WITH CHECK (auth.uid() = teacher_id);
CREATE POLICY "Members can view their groups" ON public.school_groups
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.school_group_members m
    WHERE m.group_id = school_groups.id AND m.student_id = auth.uid()
  ));

-- Policies: members
CREATE POLICY "Teachers manage members of their groups" ON public.school_group_members
  FOR ALL USING (EXISTS (
    SELECT 1 FROM public.school_groups g
    WHERE g.id = school_group_members.group_id AND g.teacher_id = auth.uid()
  )) WITH CHECK (EXISTS (
    SELECT 1 FROM public.school_groups g
    WHERE g.id = school_group_members.group_id AND g.teacher_id = auth.uid()
  ));
CREATE POLICY "Students view own membership" ON public.school_group_members
  FOR SELECT USING (student_id = auth.uid());

-- Policies: schedule
CREATE POLICY "Teachers manage own schedule" ON public.school_schedule
  FOR ALL USING (auth.uid() = teacher_id) WITH CHECK (auth.uid() = teacher_id);
CREATE POLICY "Students view relevant schedule" ON public.school_schedule
  FOR SELECT USING (
    student_id = auth.uid() OR EXISTS (
      SELECT 1 FROM public.school_group_members m
      WHERE m.group_id = school_schedule.group_id AND m.student_id = auth.uid()
    )
  );

-- Triggers
CREATE TRIGGER update_school_groups_updated_at BEFORE UPDATE ON public.school_groups
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_school_schedule_updated_at BEFORE UPDATE ON public.school_schedule
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Indexes
CREATE INDEX school_schedule_teacher_time_idx ON public.school_schedule(teacher_id, starts_at);
CREATE INDEX school_schedule_group_idx ON public.school_schedule(group_id);
CREATE INDEX school_schedule_student_idx ON public.school_schedule(student_id);
