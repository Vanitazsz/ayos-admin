-- Admin bootstrap-token signup + invite support (Option A).
-- Run in the Supabase SQL editor. Idempotent / re-runnable.
--
-- Background: the production provision_account() trigger on auth.users
-- governs every signup. An ADMIN account can only be provisioned when the
-- signup carries a valid bootstrap token (private.admin_bootstrap_requests);
-- any other signup is rejected (role must be USER/WORKER). This migration:
--   1. Carries the invited RBAC role + display name on the bootstrap request.
--   2. Adds admin_issue_bootstrap_token() so admins with team.manage can mint
--      single-use, expiring tokens (only the SHA-256 hash is stored).
--   3. Applies the invited role to the provisioned admin_profiles via a
--      post-provisioning trigger. This trigger is ADDITIVE: it does NOT
--      modify provision_account(), so the consumer/worker signup path is
--      untouched. It relies on trigger-name ordering to run AFTER
--      provision_account_after_auth_insert ("account" < "bootstrap").
--   4. Drops the obsolete admin_complete_signup() RPC.
--
-- Depends on admin-team-rbac.sql (is_admin, admin_roles, admin_profiles).

-- 1) Invited role + display name on the bootstrap request (authoritative).
alter table private.admin_bootstrap_requests
  add column if not exists admin_role text not null default 'ADMIN';

-- 2) Allow the admin_invite edge function to manage requests with the
--    service-role key (BYPASSRLS applies to service_role).
grant usage on schema private to service_role;
grant select, insert, update, delete on private.admin_bootstrap_requests to service_role;

-- 3) RPC: mint a single-use bootstrap token for an invited admin.
--    Returns the plaintext token (never stored); only its SHA-256 hash is kept.
create or replace function public.admin_issue_bootstrap_token(
  p_email text,
  p_display_name text default '',
  p_admin_role text default 'ADMIN'
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_email text := lower(trim(coalesce(p_email, '')));
  v_display_name text := trim(coalesce(p_display_name, ''));
  v_role text := upper(trim(coalesce(p_admin_role, 'ADMIN')));
  v_token text;
  v_caller_role text;
begin
  if not public.is_admin(true) then
    raise exception using errcode = '42501', message = 'AAL2_ADMIN_REQUIRED';
  end if;

  select ap.admin_role into v_caller_role
  from public.admin_profiles ap
  where ap.account_id = auth.uid();

  if v_caller_role is null or not exists (
    select 1 from public.admin_roles r
    where r.code = v_caller_role
      and 'team.manage' = any(r.permissions)
  ) then
    raise exception using errcode = '42501', message = 'TEAM_MANAGE_REQUIRED';
  end if;

  if v_email = '' or v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception using errcode = '22023', message = 'INVALID_EMAIL';
  end if;

  if v_display_name = '' then
    raise exception using errcode = '22023', message = 'DISPLAY_NAME_REQUIRED';
  end if;

  if not exists (select 1 from public.admin_roles where code = v_role) then
    raise exception using errcode = '22023', message = 'UNKNOWN_ROLE';
  end if;

  if exists (
    select 1 from public.accounts where email = v_email and deleted_at is null
  ) then
    raise exception using errcode = '23505', message = 'EMAIL_ALREADY_IN_USE';
  end if;

  v_token := encode(gen_random_bytes(32), 'hex');

  if exists (select 1 from private.admin_bootstrap_requests where email = v_email) then
    update private.admin_bootstrap_requests
    set token_hash = encode(sha256(convert_to(v_token, 'UTF8')), 'hex'),
        display_name = v_display_name,
        admin_role = v_role,
        expires_at = now() + interval '10 minutes'
    where email = v_email;
  else
    insert into private.admin_bootstrap_requests (email, token_hash, display_name, admin_role, expires_at)
    values (
      v_email,
      encode(sha256(convert_to(v_token, 'UTF8')), 'hex'),
      v_display_name,
      v_role,
      now() + interval '10 minutes'
    );
  end if;

  insert into public.audit_logs(actor_id, action, entity_type, entity_id, metadata)
  values (
    auth.uid(),
    'ADMIN_INVITE_TOKEN_ISSUED',
    'admin',
    v_email,
    jsonb_build_object('email', v_email, 'admin_role', v_role, 'expires_at', now() + interval '10 minutes')
  );

  return v_token;
end
$$;

revoke all on function public.admin_issue_bootstrap_token(text, text, text) from public, anon;
grant execute on function public.admin_issue_bootstrap_token(text, text, text) to authenticated;
grant execute on function public.admin_issue_bootstrap_token(text, text, text) to service_role;

-- 4) Post-provisioning role assignment. Runs AFTER provision_account() because
--    "provision_account_after_auth_insert" sorts before this trigger's name.
create or replace function private.provision_bootstrap_admin_role()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_role text;
  v_request_role text;
  v_meta_role text;
begin
  -- Only bootstrap-token signups (invited admins) are handled here.
  if not (new.raw_user_meta_data ? 'admin_bootstrap_token') then
    return new;
  end if;

  -- Prefer the role recorded server-side on the request (authoritative), then
  -- consume the single-use request row.
  select admin_role into v_request_role
  from private.admin_bootstrap_requests
  where email = new.email and expires_at > now();

  if v_request_role is not null then
    v_role := v_request_role;
    delete from private.admin_bootstrap_requests where email = new.email;
  else
    -- Request was already consumed before this trigger ran; fall back to the
    -- role the invite link carried (validated against admin_roles below).
    v_meta_role := upper(trim(coalesce(new.raw_user_meta_data->>'admin_bootstrap_role', 'ADMIN')));
    v_role := v_meta_role;
  end if;

  -- Never invent a role; only predefined roles are accepted.
  if not exists (select 1 from public.admin_roles where code = v_role) then
    v_role := 'ADMIN';
  end if;

  update public.admin_profiles
  set admin_role = v_role
  where account_id = new.id;

  return new;
end
$$;

drop trigger if exists provision_bootstrap_role_after_auth_insert on auth.users;
create trigger provision_bootstrap_role_after_auth_insert
  after insert on auth.users
  for each row execute function private.provision_bootstrap_admin_role();

-- 5) The old signup-finalization RPC is obsolete: provision_account() creates
--    the account at signup time, and the trigger above applies the invited role.
drop function if exists public.admin_complete_signup(text);

-- Force PostgREST to reload its schema cache.
notify pgrst, 'reload schema';
