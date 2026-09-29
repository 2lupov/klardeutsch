CREATE TABLE public.live_class_grammar (
  class_id uuid PRIMARY KEY REFERENCES public.live_classes(id) ON DELETE CASCADE,
  lesson jsonb,
  notes text NOT NULL DEFAULT '',
  marks text NOT NULL DEFAULT '',
  revealed jsonb NOT NULL DEFAULT '[]'::jsonb,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.live_class_grammar TO authenticated;
GRANT ALL ON public.live_class_grammar TO service_role;

ALTER TABLE public.live_class_grammar ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Class members manage grammar" ON public.live_class_grammar
FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.live_classes c WHERE c.id = live_class_grammar.class_id AND (c.teacher_id = auth.uid() OR c.student_id = auth.uid() OR public.has_role(auth.uid(),'admin'))))
WITH CHECK (EXISTS (SELECT 1 FROM public.live_classes c WHERE c.id = live_class_grammar.class_id AND (c.teacher_id = auth.uid() OR c.student_id = auth.uid() OR public.has_role(auth.uid(),'admin'))));

CREATE TRIGGER live_class_grammar_updated_at BEFORE UPDATE ON public.live_class_grammar
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER PUBLICATION supabase_realtime ADD TABLE public.live_class_grammar;