DROP POLICY IF EXISTS syndicate_members_no_client_writes ON public.syndicate_members;

CREATE POLICY syndicate_members_deny_insert ON public.syndicate_members AS RESTRICTIVE FOR INSERT TO anon, authenticated WITH CHECK (false);
CREATE POLICY syndicate_members_deny_update ON public.syndicate_members AS RESTRICTIVE FOR UPDATE TO anon, authenticated USING (false);
CREATE POLICY syndicate_members_deny_delete ON public.syndicate_members AS RESTRICTIVE FOR DELETE TO anon, authenticated USING (false);

CREATE POLICY syndicate_contributions_deny_insert ON public.syndicate_contributions AS RESTRICTIVE FOR INSERT TO anon, authenticated WITH CHECK (false);
CREATE POLICY syndicate_contributions_deny_update ON public.syndicate_contributions AS RESTRICTIVE FOR UPDATE TO anon, authenticated USING (false);
CREATE POLICY syndicate_contributions_deny_delete ON public.syndicate_contributions AS RESTRICTIVE FOR DELETE TO anon, authenticated USING (false);

CREATE POLICY syndicate_ledger_deny_insert ON public.syndicate_ledger AS RESTRICTIVE FOR INSERT TO anon, authenticated WITH CHECK (false);
CREATE POLICY syndicate_ledger_deny_update ON public.syndicate_ledger AS RESTRICTIVE FOR UPDATE TO anon, authenticated USING (false);
CREATE POLICY syndicate_ledger_deny_delete ON public.syndicate_ledger AS RESTRICTIVE FOR DELETE TO anon, authenticated USING (false);