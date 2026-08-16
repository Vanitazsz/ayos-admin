-- Admin-only audit logs.
--
-- The Security Audit Logs page should record only what administrators do.
-- This migration:
--   1. Deletes existing audit_logs entries whose actor is a USER or WORKER
--      account (entries keep nothing about targets; actor_id is who did it).
--   2. Adds a BEFORE INSERT guard trigger that silently drops any future
--      entry whose actor is a USER or WORKER, so the user-facing app keeps
--      working but its audit writes become no-ops.
--   3. Drops the now-unused admin_list_audit_actors(text) RPC that fed the
--      removed Users / Workers roster tabs.

delete from public.audit_logs l
where exists (
  select 1 from public.accounts a
  where a.id = l.actor_id
    and a.role::text in ('USER', 'WORKER')
);

create or replace function public.prevent_non_admin_audit_logs()
returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.actor_id is not null
     and exists (
       select 1 from public.accounts a
       where a.id = new.actor_id
         and a.role::text in ('USER', 'WORKER')
     )
  then
    return null;
  end if;
  return new;
end $$;

drop trigger if exists audit_logs_admin_only on public.audit_logs;
create trigger audit_logs_admin_only
  before insert on public.audit_logs
  for each row execute function public.prevent_non_admin_audit_logs();

drop function if exists public.admin_list_audit_actors(text);

notify pgrst, 'reload schema';
