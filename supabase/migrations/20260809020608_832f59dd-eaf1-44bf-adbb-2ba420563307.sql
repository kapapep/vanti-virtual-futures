ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;

CREATE INDEX IF NOT EXISTS markets_status_volume_idx ON public.markets (status, volume DESC);
CREATE INDEX IF NOT EXISTS markets_resolution_date_idx ON public.markets (resolution_date);
CREATE INDEX IF NOT EXISTS markets_created_at_idx ON public.markets (created_at DESC);
CREATE INDEX IF NOT EXISTS market_price_history_market_recorded_idx ON public.market_price_history (market_id, recorded_at);