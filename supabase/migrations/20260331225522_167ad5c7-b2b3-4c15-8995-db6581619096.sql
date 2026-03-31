
ALTER TABLE public.community_messages ADD COLUMN reply_to_id uuid REFERENCES public.community_messages(id) ON DELETE SET NULL DEFAULT NULL;
ALTER TABLE public.community_messages ADD COLUMN reply_to_content text DEFAULT NULL;
ALTER TABLE public.community_messages ADD COLUMN reply_to_sender text DEFAULT NULL;

ALTER TABLE public.direct_messages ADD COLUMN reply_to_id uuid REFERENCES public.direct_messages(id) ON DELETE SET NULL DEFAULT NULL;
ALTER TABLE public.direct_messages ADD COLUMN reply_to_content text DEFAULT NULL;
ALTER TABLE public.direct_messages ADD COLUMN reply_to_sender text DEFAULT NULL;
