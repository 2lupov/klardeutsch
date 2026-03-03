
-- Fix check_admin_password to use schema-qualified pgcrypto functions
CREATE OR REPLACE FUNCTION public.check_admin_password(input_password text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public', 'extensions'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_settings
    WHERE admin_password = extensions.crypt(input_password, admin_password)
  )
$$;
