-- Admin hard-delete RPCs for Industries & Skills.
-- Hard delete permanently removes the row and its entire reference tree
-- (service requests, bookings, payments, receipts, wallet transactions,
-- worker assignments, etc.). Irreversible.
--
-- Run in the Supabase SQL editor.
--
-- admin_hard_delete_skill(p_id)              -> jsonb { name, bookings, service_requests, worker_skills }
-- admin_hard_delete_industry(p_id, skills)   -> jsonb { name, skills, bookings, service_requests, worker_skills }
--   skills must include EVERY skill of the industry, or the call is refused.

-- Internal: disable/enable user-defined (protection) triggers on the affected
-- tables so triggers like prevent_wallet_transaction_mutation cannot block a
-- hard delete. RI/constraint triggers stay active; the delete order respects
-- foreign keys. Runs in the caller's transaction, so any error rolls the
-- trigger state back with it. Not exposed to any role.
create or replace function public._admin_hard_delete_triggers(p_disable boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  t text;
begin
  for t in select unnest(array[
    'cash_confirmations', 'receipts', 'refunds',
    'account_reports', 'booking_disputes', 'booking_proof_media', 'booking_status_events',
    'cancellations', 'location_updates', 'route_snapshots', 'support_tickets',
    'wallet_transactions', 'worker_feedback', 'payments', 'conversations',
    'ai_analysis_jobs', 'live_dispatch_sessions', 'match_candidates', 'request_bids',
    'request_media', 'service_request_dispatches', 'bookings', 'service_requests',
    'worker_offerings', 'service_templates', 'services', 'worker_skills',
    'service_categories', 'industries'
  ]) loop
    execute format('alter table public.%I %s trigger user', t, case when p_disable then 'disable' else 'enable' end);
  end loop;
end $$;

revoke all on function public._admin_hard_delete_triggers(boolean) from public, anon, authenticated;

-- Hard-delete a skill (service category) and its entire reference tree.
create or replace function public.admin_hard_delete_skill(p_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text;
  v_req_ids uuid[];
  v_booking_ids uuid[];
  v_payment_ids uuid[];
  v_bookings bigint;
  v_requests bigint;
  v_worker_skills bigint;
begin
  if not public.is_admin(true) then
    raise exception using errcode = '42501', message = 'AAL2_ADMIN_REQUIRED';
  end if;

  select name into v_name from service_categories where id = p_id;
  if v_name is null then
    raise exception using errcode = 'P0002', message = 'SKILL_NOT_FOUND';
  end if;

  select coalesce(array_agg(id), '{}') into v_req_ids
    from service_requests where category_id = p_id;
  select coalesce(array_agg(b.id), '{}') into v_booking_ids
    from bookings b where b.service_request_id = any(v_req_ids);
  select coalesce(array_agg(p.id), '{}') into v_payment_ids
    from payments p where p.booking_id = any(v_booking_ids);

  select count(*) into v_bookings from bookings b where b.service_request_id = any(v_req_ids);
  select count(*) into v_requests from service_requests where category_id = p_id;
  select count(*) into v_worker_skills from worker_skills where category_id = p_id;

  perform public._admin_hard_delete_triggers(true);

  -- leaves under payments
  delete from cash_confirmations where payment_id = any(v_payment_ids);
  delete from receipts where payment_id = any(v_payment_ids);
  delete from refunds where payment_id = any(v_payment_ids);
  -- leaves under bookings
  delete from account_reports where booking_id = any(v_booking_ids);
  delete from booking_disputes where booking_id = any(v_booking_ids);
  delete from booking_proof_media where booking_id = any(v_booking_ids);
  delete from booking_status_events where booking_id = any(v_booking_ids);
  delete from cancellations where booking_id = any(v_booking_ids);
  delete from location_updates where booking_id = any(v_booking_ids);
  delete from route_snapshots where booking_id = any(v_booking_ids);
  delete from support_tickets where booking_id = any(v_booking_ids);
  delete from wallet_transactions where booking_id = any(v_booking_ids);
  delete from worker_feedback where booking_id = any(v_booking_ids);
  delete from payments where booking_id = any(v_booking_ids);
  delete from conversations
    where booking_id = any(v_booking_ids) or service_request_id = any(v_req_ids);
  -- children of service_requests
  delete from ai_analysis_jobs where service_request_id = any(v_req_ids);
  delete from live_dispatch_sessions where service_request_id = any(v_req_ids);
  delete from match_candidates where service_request_id = any(v_req_ids);
  delete from request_bids where service_request_id = any(v_req_ids);
  delete from request_media where service_request_id = any(v_req_ids);
  delete from service_request_dispatches where service_request_id = any(v_req_ids);
  delete from bookings where service_request_id = any(v_req_ids);
  delete from service_requests where category_id = p_id;
  -- direct category references
  delete from worker_offerings
    where service_id in (select id from services where category_id = p_id);
  delete from service_templates where category_id = p_id;
  delete from services where category_id = p_id;
  delete from worker_skills where category_id = p_id;

  delete from service_categories where id = p_id;

  perform public._admin_hard_delete_triggers(false);

  insert into public.audit_logs(actor_id, action, entity_type, entity_id)
  values (auth.uid(), 'SKILL_HARD_DELETED', 'skill', p_id::text);

  return jsonb_build_object(
    'name', v_name,
    'bookings', v_bookings,
    'service_requests', v_requests,
    'worker_skills', v_worker_skills
  );
end $$;

-- Hard-delete an industry and every skill selected for removal.
-- p_skill_ids must include ALL of the industry's skills, or the call is refused.
create or replace function public.admin_hard_delete_industry(p_id uuid, p_skill_ids uuid[])
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text;
  v_skill_ids uuid[];
  v_missing int;
  v_skill_id uuid;
  v_bookings bigint;
  v_requests bigint;
  v_worker_skills bigint;
begin
  if not public.is_admin(true) then
    raise exception using errcode = '42501', message = 'AAL2_ADMIN_REQUIRED';
  end if;

  select name into v_name from industries where id = p_id;
  if v_name is null then
    raise exception using errcode = 'P0002', message = 'INDUSTRY_NOT_FOUND';
  end if;

  select coalesce(array_agg(id order by name), '{}') into v_skill_ids
    from service_categories where industry_id = p_id;

  v_missing := 0;
  if cardinality(v_skill_ids) > 0 then
    for v_skill_id in select unnest(v_skill_ids) loop
      if not (v_skill_id = any(coalesce(p_skill_ids, '{}'))) then
        v_missing := v_missing + 1;
      end if;
    end loop;
  end if;
  if v_missing > 0 then
    raise exception using errcode = '22023',
      message = 'INVALID_INDUSTRY_SKILLS',
      detail = format('%s of %s skills not selected for deletion', v_missing, cardinality(v_skill_ids));
  end if;

  select count(*) into v_bookings
    from bookings b join service_requests r on r.id = b.service_request_id
    where r.category_id = any(coalesce(p_skill_ids, '{}'));
  select count(*) into v_requests
    from service_requests where category_id = any(coalesce(p_skill_ids, '{}'));
  select count(*) into v_worker_skills
    from worker_skills where category_id = any(coalesce(p_skill_ids, '{}'));

  if cardinality(coalesce(p_skill_ids, '{}')) > 0 then
    for v_skill_id in select unnest(p_skill_ids) loop
      perform public.admin_hard_delete_skill(v_skill_id);
    end loop;
  end if;

  perform public._admin_hard_delete_triggers(true);
  delete from industries where id = p_id;
  perform public._admin_hard_delete_triggers(false);

  insert into public.audit_logs(actor_id, action, entity_type, entity_id)
  values (auth.uid(), 'INDUSTRY_HARD_DELETED', 'industry', p_id::text);

  return jsonb_build_object(
    'name', v_name,
    'skills', coalesce(cardinality(p_skill_ids), 0),
    'bookings', v_bookings,
    'service_requests', v_requests,
    'worker_skills', v_worker_skills
  );
end $$;

revoke all on function public.admin_hard_delete_skill(uuid) from public, anon;
grant execute on function public.admin_hard_delete_skill(uuid) to authenticated;
revoke all on function public.admin_hard_delete_industry(uuid, uuid[]) from public, anon;
grant execute on function public.admin_hard_delete_industry(uuid, uuid[]) to authenticated;

-- Force PostgREST to reload its schema cache so the new RPCs are visible
-- immediately instead of returning 404 for a few seconds.
notify pgrst, 'reload schema';
