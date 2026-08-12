create extension if not exists pg_cron with schema extensions;

select cron.schedule(
  'syndicate-locks-sweep',
  '* * * * *',
  $$select public.process_syndicate_locks();$$
);