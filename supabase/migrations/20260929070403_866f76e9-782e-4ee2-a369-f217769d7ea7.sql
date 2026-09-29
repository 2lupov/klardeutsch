CREATE TABLE public.live_class_writing (
  class_id uuid PRIMARY KEY REFERENCES public.live_classes(id) ON DELETE CASCADE,
  text text NOT NULL DEFAULT '',
  topic jsonb,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.live_class_writing TO authenticated;
GRANT ALL ON public.live_class_writing TO service_role;
ALTER TABLE public.live_class_writing ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Class members manage writing" ON public.live_class_writing FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.live_classes c WHERE c.id = class_id AND (c.teacher_id = auth.uid() OR c.student_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))))
  WITH CHECK (EXISTS (SELECT 1 FROM public.live_classes c WHERE c.id = class_id AND (c.teacher_id = auth.uid() OR c.student_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))));
CREATE TRIGGER live_class_writing_updated_at BEFORE UPDATE ON public.live_class_writing FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
ALTER PUBLICATION supabase_realtime ADD TABLE public.live_class_writing;
ALTER TABLE public.live_class_writing REPLICA IDENTITY FULL;