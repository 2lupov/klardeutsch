
-- Add audio_url column to listening_texts
ALTER TABLE public.listening_texts ADD COLUMN IF NOT EXISTS audio_url text;

-- Create storage bucket for TTS audio cache
INSERT INTO storage.buckets (id, name, public)
VALUES ('tts-audio', 'tts-audio', true)
ON CONFLICT (id) DO NOTHING;

-- Allow anyone to read from tts-audio bucket
CREATE POLICY "Anyone can read tts-audio"
ON storage.objects FOR SELECT
USING (bucket_id = 'tts-audio');

-- Allow admins to upload/delete tts-audio
CREATE POLICY "Admins can upload tts-audio"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'tts-audio' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete tts-audio"
ON storage.objects FOR DELETE
USING (bucket_id = 'tts-audio' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update tts-audio"
ON storage.objects FOR UPDATE
USING (bucket_id = 'tts-audio' AND public.has_role(auth.uid(), 'admin'));
