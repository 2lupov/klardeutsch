
-- Create storage bucket for shop images
INSERT INTO storage.buckets (id, name, public) VALUES ('shop-images', 'shop-images', true);

-- Allow admins to upload shop images
CREATE POLICY "Admins can upload shop images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'shop-images' AND
  public.has_role(auth.uid(), 'admin'::public.app_role)
);

-- Allow admins to update shop images
CREATE POLICY "Admins can update shop images"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'shop-images' AND
  public.has_role(auth.uid(), 'admin'::public.app_role)
);

-- Allow admins to delete shop images
CREATE POLICY "Admins can delete shop images"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'shop-images' AND
  public.has_role(auth.uid(), 'admin'::public.app_role)
);

-- Anyone can view shop images (public bucket)
CREATE POLICY "Anyone can view shop images"
ON storage.objects FOR SELECT
USING (bucket_id = 'shop-images');
