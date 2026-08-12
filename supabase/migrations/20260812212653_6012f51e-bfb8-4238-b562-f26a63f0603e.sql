-- ============ enums ============
create type public.syndicate_visibility as enum ('public','invite_only');
create type public.syndicate_status as enum ('open','locked','settled','cancelled');
create type public.syndicate_ledger_entry as enum ('contribution','payout','refund','fee');

-- ============ tables ============
create table public.syndicates (
  id uuid primary key default gen_random_uuid(),
  market_id uuid not null references public.markets(id) on delete cascade,
  captain_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  description text,
  outcome_side text not null check (outcome_side in ('yes','no')),
  target_stake numeric(18,2) not null check (target_stake > 0),
  min_contribution numeric(18,2) not null default 10 check (min_contribution > 0),
  max_members integer not null default 50 check (max_members between 2 and 500),
  captain_fee_bps integer not null default 0 check (captain_fee_bps between 0 and 1000),
  lock_at timestamptz not null,
  visibility public.syndicate_visibility not null default 'public',
  status public.syndicate_status not null default 'open',
  total_contributed numeric(18,2) not null default 0,
  total_shares numeric(18,4) not null default 0,
  position_id uuid references public.positions(id) on delete set null,
  settled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index syndicates_market_idx on public.syndicates(market_id, status);

create table public.syndicate_members (
  id uuid primary key default gen_random_uuid(),
  syndicate_id uuid not null references public.syndicates(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  contributed numeric(18,2) not null default 0,
  shares_owned numeric(18,4) not null default 0,
  joined_at timestamptz not null default now(),
  unique (syndicate_id, user_id)
);
create index syndicate_members_user_idx on public.syndicate_members(user_id);

create table public.syndicate_contributions (
  id uuid primary key default gen_random_uuid(),
  syndicate_id uuid not null references public.syndicates(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  amount numeric(18,2) not null check (amount > 0),
  price_at_entry numeric(6,4) not null check (price_at_entry > 0),
  shares_bought numeric(18,4) not null check (shares_bought > 0),
  created_at timestamptz not null default now()
);
create index syndicate_contributions_syndicate_idx on public.syndicate_contributions(syndicate_id, created_at);

create table public.syndicate_ledger (
  id uuid primary key default gen_random_uuid(),
  syndicate_id uuid not null references public.syndicates(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete set null,
  entry_type public.syndicate_ledger_entry not null,
  amount numeric(18,2) not null,
  balance_after numeric(18,2),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index syndicate_ledger_syndicate_idx on public.syndicate_ledger(syndicate_id, created_at);

-- existing tables gain syndicate scoping
alter table public.positions add column syndicate_id uuid references public.syndicates(id) on delete set null;
alter table public.posts add column syndicate_id uuid references public.syndicates(id) on delete cascade;
create index posts_syndicate_idx on public.posts(syndicate_id, created_at);

-- ============ grants ============
grant select, insert, update, delete on public.syndicates to authenticated;
grant select on public.syndicates to anon;
grant all on public.syndicates to service_role;
grant select on public.syndicate_members to authenticated;
grant all on public.syndicate_members to service_role;
grant select on public.syndicate_contributions to authenticated;
grant all on public.syndicate_contributions to service_role;
grant select on public.syndicate_ledger to authenticated;
grant all on public.syndicate_ledger to service_role;

-- ============ membership helper ============
create or replace function public.is_syndicate_member(p_syndicate_id uuid, p_user_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.syndicate_members m
    where m.syndicate_id = p_syndicate_id and m.user_id = p_user_id
  ) or exists (
    select 1 from public.syndicates s
    where s.id = p_syndicate_id and s.captain_id = p_user_id
  );
$$;
revoke all on function public.is_syndicate_member(uuid, uuid) from public, anon;
grant execute on function public.is_syndicate_member(uuid, uuid) to authenticated;

-- ============ RLS ============
alter table public.syndicates enable row level security;
alter table public.syndicate_members enable row level security;
alter table public.syndicate_contributions enable row level security;
alter table public.syndicate_ledger enable row level security;

create policy syndicates_select_visible on public.syndicates for select to authenticated
  using (visibility = 'public' or public.is_syndicate_member(id, auth.uid()));
create policy syndicates_select_public_anon on public.syndicates for select to anon
  using (visibility = 'public');
create policy syndicates_insert_captain on public.syndicates for insert to authenticated
  with check (captain_id = auth.uid() and status = 'open' and total_contributed = 0 and total_shares = 0 and position_id is null);
create policy syndicates_update_captain on public.syndicates for update to authenticated
  using (captain_id = auth.uid() and status = 'open')
  with check (captain_id = auth.uid() and status = 'open');
create policy syndicates_delete_empty on public.syndicates for delete to authenticated
  using (captain_id = auth.uid() and status = 'open' and total_contributed = 0);

create policy syndicate_members_select on public.syndicate_members for select to authenticated
  using (user_id = auth.uid() or public.is_syndicate_member(syndicate_id, auth.uid()));

create policy syndicate_contributions_select on public.syndicate_contributions for select to authenticated
  using (user_id = auth.uid() or public.is_syndicate_member(syndicate_id, auth.uid()));

create policy syndicate_ledger_select on public.syndicate_ledger for select to authenticated
  using (user_id = auth.uid() or public.is_syndicate_member(syndicate_id, auth.uid()));

-- Server columns on syndicates are never client-writable.
create or replace function public.guard_syndicate_columns()
returns trigger language plpgsql set search_path = public as $$
begin
  if current_user = 'authenticated' then
    if new.total_contributed is distinct from old.total_contributed
      or new.total_shares is distinct from old.total_shares
      or new.status is distinct from old.status
      or new.position_id is distinct from old.position_id
      or new.settled_at is distinct from old.settled_at
      or new.captain_id is distinct from old.captain_id
      or new.market_id is distinct from old.market_id
      or new.outcome_side is distinct from old.outcome_side then
      raise exception 'SERVER_MANAGED_COLUMN';
    end if;
  end if;
  new.updated_at := now();
  return new;
end $$;
revoke all on function public.guard_syndicate_columns() from public, anon, authenticated;
create trigger guard_syndicate_columns_trg before update on public.syndicates
  for each row execute function public.guard_syndicate_columns();

-- ============ join_syndicate ============
create or replace function public.join_syndicate(p_syndicate_id uuid, p_amount numeric)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := auth.uid();
  v_syn public.syndicates;
  v_market public.markets;
  v_price numeric(6,4);
  v_amount numeric(18,2);
  v_shares numeric(18,4);
  v_balance numeric(18,2);
  v_new_balance numeric(18,2);
  v_members integer;
  v_is_member boolean;
begin
  if v_user is null then raise exception 'NOT_AUTHENTICATED'; end if;
  v_amount := round(coalesce(p_amount, 0), 2);
  if v_amount <= 0 then raise exception 'INVALID_AMOUNT'; end if;

  select * into v_syn from public.syndicates where id = p_syndicate_id for update;
  if not found then raise exception 'SYNDICATE_NOT_FOUND'; end if;
  if v_syn.status <> 'open' then raise exception 'SYNDICATE_CLOSED'; end if;
  if v_syn.lock_at <= now() then raise exception 'SYNDICATE_LOCKED'; end if;
  if v_amount < v_syn.min_contribution then raise exception 'BELOW_MIN_CONTRIBUTION'; end if;

  select count(*), bool_or(user_id = v_user) into v_members, v_is_member
    from public.syndicate_members where syndicate_id = p_syndicate_id;
  if not coalesce(v_is_member, false) and v_members >= v_syn.max_members then
    raise exception 'SYNDICATE_FULL';
  end if;

  select * into v_market from public.markets where id = v_syn.market_id for update;
  if not found then raise exception 'MARKET_NOT_FOUND'; end if;
  if v_market.status <> 'active' then raise exception 'MARKET_CLOSED'; end if;
  if v_market.resolution_date <= now() then raise exception 'MARKET_EXPIRED'; end if;

  v_price := case when v_syn.outcome_side = 'yes' then v_market.yes_price else round(1 - v_market.yes_price, 4) end;
  if v_price <= 0 then raise exception 'INVALID_PRICE'; end if;

  select balance into v_balance from public.profiles where id = v_user for update;
  if not found then raise exception 'PROFILE_NOT_FOUND'; end if;
  if v_amount > v_balance then raise exception 'INSUFFICIENT_BALANCE'; end if;

  v_shares := round(v_amount / v_price, 4);
  if v_shares <= 0 then raise exception 'INVALID_AMOUNT'; end if;

  v_new_balance := round(v_balance - v_amount, 2);
  update public.profiles set balance = v_new_balance where id = v_user;

  insert into public.syndicate_contributions (syndicate_id, user_id, amount, price_at_entry, shares_bought)
  values (p_syndicate_id, v_user, v_amount, v_price, v_shares);

  insert into public.syndicate_members (syndicate_id, user_id, contributed, shares_owned)
  values (p_syndicate_id, v_user, v_amount, v_shares)
  on conflict (syndicate_id, user_id) do update
    set contributed = public.syndicate_members.contributed + excluded.contributed,
        shares_owned = public.syndicate_members.shares_owned + excluded.shares_owned;

  update public.syndicates set
    total_contributed = round(total_contributed + v_amount, 2),
    total_shares = round(total_shares + v_shares, 4),
    updated_at = now()
  where id = p_syndicate_id
  returning * into v_syn;

  insert into public.syndicate_ledger (syndicate_id, user_id, entry_type, amount, balance_after, metadata)
  values (p_syndicate_id, v_user, 'contribution', -v_amount, v_new_balance,
    jsonb_build_object('price_at_entry', v_price, 'shares_bought', v_shares));

  insert into public.transactions (user_id, type, amount, balance_after)
  values (v_user, 'syndicate_contribution', -v_amount, v_new_balance);

  return jsonb_build_object(
    'balance', v_new_balance,
    'price_at_entry', v_price,
    'shares_bought', v_shares,
    'total_contributed', v_syn.total_contributed,
    'total_shares', v_syn.total_shares
  );
end $$;
revoke all on function public.join_syndicate(uuid, numeric) from public, anon;
grant execute on function public.join_syndicate(uuid, numeric) to authenticated;

-- ============ settle_syndicate ============
create or replace function public.settle_syndicate(p_syndicate_id uuid, p_result text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_syn public.syndicates;
  v_market public.markets;
  v_result text;
  v_member record;
  v_gross numeric(18,2);
  v_profit numeric(18,2);
  v_fee numeric(18,2);
  v_payout numeric(18,2);
  v_fee_total numeric(18,2) := 0;
  v_paid numeric(18,2) := 0;
  v_balance numeric(18,2);
  v_count integer := 0;
begin
  select * into v_syn from public.syndicates where id = p_syndicate_id for update;
  if not found then raise exception 'SYNDICATE_NOT_FOUND'; end if;
  if v_syn.status = 'settled' then
    return jsonb_build_object('settled', true, 'idempotent', true);
  end if;
  if v_syn.status = 'cancelled' then raise exception 'SYNDICATE_CANCELLED'; end if;

  select * into v_market from public.markets where id = v_syn.market_id for update;

  v_result := lower(coalesce(p_result, ''));
  if v_result not in ('win','loss','void') then
    if v_market.status = 'resolved' and v_market.outcome is not null then
      v_result := case when v_market.outcome = v_syn.outcome_side then 'win' else 'loss' end;
    else
      v_result := 'void';
    end if;
  end if;

  for v_member in
    select * from public.syndicate_members where syndicate_id = p_syndicate_id order by joined_at for update
  loop
    v_count := v_count + 1;

    if v_result = 'win' then
      v_gross := round(v_member.shares_owned * 1.00, 2);
      v_profit := greatest(v_gross - v_member.contributed, 0);
      v_fee := round(v_profit * v_syn.captain_fee_bps / 10000.0, 2);
      v_payout := round(v_gross - v_fee, 2);
    elsif v_result = 'void' then
      v_fee := 0;
      v_payout := round(v_member.contributed, 2);
    else
      v_fee := 0;
      v_payout := 0;
    end if;

    if v_payout > 0 then
      update public.profiles set balance = round(balance + v_payout, 2)
        where id = v_member.user_id returning balance into v_balance;
      insert into public.transactions (user_id, type, amount, balance_after)
      values (v_member.user_id,
        case when v_result = 'void' then 'syndicate_refund' else 'syndicate_payout' end,
        v_payout, v_balance);
    else
      select balance into v_balance from public.profiles where id = v_member.user_id;
    end if;

    insert into public.syndicate_ledger (syndicate_id, user_id, entry_type, amount, balance_after, metadata)
    values (p_syndicate_id, v_member.user_id,
      case when v_result = 'void' then 'refund' else 'payout' end,
      v_payout, v_balance,
      jsonb_build_object('result', v_result, 'shares_owned', v_member.shares_owned,
        'contributed', v_member.contributed, 'captain_fee', v_fee));

    if v_fee > 0 then
      v_fee_total := v_fee_total + v_fee;
      insert into public.syndicate_ledger (syndicate_id, user_id, entry_type, amount, metadata)
      values (p_syndicate_id, v_member.user_id, 'fee', -v_fee,
        jsonb_build_object('to_captain', v_syn.captain_id, 'basis', 'profit_only'));
    end if;

    v_paid := v_paid + v_payout;
  end loop;

  if v_fee_total > 0 then
    update public.profiles set balance = round(balance + v_fee_total, 2)
      where id = v_syn.captain_id returning balance into v_balance;
    insert into public.transactions (user_id, type, amount, balance_after)
    values (v_syn.captain_id, 'syndicate_captain_fee', v_fee_total, v_balance);
    insert into public.syndicate_ledger (syndicate_id, user_id, entry_type, amount, balance_after, metadata)
    values (p_syndicate_id, v_syn.captain_id, 'fee', v_fee_total, v_balance,
      jsonb_build_object('basis', 'profit_only', 'members', v_count));
  end if;

  if v_syn.position_id is not null then
    update public.positions set contracts = 0 where id = v_syn.position_id;
  end if;

  update public.syndicates set status = 'settled', settled_at = now(), updated_at = now()
    where id = p_syndicate_id;

  return jsonb_build_object('settled', true, 'result', v_result, 'members', v_count,
    'paid_out', v_paid, 'captain_fee', v_fee_total);
end $$;
revoke all on function public.settle_syndicate(uuid, text) from public, anon, authenticated;

-- ============ cancel_syndicate ============
create or replace function public.cancel_syndicate(p_syndicate_id uuid, p_reason text default 'target_not_met')
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_syn public.syndicates;
  v_member record;
  v_balance numeric(18,2);
  v_refunded numeric(18,2) := 0;
  v_count integer := 0;
begin
  select * into v_syn from public.syndicates where id = p_syndicate_id for update;
  if not found then raise exception 'SYNDICATE_NOT_FOUND'; end if;
  if v_syn.status in ('settled','cancelled') then
    return jsonb_build_object('cancelled', v_syn.status = 'cancelled', 'idempotent', true);
  end if;

  for v_member in
    select * from public.syndicate_members where syndicate_id = p_syndicate_id for update
  loop
    v_count := v_count + 1;
    if v_member.contributed > 0 then
      update public.profiles set balance = round(balance + v_member.contributed, 2)
        where id = v_member.user_id returning balance into v_balance;
      insert into public.transactions (user_id, type, amount, balance_after)
      values (v_member.user_id, 'syndicate_refund', v_member.contributed, v_balance);
      v_refunded := v_refunded + v_member.contributed;
    else
      select balance into v_balance from public.profiles where id = v_member.user_id;
    end if;

    insert into public.syndicate_ledger (syndicate_id, user_id, entry_type, amount, balance_after, metadata)
    values (p_syndicate_id, v_member.user_id, 'refund', v_member.contributed, v_balance,
      jsonb_build_object('reason', p_reason, 'at_cost', true));
  end loop;

  if v_syn.position_id is not null then
    update public.positions set contracts = 0 where id = v_syn.position_id;
  end if;

  update public.syndicates set status = 'cancelled', settled_at = now(), updated_at = now()
    where id = p_syndicate_id;

  return jsonb_build_object('cancelled', true, 'reason', p_reason, 'members', v_count, 'refunded', v_refunded);
end $$;
revoke all on function public.cancel_syndicate(uuid, text) from public, anon, authenticated;

-- ============ scheduled sweep ============
create or replace function public.process_syndicate_locks()
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_syn record;
  v_market public.markets;
  v_price numeric(6,4);
  v_position_id uuid;
  v_locked integer := 0;
  v_cancelled integer := 0;
  v_settled integer := 0;
begin
  -- markets that resolved (or expired) while a pool was still open: cancel and refund
  for v_syn in
    select s.id from public.syndicates s
    join public.markets m on m.id = s.market_id
    where s.status = 'open' and (m.status <> 'active' or m.resolution_date <= now())
  loop
    perform public.cancel_syndicate(v_syn.id, 'market_unavailable');
    v_cancelled := v_cancelled + 1;
  end loop;

  for v_syn in
    select * from public.syndicates where status = 'open' and lock_at <= now()
  loop
    if v_syn.total_contributed < v_syn.target_stake then
      perform public.cancel_syndicate(v_syn.id, 'target_not_met');
      v_cancelled := v_cancelled + 1;
    else
      select * into v_market from public.markets where id = v_syn.market_id for update;
      v_price := case when v_syn.total_shares > 0
        then round(v_syn.total_contributed / v_syn.total_shares, 4) else 0.5 end;

      insert into public.positions (user_id, market_id, side, contracts, avg_price, syndicate_id)
      values (v_syn.captain_id, v_syn.market_id, v_syn.outcome_side, v_syn.total_shares, v_price, v_syn.id)
      returning id into v_position_id;

      update public.markets set volume = volume + v_syn.total_contributed where id = v_syn.market_id;

      update public.syndicates set status = 'locked', position_id = v_position_id, updated_at = now()
        where id = v_syn.id;
      v_locked := v_locked + 1;
    end if;
  end loop;

  -- locked pools whose market has since resolved
  for v_syn in
    select s.id from public.syndicates s
    join public.markets m on m.id = s.market_id
    where s.status = 'locked' and m.status = 'resolved'
  loop
    perform public.settle_syndicate(v_syn.id);
    v_settled := v_settled + 1;
  end loop;

  return jsonb_build_object('locked', v_locked, 'cancelled', v_cancelled, 'settled', v_settled);
end $$;
revoke all on function public.process_syndicate_locks() from public, anon, authenticated;

-- ============ resolve_market settles syndicates in the same transaction ============
create or replace function public.resolve_market(p_market_id uuid, p_outcome text)
returns jsonb language plpgsql security definer set search_path = public as $function$
DECLARE
  v_user uuid := auth.uid();
  v_is_admin boolean;
  v_pos record;
  v_payout numeric(18,2);
  v_balance numeric(18,2);
  v_count integer := 0;
  v_syn record;
  v_syndicates integer := 0;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED';
  END IF;
  SELECT is_admin INTO v_is_admin FROM public.profiles WHERE id = v_user;
  IF NOT coalesce(v_is_admin, false) THEN
    RAISE EXCEPTION 'NOT_AUTHORIZED';
  END IF;
  IF p_outcome NOT IN ('yes','no') THEN
    RAISE EXCEPTION 'INVALID_OUTCOME';
  END IF;

  PERFORM 1 FROM public.markets WHERE id = p_market_id AND status = 'active' FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'MARKET_NOT_RESOLVABLE';
  END IF;

  -- individual positions only; syndicate-owned positions settle through settle_syndicate
  FOR v_pos IN
    SELECT * FROM public.positions
    WHERE market_id = p_market_id AND contracts > 0 AND syndicate_id IS NULL FOR UPDATE
  LOOP
    v_payout := CASE WHEN v_pos.side = p_outcome THEN round(v_pos.contracts * 1.00, 2) ELSE 0 END;
    IF v_payout > 0 THEN
      UPDATE public.profiles SET balance = round(balance + v_payout, 2)
        WHERE id = v_pos.user_id RETURNING balance INTO v_balance;
      INSERT INTO public.transactions (user_id, type, amount, balance_after)
      VALUES (v_pos.user_id, 'settlement', v_payout, v_balance);
    END IF;
    UPDATE public.positions SET contracts = 0 WHERE id = v_pos.id;
    v_count := v_count + 1;
  END LOOP;

  UPDATE public.markets SET
    status = 'resolved',
    outcome = p_outcome,
    yes_price = CASE WHEN p_outcome = 'yes' THEN 0.9900 ELSE 0.0100 END
  WHERE id = p_market_id;

  INSERT INTO public.market_price_history (market_id, yes_price)
  VALUES (p_market_id, CASE WHEN p_outcome = 'yes' THEN 0.9900 ELSE 0.0100 END);

  -- locked pools settle on the outcome; still-open pools are refunded at cost
  FOR v_syn IN
    SELECT id, status FROM public.syndicates
    WHERE market_id = p_market_id AND status IN ('open','locked')
  LOOP
    IF v_syn.status = 'locked' THEN
      PERFORM public.settle_syndicate(v_syn.id);
    ELSE
      PERFORM public.cancel_syndicate(v_syn.id, 'market_resolved_before_lock');
    END IF;
    v_syndicates := v_syndicates + 1;
  END LOOP;

  RETURN jsonb_build_object('resolved', true, 'outcome', p_outcome,
    'positions_settled', v_count, 'syndicates_settled', v_syndicates);
END;
$function$;
revoke all on function public.resolve_market(uuid, text) from public, anon;
grant execute on function public.resolve_market(uuid, text) to authenticated;

-- realtime for the emotional hook
alter publication supabase_realtime add table public.syndicates;
alter publication supabase_realtime add table public.syndicate_members;