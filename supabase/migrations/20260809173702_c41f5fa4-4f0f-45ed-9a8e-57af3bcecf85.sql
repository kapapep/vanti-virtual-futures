CREATE TABLE public.posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  market_id uuid REFERENCES public.markets(id) ON DELETE CASCADE,
  parent_id uuid REFERENCES public.posts(id) ON DELETE CASCADE,
  body text NOT NULL CHECK (char_length(body) > 0 AND char_length(body) <= 500),
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, DELETE ON public.posts TO authenticated;
GRANT SELECT ON public.posts TO anon;
GRANT ALL ON public.posts TO service_role;

ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY posts_public_select ON public.posts FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY posts_insert_own ON public.posts FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY posts_delete_own ON public.posts FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE INDEX posts_user_created_idx ON public.posts (user_id, created_at DESC);
CREATE INDEX posts_market_created_idx ON public.posts (market_id, created_at DESC);
CREATE INDEX posts_parent_idx ON public.posts (parent_id);
CREATE INDEX posts_created_idx ON public.posts (created_at DESC);

CREATE TABLE public.likes (
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, post_id)
);

GRANT SELECT, INSERT, DELETE ON public.likes TO authenticated;
GRANT SELECT ON public.likes TO anon;
GRANT ALL ON public.likes TO service_role;

ALTER TABLE public.likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY likes_public_select ON public.likes FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY likes_insert_own ON public.likes FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY likes_delete_own ON public.likes FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE INDEX likes_post_idx ON public.likes (post_id);

CREATE TABLE public.reposts (
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, post_id)
);

GRANT SELECT, INSERT, DELETE ON public.reposts TO authenticated;
GRANT SELECT ON public.reposts TO anon;
GRANT ALL ON public.reposts TO service_role;

ALTER TABLE public.reposts ENABLE ROW LEVEL SECURITY;

CREATE POLICY reposts_public_select ON public.reposts FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY reposts_insert_own ON public.reposts FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY reposts_delete_own ON public.reposts FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE INDEX reposts_post_idx ON public.reposts (post_id);