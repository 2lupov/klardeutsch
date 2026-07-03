
CREATE TABLE public.school_attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id uuid REFERENCES public.school_schedule(id) ON DELETE CASCADE,
  group_id uuid REFERENCES public.school_groups(id) ON DELETE CASCADE,
  student_id uuid NOT NULL,
  teacher_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'present' CHECK (status IN ('present','absent','late','excused')),
  note text,
  lesson_date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.school_attendance TO authenticated;
GRANT ALL ON public.school_attendance TO service_role;
ALTER TABLE public.school_attendance ENABLE ROW LEVEL SECURITY;
CREATE POLICY "teacher manages own attendance" ON public.school_attendance
  FOR ALL USING (auth.uid() = teacher_id) WITH CHECK (auth.uid() = teacher_id);
CREATE POLICY "student sees own attendance" ON public.school_attendance
  FOR SELECT USING (auth.uid() = student_id);

CREATE TABLE public.school_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id uuid NOT NULL,
  student_id uuid NOT NULL,
  group_id uuid REFERENCES public.school_groups(id) ON DELETE SET NULL,
  amount numeric(10,2) NOT NULL,
  currency text NOT NULL DEFAULT 'UAH',
  type text NOT NULL DEFAULT 'lesson' CHECK (type IN ('lesson','subscription','course','refund','other')),
  status text NOT NULL DEFAULT 'paid' CHECK (status IN ('paid','pending','overdue','cancelled')),
  paid_at date DEFAULT CURRENT_DATE,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.school_payments TO authenticated;
GRANT ALL ON public.school_payments TO service_role;
ALTER TABLE public.school_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "teacher manages own payments" ON public.school_payments
  FOR ALL USING (auth.uid() = teacher_id) WITH CHECK (auth.uid() = teacher_id);
CREATE POLICY "student sees own payments" ON public.school_payments
  FOR SELECT USING (auth.uid() = student_id);

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$
LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_attendance_updated BEFORE UPDATE ON public.school_attendance
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_payments_updated BEFORE UPDATE ON public.school_payments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
