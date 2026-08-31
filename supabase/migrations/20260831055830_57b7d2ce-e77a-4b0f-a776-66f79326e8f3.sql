REVOKE ALL ON FUNCTION public.student_has_book_access(uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.student_has_book_access(uuid) TO authenticated, service_role;