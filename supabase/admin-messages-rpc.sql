-- Admin Messages / Conversation moderation.
-- Run in the Supabase SQL editor AFTER admin-rbac-permissions.sql (defines
-- is_admin()/iam_admin()) and admin-team-rbac.sql (defines admin_roles).
-- Idempotent / re-runnable.
--
-- Design:
--   * Users archive conversations themselves via conversations.archived_at /
--     conversations.archived_by (permanent user-facing archive, kept intact).
--   * Admin moderation is conversation-level and recorded on the SAME row using
--     two NEW columns: disabled_at (timestamptz) and disabled_by (uuid -> accounts).
--     A disabled conversation is hidden from both participants on the consumer
--     side; the admin can re-enable it, which just clears those columns.
--   * All admin reads/writes go through SECURITY DEFINER RPCs guarded by is_admin().

-- 1) Moderation + trash columns on conversations
alter table public.conversations add column if not exists disabled_at timestamptz;
alter table public.conversations add column if not exists disabled_by uuid references public.accounts(id) on delete set null;
alter table public.conversations add column if not exists deleted_at timestamptz;
alter table public.conversations add column if not exists deleted_by uuid references public.accounts(id) on delete set null;

-- 2) RPC: list conversations (admin dashboard). Denormalizes the two parties,
--    message count and last message preview, newest activity first.
--    Optional p_search filters by party name/email, conversation id, or any
--    message body in the thread (literal, case-insensitive substring).
drop function if exists public.admin_list_conversations(text);
create or replace function public.admin_list_conversations(p_search text default null)
returns table (
  id uuid,
  booking_id uuid,
  service_request_id uuid,
  customer_id uuid,
  customer_name text,
  customer_email text,
  worker_id uuid,
  worker_name text,
  worker_email text,
  message_count bigint,
  last_message_body text,
  last_message_sender_id uuid,
  last_message_at timestamptz,
  created_at timestamptz,
  updated_at timestamptz,
  archived_at timestamptz,
  disabled_at timestamptz,
  disabled_by uuid,
  deleted_at timestamptz,
  booking_status text
)
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin(false) then
    raise exception using errcode = '42501', message = 'ADMIN_REQUIRED';
  end if;
  return query
    select c.id,
           c.booking_id,
           c.service_request_id,
           cust.id,
           custp.display_name,
           cust.email,
           worker.id,
           workerp.display_name,
           worker.email,
           msgs.message_count,
           msgs.last_body,
           msgs.last_sender_id,
           msgs.last_at,
           c.created_at,
           c.updated_at,
           c.archived_at,
           c.disabled_at,
           c.disabled_by,
           c.deleted_at,
           booking.status::text as booking_status
    from public.conversations c
    left join public.bookings booking on booking.id = c.booking_id
    left join lateral (
      select cp.account_id
      from public.conversation_participants cp
      join public.accounts ca on ca.id = cp.account_id
      where cp.conversation_id = c.id
        and ca.role = 'USER'
        and ca.deleted_at is null
      limit 1
    ) cu on true
    left join public.accounts cust on cust.id = cu.account_id
    left join public.user_profiles custp on custp.account_id = cust.id
    left join lateral (
      select cp.account_id
      from public.conversation_participants cp
      join public.accounts ca on ca.id = cp.account_id
      where cp.conversation_id = c.id
        and ca.role = 'WORKER'
        and ca.deleted_at is null
      limit 1
    ) cw on true
    left join public.accounts worker on worker.id = coalesce(cw.account_id, c.worker_account_id)
    left join public.worker_profiles workerp on workerp.account_id = worker.id
    left join lateral (
      select count(*)::bigint as message_count,
             (array_agg(m.body order by m.created_at desc))[1] as last_body,
             (array_agg(m.sender_id order by m.created_at desc))[1] as last_sender_id,
             max(m.created_at) as last_at
      from public.messages m
      where m.conversation_id = c.id
    ) msgs on true
    where c.deleted_at is null
      and (p_search is null or
           strpos(lower(cust.email), lower(p_search)) > 0
           or strpos(lower(custp.display_name), lower(p_search)) > 0
           or strpos(lower(worker.email), lower(p_search)) > 0
           or strpos(lower(workerp.display_name), lower(p_search)) > 0
           or strpos(lower(c.id::text), lower(p_search)) > 0
           or exists (
             select 1
             from public.messages sm
             where sm.conversation_id = c.id
               and strpos(lower(sm.body), lower(p_search)) > 0
           ))
    order by coalesce(msgs.last_at, c.updated_at, c.created_at) desc;
end $$;

-- 3) RPC: full message thread for one conversation (oldest first)
create or replace function public.admin_get_conversation_messages(p_conversation_id uuid)
returns table (
  id uuid,
  conversation_id uuid,
  sender_id uuid,
  sender_name text,
  sender_role text,
  body text,
  created_at timestamptz,
  attachment_count bigint
)
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin(false) then
    raise exception using errcode = '42501', message = 'ADMIN_REQUIRED';
  end if;
  if not exists (select 1 from public.conversations c where c.id = p_conversation_id) then
    raise exception using errcode = 'P0002', message = 'CONVERSATION_NOT_FOUND';
  end if;
  return query
    select m.id,
           m.conversation_id,
           m.sender_id,
           coalesce(up.display_name, wp.display_name, a.email, 'Unknown'),
           a.role::text,
           m.body,
           m.created_at,
           (select count(*)::bigint
            from public.message_attachments ma
            where ma.message_id = m.id) as attachment_count
    from public.messages m
    join public.accounts a on a.id = m.sender_id
    left join public.user_profiles up on up.account_id = a.id
    left join public.worker_profiles wp on wp.account_id = a.id
    where m.conversation_id = p_conversation_id
    order by m.created_at asc;
end $$;

-- 4) RPC: enable / disable a conversation (moderation)
create or replace function public.admin_toggle_conversation_moderation(p_conversation_id uuid, p_disabled boolean)
returns boolean
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin(true) then
    raise exception using errcode = '42501', message = 'AAL2_ADMIN_REQUIRED';
  end if;
  update public.conversations
     set disabled_at = case when p_disabled then now() else null end,
         disabled_by = case when p_disabled then auth.uid() else null end,
         updated_at = now()
   where id = p_conversation_id;
  if not found then
    raise exception using errcode = 'P0002', message = 'CONVERSATION_NOT_FOUND';
  end if;
  return coalesce(p_disabled, false);
end $$;

-- 6) RPC: move a conversation to trash. Guards against conversations tied to an
--    active booking (must be COMPLETED or CANCELLED first), mirroring the
--    consumer-side chat_can_send rule. Adds a trash_entries row and soft-deletes
--    the conversation (deleted_at) so it disappears from admin_list_conversations
--    and from both participants on the consumer side.
create or replace function public.admin_move_conversation_to_trash(p_conversation_id uuid)
returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_conversation public.conversations%rowtype;
  v_booking_status text;
  v_customer_name text;
  v_worker_name text;
begin
  if not public.is_admin(true) then
    raise exception using errcode = '42501', message = 'AAL2_ADMIN_REQUIRED';
  end if;

  select c.* into v_conversation
  from public.conversations c
  where c.id = p_conversation_id;

  if v_conversation.id is null then
    raise exception using errcode = 'P0002', message = 'CONVERSATION_NOT_FOUND';
  end if;

  if v_conversation.deleted_at is not null then
    raise exception using errcode = '45001', message = 'CONVERSATION_ALREADY_IN_TRASH';
  end if;

  if v_conversation.booking_id is not null then
    select b.status::text into v_booking_status
    from public.bookings b
    where b.id = v_conversation.booking_id;

    if v_booking_status is not null
       and v_booking_status not in ('COMPLETED', 'CANCELLED') then
      raise exception using errcode = '45001',
        message = 'BOOKING_ACTIVE_CANNOT_TRASH';
    end if;
  end if;

  select
    coalesce((select up.display_name
              from public.conversation_participants cp
              join public.accounts a on a.id = cp.account_id
              left join public.user_profiles up on up.account_id = a.id
              where cp.conversation_id = v_conversation.id and a.role = 'USER'
              limit 1), 'Customer'),
    coalesce((select wp.display_name
              from public.conversation_participants cp
              join public.accounts a on a.id = cp.account_id
              left join public.worker_profiles wp on wp.account_id = a.id
              where cp.conversation_id = v_conversation.id and a.role = 'WORKER'
              limit 1), 'Worker')
  into v_customer_name, v_worker_name;

  insert into public.trash_entries(entity_type, entity_id, snapshot, deleted_by)
  values (
    'conversation',
    v_conversation.id::text,
    jsonb_build_object(
      'conversation', jsonb_build_object(
        'name', v_customer_name || ' ↔ ' || v_worker_name,
        'customer', v_customer_name,
        'worker', v_worker_name
      )
    ),
    auth.uid()
  );

  update public.conversations
     set deleted_at = now(),
         deleted_by = auth.uid(),
         updated_at = now()
   where id = v_conversation.id;

  insert into public.audit_logs(actor_id, action, entity_type, entity_id, metadata)
  values (
    auth.uid(),
    'CONVERSATION_TRASHED_BY_ADMIN',
    'conversation',
    v_conversation.id::text,
    jsonb_build_object(
      'booking_id', v_conversation.booking_id,
      'service_request_id', v_conversation.service_request_id,
      'customer', v_customer_name,
      'worker', v_worker_name
    )
  );

  return jsonb_build_object(
    'success', true,
    'conversation_id', v_conversation.id
  );
end $$;

-- 7) RPC: restore a conversation from trash. Clears deleted_at/deleted_by and
--    marks the trash entry restored.
create or replace function public.admin_restore_conversation_from_trash(p_trash_id uuid)
returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_conversation_id uuid;
begin
  if not public.is_admin(true) then
    raise exception using errcode = '42501', message = 'AAL2_ADMIN_REQUIRED';
  end if;

  select entity_id::uuid into v_conversation_id
  from public.trash_entries
  where id = p_trash_id
    and entity_type = 'conversation'
    and restored_at is null;

  if v_conversation_id is null then
    raise exception using errcode = 'P0002', message = 'TRASH_ENTRY_NOT_FOUND';
  end if;

  update public.conversations
     set deleted_at = null,
         deleted_by = null,
         updated_at = now()
   where id = v_conversation_id;

  update public.trash_entries
     set restored_at = now()
   where id = p_trash_id;

  insert into public.audit_logs(actor_id, action, entity_type, entity_id)
  values (auth.uid(), 'CONVERSATION_RESTORED_FROM_TRASH', 'conversation', v_conversation_id::text);
end $$;

-- 8) RPC: permanently delete a conversation from trash. Requires the admin to
--    type 'DELETE <conversation_id>' to confirm. Children (participants,
--    messages, attachments, translations) go via FK cascade.
create or replace function public.admin_hard_delete_conversation_from_trash(
  p_trash_id uuid,
  p_confirmation text
)
returns void
language plpgsql security definer set search_path = '' as $$
declare
  entry public.trash_entries;
  v_conversation_id uuid;
begin
  if not public.is_admin(true) then
    raise exception using errcode = '42501', message = 'AAL2_ADMIN_REQUIRED';
  end if;

  select item.* into entry
  from public.trash_entries item
  where item.id = p_trash_id and item.restored_at is null
  for update;

  if entry.id is null or entry.entity_type <> 'conversation' then
    raise exception using errcode = 'P0002', message = 'TRASH_ENTRY_NOT_FOUND';
  end if;

  if trim(coalesce(p_confirmation, '')) <> 'DELETE ' || entry.entity_id then
    raise exception using errcode = '22023', message = 'DELETE_CONFIRMATION_MISMATCH';
  end if;

  select id into v_conversation_id
  from public.conversations
  where id = entry.entity_id::uuid;

  if v_conversation_id is not null then
    delete from public.conversations where id = v_conversation_id;
  end if;

  delete from public.trash_entries where id = entry.id;

  insert into public.audit_logs(actor_id, action, entity_type, entity_id)
  values (auth.uid(), 'CONVERSATION_HARD_DELETED_FROM_TRASH', 'conversation', entry.entity_id);
end $$;

-- 9) grants
revoke all on function public.admin_list_conversations(text) from public, anon;
grant execute on function public.admin_list_conversations(text) to authenticated;

revoke all on function public.admin_get_conversation_messages(uuid) from public, anon;
grant execute on function public.admin_get_conversation_messages(uuid) to authenticated;

revoke all on function public.admin_toggle_conversation_moderation(uuid, boolean) from public, anon;
grant execute on function public.admin_toggle_conversation_moderation(uuid, boolean) to authenticated;

revoke all on function public.admin_move_conversation_to_trash(uuid) from public, anon;
grant execute on function public.admin_move_conversation_to_trash(uuid) to authenticated;

revoke all on function public.admin_restore_conversation_from_trash(uuid) from public, anon;
grant execute on function public.admin_restore_conversation_from_trash(uuid) to authenticated;

revoke all on function public.admin_hard_delete_conversation_from_trash(uuid, text) from public, anon;
grant execute on function public.admin_hard_delete_conversation_from_trash(uuid, text) to authenticated;

-- Force PostgREST to reload its schema cache so the freshly created RPCs are
-- visible immediately instead of returning 404 for a few seconds.
notify pgrst, 'reload schema';
