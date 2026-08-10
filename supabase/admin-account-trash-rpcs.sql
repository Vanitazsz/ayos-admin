-- Admin account trash RPCs for Users & Workers.
-- "Move to trash" soft-deletes an account: it suspends the account and creates a
-- trash_entries row so admins can restore or permanently delete from the Trash
-- page (/admin/trash). Accounts keep deleted_at NULL so they stay visible in the
-- admin lists (grayed out) and can be restored or hard-deleted later.
--
-- Run in the Supabase SQL editor.
--
-- NOTE: named admin_move_account_to_trash (not admin_soft_delete_account) to
-- avoid clashing with the main app's existing admin_soft_delete_account(uuid),
-- which returns public.trash_entries and sets deleted_at = now() (hiding the
-- account from the admin lists). This admin variant returns void and keeps
-- deleted_at NULL so trashed accounts stay visible and grayed in the lists.
--
-- admin_move_account_to_trash(p_account_id)                   -> suspends + inserts trash_entries
-- admin_restore_account_from_trash(p_trash_id)                 -> reactivates + marks restored_at
-- admin_hard_delete_account_from_trash(p_trash_id, email)      -> purges account + removes trash entry

create or replace function public.admin_move_account_to_trash(p_account_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text;
  v_name text;
  v_entity text;
begin
  if not public.is_admin(true) then
    raise exception using errcode = '42501', message = 'AAL2_ADMIN_REQUIRED';
  end if;

  select role into v_role from public.accounts where id = p_account_id;
  if v_role is null then
    raise exception using errcode = 'P0002', message = 'ACCOUNT_NOT_FOUND';
  end if;

  -- Idempotent: if there's already an active trash entry, just ensure it's suspended.
  if exists (
    select 1 from public.trash_entries
    where entity_id = p_account_id::text
      and restored_at is null
  ) then
    update public.accounts set status = 'SUSPENDED' where id = p_account_id;
    return;
  end if;

  select display_name into v_name from public.user_profiles where account_id = p_account_id;
  if v_name is null then
    select display_name into v_name from public.worker_profiles where account_id = p_account_id;
  end if;

  v_entity := case
    when v_role = 'USER' then 'user'
    when v_role = 'WORKER' then 'worker'
    else 'account'
  end;

  update public.accounts set status = 'SUSPENDED' where id = p_account_id;
  insert into public.trash_entries(entity_type, entity_id, snapshot, deleted_by)
  values (
    v_entity,
    p_account_id::text,
    jsonb_build_object(v_entity, jsonb_build_object('name', v_name)),
    auth.uid()
  );

  insert into public.audit_logs(actor_id, action, entity_type, entity_id)
  values (auth.uid(), 'ACCOUNT_TRASHED', v_entity, p_account_id::text);
end $$;

create or replace function public.admin_restore_account_from_trash(p_trash_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_account_id uuid;
  v_entity text;
begin
  if not public.is_admin(true) then
    raise exception using errcode = '42501', message = 'AAL2_ADMIN_REQUIRED';
  end if;

  select entity_id::uuid, entity_type into v_account_id, v_entity
  from public.trash_entries
  where id = p_trash_id
    and restored_at is null;
  if v_account_id is null then
    raise exception using errcode = 'P0002', message = 'TRASH_ENTRY_NOT_FOUND';
  end if;

  update public.accounts set status = 'ACTIVE' where id = v_account_id;
  update public.trash_entries set restored_at = now() where id = p_trash_id;

  insert into public.audit_logs(actor_id, action, entity_type, entity_id)
  values (auth.uid(), 'ACCOUNT_RESTORED', v_entity, v_account_id::text);
end $$;

-- Permanently delete a trashed user/worker account. Requires typing the
-- account's email (same contract as the old delete-account modal) and reuses
-- the existing admin_delete_account purge RPC, then cleans up the trash entry.
create or replace function public.admin_hard_delete_account_from_trash(
  p_trash_id uuid,
  p_confirmation_email text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_account_id uuid;
  v_entity text;
  v_email text;
begin
  if not public.is_admin(true) then
    raise exception using errcode = '42501', message = 'AAL2_ADMIN_REQUIRED';
  end if;

  select entity_id::uuid, entity_type into v_account_id, v_entity
  from public.trash_entries
  where id = p_trash_id
    and restored_at is null;
  if v_account_id is null then
    raise exception using errcode = 'P0002', message = 'TRASH_ENTRY_NOT_FOUND';
  end if;
  if v_entity not in ('user', 'worker') then
    raise exception using errcode = '22023', message = 'NOT_ACCOUNT_TRASH_ENTRY';
  end if;

  select email into v_email from public.accounts where id = v_account_id;
  if v_email is null then
    raise exception using errcode = 'P0002', message = 'ACCOUNT_NOT_FOUND';
  end if;

  if lower(trim(p_confirmation_email)) is distinct from lower(trim(v_email)) then
    raise exception using errcode = '22023', message = 'EMAIL_CONFIRMATION_MISMATCH';
  end if;

  perform public.admin_delete_account(v_account_id, v_email);

  delete from public.trash_entries where id = p_trash_id;

  insert into public.audit_logs(actor_id, action, entity_type, entity_id)
  values (auth.uid(), 'ACCOUNT_HARD_DELETED_FROM_TRASH', v_entity, v_account_id::text);
end $$;

revoke all on function public.admin_move_account_to_trash(uuid) from public, anon;
grant execute on function public.admin_move_account_to_trash(uuid) to authenticated;
revoke all on function public.admin_restore_account_from_trash(uuid) from public, anon;
grant execute on function public.admin_restore_account_from_trash(uuid) to authenticated;
revoke all on function public.admin_hard_delete_account_from_trash(uuid, text) from public, anon;
grant execute on function public.admin_hard_delete_account_from_trash(uuid, text) to authenticated;

-- Force PostgREST to reload its schema cache so the new RPCs are visible
-- immediately instead of returning 404 for a few seconds.
notify pgrst, 'reload schema';
