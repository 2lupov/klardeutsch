CREATE TABLE public.live_class_video (
  class_id uuid PRIMARY KEY REFERENCES public.live_classes(id) ON DELETE CASCADE,
  video_url text NOT NULL DEFAULT '',
  video_id text,
  notes text NOT NULL DEFAULT '',
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.live_class_video TO authenticated;
GRANT ALL ON public.live_class_video TO service_role;
ALTER TABLE public.live_class_video ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Live class participants manage video" ON public.live_class_video
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.live_classes c
    WHERE c.id = live_class_video.class_id
      AND (c.teacher_id = auth.uid() OR c.student_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.live_classes c
    WHERE c.id = live_class_video.class_id
      AND (c.teacher_id = auth.uid() OR c.student_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  )
);
CREATE TRIGGER update_live_class_video_updated_at
BEFORE UPDATE ON public.live_class_video
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
ALTER TABLE public.live_class_video REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.live_class_video;