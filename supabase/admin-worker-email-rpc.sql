-- Admin RPC to change a WORKER's email address.
-- Mirrors admin_update_user_email but scoped to accounts.role = 'WORKER':
-- updates both auth.users (Supabase Auth login email, confirmed immediately)
-- and accounts.email (displayed in the admin). Requires explicit admin intent,
-- validates format + uniqueness, and refuses to change the signed-in admin's
-- own email to prevent accidental lockout.
--
-- Run in the Supabase SQL editor.
--
-- admin_update_worker_email(p_worker_id, p_email) -> text (normalized email)

create or replace function public.admin_update_worker_email(
  p_worker_id uuid,
  p_email text
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  target public.accounts;
  normalized_email text := lower(trim(coalesce(p_email, '')));
begin
  if not public.is_admin(true) then
    raise exception using errcode = '42501', message = 'AAL2_ADMIN_REQUIRED';
  end if;

  if normalized_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then
    raise exception using errcode = '22023', message = 'INVALID_EMAIL';
  end if;

  if p_worker_id = auth.uid() then
    raise exception using errcode = '22023', message = 'SELF_EMAIL_CHANGE_DISALLOWED';
  end if;

  select account.* into target
  from public.accounts account
  where account.id = p_worker_id and account.role = 'WORKER'
  for update;

  if target.id is null or target.deleted_at is not null then
    raise exception using errcode = 'P0002', message = 'WORKER_ACCOUNT_NOT_FOUND';
  end if;

  if exists (
    select 1 from auth.users existing
    where existing.id <> p_worker_id
      and lower(coalesce(existing.email, '')) = normalized_email
  ) then
    raise exception using errcode = '23505', message = 'EMAIL_ALREADY_IN_USE';
  end if;

  update auth.users
  set email = normalized_email,
      email_change = normalized_email,
      email_confirmed_at = now(),
      updated_at = now()
  where id = p_worker_id;

  update public.accounts
  set email = normalized_email, updated_at = now()
  where id = p_worker_id;

  insert into public.audit_logs(actor_id, action, entity_type, entity_id, metadata)
  values (
    auth.uid(),
    'EMAIL_CHANGED',
    'account',
    p_worker_id::text,
    jsonb_build_object('email', normalized_email)
  );

  return normalized_email;
end
$$;

revoke all on function public.admin_update_worker_email(uuid, text) from public, anon;
grant execute on function public.admin_update_worker_email(uuid, text) to authenticated;
