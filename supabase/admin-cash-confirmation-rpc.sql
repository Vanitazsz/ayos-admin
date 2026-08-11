-- Admin cash payment confirmation.
-- Run in the Supabase SQL editor. Idempotent / re-runnable.
--
-- Cash (COD) payments are collected offline and can only be verified by a
-- SUPER_ADMIN manually. This adds:
--   * admin_get_my_role()               -> the caller's RBAC role code
--   * admin_confirm_cash_payment(...)   -> mark a PENDING CASH payment as SUCCESSFUL

-- 1) RPC: current admin's role code (SUPER_ADMIN / ADMIN / ...)
--    Needed because SUPER_ADMIN and ADMIN share the same permission set, so
--    permissions alone cannot distinguish a super admin.
create or replace function public.admin_get_my_role()
returns text
language sql
security definer
set search_path = ''
stable
as $$
  select ap.admin_role
  from public.accounts a
  join public.admin_profiles ap on ap.account_id = a.id
  where a.id = auth.uid()
    and a.role = 'ADMIN'
    and a.status = 'ACTIVE'
    and a.deleted_at is null;
$$;

-- 2) RPC: confirm a pending cash payment (SUPER_ADMIN only)
create or replace function public.admin_confirm_cash_payment(
  p_payment_id uuid,
  p_notes text default null
)
returns table (
  id uuid,
  status text,
  method text,
  service_amount numeric
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text;
  target_payment public.payments;
begin
  if not public.is_admin(true) then
    raise exception using errcode = '42501', message = 'AAL2_ADMIN_REQUIRED';
  end if;

  select ap.admin_role into v_role
  from public.accounts a
  join public.admin_profiles ap on ap.account_id = a.id
  where a.id = auth.uid() and a.deleted_at is null;

  if v_role <> 'SUPER_ADMIN' then
    raise exception using errcode = '42501', message = 'SUPER_ADMIN_REQUIRED';
  end if;

  if p_payment_id is null then
    raise exception using errcode = '22023', message = 'PAYMENT_ID_REQUIRED';
  end if;

  select * into target_payment
  from public.payments
  where id = p_payment_id
  for update;

  if target_payment.id is null then
    raise exception using errcode = 'P0002', message = 'PAYMENT_NOT_FOUND';
  end if;

  if upper(trim(coalesce(target_payment.method, ''))) <> 'CASH' then
    raise exception using errcode = '22023', message = 'NOT_CASH_PAYMENT';
  end if;

  if target_payment.status <> 'PENDING' then
    raise exception using errcode = '22023', message = 'PAYMENT_NOT_PENDING';
  end if;

  update public.payments
  set status = 'SUCCESSFUL'
  where id = target_payment.id;

  -- Defensive: guarantee the admin-confirmation columns exist regardless of
  -- how cash_confirmations is shaped in the live database.
  alter table public.cash_confirmations add column if not exists payment_id uuid;
  alter table public.cash_confirmations add column if not exists confirmed_by uuid;
  alter table public.cash_confirmations add column if not exists notes text;
  alter table public.cash_confirmations add column if not exists confirmed_at timestamptz not null default now();

  insert into public.cash_confirmations(payment_id, confirmed_by, notes)
  values (target_payment.id, auth.uid(), nullif(trim(coalesce(p_notes, '')), ''))
  on conflict do nothing;

  insert into public.audit_logs(actor_id, action, entity_type, entity_id, metadata)
  values (auth.uid(), 'CASH_PAYMENT_CONFIRMED', 'payment', target_payment.id::text,
          jsonb_build_object('amount', target_payment.service_amount, 'notes', p_notes));

  return query
    select p.id, p.status::text, p.method::text, p.service_amount
    from public.payments p
    where p.id = target_payment.id;
end $$;

-- 3) grants
revoke execute on function public.admin_get_my_role() from public, anon;
grant execute on function public.admin_get_my_role() to authenticated;

revoke execute on function public.admin_confirm_cash_payment(uuid, text) from public, anon;
grant execute on function public.admin_confirm_cash_payment(uuid, text) to authenticated;

-- Force PostgREST to reload its schema cache so the freshly created RPCs are
-- visible immediately instead of returning 404 for a few seconds.
notify pgrst, 'reload schema';
