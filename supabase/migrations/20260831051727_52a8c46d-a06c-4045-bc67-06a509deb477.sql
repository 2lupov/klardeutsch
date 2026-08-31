CREATE TABLE public.live_classes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  teacher_id uuid NOT NULL,
  student_id uuid NOT NULL,
  title text NOT NULL DEFAULT 'Живий урок',
  status text NOT NULL DEFAULT 'active',
  current_section text NOT NULL DEFAULT 'board',
  board jsonb NOT NULL DEFAULT '[]'::jsonb,
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.live_classes TO authenticated;
GRANT ALL ON public.live_classes TO service_role;
ALTER TABLE public.live_classes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Teacher manages own live classes" ON public.live_classes FOR ALL TO authenticated
  USING (auth.uid() = teacher_id OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (auth.uid() = teacher_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Student reads own live classes" ON public.live_classes FOR SELECT TO authenticated
  USING (auth.uid() = student_id);

CREATE TABLE public.live_class_items (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  class_id uuid NOT NULL REFERENCES public.live_classes(id) ON DELETE CASCADE,
  section text NOT NULL,
  kind text NOT NULL DEFAULT 'text',
  title text,
  content jsonb NOT NULL DEFAULT '{}'::jsonb,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX live_class_items_class_idx ON public.live_class_items(class_id, section, sort_order);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.live_class_items TO authenticated;
GRANT ALL ON public.live_class_items TO service_role;
ALTER TABLE public.live_class_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Teacher manages own class items" ON public.live_class_items FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.live_classes c WHERE c.id = class_id AND (c.teacher_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))))
  WITH CHECK (EXISTS (SELECT 1 FROM public.live_classes c WHERE c.id = class_id AND (c.teacher_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))));
CREATE POLICY "Student reads own class items" ON public.live_class_items FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.live_classes c WHERE c.id = class_id AND c.student_id = auth.uid()));

CREATE TABLE public.live_class_answers (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  class_id uuid NOT NULL REFERENCES public.live_classes(id) ON DELETE CASCADE,
  item_id uuid NOT NULL REFERENCES public.live_class_items(id) ON DELETE CASCADE,
  student_id uuid NOT NULL,
  answer text,
  is_correct boolean,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (item_id, student_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.live_class_answers TO authenticated;
GRANT ALL ON public.live_class_answers TO service_role;
ALTER TABLE public.live_class_answers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Student manages own answers" ON public.live_class_answers FOR ALL TO authenticated
  USING (auth.uid() = student_id)
  WITH CHECK (auth.uid() = student_id);
CREATE POLICY "Teacher reads class answers" ON public.live_class_answers FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.live_classes c WHERE c.id = class_id AND (c.teacher_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))));

CREATE TABLE public.live_class_seen (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  class_id uuid NOT NULL REFERENCES public.live_classes(id) ON DELETE CASCADE,
  student_id uuid NOT NULL,
  section text NOT NULL,
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (class_id, student_id, section)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.live_class_seen TO authenticated;
GRANT ALL ON public.live_class_seen TO service_role;
ALTER TABLE public.live_class_seen ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Student manages own seen marks" ON public.live_class_seen FOR ALL TO authenticated
  USING (auth.uid() = student_id)
  WITH CHECK (auth.uid() = student_id);
CREATE POLICY "Teacher reads seen marks" ON public.live_class_seen FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.live_classes c WHERE c.id = class_id AND (c.teacher_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))));

CREATE TRIGGER live_classes_updated_at BEFORE UPDATE ON public.live_classes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER live_class_items_updated_at BEFORE UPDATE ON public.live_class_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER live_class_answers_updated_at BEFORE UPDATE ON public.live_class_answers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER live_class_seen_updated_at BEFORE UPDATE ON public.live_class_seen FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER PUBLICATION supabase_realtime ADD TABLE public.live_classes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.live_class_items;
ALTER PUBLICATION supabase_realtime ADD TABLE public.live_class_answers;
ALTER TABLE public.live_classes REPLICA IDENTITY FULL;
ALTER TABLE public.live_class_items REPLICA IDENTITY FULL;
ALTER TABLE public.live_class_answers REPLICA IDENTITY FULL;