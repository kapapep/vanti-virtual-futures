CREATE OR REPLACE FUNCTION public.withdraw_virtual_cash(p_amount numeric)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user uuid := auth.uid();
  v_amount numeric(18,2);
  v_balance numeric(18,2);
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED';
  END IF;
  v_amount := round(coalesce(p_amount, 0), 2);
  IF v_amount <= 0 OR v_amount > 10000 THEN
    RAISE EXCEPTION 'INVALID_AMOUNT';
  END IF;

  SELECT balance INTO v_balance FROM public.profiles WHERE id = v_user FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'PROFILE_NOT_FOUND';
  END IF;
  IF v_amount > v_balance THEN
    RAISE EXCEPTION 'INSUFFICIENT_BALANCE';
  END IF;

  UPDATE public.profiles SET balance = round(balance - v_amount, 2)
    WHERE id = v_user RETURNING balance INTO v_balance;

  INSERT INTO public.transactions (user_id, type, amount, balance_after)
  VALUES (v_user, 'virtual_withdrawal', -v_amount, v_balance);

  RETURN jsonb_build_object('balance', v_balance, 'amount', v_amount);
END;
$function$;

REVOKE ALL ON FUNCTION public.withdraw_virtual_cash(numeric) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.withdraw_virtual_cash(numeric) TO authenticated;