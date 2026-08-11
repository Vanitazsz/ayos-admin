-- Admin LOCATIONS entity RPCs.
-- The `locations` table itself is created/migrated by the consumer schema migration
-- (ayos-final: 2026...rename_subdivisions_to_locations.sql), which owns the canonical
-- definition (same shape/grants/RLS as the legacy `subdivisions` table). This script
-- only guarantees the table exists for standalone setup and defines the admin RPCs.
-- Run in the Supabase SQL editor. Idempotent / re-runnable.
--
-- Design notes (mirrors the existing admin RPC conventions):
--   * The locations table is RLS-protected; the consumer app reads active rows, and
--     admins manage rows through the SECURITY DEFINER RPCs below guarded by is_admin().
--   * The table is added to the realtime publication so the admin app's
--     useRealtime('locations', ...) subscription works.
--   * Do NOT drop the legacy `subdivisions` schema here; that is owned by the consumer
--     migration so the consumer app stays in sync.

-- 1) canonical locations table (matches the consumer definition; no-op if present)
create table if not exists public.locations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(btrim(name)) between 2 and 160),
  center_lat double precision not null check (center_lat between -90 and 90),
  center_lng double precision not null check (center_lng between -180 and 180),
  radius_meters integer not null default 2000 check (radius_meters between 100 and 50000),
  boundary jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists locations_name_key on public.locations(lower(name));
create index if not exists locations_active_idx on public.locations(is_active, name);

-- 2) RLS + grants (parity with the legacy subdivisions access model)
alter table public.locations enable row level security;
drop policy if exists "admin_full_access" on public.locations;

revoke all on public.locations from anon, authenticated;
grant select on public.locations to authenticated;
grant select, insert, update, delete on public.locations to service_role;

drop policy if exists locations_authenticated_read on public.locations;
create policy locations_authenticated_read on public.locations
for select to authenticated using (is_active or public.is_admin(false));

drop policy if exists locations_admin_insert on public.locations;
create policy locations_admin_insert on public.locations
for insert to authenticated with check (public.is_admin(true));

drop policy if exists locations_admin_update on public.locations;
create policy locations_admin_update on public.locations
for update to authenticated using (public.is_admin(true)) with check (public.is_admin(true));

drop policy if exists locations_admin_delete on public.locations;
create policy locations_admin_delete on public.locations
for delete to authenticated using (public.is_admin(true));

-- 3) realtime
do $$
begin
  alter publication supabase_realtime add table public.locations;
exception when duplicate_object then null;
end $$;

-- 4) admin RPCs
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

-- 5) grants
revoke all on function public.admin_list_locations() from public, anon;
grant execute on function public.admin_list_locations() to authenticated;

revoke all on function public.admin_create_location(text, double precision, double precision, integer, jsonb) from public, anon;
grant execute on function public.admin_create_location(text, double precision, double precision, integer, jsonb) to authenticated;

revoke all on function public.admin_update_location(uuid, text, double precision, double precision, integer, jsonb, boolean) from public, anon;
grant execute on function public.admin_update_location(uuid, text, double precision, double precision, integer, jsonb, boolean) to authenticated;
