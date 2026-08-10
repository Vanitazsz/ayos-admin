-- RBAC-safe permissions for the admin app (Fix: 42501 "permission denied" on every table)
-- Run in the Supabase SQL editor AFTER admin-aggregation-functions.sql.
-- NOTE: re-runnable / idempotent. Re-run this file to replace the v1 recursive
-- admin_full_access policy (SQLSTATE 42P17 "infinite recursion") with the recursion-free one.
--
-- Design (RBAC):
--   * The admin app runs requests as the `authenticated` role (the JWT of the logged-in user).
--   * The admin app only READS tables directly; every write goes through SECURITY DEFINER RPCs.
--     Therefore we grant ONLY SELECT (no INSERT/UPDATE/DELETE) to `authenticated`.
--   * Row-level visibility stays controlled by RLS. We add an "admin_full_access" policy that
--     only admits accounts whose role is 'ADMIN', so ordinary consumer users (also
--     `authenticated`) see nothing on admin tables.
--   * The ADMIN check goes through the SECURITY DEFINER helper iam_admin() so the policy does
--     NOT re-enter its own table (which caused "infinite recursion detected in policy").
--   * `anon` (not logged in) gets NO grants here -- it stays locked out (42501), as today.

-- 1) RLS-bypassing ADMIN check (recursion-free).
create or replace function public.iam_admin()
returns boolean
language sql
security definer
set search_path = public, auth
stable as $$
  select exists (
    select 1 from public.accounts
    where id = auth.uid() and role::text = 'ADMIN'
  );
$$;

revoke execute on function public.iam_admin() from public;
grant execute on function public.iam_admin() to authenticated;

-- 2) Base table privilege for logged-in users (admin reads; consumers already have this).
--    NOTE: "all tables" already includes views in PostgreSQL, so no separate views grant exists.
grant usage on schema public to authenticated;
grant select on all tables in schema public to authenticated;

-- 3) Force RLS on admin-only tables so the SELECT grant above does NOT expose them to
--    ordinary consumer users. (These tables are never read by the consumer app.)
do $$
declare t text;
begin
  foreach t in array array['audit_logs','report_exports','trash_entries','account_reports',
                           'booking_disputes','customer_verifications','worker_verifications',
                           'admin_profiles','authentication_events']::text[]
  loop
    -- relkind = 'r' guard: skip views (they cannot hold RLS).
    if exists (
      select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relname = t and c.relkind = 'r'
    ) then
      execute format('alter table public.%I enable row level security', t);
    end if;
  end loop;
end $$;

-- 4) Admin-only access on every RLS-protected public table.
--    Additive: existing consumer policies are untouched; only ADMIN accounts are admitted.
do $$
declare r record;
begin
  for r in
    select c.oid::regclass::text as tbl
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'r' and c.relrowsecurity
  loop
    execute format('drop policy if exists "admin_full_access" on %s', r.tbl);
    execute format(
      'create policy "admin_full_access" on %s
         for all
         using (public.iam_admin())
         with check (public.iam_admin())',
      r.tbl);
  end loop;
end $$;
