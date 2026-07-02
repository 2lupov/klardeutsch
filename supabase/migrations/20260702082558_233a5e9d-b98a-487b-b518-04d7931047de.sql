
CREATE POLICY "Admins can view all teacher ai chats" ON public.teacher_ai_chats
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can view all teacher ai messages" ON public.teacher_ai_messages
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));
