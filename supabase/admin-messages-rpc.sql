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

-- 1) Moderation columns on conversations
alter table public.conversations add column if not exists disabled_at timestamptz;
alter table public.conversations add column if not exists disabled_by uuid references public.accounts(id) on delete set null;

-- 2) RPC: list conversations (admin dashboard). Denormalizes the two parties,
--    message count and last message preview, newest activity first.
--    Optional p_search filters by party name/email, conversation id, or any
--    message body in the thread (literal, case-insensitive substring).
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
  disabled_by uuid
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
           c.disabled_by
    from public.conversations c
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
    where (p_search is null or
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

-- 5) RPC: permanently delete a conversation and everything under it (cascade)
create or replace function public.admin_delete_conversation(p_conversation_id uuid)
returns boolean
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin(true) then
    raise exception using errcode = '42501', message = 'AAL2_ADMIN_REQUIRED';
  end if;
  delete from public.conversations where id = p_conversation_id;
  if not found then
    raise exception using errcode = 'P0002', message = 'CONVERSATION_NOT_FOUND';
  end if;
  return true;
end $$;

-- 6) grants
revoke all on function public.admin_list_conversations(text) from public, anon;
grant execute on function public.admin_list_conversations(text) to authenticated;

revoke all on function public.admin_get_conversation_messages(uuid) from public, anon;
grant execute on function public.admin_get_conversation_messages(uuid) to authenticated;

revoke all on function public.admin_toggle_conversation_moderation(uuid, boolean) from public, anon;
grant execute on function public.admin_toggle_conversation_moderation(uuid, boolean) to authenticated;

revoke all on function public.admin_delete_conversation(uuid) from public, anon;
grant execute on function public.admin_delete_conversation(uuid) to authenticated;

-- Force PostgREST to reload its schema cache so the freshly created RPCs are
-- visible immediately instead of returning 404 for a few seconds.
notify pgrst, 'reload schema';
