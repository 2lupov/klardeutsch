
-- Add file_url column to shop_items
ALTER TABLE public.shop_items ADD COLUMN IF NOT EXISTS file_url text;

-- Create shop-files storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('shop-files', 'shop-files', true)
ON CONFLICT (id) DO NOTHING;

-- Allow anyone to read shop files
CREATE POLICY "Anyone can read shop files"
ON storage.objects FOR SELECT
USING (bucket_id = 'shop-files');

-- Allow admins to upload shop files
CREATE POLICY "Admins can upload shop files"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'shop-files' AND public.has_role(auth.uid(), 'admin'));

-- Allow admins to delete shop files
CREATE POLICY "Admins can delete shop files"
ON storage.objects FOR DELETE
USING (bucket_id = 'shop-files' AND public.has_role(auth.uid(), 'admin'));

-- Allow admins to update shop files
CREATE POLICY "Admins can update shop files"
ON storage.objects FOR UPDATE
USING (bucket_id = 'shop-files' AND public.has_role(auth.uid(), 'admin'));
