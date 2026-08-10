ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS hide_following boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS suspended_until timestamptz;

ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS image_url text,
  ADD COLUMN IF NOT EXISTS audio_url text;

CREATE OR REPLACE FUNCTION public.guard_server_columns()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
begin
  if current_user = 'authenticated' then
    if new.balance is distinct from old.balance then
      raise exception 'balance cannot be changed directly';
    end if;
    if new.suspended_until is distinct from old.suspended_until then
      raise exception 'suspension cannot be changed directly';
    end if;
    if new.is_admin is distinct from old.is_admin then
      raise exception 'admin status cannot be changed directly';
    end if;
    if new.follower_count_display is distinct from old.follower_count_display then
      raise exception 'follower count cannot be changed directly';
    end if;
  end if;
  return new;
end $function$;

-- Following lists can be hidden; follower lists are always public.
DROP POLICY IF EXISTS follows_public_select ON public.follows;
CREATE POLICY follows_public_select ON public.follows
  FOR SELECT TO anon, authenticated
  USING (
    follower_id = auth.uid()
    OR NOT EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = follows.follower_id AND p.hide_following
    )
  );

CREATE OR REPLACE FUNCTION public.block_suspended_authors()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_until timestamptz;
BEGIN
  SELECT suspended_until INTO v_until FROM public.profiles WHERE id = NEW.user_id;
  IF v_until IS NOT NULL AND v_until > now() THEN
    RAISE EXCEPTION 'ACCOUNT_SUSPENDED';
  END IF;
  RETURN NEW;
END $function$;

DROP TRIGGER IF EXISTS block_suspended_posts ON public.posts;
CREATE TRIGGER block_suspended_posts BEFORE INSERT ON public.posts
  FOR EACH ROW EXECUTE FUNCTION public.block_suspended_authors();

DROP TRIGGER IF EXISTS block_suspended_likes ON public.likes;
CREATE TRIGGER block_suspended_likes BEFORE INSERT ON public.likes
  FOR EACH ROW EXECUTE FUNCTION public.block_suspended_authors();

DROP TRIGGER IF EXISTS block_suspended_reposts ON public.reposts;
CREATE TRIGGER block_suspended_reposts BEFORE INSERT ON public.reposts
  FOR EACH ROW EXECUTE FUNCTION public.block_suspended_authors();

CREATE OR REPLACE FUNCTION public.record_explicit_violation(p_reason text DEFAULT 'explicit_content')
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user uuid := auth.uid();
  v_until timestamptz;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED';
  END IF;
  UPDATE public.profiles
    SET suspended_until = greatest(coalesce(suspended_until, now()), now()) + interval '7 days'
    WHERE id = v_user
    RETURNING suspended_until INTO v_until;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'PROFILE_NOT_FOUND';
  END IF;
  RETURN jsonb_build_object('suspended_until', v_until, 'reason', p_reason);
END $function$;

GRANT EXECUTE ON FUNCTION public.record_explicit_violation(text) TO authenticated;