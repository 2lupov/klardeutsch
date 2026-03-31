
CREATE TABLE public.friendships (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  friend_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, friend_id)
);

ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can see own friendships" ON public.friendships FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR auth.uid() = friend_id);

CREATE POLICY "Users can send friend requests" ON public.friendships FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND user_id <> friend_id);

CREATE POLICY "Users can accept/reject incoming requests" ON public.friendships FOR UPDATE TO authenticated
  USING (auth.uid() = friend_id);

CREATE POLICY "Users can delete own friendships" ON public.friendships FOR DELETE TO authenticated
  USING (auth.uid() = user_id OR auth.uid() = friend_id);

CREATE INDEX idx_friendships_user ON public.friendships (user_id);
CREATE INDEX idx_friendships_friend ON public.friendships (friend_id);
