alter table public.transactions drop constraint transactions_type_check;
alter table public.transactions add constraint transactions_type_check check (
  type = any (array[
    'signup_grant','trade_buy','trade_sell','settlement',
    'virtual_topup','virtual_withdrawal',
    'syndicate_contribution','syndicate_payout','syndicate_refund','syndicate_captain_fee'
  ])
);