-- Admin bulk RPCs to apply account-status / verification changes to many
-- customer accounts in a single request. Used by the Users page bulk-selection
-- bar (Suspend / Reactivate / Verify / Unverify). Delete is intentionally
-- excluded (it requires a typed-email confirmation per account).
-- Run in the Supabase SQL editor.

create or replace function public.admin_bulk_set_account_status(
  p_account_ids uuid[],
  p_next_status account_status
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  updated_count integer := 0;
  affected uuid[];
  target_id uuid;
begin
  if not public.is_admin(true) then
    raise exception using errcode = '42501', message = 'AAL2_ADMIN_REQUIRED';
  end if;

  if p_account_ids is null or array_length(p_account_ids, 1) is null then
    raise exception using errcode = '22004', message = 'INVALID_ACCOUNT_IDS';
  end if;

  with target as (
    select account.id
    from public.accounts account
    where account.id = any(p_account_ids)
      and account.role = 'USER'
      and account.deleted_at is null
      and account.status is distinct from p_next_status
  ), updated as (
    update public.accounts account
    set status = p_next_status
    from target
    where account.id = target.id
    returning account.id
  )
  select array_agg(id) into affected from updated;

  if affected is not null then
    foreach target_id in array affected
    loop
      insert into public.audit_logs(actor_id, action, entity_type, entity_id, metadata)
      values (
        auth.uid(),
        'ACCOUNT_STATUS_CHANGED',
        'account',
        target_id::text,
        jsonb_build_object('status', p_next_status)
      );
      updated_count := updated_count + 1;
    end loop;
  end if;

  return updated_count;
end
$$;

revoke all on function public.admin_bulk_set_account_status(uuid[], account_status) from public, anon;
grant execute on function public.admin_bulk_set_account_status(uuid[], account_status) to authenticated;

create or replace function public.admin_bulk_set_customer_verification(
  p_account_ids uuid[],
  p_status text
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  updated_count integer := 0;
  affected uuid[];
  target_id uuid;
  normalized_status text := lower(btrim(coalesce(p_status, '')));
begin
  if not public.is_admin(true) then
    raise exception using errcode = '42501', message = 'AAL2_ADMIN_REQUIRED';
  end if;

  if normalized_status not in ('verified', 'unverified') then
    raise exception using errcode = '22023', message = 'INVALID_VERIFICATION_STATUS';
  end if;

  if p_account_ids is null or array_length(p_account_ids, 1) is null then
    raise exception using errcode = '22004', message = 'INVALID_ACCOUNT_IDS';
  end if;

  with target as (
    select profile.account_id
    from public.user_profiles profile
    join public.accounts account on account.id = profile.account_id
    where account.id = any(p_account_ids)
      and account.role = 'USER'
      and account.deleted_at is null
      and profile.verification_status is distinct from normalized_status
  ), updated as (
    update public.user_profiles profile
    set verification_status = normalized_status,
        updated_at = now()
    from target
    where profile.account_id = target.account_id
    returning profile.account_id
  )
  select array_agg(account_id) into affected from updated;

  if affected is not null then
    foreach target_id in array affected
    loop
      insert into public.audit_logs(actor_id, action, entity_type, entity_id, metadata)
      values (
        auth.uid(),
        'CUSTOMER_VERIFICATION_STATUS_UPDATED',
        'account',
        target_id::text,
        jsonb_build_object('verification_status', normalized_status)
      );
      updated_count := updated_count + 1;
    end loop;
  end if;

  return updated_count;
end
$$;

revoke all on function public.admin_bulk_set_customer_verification(uuid[], text) from public, anon;
grant execute on function public.admin_bulk_set_customer_verification(uuid[], text) to authenticated;
