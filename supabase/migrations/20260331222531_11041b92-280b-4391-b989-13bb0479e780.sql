
ALTER TABLE public.community_messages ADD COLUMN audio_url text DEFAULT NULL;
ALTER TABLE public.direct_messages ADD COLUMN audio_url text DEFAULT NULL;

INSERT INTO storage.buckets (id, name, public) VALUES ('voice-messages', 'voice-messages', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Authenticated users can upload voice messages"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'voice-messages');

CREATE POLICY "Anyone can read voice messages"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'voice-messages');

CREATE POLICY "Users can delete own voice messages"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'voice-messages' AND (storage.foldername(name))[1] = auth.uid()::text);
