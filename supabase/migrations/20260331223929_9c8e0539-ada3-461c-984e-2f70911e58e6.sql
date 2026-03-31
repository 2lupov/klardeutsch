
-- Add gallery support (multiple images as JSON array) and file attachments
ALTER TABLE public.community_messages ADD COLUMN IF NOT EXISTS image_urls jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.community_messages ADD COLUMN IF NOT EXISTS file_url text;
ALTER TABLE public.community_messages ADD COLUMN IF NOT EXISTS file_name text;

ALTER TABLE public.direct_messages ADD COLUMN IF NOT EXISTS image_urls jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.direct_messages ADD COLUMN IF NOT EXISTS file_url text;
ALTER TABLE public.direct_messages ADD COLUMN IF NOT EXISTS file_name text;

-- Create chat-files bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('chat-files', 'chat-files', true) ON CONFLICT (id) DO NOTHING;

-- RLS for chat-files bucket
CREATE POLICY "Auth users upload chat files" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'chat-files');
CREATE POLICY "Public read chat files" ON storage.objects FOR SELECT USING (bucket_id = 'chat-files');
