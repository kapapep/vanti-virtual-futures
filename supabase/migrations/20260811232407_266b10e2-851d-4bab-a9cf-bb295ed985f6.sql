CREATE OR REPLACE FUNCTION public.reset_virtual_balance()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user uuid := auth.uid();
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED';
  END IF;

  DELETE FROM public.transactions WHERE user_id = v_user;
  DELETE FROM public.positions WHERE user_id = v_user;
  DELETE FROM public.trades WHERE user_id = v_user;

  UPDATE public.profiles SET balance = 10000.00 WHERE id = v_user;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'PROFILE_NOT_FOUND';
  END IF;

  INSERT INTO public.transactions (user_id, type, amount, balance_after)
  VALUES (v_user, 'signup_grant', 10000.00, 10000.00);

  RETURN jsonb_build_object('balance', 10000.00);
END;
$function$;

REVOKE ALL ON FUNCTION public.reset_virtual_balance() FROM public;
GRANT EXECUTE ON FUNCTION public.reset_virtual_balance() TO authenticated;