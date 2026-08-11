DO $$
DECLARE
  v_user uuid;
BEGIN
  SELECT id INTO v_user FROM public.profiles WHERE username = 'daddy';
  IF v_user IS NULL THEN
    RAISE NOTICE 'no profile with username daddy';
    RETURN;
  END IF;

  -- Safety: never delete an elevated account
  IF EXISTS (SELECT 1 FROM public.profiles WHERE id = v_user AND is_admin) THEN
    RAISE EXCEPTION 'ACCOUNT_IS_ADMIN';
  END IF;

  -- Engagement on this user's posts (children first)
  DELETE FROM public.likes   WHERE post_id IN (SELECT id FROM public.posts WHERE user_id = v_user);
  DELETE FROM public.reposts WHERE post_id IN (SELECT id FROM public.posts WHERE user_id = v_user);
  UPDATE public.posts SET parent_id = NULL
    WHERE parent_id IN (SELECT id FROM public.posts WHERE user_id = v_user);

  -- This user's own engagement and content
  DELETE FROM public.likes     WHERE user_id = v_user;
  DELETE FROM public.reposts   WHERE user_id = v_user;
  DELETE FROM public.posts     WHERE user_id = v_user AND parent_id IS NOT NULL;
  DELETE FROM public.posts     WHERE user_id = v_user;

  -- Trading + activity
  DELETE FROM public.transactions WHERE user_id = v_user;
  DELETE FROM public.transactions WHERE trade_id IN (SELECT id FROM public.trades WHERE user_id = v_user);
  DELETE FROM public.positions    WHERE user_id = v_user;
  DELETE FROM public.trades       WHERE user_id = v_user;
  DELETE FROM public.watchlist    WHERE user_id = v_user;

  -- Social graph (both directions)
  DELETE FROM public.follows WHERE follower_id = v_user OR following_id = v_user;

  -- Profile (avatar is an inline data URL, removed with the row) then the login record
  DELETE FROM public.profiles WHERE id = v_user;
  DELETE FROM auth.users WHERE id = v_user;
END $$;