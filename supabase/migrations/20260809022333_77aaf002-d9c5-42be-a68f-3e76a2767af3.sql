CREATE OR REPLACE FUNCTION public.execute_trade(
  p_market_id uuid,
  p_side text,
  p_action text,
  p_amount numeric
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
  v_new_avg numeric(6,4);
  v_delta numeric(10,6);
  v_new_yes numeric(6,4);
  v_trade_id uuid;
  v_had_trade boolean;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED';
  END IF;
  IF p_side NOT IN ('yes','no') THEN
    RAISE EXCEPTION 'INVALID_SIDE';
  END IF;
  IF p_action NOT IN ('buy','sell') THEN
    RAISE EXCEPTION 'INVALID_ACTION';
  END IF;
  IF p_amount IS NULL OR p_amount <= 0 THEN
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

  v_price := CASE WHEN p_side = 'yes' THEN v_market.yes_price ELSE 1 - v_market.yes_price END;
  IF v_price <= 0 THEN
    RAISE EXCEPTION 'INVALID_PRICE';
  END IF;

  SELECT balance INTO v_balance FROM public.profiles WHERE id = v_user FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'PROFILE_NOT_FOUND';
  END IF;

  SELECT * INTO v_pos FROM public.positions
    WHERE user_id = v_user AND market_id = p_market_id AND side = p_side FOR UPDATE;

  SELECT EXISTS (SELECT 1 FROM public.trades WHERE user_id = v_user AND market_id = p_market_id)
    INTO v_had_trade;

  IF p_action = 'buy' THEN
    IF p_amount > v_balance THEN
      RAISE EXCEPTION 'INSUFFICIENT_BALANCE';
    END IF;
    v_contracts := round(p_amount / v_price, 4);
    IF v_contracts <= 0 THEN
      RAISE EXCEPTION 'INVALID_AMOUNT';
    END IF;
    v_total := round(p_amount, 2);
    v_new_balance := round(v_balance - v_total, 2);

    IF v_pos.id IS NULL THEN
      v_new_contracts := v_contracts;
      v_new_avg := v_price;
      INSERT INTO public.positions (user_id, market_id, side, contracts, avg_price)
      VALUES (v_user, p_market_id, p_side, v_new_contracts, v_new_avg)
      RETURNING * INTO v_pos;
    ELSE
      v_new_contracts := v_pos.contracts + v_contracts;
      v_new_avg := round(((v_pos.contracts * v_pos.avg_price) + (v_contracts * v_price)) / v_new_contracts, 4);
      UPDATE public.positions SET contracts = v_new_contracts, avg_price = v_new_avg
        WHERE id = v_pos.id RETURNING * INTO v_pos;
    END IF;
  ELSE
    IF v_pos.id IS NULL THEN
      RAISE EXCEPTION 'NO_POSITION';
    END IF;
    v_contracts := round(p_amount / v_price, 4);
    IF v_contracts > v_pos.contracts THEN
      v_contracts := v_pos.contracts;
    END IF;
    IF v_contracts <= 0 THEN
      RAISE EXCEPTION 'INVALID_AMOUNT';
    END IF;
    v_total := round(v_contracts * v_price, 2);
    v_new_balance := round(v_balance + v_total, 2);
    v_new_contracts := round(v_pos.contracts - v_contracts, 4);
    UPDATE public.positions SET contracts = v_new_contracts
      WHERE id = v_pos.id RETURNING * INTO v_pos;
  END IF;

  UPDATE public.profiles SET balance = v_new_balance WHERE id = v_user;

  INSERT INTO public.trades (user_id, market_id, side, action, contracts, price, total)
  VALUES (v_user, p_market_id, p_side, p_action, v_contracts, v_price, v_total)
  RETURNING id INTO v_trade_id;

  INSERT INTO public.transactions (user_id, type, amount, balance_after, trade_id)
  VALUES (
    v_user,
    CASE WHEN p_action = 'buy' THEN 'trade_buy' ELSE 'trade_sell' END,
    CASE WHEN p_action = 'buy' THEN -v_total ELSE v_total END,
    v_new_balance,
    v_trade_id
  );

  v_delta := v_contracts / 5000.0;
  IF (p_side = 'yes' AND p_action = 'buy') OR (p_side = 'no' AND p_action = 'sell') THEN
    v_new_yes := v_market.yes_price + v_delta;
  ELSE
    v_new_yes := v_market.yes_price - v_delta;
  END IF;
  v_new_yes := round(least(0.9900, greatest(0.0100, v_new_yes)), 4);

  UPDATE public.markets SET
    yes_price = v_new_yes,
    volume = volume + v_total,
    trader_count = trader_count + CASE WHEN v_had_trade THEN 0 ELSE 1 END
  WHERE id = p_market_id;

  INSERT INTO public.market_price_history (market_id, yes_price)
  VALUES (p_market_id, v_new_yes);

  RETURN jsonb_build_object(
    'balance', v_new_balance,
    'price', v_price,
    'contracts', v_contracts,
    'total', v_total,
    'yes_price', v_new_yes,
    'position', jsonb_build_object(
      'side', p_side,
      'contracts', v_new_contracts,
      'avg_price', v_pos.avg_price
    )
  );
END;
$$;

REVOKE ALL ON FUNCTION public.execute_trade(uuid, text, text, numeric) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.execute_trade(uuid, text, text, numeric) TO authenticated;

CREATE OR REPLACE FUNCTION public.resolve_market(p_market_id uuid, p_outcome text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_is_admin boolean;
  v_pos record;
  v_payout numeric(18,2);
  v_balance numeric(18,2);
  v_count integer := 0;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED';
  END IF;
  SELECT is_admin INTO v_is_admin FROM public.profiles WHERE id = v_user;
  IF NOT coalesce(v_is_admin, false) THEN
    RAISE EXCEPTION 'NOT_AUTHORIZED';
  END IF;
  IF p_outcome NOT IN ('yes','no') THEN
    RAISE EXCEPTION 'INVALID_OUTCOME';
  END IF;

  PERFORM 1 FROM public.markets WHERE id = p_market_id AND status = 'active' FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'MARKET_NOT_RESOLVABLE';
  END IF;

  FOR v_pos IN
    SELECT * FROM public.positions WHERE market_id = p_market_id AND contracts > 0 FOR UPDATE
  LOOP
    v_payout := CASE WHEN v_pos.side = p_outcome THEN round(v_pos.contracts * 1.00, 2) ELSE 0 END;
    IF v_payout > 0 THEN
      UPDATE public.profiles SET balance = round(balance + v_payout, 2)
        WHERE id = v_pos.user_id RETURNING balance INTO v_balance;
      INSERT INTO public.transactions (user_id, type, amount, balance_after)
      VALUES (v_pos.user_id, 'settlement', v_payout, v_balance);
    END IF;
    UPDATE public.positions SET contracts = 0 WHERE id = v_pos.id;
    v_count := v_count + 1;
  END LOOP;

  UPDATE public.markets SET
    status = 'resolved',
    outcome = p_outcome,
    yes_price = CASE WHEN p_outcome = 'yes' THEN 0.9900 ELSE 0.0100 END
  WHERE id = p_market_id;

  INSERT INTO public.market_price_history (market_id, yes_price)
  VALUES (p_market_id, CASE WHEN p_outcome = 'yes' THEN 0.9900 ELSE 0.0100 END);

  RETURN jsonb_build_object('resolved', true, 'outcome', p_outcome, 'positions_settled', v_count);
END;
$$;

REVOKE ALL ON FUNCTION public.resolve_market(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.resolve_market(uuid, text) TO authenticated;