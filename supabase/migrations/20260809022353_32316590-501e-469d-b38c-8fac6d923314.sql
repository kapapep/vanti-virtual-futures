REVOKE EXECUTE ON FUNCTION public.execute_trade(uuid, text, text, numeric) FROM anon;
REVOKE EXECUTE ON FUNCTION public.resolve_market(uuid, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.guard_server_columns() FROM anon, authenticated;