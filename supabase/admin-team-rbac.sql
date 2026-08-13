-- Admin Team / RBAC support.
-- Run in the Supabase SQL editor AFTER admin-rbac-permissions.sql (which defines
-- is_admin() and iam_admin()). Idempotent / re-runnable.
--
-- Design (RBAC):
--   * Granular authorization is carried by admin_profiles.admin_role, a stable
--     text code that references admin_roles.code. accounts.role stays 'ADMIN' for
--     every team member so is_admin(), the admin_full_access policies, and the
--     app's resolveAdmin() keep working unchanged.
--   * Predefined roles carry a fixed permission set (text[]). The Team page
--     surfaces those permissions, and the frontend gates the team module on
--     team.view / team.manage.
--   * All team reads/writes go through SECURITY DEFINER RPCs guarded by is_admin();
--     the admin_invite edge function creates the auth user with the service-role key.

-- 1) admin_roles table
create table if not exists public.admin_roles (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  description text not null default '',
  permissions text[] not null default '{}',
  is_system boolean not null default true,
  created_at timestamptz not null default now()
);

-- 2) admin_profiles.admin_role column (RBAC role code, defaults to ADMIN)
alter table public.admin_profiles add column if not exists admin_role text not null default 'ADMIN';

-- 3) Seed roles (idempotent; re-runs refresh names/permissions)
insert into public.admin_roles(code, name, description, permissions, is_system)
values
  ('SUPER_ADMIN', 'Super Admin', 'Full access to every module, including team management and settings.',
   array[
     'dashboard.view','users.view','users.manage','workers.view','workers.manage',
     'bookings.view','bookings.manage','services.view','services.manage',
     'payments.view','payments.manage','support.view','support.manage',
      'reports.view','analytics.view','notifications.view','audit.view','trash.view',
      'locations.view','locations.manage','settings.view','settings.manage',
      'team.view','team.manage','messages.view','messages.manage'
   ], true),
  ('ADMIN', 'Administrator', 'Manage the platform day to day; cannot manage the team.',
   array[
     'dashboard.view','users.view','users.manage','workers.view','workers.manage',
     'bookings.view','bookings.manage','services.view','services.manage',
     'payments.view','payments.manage','support.view','support.manage',
     'reports.view','analytics.view','notifications.view','audit.view','trash.view',
     'locations.view','locations.manage','settings.view','settings.manage','team.view',
     'messages.view','messages.manage'
   ], true),
  ('MODERATOR', 'Moderator', 'Review content and handle community and support cases.',
   array[
     'dashboard.view','users.view','workers.view','bookings.view','services.view',
     'payments.view','support.view','support.manage','reports.view',
     'notifications.view','locations.view','team.view','messages.view','messages.manage'
   ], true),
  ('ANALYST', 'Analyst', 'View metrics, reports and analytics for business decisions.',
   array[
     'dashboard.view','users.view','workers.view','bookings.view','payments.view',
     'reports.view','analytics.view','locations.view','messages.view'
   ], true),
  ('VIEWER', 'Viewer', 'Read-only access to core dashboards.',
   array[
     'dashboard.view','users.view','workers.view','bookings.view','services.view',
     'payments.view','reports.view','analytics.view','messages.view'
   ], true)
on conflict (code) do update
set name = excluded.name,
    description = excluded.description,
    permissions = excluded.permissions,
    is_system = excluded.is_system;

-- 4) RPC: current admin's permission set (frontend gating)
create or replace function public.admin_get_my_permissions()
returns text[]
language sql
security definer
set search_path = ''
stable
as $$
  select coalesce(r.permissions, '{}'::text[])
  from public.accounts a
  join public.admin_profiles ap on ap.account_id = a.id
  left join public.admin_roles r on r.code = ap.admin_role
  where a.id = auth.uid()
    and a.role = 'ADMIN'
    and a.status = 'ACTIVE'
    and a.deleted_at is null;
$$;

-- 5) RPC: all predefined roles (for dropdowns / permission display)
create or replace function public.admin_get_roles()
returns setof public.admin_roles
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin(false) then
    raise exception using errcode = '42501', message = 'ADMIN_REQUIRED';
  end if;
  return query
    select r.*
    from public.admin_roles r
    order by array_position(array['SUPER_ADMIN','ADMIN','MODERATOR','ANALYST','VIEWER'], r.code), r.name;
end $$;

-- 6) RPC: list team members
create or replace function public.admin_list_team()
returns table (
  id uuid,
  email text,
  status text,
  created_at timestamptz,
  last_sign_in_at timestamptz,
  display_name text,
  admin_role text,
  role_name text,
  role_description text,
  permissions text[],
  updated_at timestamptz
)
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin(false) then
    raise exception using errcode = '42501', message = 'ADMIN_REQUIRED';
  end if;
  return query
    select a.id,
           a.email,
           a.status::text,
           a.created_at,
           u.last_sign_in_at,
           ap.display_name,
           ap.admin_role,
           coalesce(r.name, ap.admin_role),
           coalesce(r.description, ''),
           coalesce(r.permissions, '{}'::text[]),
           ap.updated_at
    from public.accounts a
    join public.admin_profiles ap on ap.account_id = a.id
    left join public.admin_roles r on r.code = ap.admin_role
    left join auth.users u on u.id = a.id
    where a.role = 'ADMIN'
      and a.deleted_at is null
    order by a.created_at asc;
end $$;

-- 7) RPC: change a member's role (protects the last SUPER_ADMIN)
create or replace function public.admin_set_member_role(p_account_id uuid, p_admin_role text)
returns text
language plpgsql security definer set search_path = '' as $$
declare
  v_role_code text := upper(trim(coalesce(p_admin_role, '')));
  v_target_role text;
  v_super_count bigint;
begin
  if not public.is_admin(true) then
    raise exception using errcode = '42501', message = 'AAL2_ADMIN_REQUIRED';
  end if;

  if not exists (
    select 1 from public.admin_roles where code = v_role_code
  ) then
    raise exception using errcode = '22023', message = 'UNKNOWN_ROLE';
  end if;

  select ap.admin_role into v_target_role
  from public.accounts a
  join public.admin_profiles ap on ap.account_id = a.id
  where a.id = p_account_id and a.role = 'ADMIN' and a.deleted_at is null;

  if v_target_role is null then
    raise exception using errcode = 'P0002', message = 'MEMBER_NOT_FOUND';
  end if;

  -- Refuse to demote or change the only remaining SUPER_ADMIN.
  select count(*) into v_super_count
  from public.accounts a
  join public.admin_profiles ap on ap.account_id = a.id
  where a.role = 'ADMIN' and a.deleted_at is null and ap.admin_role = 'SUPER_ADMIN';

  if v_target_role = 'SUPER_ADMIN' and v_role_code <> 'SUPER_ADMIN' and v_super_count <= 1 then
    raise exception using errcode = '22023', message = 'LAST_SUPER_ADMIN';
  end if;

  if p_account_id = auth.uid() and v_target_role = 'SUPER_ADMIN' and v_role_code <> 'SUPER_ADMIN' then
    raise exception using errcode = '22023', message = 'LAST_SUPER_ADMIN';
  end if;

  update public.admin_profiles
  set admin_role = v_role_code
  where account_id = p_account_id;

  insert into public.audit_logs(actor_id, action, entity_type, entity_id, metadata)
  values (auth.uid(), 'TEAM_ROLE_CHANGED', 'admin', p_account_id::text,
          jsonb_build_object('from', v_target_role, 'to', v_role_code));

  return v_role_code;
end $$;

-- 8) grants
revoke all on function public.admin_get_my_permissions() from public, anon;
grant execute on function public.admin_get_my_permissions() to authenticated;

revoke all on function public.admin_get_roles() from public, anon;
grant execute on function public.admin_get_roles() to authenticated;

revoke all on function public.admin_list_team() from public, anon;
grant execute on function public.admin_list_team() to authenticated;

revoke all on function public.admin_set_member_role(uuid, text) from public, anon;
grant execute on function public.admin_set_member_role(uuid, text) to authenticated;

-- Force PostgREST to reload its schema cache so the freshly created RPCs are
-- visible immediately instead of returning 404 for a few seconds.
notify pgrst, 'reload schema';
