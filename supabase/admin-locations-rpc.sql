-- Admin LOCATIONS entity + migration.
-- Replaces the legacy "subdivisions" concept end-to-end:
--   admin_list_subdivisions / admin_create_subdivision / admin_update_subdivision
-- Run in the Supabase SQL editor. Idempotent / re-runnable.
--
-- Design notes (mirrors the existing admin RPC conventions):
--   * The locations table is admin-only (RLS via the shared admin_full_access policy).
--   * All writes go through SECURITY DEFINER RPCs guarded by public.is_admin().
--   * Reads are also exposed through an RPC (is_admin(false)) so the admin app has a
--     single, explicit source of truth and stays consistent with worker/user pages.
--   * The table is added to the realtime publication so the admin app's
--     useRealtime('locations', ...) subscription works.
--   * worker_profiles.location_id and user_profiles.location_id are additive, nullable
--     columns so the consumer apps are unaffected; existing rows are backfilled where a
--     name match is possible.

-- 1) locations table
create table if not exists public.locations (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  center_lat double precision not null,
  center_lng double precision not null,
  radius_meters integer not null default 2000 check (radius_meters between 100 and 50000),
  boundary jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists locations_is_active_idx on public.locations(is_active);

-- 2) realtime
do $$
begin
  alter publication supabase_realtime add table public.locations;
exception when duplicate_object then null;
end $$;

-- 3) RLS
alter table public.locations enable row level security;
drop policy if exists "admin_full_access" on public.locations;
create policy "admin_full_access" on public.locations
  for all using (public.iam_admin()) with check (public.iam_admin());

-- 4) migrate legacy subdivisions data, then drop the old objects.
do $$
begin
  if exists (
    select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname = 'subdivisions' and c.relkind = 'r'
  ) then
    begin
      insert into public.locations(id, name, center_lat, center_lng, radius_meters, boundary, is_active, created_at, updated_at)
      select id, name, center_lat, center_lng, radius_meters, boundary, is_active, created_at, updated_at
      from public.subdivisions
      on conflict (id) do nothing;
    exception when undefined_column then
      insert into public.locations(id, name, center_lat, center_lng, radius_meters, is_active, created_at, updated_at)
      select id, name, center_lat, center_lng, radius_meters, is_active, created_at, updated_at
      from public.subdivisions
      on conflict (id) do nothing;
    end;
    drop table public.subdivisions;
  end if;
end $$;

-- Drop every function under the old names regardless of signature.
do $$
declare r record;
begin
  for r in
    select p.oid::regprocedure as sig
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in ('admin_list_subdivisions', 'admin_create_subdivision', 'admin_update_subdivision')
  loop
    execute 'drop function ' || r.sig;
  end loop;
end $$;

-- 5) admin RPCs
create or replace function public.admin_list_locations()
returns setof public.locations
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin(false) then
    raise exception using errcode = '42501', message = 'ADMIN_REQUIRED';
  end if;
  return query
    select l.*
    from public.locations l
    order by l.name asc;
end $$;

create or replace function public.admin_create_location(
  p_name text,
  p_lat double precision,
  p_lng double precision,
  p_radius_meters integer,
  p_boundary jsonb
)
returns public.locations
language plpgsql security definer set search_path = '' as $$
declare
  result public.locations;
  normalized_name text := trim(coalesce(p_name, ''));
begin
  if not public.is_admin(true) then
    raise exception using errcode = '42501', message = 'AAL2_ADMIN_REQUIRED';
  end if;

  if length(normalized_name) not between 2 and 120 then
    raise exception using errcode = '22023', message = 'INVALID_LOCATION_NAME';
  end if;

  if p_lat is null or p_lng is null
     or p_lat not between -90 and 90
     or p_lng not between -180 and 180 then
    raise exception using errcode = '22023', message = 'INVALID_LOCATION_CENTER';
  end if;

  if p_radius_meters is null or p_radius_meters < 100 or p_radius_meters > 50000 then
    raise exception using errcode = '22023', message = 'INVALID_LOCATION_RADIUS';
  end if;

  insert into public.locations(name, center_lat, center_lng, radius_meters, boundary)
  values (normalized_name, p_lat, p_lng, p_radius_meters, p_boundary)
  returning * into result;

  insert into public.audit_logs(actor_id, action, entity_type, entity_id, metadata)
  values (auth.uid(), 'LOCATION_CREATED', 'location', result.id::text,
          jsonb_build_object('name', result.name));

  return result;
end
$$;

create or replace function public.admin_update_location(
  p_id uuid,
  p_name text,
  p_lat double precision,
  p_lng double precision,
  p_radius_meters integer,
  p_boundary jsonb,
  p_is_active boolean
)
returns public.locations
language plpgsql security definer set search_path = '' as $$
declare
  target public.locations;
  result public.locations;
  normalized_name text := trim(coalesce(p_name, ''));
begin
  if not public.is_admin(true) then
    raise exception using errcode = '42501', message = 'AAL2_ADMIN_REQUIRED';
  end if;

  if length(normalized_name) not between 2 and 120 then
    raise exception using errcode = '22023', message = 'INVALID_LOCATION_NAME';
  end if;

  if p_lat is null or p_lng is null
     or p_lat not between -90 and 90
     or p_lng not between -180 and 180 then
    raise exception using errcode = '22023', message = 'INVALID_LOCATION_CENTER';
  end if;

  if p_radius_meters is null or p_radius_meters < 100 or p_radius_meters > 50000 then
    raise exception using errcode = '22023', message = 'INVALID_LOCATION_RADIUS';
  end if;

  select l.* into target
  from public.locations l
  where l.id = p_id
  for update;

  if target.id is null then
    raise exception using errcode = 'P0002', message = 'LOCATION_NOT_FOUND';
  end if;

  update public.locations
  set name = normalized_name,
      center_lat = p_lat,
      center_lng = p_lng,
      radius_meters = p_radius_meters,
      boundary = p_boundary,
      is_active = coalesce(p_is_active, target.is_active),
      updated_at = now()
  where id = target.id
  returning * into result;

  insert into public.audit_logs(actor_id, action, entity_type, entity_id, metadata)
  values (auth.uid(), 'LOCATION_UPDATED', 'location', result.id::text,
          jsonb_build_object('name', result.name));

  return result;
end
$$;

-- 6) associations: additive nullable FKs on the shared profile tables.
alter table public.worker_profiles add column if not exists location_id uuid references public.locations(id) on delete set null;
alter table public.user_profiles add column if not exists location_id uuid references public.locations(id) on delete set null;
create index if not exists worker_profiles_location_id_idx on public.worker_profiles(location_id);
create index if not exists user_profiles_location_id_idx on public.user_profiles(location_id);

-- 7) backfill existing profiles where a name match is unambiguous.
do $$
declare loc record;
begin
  for loc in
    select id, name from public.locations where is_active
  loop
    update public.worker_profiles
    set location_id = loc.id
    where location_id is null
      and lower(coalesce(service_area, '')) = lower(loc.name);

    update public.user_profiles
    set location_id = loc.id
    where location_id is null
      and exists (
        select 1 from public.addresses a
        where a.account_id = user_profiles.account_id
          and lower(coalesce(a.city, '') || ' ' || coalesce(a.barangay, '')) like '%' || lower(loc.name) || '%'
      );
  end loop;
end $$;

-- 8) grants
revoke all on function public.admin_list_locations() from public, anon;
grant execute on function public.admin_list_locations() to authenticated;

revoke all on function public.admin_create_location(text, double precision, double precision, integer, jsonb) from public, anon;
grant execute on function public.admin_create_location(text, double precision, double precision, integer, jsonb) to authenticated;

revoke all on function public.admin_update_location(uuid, text, double precision, double precision, integer, jsonb, boolean) from public, anon;
grant execute on function public.admin_update_location(uuid, text, double precision, double precision, integer, jsonb, boolean) to authenticated;
