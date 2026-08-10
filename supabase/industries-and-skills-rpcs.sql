-- Admin RPCs for the Industries & Skills catalog.
-- Skills are stored in public.service_categories (the consumer's
-- fetchIndustriesAndSkills() model); industries live in public.industries.
-- Run in the Supabase SQL editor.

create or replace function public.admin_upsert_industry(
  p_id uuid,
  p_name text,
  p_description text,
  p_sort_order integer,
  p_is_active boolean
)
returns public.industries
language plpgsql
security definer
set search_path = ''
as $$
declare
  result public.industries;
  generated_slug text;
begin
  if not public.is_admin(true) then
    raise exception using errcode = '42501', message = 'AAL2_ADMIN_REQUIRED';
  end if;
  generated_slug := trim(both '-' from regexp_replace(lower(btrim(p_name)), '[^a-z0-9]+', '-', 'g'));
  if p_id is null then
    insert into public.industries(name, slug, description, sort_order, is_active)
    values (
      btrim(p_name),
      generated_slug,
      nullif(btrim(coalesce(p_description, '')), ''),
      coalesce(p_sort_order, 0),
      coalesce(p_is_active, true)
    )
    returning * into result;
  else
    update public.industries
    set name = btrim(p_name),
        slug = coalesce(slug, generated_slug),
        description = nullif(btrim(coalesce(p_description, '')), ''),
        sort_order = coalesce(p_sort_order, sort_order),
        is_active = coalesce(p_is_active, is_active),
        updated_at = now()
    where id = p_id
    returning * into result;
  end if;
  if result.id is null then
    raise exception using errcode = 'P0002', message = 'INDUSTRY_NOT_FOUND';
  end if;
  insert into public.audit_logs(actor_id, action, entity_type, entity_id)
  values (auth.uid(), 'INDUSTRY_UPSERTED', 'industry', result.id::text);
  return result;
end
$$;

create or replace function public.admin_upsert_skill(
  p_id uuid,
  p_name text,
  p_industry_id uuid,
  p_minimum_price_minor bigint,
  p_maximum_price_minor bigint,
  p_is_safety_critical boolean,
  p_is_active boolean
)
returns public.service_categories
language plpgsql
security definer
set search_path = ''
as $$
declare
  result public.service_categories;
  generated_slug text;
begin
  if not public.is_admin(true) then
    raise exception using errcode = '42501', message = 'AAL2_ADMIN_REQUIRED';
  end if;
  if p_industry_id is null
    or not exists (
      select 1 from public.industries industry
      where industry.id = p_industry_id
    ) then
    raise exception using errcode = '22023', message = 'INVALID_SKILL_INDUSTRY';
  end if;
  if p_minimum_price_minor is not null and p_minimum_price_minor < 0 then
    raise exception using errcode = '22023', message = 'INVALID_SKILL_PRICE';
  end if;
  if p_maximum_price_minor is not null
    and p_minimum_price_minor is not null
    and p_maximum_price_minor < p_minimum_price_minor then
    raise exception using errcode = '22023', message = 'INVALID_SKILL_PRICE';
  end if;
  generated_slug := trim(both '-' from regexp_replace(lower(btrim(p_name)), '[^a-z0-9]+', '-', 'g'));
  if p_id is null then
    insert into public.service_categories(
      name, slug, industry_id, minimum_price_minor, maximum_price_minor,
      is_safety_critical, is_active
    )
    values (
      btrim(p_name),
      generated_slug,
      p_industry_id,
      p_minimum_price_minor,
      p_maximum_price_minor,
      coalesce(p_is_safety_critical, false),
      coalesce(p_is_active, true)
    )
    returning * into result;
  else
    update public.service_categories
    set name = btrim(p_name),
        slug = coalesce(slug, generated_slug),
        industry_id = p_industry_id,
        minimum_price_minor = p_minimum_price_minor,
        maximum_price_minor = p_maximum_price_minor,
        is_safety_critical = coalesce(p_is_safety_critical, is_safety_critical),
        is_active = coalesce(p_is_active, is_active),
        updated_at = now()
    where id = p_id
    returning * into result;
  end if;
  if result.id is null then
    raise exception using errcode = 'P0002', message = 'SKILL_NOT_FOUND';
  end if;
  insert into public.audit_logs(actor_id, action, entity_type, entity_id)
  values (auth.uid(), 'SKILL_UPSERTED', 'skill', result.id::text);
  return result;
end
$$;

revoke all on function public.admin_upsert_industry(uuid, text, text, integer, boolean) from public, anon;
grant execute on function public.admin_upsert_industry(uuid, text, text, integer, boolean) to authenticated;
revoke all on function public.admin_upsert_skill(uuid, text, uuid, bigint, bigint, boolean, boolean) from public, anon;
grant execute on function public.admin_upsert_skill(uuid, text, uuid, bigint, bigint, boolean, boolean) to authenticated;
