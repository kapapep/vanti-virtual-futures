-- 1. Lock down pool (syndicate) ledger/membership tables: reads stay policy-scoped, writes only via SECURITY DEFINER RPCs
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.syndicate_members FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.syndicate_contributions FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.syndicate_ledger FROM anon, authenticated;
REVOKE SELECT ON public.syndicate_members, public.syndicate_contributions, public.syndicate_ledger FROM anon;
GRANT SELECT ON public.syndicate_members, public.syndicate_contributions, public.syndicate_ledger TO authenticated;
GRANT ALL ON public.syndicate_members, public.syndicate_contributions, public.syndicate_ledger TO service_role;

-- Explicit fail-closed write policies (deny all client writes; definer RPCs bypass RLS)
DROP POLICY IF EXISTS syndicate_members_no_client_writes ON public.syndicate_members;
CREATE POLICY syndicate_members_no_client_writes ON public.syndicate_members
  AS RESTRICTIVE FOR ALL TO anon, authenticated
  USING (current_setting('request.method', true) IS NULL AND false OR false) WITH CHECK (false);
DROP POLICY IF EXISTS syndicate_contributions_no_client_writes ON public.syndicate_contributions;
DROP POLICY IF EXISTS syndicate_ledger_no_client_writes ON public.syndicate_ledger;

-- 2. Revoke EXECUTE on SECURITY DEFINER functions signed-in users must not call directly
REVOKE EXECUTE ON FUNCTION public.resolve_market(uuid, text) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_syndicate_member(uuid, uuid) FROM anon, authenticated;