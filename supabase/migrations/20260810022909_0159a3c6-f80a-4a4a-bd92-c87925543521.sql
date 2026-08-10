REVOKE ALL ON FUNCTION public.block_suspended_authors() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.record_explicit_violation(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_explicit_violation(text) TO authenticated;