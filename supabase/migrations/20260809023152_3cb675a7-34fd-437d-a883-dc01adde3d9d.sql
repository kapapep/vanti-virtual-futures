-- Public trader profiles need to show other users' trades and positions (read-only).
CREATE POLICY "trades_public_select" ON public.trades
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "positions_public_select" ON public.positions
  FOR SELECT TO anon, authenticated USING (true);

GRANT SELECT ON public.trades TO anon;
GRANT SELECT ON public.positions TO anon;