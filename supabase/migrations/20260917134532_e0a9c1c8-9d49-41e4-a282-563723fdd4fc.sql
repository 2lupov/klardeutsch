CREATE POLICY "Kit owners upload kit files"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'tutoring-materials'
  AND (storage.foldername(name))[1] = 'kits'
  AND EXISTS (
    SELECT 1 FROM public.lesson_kits k
    WHERE k.id::text = (storage.foldername(name))[2]
      AND (k.owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role))
  )
);

CREATE POLICY "Kit owners read kit files"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'tutoring-materials'
  AND (storage.foldername(name))[1] = 'kits'
  AND EXISTS (
    SELECT 1 FROM public.lesson_kits k
    WHERE k.id::text = (storage.foldername(name))[2]
      AND (k.owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role))
  )
);

CREATE POLICY "Kit owners delete kit files"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'tutoring-materials'
  AND (storage.foldername(name))[1] = 'kits'
  AND EXISTS (
    SELECT 1 FROM public.lesson_kits k
    WHERE k.id::text = (storage.foldername(name))[2]
      AND (k.owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role))
  )
);