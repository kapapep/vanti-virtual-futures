CREATE OR REPLACE FUNCTION public.guard_server_columns()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
begin
  if current_user = 'authenticated'
     and new.balance is distinct from old.balance then
    raise exception 'balance cannot be changed directly';
  end if;
  return new;
end $function$;