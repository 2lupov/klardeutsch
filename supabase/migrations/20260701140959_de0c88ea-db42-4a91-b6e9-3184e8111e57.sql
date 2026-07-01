
-- 1) Chat storage: scope INSERT to uploader's own folder, scope SELECT to owner listing
DROP POLICY IF EXISTS "Authenticated users can upload chat images" ON storage.objects;
CREATE POLICY "Authenticated users can upload chat images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'chat-images'
  AND (storage.foldername(name))[1] = (auth.uid())::text
);

DROP POLICY IF EXISTS "Authenticated users can upload voice messages" ON storage.objects;
CREATE POLICY "Authenticated users can upload voice messages"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'voice-messages'
  AND (storage.foldername(name))[1] = (auth.uid())::text
);

-- 2) Chat storage: restrict SELECT (listing) to files in the caller's own folder.
--    Files remain accessible via their public URL for legitimate recipients,
--    but path enumeration via the storage API is blocked.
DROP POLICY IF EXISTS "Auth read chat images" ON storage.objects;
CREATE POLICY "Auth read chat images"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'chat-images'
  AND (storage.foldername(name))[1] = (auth.uid())::text
);

DROP POLICY IF EXISTS "Auth read chat files" ON storage.objects;
CREATE POLICY "Auth read chat files"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'chat-files'
  AND (storage.foldername(name))[1] = (auth.uid())::text
);

DROP POLICY IF EXISTS "Auth read voice messages" ON storage.objects;
CREATE POLICY "Auth read voice messages"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'voice-messages'
  AND (storage.foldername(name))[1] = (auth.uid())::text
);

-- 3) Public buckets that should not allow enumeration/listing at all.
--    Files remain publicly downloadable via their known URLs (public buckets),
--    but SELECT via the API is limited to admins.
DROP POLICY IF EXISTS "Auth read tts-audio" ON storage.objects;
CREATE POLICY "Admins can list tts-audio"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'tts-audio' AND public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Auth read gift images" ON storage.objects;
CREATE POLICY "Admins can list gift images"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'gift-images' AND public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Auth read shop images" ON storage.objects;
CREATE POLICY "Admins can list shop images"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'shop-images' AND public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Auth read shop files" ON storage.objects;
CREATE POLICY "Admins can list shop files"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'shop-files' AND public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Auth read avatars" ON storage.objects;
CREATE POLICY "Users can list own avatars"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'avatars'
  AND (
    (storage.foldername(name))[1] = (auth.uid())::text
    OR public.has_role(auth.uid(), 'admin'::app_role)
  )
);

-- 4) SECURITY DEFINER functions: revoke EXECUTE from anon/authenticated for
--    functions that must never be called directly from the client (triggers,
--    internal email/queue helpers, and admin-only utilities). Client-facing
--    RPCs (award_xp, award_coins, apply_referral_code, purchase_*, etc.)
--    already contain in-function auth checks and remain callable.
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.email_queue_wake() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.email_queue_dispatch() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.enqueue_email(text, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.read_email_batch(text, integer, integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.delete_email(text, bigint) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.move_to_dlq(text, text, bigint, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.check_admin_password(text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_set_xp(uuid, integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_admin_users() FROM PUBLIC, anon;
