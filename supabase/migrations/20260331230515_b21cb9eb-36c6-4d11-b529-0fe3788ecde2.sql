
INSERT INTO storage.buckets (id, name, public) VALUES ('gift-images', 'gift-images', true);

CREATE POLICY "Anyone can view gift images" ON storage.objects FOR SELECT USING (bucket_id = 'gift-images');

CREATE POLICY "Admins can upload gift images" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'gift-images' AND public.has_role(auth.uid(), 'admin'));
