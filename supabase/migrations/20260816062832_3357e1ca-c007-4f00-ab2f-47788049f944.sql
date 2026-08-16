CREATE TABLE public.reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  reason text NOT NULL CHECK (reason IN ('spam','harassment','misinformation','other')),
  details text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (reporter_id, post_id)
);
GRANT SELECT, INSERT ON public.reports TO authenticated;
GRANT ALL ON public.reports TO service_role;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reports_insert_own" ON public.reports FOR INSERT TO authenticated
  WITH CHECK (reporter_id = auth.uid());
CREATE POLICY "reports_select_own" ON public.reports FOR SELECT TO authenticated
  USING (reporter_id = auth.uid());

CREATE TABLE public.blocks (
  blocker_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  blocked_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (blocker_id, blocked_id),
  CHECK (blocker_id <> blocked_id)
);
GRANT SELECT, INSERT, DELETE ON public.blocks TO authenticated;
GRANT ALL ON public.blocks TO service_role;
ALTER TABLE public.blocks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "blocks_insert_own" ON public.blocks FOR INSERT TO authenticated
  WITH CHECK (blocker_id = auth.uid());
CREATE POLICY "blocks_select_own" ON public.blocks FOR SELECT TO authenticated
  USING (blocker_id = auth.uid());
CREATE POLICY "blocks_delete_own" ON public.blocks FOR DELETE TO authenticated
  USING (blocker_id = auth.uid());

CREATE TABLE public.mutes (
  muter_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  muted_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (muter_id, muted_id),
  CHECK (muter_id <> muted_id)
);
GRANT SELECT, INSERT, DELETE ON public.mutes TO authenticated;
GRANT ALL ON public.mutes TO service_role;
ALTER TABLE public.mutes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mutes_insert_own" ON public.mutes FOR INSERT TO authenticated
  WITH CHECK (muter_id = auth.uid());
CREATE POLICY "mutes_select_own" ON public.mutes FOR SELECT TO authenticated
  USING (muter_id = auth.uid());
CREATE POLICY "mutes_delete_own" ON public.mutes FOR DELETE TO authenticated
  USING (muter_id = auth.uid());