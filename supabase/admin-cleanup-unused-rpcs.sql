-- Cleanup: Drop unused RPCs and fix storage policy.
-- Run in the Supabase SQL editor after deploying the updated SQL files.

-- 1) Drop unused RPCs
drop function if exists public.admin_booking_series(int);
drop function if exists public.admin_create_location(text, double precision, double precision, integer, jsonb);
drop function if exists public.admin_update_location(uuid, text, double precision, double precision, integer, jsonb, boolean);
drop function if exists public.admin_delete_conversation(uuid);
drop function if exists public.admin_list_audit_actors(text);

-- 2) Fix unscoped storage policy (was allowing delete from ANY bucket)
drop policy if exists customer_verification_documents_admin_delete on storage.objects;
create policy customer_verification_documents_admin_delete
on storage.objects for delete to authenticated
using (public.is_admin(true) and bucket_id = 'verification-documents');

-- Force PostgREST to reload schema cache
notify pgrst, 'reload schema';
