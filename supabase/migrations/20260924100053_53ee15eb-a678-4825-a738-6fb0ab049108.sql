CREATE OR REPLACE FUNCTION public.admin_give_gift(p_receiver_id uuid, p_gift_id uuid, p_message text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'teacher'::app_role)) THEN
    RAISE EXCEPTION 'not allowed';
  END IF;
  INSERT INTO public.user_gifts (gift_id, sender_id, receiver_id, message)
  VALUES (p_gift_id, auth.uid(), p_receiver_id, p_message);
END; $$;
REVOKE ALL ON FUNCTION public.admin_give_gift(uuid, uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_give_gift(uuid, uuid, text) TO authenticated;