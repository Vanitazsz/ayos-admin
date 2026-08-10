-- Admin "Move to Trash" RPCs for Industries & Skills.
-- Soft-deletes an industry and/or skill by disabling it and recording a
-- trash_entries row, so admins can restore or permanently delete from the
-- Trash page. Hard delete is only reachable from the Trash page.
--
-- Run in the Supabase SQL editor.
--
-- admin_move_skill_to_trash(p_skill_id)          -> void
-- admin_move_industry_to_trash(p_industry_id)    -> jsonb { name, skills }
--   Moves the industry AND every one of its skills to trash.
-- admin_restore_skill_from_trash(p_trash_id)     -> void
-- admin_restore_industry_from_trash(p_trash_id)  -> void
--   Restoring an industry also restores its trashed skills.
-- admin_hard_delete_skill_from_trash(p_trash_id) -> jsonb
-- admin_hard_delete_industry_from_trash(p_trash_id, p_delete_skills default true) -> jsonb
--   p_delete_skills = false refuses if the industry still has skills.
--   Reads the trash entry, runs the existing hard-delete RPCs, and cleans up
--   the trash entry (industry also cleans its skills' entries).

create or replace function public.admin_move_skill_to_trash(p_skill_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  target public.service_categories;
begin
  if not public.is_admin(true) then
    raise exception using errcode = '42501', message = 'AAL2_ADMIN_REQUIRED';
  end if;

  select skill.* into target
  from public.service_categories skill
  where skill.id = p_skill_id
  for update;

  if target.id is null then
    raise exception using errcode = 'P0002', message = 'SKILL_NOT_FOUND';
  end if;

  if exists (
    select 1 from public.trash_entries entry
    where entry.entity_type = 'skill' and entry.entity_id = p_skill_id::text
      and entry.restored_at is null
  ) then
    raise exception using errcode = '22023', message = 'SKILL_ALREADY_IN_TRASH';
  end if;

  update public.service_categories
  set is_active = false, updated_at = now()
  where id = target.id;

  insert into public.trash_entries(entity_type, entity_id, snapshot, deleted_by)
  values (
    'skill',
    target.id::text,
    jsonb_build_object('skill', to_jsonb(target)),
    auth.uid()
  );

  insert into public.audit_logs(actor_id, action, entity_type, entity_id)
  values (auth.uid(), 'SKILL_MOVED_TO_TRASH', 'skill', target.id::text);
end
$$;

create or replace function public.admin_move_industry_to_trash(p_industry_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  target public.industries;
  skill public.service_categories;
  v_skill_count integer := 0;
begin
  if not public.is_admin(true) then
    raise exception using errcode = '42501', message = 'AAL2_ADMIN_REQUIRED';
  end if;

  select industry.* into target
  from public.industries industry
  where industry.id = p_industry_id
  for update;

  if target.id is null then
    raise exception using errcode = 'P0002', message = 'INDUSTRY_NOT_FOUND';
  end if;

  if exists (
    select 1 from public.trash_entries entry
    where entry.entity_type = 'industry' and entry.entity_id = p_industry_id::text
      and entry.restored_at is null
  ) then
    raise exception using errcode = '22023', message = 'INDUSTRY_ALREADY_IN_TRASH';
  end if;

  update public.industries
  set is_active = false, updated_at = now()
  where id = target.id;

  for skill in
    select sc.* from public.service_categories sc
    where sc.industry_id = target.id
    for update
  loop
    if not exists (
      select 1 from public.trash_entries entry
      where entry.entity_type = 'skill' and entry.entity_id = skill.id::text
        and entry.restored_at is null
    ) then
      update public.service_categories
      set is_active = false, updated_at = now()
      where id = skill.id;
      insert into public.trash_entries(entity_type, entity_id, snapshot, deleted_by)
      values (
        'skill',
        skill.id::text,
        jsonb_build_object('skill', to_jsonb(skill)),
        auth.uid()
      );
      v_skill_count := v_skill_count + 1;
    end if;
  end loop;

  insert into public.trash_entries(entity_type, entity_id, snapshot, deleted_by)
  values (
    'industry',
    target.id::text,
    jsonb_build_object('industry', to_jsonb(target)),
    auth.uid()
  );

  insert into public.audit_logs(actor_id, action, entity_type, entity_id)
  values (auth.uid(), 'INDUSTRY_MOVED_TO_TRASH', 'industry', target.id::text);

  return jsonb_build_object('name', target.name, 'skills', v_skill_count);
end
$$;

create or replace function public.admin_restore_skill_from_trash(p_trash_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  entry public.trash_entries;
begin
  if not public.is_admin(true) then
    raise exception using errcode = '42501', message = 'AAL2_ADMIN_REQUIRED';
  end if;

  select item.* into entry
  from public.trash_entries item
  where item.id = p_trash_id and item.restored_at is null
  for update;

  if entry.id is null or entry.entity_type <> 'skill' then
    raise exception using errcode = 'P0001', message = 'RESTORE_NOT_ALLOWED';
  end if;

  update public.service_categories
  set is_active = coalesce((entry.snapshot->'skill'->>'is_active')::boolean, true),
      updated_at = now()
  where id = entry.entity_id::uuid;

  if not found then
    raise exception using errcode = 'P0001', message = 'RESTORE_NOT_ALLOWED';
  end if;

  update public.trash_entries
  set restored_at = now(), restored_by = auth.uid()
  where id = entry.id;

  insert into public.audit_logs(actor_id, action, entity_type, entity_id)
  values (auth.uid(), 'SKILL_RESTORED_FROM_TRASH', 'skill', entry.entity_id);
end
$$;

create or replace function public.admin_restore_industry_from_trash(p_trash_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  entry public.trash_entries;
  skill_entry record;
begin
  if not public.is_admin(true) then
    raise exception using errcode = '42501', message = 'AAL2_ADMIN_REQUIRED';
  end if;

  select item.* into entry
  from public.trash_entries item
  where item.id = p_trash_id and item.restored_at is null
  for update;

  if entry.id is null or entry.entity_type <> 'industry' then
    raise exception using errcode = 'P0001', message = 'RESTORE_NOT_ALLOWED';
  end if;

  update public.industries
  set is_active = coalesce((entry.snapshot->'industry'->>'is_active')::boolean, true),
      updated_at = now()
  where id = entry.entity_id::uuid;

  if not found then
    raise exception using errcode = 'P0001', message = 'RESTORE_NOT_ALLOWED';
  end if;

  for skill_entry in
    select sc.id, tr.id as trash_id
    from public.service_categories sc
    join public.trash_entries tr
      on tr.entity_type = 'skill'
     and tr.entity_id = sc.id::text
     and tr.restored_at is null
    where sc.industry_id = entry.entity_id::uuid
  loop
    update public.service_categories
    set is_active = true, updated_at = now()
    where id = skill_entry.id;
    update public.trash_entries
    set restored_at = now(), restored_by = auth.uid()
    where id = skill_entry.trash_id;
  end loop;

  update public.trash_entries
  set restored_at = now(), restored_by = auth.uid()
  where id = entry.id;

  insert into public.audit_logs(actor_id, action, entity_type, entity_id)
  values (auth.uid(), 'INDUSTRY_RESTORED_FROM_TRASH', 'industry', entry.entity_id);
end
$$;

create or replace function public.admin_hard_delete_skill_from_trash(p_trash_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  entry public.trash_entries;
  result jsonb;
begin
  if not public.is_admin(true) then
    raise exception using errcode = '42501', message = 'AAL2_ADMIN_REQUIRED';
  end if;

  select item.* into entry
  from public.trash_entries item
  where item.id = p_trash_id and item.restored_at is null
  for update;

  if entry.id is null or entry.entity_type <> 'skill' then
    raise exception using errcode = 'P0002', message = 'TRASH_ENTRY_NOT_FOUND';
  end if;

  if not exists (
    select 1 from public.service_categories sc
    where sc.id = entry.entity_id::uuid
  ) then
    -- Skill row is already gone (e.g. its parent industry was hard-deleted
    -- first, leaving an orphaned trash entry). Treat it as already deleted:
    -- remove the entry instead of raising SKILL_NOT_FOUND.
    delete from public.trash_entries where id = entry.id;
    return jsonb_build_object(
      'name', entry.snapshot->'skill'->>'name',
      'bookings', 0, 'service_requests', 0, 'worker_skills', 0,
      'already_deleted', true
    );
  end if;

  result := public.admin_hard_delete_skill(entry.entity_id::uuid);

  delete from public.trash_entries where id = entry.id;

  insert into public.audit_logs(actor_id, action, entity_type, entity_id)
  values (auth.uid(), 'SKILL_HARD_DELETED_FROM_TRASH', 'skill', entry.entity_id);

  return result;
end
$$;

create or replace function public.admin_hard_delete_industry_from_trash(
  p_trash_id uuid,
  p_delete_skills boolean default true
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  entry public.trash_entries;
  v_skill_ids uuid[];
  v_skill_count int;
  result jsonb;
begin
  if not public.is_admin(true) then
    raise exception using errcode = '42501', message = 'AAL2_ADMIN_REQUIRED';
  end if;

  select item.* into entry
  from public.trash_entries item
  where item.id = p_trash_id and item.restored_at is null
  for update;

  if entry.id is null or entry.entity_type <> 'industry' then
    raise exception using errcode = 'P0002', message = 'TRASH_ENTRY_NOT_FOUND';
  end if;

  if not exists (
    select 1 from public.industries i where i.id = entry.entity_id::uuid
  ) then
    -- Industry row is already gone; remove the orphaned trash entry.
    delete from public.trash_entries where id = entry.id;
    return jsonb_build_object(
      'name', entry.snapshot->'industry'->>'name',
      'skills', 0, 'bookings', 0, 'service_requests', 0, 'worker_skills', 0,
      'already_deleted', true
    );
  end if;

  if p_delete_skills then
    select coalesce(array_agg(id), '{}') into v_skill_ids
      from public.service_categories
      where industry_id = entry.entity_id::uuid;

    result := public.admin_hard_delete_industry(entry.entity_id::uuid, v_skill_ids);

    delete from public.trash_entries
    where entity_type in ('industry', 'skill')
      and (
        (entity_type = 'industry' and entity_id = entry.entity_id)
        or
        (entity_type = 'skill' and entity_id in (select id::text from unnest(v_skill_ids)))
      );
  else
    select count(*) into v_skill_count
    from public.service_categories
    where industry_id = entry.entity_id::uuid;

    if v_skill_count > 0 then
      raise exception using errcode = '22023', message = 'SKILLS_MUST_BE_DELETED';
    end if;

    result := public.admin_hard_delete_industry(entry.entity_id::uuid, '{}'::uuid[]);

    delete from public.trash_entries
    where entity_type = 'industry' and entity_id = entry.entity_id;
  end if;

  insert into public.audit_logs(actor_id, action, entity_type, entity_id)
  values (auth.uid(), 'INDUSTRY_HARD_DELETED_FROM_TRASH', 'industry', entry.entity_id);

  return result;
end
$$;

revoke all on function public.admin_move_skill_to_trash(uuid) from public, anon;
revoke all on function public.admin_move_industry_to_trash(uuid) from public, anon;
revoke all on function public.admin_restore_skill_from_trash(uuid) from public, anon;
revoke all on function public.admin_restore_industry_from_trash(uuid) from public, anon;
revoke all on function public.admin_hard_delete_skill_from_trash(uuid) from public, anon;
revoke all on function public.admin_hard_delete_industry_from_trash(uuid) from public, anon;

grant execute on function public.admin_move_skill_to_trash(uuid) to authenticated;
grant execute on function public.admin_move_industry_to_trash(uuid) to authenticated;
grant execute on function public.admin_restore_skill_from_trash(uuid) to authenticated;
grant execute on function public.admin_restore_industry_from_trash(uuid) to authenticated;
grant execute on function public.admin_hard_delete_skill_from_trash(uuid) to authenticated;
grant execute on function public.admin_hard_delete_industry_from_trash(uuid) to authenticated;
grant execute on function public.admin_hard_delete_industry_from_trash(uuid, boolean) to authenticated;

-- Force PostgREST to reload its schema cache so the new RPCs are visible
-- immediately instead of returning 404 for a few seconds.
notify pgrst, 'reload schema';
