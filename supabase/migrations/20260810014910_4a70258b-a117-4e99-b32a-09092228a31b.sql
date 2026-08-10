ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS follower_count_display bigint;

UPDATE public.profiles SET follower_count_display = 1300000, display_name = 'ricky' WHERE username = 'daddy';