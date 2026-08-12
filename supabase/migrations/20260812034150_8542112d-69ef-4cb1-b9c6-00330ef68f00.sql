-- 1. Trades privacy: remove blanket public read of every user's trades
DROP POLICY IF EXISTS trades_public_select ON public.trades;

-- Anonymized market activity feed (no user attribution) so market pages keep working
CREATE OR REPLACE VIEW public.market_recent_trades
WITH (security_invoker = off) AS
SELECT id, market_id, side, action, contracts, price, created_at
FROM public.trades;

REVOKE ALL ON public.market_recent_trades FROM anon, authenticated;
GRANT SELECT ON public.market_recent_trades TO anon, authenticated;

-- 2. Lock down EXECUTE on SECURITY DEFINER functions
-- Trigger-only functions must not be callable by API roles at all
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.block_suspended_authors() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.guard_server_columns() FROM PUBLIC, anon, authenticated;

-- User-facing RPCs: signed-in only, never anonymous
REVOKE ALL ON FUNCTION public.execute_trade(uuid, text, text, numeric) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.sell_position(uuid, text, numeric) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.reset_virtual_balance() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.resolve_market(uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.record_explicit_violation(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.add_virtual_cash(numeric) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.withdraw_virtual_cash(numeric) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.execute_trade(uuid, text, text, numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION public.sell_position(uuid, text, numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reset_virtual_balance() TO authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_market(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_explicit_violation(text) TO authenticated;