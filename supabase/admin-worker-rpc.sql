-- Admin RPC to update a worker's profile.
-- Mirrors admin_update_user but for WORKER accounts:
-- updates accounts.mobile, worker_profiles profile fields, and the
-- worker's full skill set (worker_skills rows replaced by p_category_ids).
-- Per-skill rates (worker_skills.rate_minor) are passed in parallel to
-- p_category_ids via p_rate_minors so admin edits preserve/override them
-- instead of silently wiping them.
-- Run in the Supabase SQL editor.

create or replace function public.admin_update_worker(
  p_worker_id uuid,
  p_display_name text,
  p_mobile text,
  p_bio text,
  p_service_area text,
  p_category_ids uuid[],
  p_experience integer,
  p_rate_minors bigint[]
)
returns public.worker_profiles
language plpgsql
security definer
set search_path = ''
as $$
declare
  target public.accounts;
  result public.worker_profiles;
  normalized_name text := trim(coalesce(p_display_name, ''));
  normalized_mobile text := nullif(trim(coalesce(p_mobile, '')), '');
  normalized_bio text := nullif(trim(coalesce(p_bio, '')), '');
  normalized_area text := nullif(trim(coalesce(p_service_area, '')), '');
  category_ids uuid[] := coalesce(p_category_ids, '{}');
  rate_minors bigint[] := coalesce(p_rate_minors, '{}');
  invalid_categories integer;
begin
  if not public.is_admin(true) then
    raise exception using errcode = '42501', message = 'AAL2_ADMIN_REQUIRED';
  end if;

  if length(normalized_name) not between 2 and 120 then
    raise exception using errcode = '22023', message = 'INVALID_WORKER_NAME';
  end if;

  if normalized_mobile is not null
    and normalized_mobile !~ '^\+[1-9][0-9]{7,14}$' then
    raise exception using errcode = '22023', message = 'INVALID_WORKER_PHONE';
  end if;

  if array_length(category_ids, 1) is null then
    raise exception using errcode = '22023', message = 'INVALID_WORKER_CATEGORY';
  end if;

  select count(*) into invalid_categories
  from unnest(category_ids) as provided(id)
  where not exists (
    select 1 from public.service_categories category
    where category.id = provided.id and category.is_active
  );

  if invalid_categories > 0 then
    raise exception using errcode = '22023', message = 'INVALID_WORKER_CATEGORY';
  end if;

  if array_length(rate_minors, 1) is not null
    and array_length(rate_minors, 1) <> array_length(category_ids, 1) then
    raise exception using errcode = '22023', message = 'INVALID_WORKER_RATES';
  end if;

  if p_experience is not null and (p_experience < 0 or p_experience > 100) then
    raise exception using errcode = '22023', message = 'INVALID_WORKER_EXPERIENCE';
  end if;

  select account.* into target
  from public.accounts account
  where account.id = p_worker_id and account.role = 'WORKER'
  for update;

  if target.id is null or target.deleted_at is not null then
    raise exception using errcode = 'P0002', message = 'WORKER_ACCOUNT_NOT_FOUND';
  end if;

  update public.accounts
  set mobile = normalized_mobile, updated_at = now()
  where id = target.id;

  update public.worker_profiles
  set display_name = normalized_name,
      bio = normalized_bio,
      service_area = normalized_area,
      updated_at = now()
  where account_id = target.id
  returning * into result;

  if result.account_id is null then
    raise exception using errcode = 'P0002', message = 'WORKER_PROFILE_NOT_FOUND';
  end if;

  delete from public.worker_skills where worker_id = target.id;

  insert into public.worker_skills(worker_id, category_id, years, rate_minor)
  select target.id, provided.id, coalesce(p_experience, 0), rates.rate_minor
  from unnest(category_ids) with ordinality as provided(id, ord)
  left join unnest(rate_minors) with ordinality as rates(rate_minor, ord)
    on rates.ord = provided.ord;

  insert into public.audit_logs(actor_id, action, entity_type, entity_id, metadata)
  values (
    auth.uid(),
    'WORKER_UPDATED',
    'account',
    target.id::text,
    jsonb_build_object(
      'fields',
      jsonb_build_array('display_name', 'mobile', 'bio', 'service_area', 'category', 'experience', 'rates')
    )
  );

  return result;
end
$$;

revoke all on function public.admin_update_worker(uuid, text, text, text, text, uuid[], integer, bigint[]) from public, anon;
grant execute on function public.admin_update_worker(uuid, text, text, text, text, uuid[], integer, bigint[]) to authenticated;
