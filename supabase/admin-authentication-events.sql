-- Authentication events for the admin profile "Login History" feature.
-- Run in the Supabase SQL editor BEFORE the admin-rbac-permissions.sql policy is applied
-- (or after; this file is idempotent and re-runnable).
--
-- Writes: the `record-auth-session` edge function inserts rows using the service-role
-- key, which bypasses RLS but still needs an explicit table-level grant (service_role
-- does NOT inherit table privileges in this project; see the grant below).
-- Reads: the admin app reads this table as `authenticated` (SELECT grant from
-- admin-rbac-permissions.sql) and is admitted by the admin_full_access policy below.

-- 1) Table (idempotent; do not drop existing data).
create table if not exists public.authentication_events (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null,
  ip_address inet,
  user_agent text,
  event_type text not null default 'sign_in',
  created_at timestamptz not null default now()
);

-- 2) Columns the admin app expects (safe no-op if already present).
alter table public.authentication_events add column if not exists ip_address inet;
alter table public.authentication_events add column if not exists user_agent text;
alter table public.authentication_events add column if not exists event_type text;

-- 2b) event_type vocabulary (must match the live table; the record-auth-session
--     edge function writes 'SIGNED_IN').
alter table public.authentication_events drop constraint if exists authentication_events_event_type_check;
alter table public.authentication_events add constraint authentication_events_event_type_check
  check (event_type in ('SIGNED_IN', 'SIGNED_OUT', 'PASSWORD_CHANGED', 'MFA_CHANGED'));

-- 3) Read path: RLS + admin-only visibility (mirrors admin-rbac-permissions.sql).
alter table public.authentication_events enable row level security;

drop policy if exists "admin_full_access" on public.authentication_events;
create policy "admin_full_access" on public.authentication_events
  for all
  using (public.iam_admin())
  with check (public.iam_admin());

-- 4) Index for the profile page query:
--    where account_id = <admin> order by created_at desc limit 50.
create index if not exists authentication_events_account_id_created_at_idx
  on public.authentication_events (account_id, created_at desc);

-- 5) The record-auth-session edge function writes with the service-role key.
--    It bypasses RLS but needs an explicit grant (project pattern, see admin-bootstrap.sql).
grant select, insert, update, delete on public.authentication_events to service_role;
