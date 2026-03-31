
-- Community messages (general chat for all authenticated users)
CREATE TABLE public.community_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.community_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read community messages"
  ON public.community_messages FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert own community messages"
  ON public.community_messages FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own community messages"
  ON public.community_messages FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Direct messages (1-on-1 between users)
CREATE TABLE public.direct_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id UUID NOT NULL,
  receiver_id UUID NOT NULL,
  content TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.direct_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own DMs"
  ON public.direct_messages FOR SELECT
  TO authenticated
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "Users can send DMs"
  ON public.direct_messages FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Users can delete own sent DMs"
  ON public.direct_messages FOR DELETE
  TO authenticated
  USING (auth.uid() = sender_id);

CREATE POLICY "Receiver can update read status"
  ON public.direct_messages FOR UPDATE
  TO authenticated
  USING (auth.uid() = receiver_id);

-- Enable realtime for both tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.community_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.direct_messages;
