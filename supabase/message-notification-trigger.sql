-- New-message notifications for conversation participants.
-- Run in the Supabase SQL editor. Idempotent / re-runnable.
--
-- When a message is inserted, write one row to `notifications` for every
-- participant in the conversation except the sender. Skipped when the
-- conversation is deleted or disabled (admin moderation / trash).

create or replace function public.notify_message_recipient()
returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_conversation public.conversations%rowtype;
  v_sender_name text;
begin
  if NEW.sender_id is null then
    return NEW;
  end if;

  select c.* into v_conversation
  from public.conversations c
  where c.id = NEW.conversation_id
    and c.deleted_at is null
    and c.disabled_at is null;

  if v_conversation.id is null then
    return NEW;
  end if;

  select coalesce(nullif(trim(up.display_name), ''), nullif(trim(wp.display_name), ''), a.email, 'New message')
  into v_sender_name
  from public.accounts a
  left join public.user_profiles up on up.account_id = a.id
  left join public.worker_profiles wp on wp.account_id = a.id
  where a.id = NEW.sender_id;

  insert into public.notifications(
    recipient_id, title, body, category, status,
    sent_at, source_key, read_at, created_at, updated_at
  )
  select cp.account_id,
         v_sender_name,
         left(coalesce(NEW.body, ''), 200),
         'message',
         'SENT',
         now(),
         'message:' || NEW.id::text,
         null,
         now(),
         now()
  from public.conversation_participants cp
  where cp.conversation_id = NEW.conversation_id
    and cp.account_id <> NEW.sender_id;

  return NEW;
end $$;

drop trigger if exists notify_message_recipient_after_insert on public.messages;
create trigger notify_message_recipient_after_insert
after insert on public.messages
for each row execute function public.notify_message_recipient();
