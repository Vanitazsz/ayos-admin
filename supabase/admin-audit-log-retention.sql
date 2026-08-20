-- Audit log auto-retention: delete rows older than 7 days.
-- Uses a PROCEDURE (not function) so each batch commits independently,
-- keeping lock duration and WAL generation per-batch bounded.
-- Requires the pg_cron extension (available on paid Supabase plans).
-- Run this once in the Supabase SQL editor.

create extension if not exists pg_cron;

create or replace procedure public.cleanup_old_audit_logs()
language plpgsql security definer set search_path = public as $$
declare
  batch_size constant int := 5000;
  deleted_count int;
begin
  loop
    delete from public.audit_logs
    where id in (
      select id from public.audit_logs
      where created_at < now() - interval '7 days'
      limit batch_size
    );
    get diagnostics deleted_count = row_count;
    exit when deleted_count = 0;
    perform pg_sleep(0.1);
 commit;
  end loop;
end $$;

-- Schedule daily cleanup at 03:00 UTC.
select cron.schedule(
  'cleanup-old-audit-logs',
  '0 3 * * *',
  $$call public.cleanup_old_audit_logs()$$
);

-- Ensure an index exists for efficient range scans on the retention check.
create index if not exists idx_audit_logs_created_at on public.audit_logs (created_at);

notify pgrst, 'reload schema';
