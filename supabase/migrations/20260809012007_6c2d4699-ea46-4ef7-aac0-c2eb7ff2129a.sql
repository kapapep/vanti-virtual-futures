-- PROFILES
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text UNIQUE NOT NULL,
  display_name text,
  bio text,
  avatar_url text,
  balance numeric(14,2) NOT NULL DEFAULT 10000.00,
  is_admin boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX profiles_username_idx ON public.profiles (username);

GRANT SELECT ON public.profiles TO anon, authenticated;
GRANT INSERT (id, username, display_name, bio, avatar_url) ON public.profiles TO authenticated;
GRANT UPDATE (display_name, bio, avatar_url) ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_public_select" ON public.profiles FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());

-- CATEGORIES
CREATE TABLE public.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  icon text
);
GRANT SELECT ON public.categories TO anon, authenticated;
GRANT ALL ON public.categories TO service_role;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "categories_public_select" ON public.categories FOR SELECT TO anon, authenticated USING (true);

-- MARKETS
CREATE TABLE public.markets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question text NOT NULL,
  description text,
  category_id uuid REFERENCES public.categories(id) ON DELETE SET NULL,
  yes_price numeric(5,4) NOT NULL DEFAULT 0.5000,
  volume numeric(14,2) NOT NULL DEFAULT 0,
  trader_count integer NOT NULL DEFAULT 0,
  resolution_date timestamptz NOT NULL,
  resolution_source text,
  resolution_criteria text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','closed','resolved')),
  outcome text CHECK (outcome IN ('yes','no')),
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX markets_status_resolution_idx ON public.markets (status, resolution_date);
CREATE INDEX markets_category_idx ON public.markets (category_id);

GRANT SELECT ON public.markets TO anon, authenticated;
GRANT ALL ON public.markets TO service_role;
ALTER TABLE public.markets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "markets_public_select" ON public.markets FOR SELECT TO anon, authenticated USING (true);

-- MARKET PRICE HISTORY
CREATE TABLE public.market_price_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  market_id uuid NOT NULL REFERENCES public.markets(id) ON DELETE CASCADE,
  yes_price numeric(5,4) NOT NULL,
  recorded_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX market_price_history_market_recorded_idx ON public.market_price_history (market_id, recorded_at);

GRANT SELECT ON public.market_price_history TO anon, authenticated;
GRANT ALL ON public.market_price_history TO service_role;
ALTER TABLE public.market_price_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "price_history_public_select" ON public.market_price_history FOR SELECT TO anon, authenticated USING (true);

-- POSITIONS
CREATE TABLE public.positions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  market_id uuid NOT NULL REFERENCES public.markets(id) ON DELETE CASCADE,
  side text NOT NULL CHECK (side IN ('yes','no')),
  contracts numeric(14,4) NOT NULL DEFAULT 0,
  avg_price numeric(5,4) NOT NULL,
  UNIQUE (user_id, market_id, side)
);
CREATE INDEX positions_user_idx ON public.positions (user_id);

GRANT SELECT ON public.positions TO authenticated;
GRANT ALL ON public.positions TO service_role;
ALTER TABLE public.positions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "positions_select_own" ON public.positions FOR SELECT TO authenticated USING (user_id = auth.uid());

-- TRADES
CREATE TABLE public.trades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  market_id uuid NOT NULL REFERENCES public.markets(id) ON DELETE CASCADE,
  side text NOT NULL CHECK (side IN ('yes','no')),
  action text NOT NULL CHECK (action IN ('buy','sell')),
  contracts numeric(14,4) NOT NULL,
  price numeric(5,4) NOT NULL,
  total numeric(14,2) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX trades_user_created_idx ON public.trades (user_id, created_at DESC);
CREATE INDEX trades_market_created_idx ON public.trades (market_id, created_at DESC);

GRANT SELECT ON public.trades TO authenticated;
GRANT ALL ON public.trades TO service_role;
ALTER TABLE public.trades ENABLE ROW LEVEL SECURITY;
CREATE POLICY "trades_select_own" ON public.trades FOR SELECT TO authenticated USING (user_id = auth.uid());

-- TRANSACTIONS
CREATE TABLE public.transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('signup_grant','trade_buy','trade_sell','settlement')),
  amount numeric(14,2) NOT NULL,
  balance_after numeric(14,2) NOT NULL,
  trade_id uuid REFERENCES public.trades(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX transactions_user_created_idx ON public.transactions (user_id, created_at DESC);

GRANT SELECT ON public.transactions TO authenticated;
GRANT ALL ON public.transactions TO service_role;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "transactions_select_own" ON public.transactions FOR SELECT TO authenticated USING (user_id = auth.uid());

-- FOLLOWS
CREATE TABLE public.follows (
  follower_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  following_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (follower_id, following_id)
);
CREATE INDEX follows_following_idx ON public.follows (following_id);

GRANT SELECT, INSERT, DELETE ON public.follows TO authenticated;
GRANT SELECT ON public.follows TO anon;
GRANT ALL ON public.follows TO service_role;
ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;
CREATE POLICY "follows_public_select" ON public.follows FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "follows_insert_own" ON public.follows FOR INSERT TO authenticated WITH CHECK (follower_id = auth.uid() AND following_id <> auth.uid());
CREATE POLICY "follows_delete_own" ON public.follows FOR DELETE TO authenticated USING (follower_id = auth.uid());

-- WATCHLIST
CREATE TABLE public.watchlist (
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  market_id uuid NOT NULL REFERENCES public.markets(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, market_id)
);
GRANT SELECT, INSERT, DELETE ON public.watchlist TO authenticated;
GRANT ALL ON public.watchlist TO service_role;
ALTER TABLE public.watchlist ENABLE ROW LEVEL SECURITY;
CREATE POLICY "watchlist_select_own" ON public.watchlist FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "watchlist_insert_own" ON public.watchlist FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "watchlist_delete_own" ON public.watchlist FOR DELETE TO authenticated USING (user_id = auth.uid());

-- SIGNUP TRIGGER: profile + signup_grant transaction
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  desired_username text;
  final_username text;
  suffix integer := 0;
BEGIN
  desired_username := lower(coalesce(NEW.raw_user_meta_data->>'username', 'user' || substr(replace(NEW.id::text, '-', ''), 1, 8)));
  desired_username := regexp_replace(desired_username, '[^a-z0-9_]', '', 'g');
  IF length(desired_username) < 3 THEN
    desired_username := 'user' || substr(replace(NEW.id::text, '-', ''), 1, 8);
  END IF;
  final_username := desired_username;
  WHILE EXISTS (SELECT 1 FROM public.profiles WHERE username = final_username) LOOP
    suffix := suffix + 1;
    final_username := desired_username || suffix::text;
  END LOOP;

  INSERT INTO public.profiles (id, username, display_name, balance)
  VALUES (NEW.id, final_username, coalesce(NEW.raw_user_meta_data->>'display_name', final_username), 10000.00);

  INSERT INTO public.transactions (user_id, type, amount, balance_after)
  VALUES (NEW.id, 'signup_grant', 10000.00, 10000.00);

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();