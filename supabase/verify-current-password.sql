-- Current-password verification for the admin "Change Password" flow.
-- Single round trip, no session side effects (bcrypt compare, SECURITY DEFINER).
-- Run in the Supabase SQL editor.
create or replace function public.verify_current_password(p_password text)
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select exists (
    select 1 from auth.users u
    where u.id = auth.uid()
      and u.deleted_at is null
      and u.encrypted_password = extensions.crypt(p_password, u.encrypted_password)
  );
$$;

revoke all on function public.verify_current_password(text) from public, anon;
grant execute on function public.verify_current_password(text) to authenticated;
