-- Admin Auth diagnostics (READ-ONLY).
-- Run in the Supabase SQL editor. Nothing here writes to any table.
--
-- Use this to answer three questions:
--   1. Did a signup / OTP / invite request reach Auth, and did the email get sent?
--   2. What is the actual database error behind "Database error saving new user"?
--   3. Are there triggers/constraints on auth tables that could block inserts
--      (invite specifically, since signup works)?

select '=== 1. Recent auth.users ===' as section;
select
  id,
  email,
  email_confirmed_at,
  invited_at,
  created_at,
  last_sign_in_at
from auth.users
order by created_at desc
limit 15;

select '=== 2. Recent auth.audit_log_entries (parsed) ===' as section;
select
  created_at,
  (payload->>'action') as event,
  (payload->>'actor_id') as actor_id,
  (payload->>'status') as status,
  (payload->>'error') as error,
  (payload->>'path') as path,
  (payload->>'message') as message,
  payload::text as full_payload
from auth.audit_log_entries
order by created_at desc
limit 100;

select '=== 3. Triggers on auth tables ===' as section;
select
  tgrelid::regclass as table_name,
  tgname as trigger_name,
  pg_get_triggerdef(oid) as definition
from pg_trigger
where
  not tgisinternal
  and tgrelid in ('auth.users'::regclass, 'auth.identities'::regclass,
                  'auth.sessions'::regclass, 'auth.refresh_tokens'::regclass,
                  'auth.instances'::regclass, 'auth.mfa_factors'::regclass)
order by 1, 2;

select '=== 4. NOT NULL / constraints on auth.users ===' as section;
select
  a.attname as column_name,
  format_type(a.atttypid, a.atttypmod) as data_type,
  a.attnotnull as not_null,
  coalesce(pg_get_expr(d.adbin, d.adrelid), '') as default_expr
from pg_attribute a
join pg_class c on c.oid = a.attrelid
left join pg_attrdef d on d.adrelid = a.attrelid and d.adnum = a.attnum
where
  c.relname = 'users'
  and c.relnamespace = 'auth'::regnamespace
  and a.attnum > 0
  and not a.attisdropped
order by a.attnum;

select '=== 5. auth schema migrations (tail) ===' as section;
select version
from auth.schema_migrations
order by version desc
limit 5;

select '=== 6. auth.identities recent rows (invite/OTP insert target) ===' as section;
select
  id,
  user_id,
  provider,
  provider_id,
  created_at,
  updated_at
from auth.identities
order by created_at desc
limit 15;
