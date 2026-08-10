-- Admin RPC to directly set a customer's verification_status.
-- Complements admin_review_customer_verification (document-based flow) with a
-- manual override for the More Details drawer on the Users page.
-- Run in the Supabase SQL editor.

create or replace function public.admin_set_customer_verification(
  p_account_id uuid,
  p_status text
)
returns public.user_profiles
language plpgsql
security definer
set search_path = ''
as $$
declare
  target public.accounts;
  result public.user_profiles;
  normalized_status text := lower(btrim(coalesce(p_status, '')));
begin
  if not public.is_admin(true) then
    raise exception using errcode = '42501', message = 'AAL2_ADMIN_REQUIRED';
  end if;

  if normalized_status not in ('verified', 'unverified') then
    raise exception using errcode = '22023', message = 'INVALID_VERIFICATION_STATUS';
  end if;

  select account.* into target
  from public.accounts account
  where account.id = p_account_id and account.role = 'USER'
  for update;

  if target.id is null or target.deleted_at is not null then
    raise exception using errcode = 'P0002', message = 'USER_ACCOUNT_NOT_FOUND';
  end if;

  update public.user_profiles
  set verification_status = normalized_status,
      updated_at = now()
  where account_id = target.id
  returning * into result;

  if result.account_id is null then
    raise exception using errcode = 'P0002', message = 'USER_PROFILE_NOT_FOUND';
  end if;

  insert into public.audit_logs(actor_id, action, entity_type, entity_id, metadata)
  values (
    auth.uid(),
    'CUSTOMER_VERIFICATION_STATUS_UPDATED',
    'account',
    target.id::text,
    jsonb_build_object('verification_status', normalized_status)
  );

  return result;
end
$$;

revoke all on function public.admin_set_customer_verification(uuid, text) from public, anon;
grant execute on function public.admin_set_customer_verification(uuid, text) to authenticated;
