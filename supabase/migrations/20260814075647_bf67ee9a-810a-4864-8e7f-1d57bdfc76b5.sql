-- Clamp any out-of-range or empty probability rows (defensive; none exist today).
UPDATE public.market_price_history SET yes_price = 0.01 WHERE yes_price IS NULL OR yes_price < 0.01;
UPDATE public.market_price_history SET yes_price = 0.99 WHERE yes_price > 0.99;

ALTER TABLE public.market_price_history ALTER COLUMN yes_price SET NOT NULL;

ALTER TABLE public.market_price_history
  DROP CONSTRAINT IF EXISTS market_price_history_yes_price_range;
ALTER TABLE public.market_price_history
  ADD CONSTRAINT market_price_history_yes_price_range
  CHECK (yes_price >= 0.01 AND yes_price <= 0.99);

-- Collapse duplicate timestamps per market, keeping the latest inserted row.
DELETE FROM public.market_price_history h
USING public.market_price_history k
WHERE h.market_id = k.market_id
  AND h.recorded_at = k.recorded_at
  AND h.id < k.id;

CREATE UNIQUE INDEX IF NOT EXISTS market_price_history_market_time_key
  ON public.market_price_history (market_id, recorded_at);