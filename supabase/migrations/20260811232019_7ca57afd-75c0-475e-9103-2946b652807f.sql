CREATE OR REPLACE FUNCTION public.sell_position(p_market_id uuid, p_side text, p_contracts numeric)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user uuid := auth.uid();
  v_market public.markets;
  v_price numeric(6,4);
  v_contracts numeric(18,4);
  v_total numeric(18,2);
  v_balance numeric(18,2);
  v_new_balance numeric(18,2);
  v_pos public.positions;
  v_new_contracts numeric(18,4);
  v_delta numeric(10,6);
  v_new_yes numeric(6,4);
  v_trade_id uuid;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED';
  END IF;
  IF p_side NOT IN ('yes','no') THEN
    RAISE EXCEPTION 'INVALID_SIDE';
  END IF;
  IF p_contracts IS NULL OR p_contracts <= 0 THEN
    RAISE EXCEPTION 'INVALID_AMOUNT';
  END IF;

  SELECT * INTO v_market FROM public.markets WHERE id = p_market_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'MARKET_NOT_FOUND';
  END IF;
  IF v_market.status <> 'active' THEN
    RAISE EXCEPTION 'MARKET_CLOSED';
  END IF;
  IF v_market.resolution_date <= now() THEN
    RAISE EXCEPTION 'MARKET_EXPIRED';
  END IF;

  -- Price is resolved server-side, strictly from the side being sold.
  v_price := CASE WHEN p_side = 'yes' THEN v_market.yes_price ELSE round(1 - v_market.yes_price, 4) END;
  IF v_price <= 0 THEN
    RAISE EXCEPTION 'INVALID_PRICE';
  END IF;

  SELECT * INTO v_pos FROM public.positions
    WHERE user_id = v_user AND market_id = p_market_id AND side = p_side FOR UPDATE;
  IF NOT FOUND OR v_pos.contracts <= 0 THEN
    RAISE EXCEPTION 'NO_POSITION';
  END IF;

  v_contracts := round(p_contracts, 4);
  IF v_contracts > v_pos.contracts THEN
    RAISE EXCEPTION 'EXCEEDS_POSITION';
  END IF;

  SELECT balance INTO v_balance FROM public.profiles WHERE id = v_user FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'PROFILE_NOT_FOUND';
  END IF;

  v_total := round(v_contracts * v_price, 2);
  v_new_balance := round(v_balance + v_total, 2);
  v_new_contracts := round(v_pos.contracts - v_contracts, 4);

  UPDATE public.positions SET contracts = v_new_contracts
    WHERE id = v_pos.id RETURNING * INTO v_pos;
  UPDATE public.profiles SET balance = v_new_balance WHERE id = v_user;

  INSERT INTO public.trades (user_id, market_id, side, action, contracts, price, total)
  VALUES (v_user, p_market_id, p_side, 'sell', v_contracts, v_price, v_total)
  RETURNING id INTO v_trade_id;

  INSERT INTO public.transactions (user_id, type, amount, balance_after, trade_id)
  VALUES (v_user, 'trade_sell', v_total, v_new_balance, v_trade_id);

  v_delta := v_contracts / 5000.0;
  IF p_side = 'yes' THEN
    v_new_yes := v_market.yes_price - v_delta;
  ELSE
    v_new_yes := v_market.yes_price + v_delta;
  END IF;
  v_new_yes := round(least(0.9900, greatest(0.0100, v_new_yes)), 4);

  UPDATE public.markets SET yes_price = v_new_yes, volume = volume + v_total
    WHERE id = p_market_id;

  INSERT INTO public.market_price_history (market_id, yes_price)
  VALUES (p_market_id, v_new_yes);

  RETURN jsonb_build_object(
    'balance', v_new_balance,
    'price', v_price,
    'contracts', v_contracts,
    'total', v_total,
    'yes_price', v_new_yes,
    'position', jsonb_build_object('side', p_side, 'contracts', v_new_contracts, 'avg_price', v_pos.avg_price)
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.sell_position(uuid, text, numeric) FROM public;
GRANT EXECUTE ON FUNCTION public.sell_position(uuid, text, numeric) TO authenticated;

-- Positions must never be readable across users: it fed client-side sell sizing.
DROP POLICY IF EXISTS positions_public_select ON public.positions;
