CREATE OR REPLACE FUNCTION public.settle_syndicate(p_syndicate_id uuid, p_result text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
      (case when v_result = 'void' then 'refund' else 'payout' end)::public.syndicate_ledger_entry,
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

  update public.syndicates set status = 'settled', result = v_result, settled_at = now(), updated_at = now()
    where id = p_syndicate_id;

  return jsonb_build_object('settled', true, 'result', v_result, 'members', v_count,
    'paid_out', v_paid, 'captain_fee', v_fee_total);
end $function$;

REVOKE ALL ON FUNCTION public.settle_syndicate(uuid, text) FROM PUBLIC, anon, authenticated;