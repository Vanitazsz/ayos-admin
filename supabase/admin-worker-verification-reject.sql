-- Admin rejection of a worker identity verification.
--
-- Replaces the admin Workers page "Request documents" action
-- (review_worker_verification with decision 'NEEDS_DOCUMENTS') with a reject
-- that deletes the worker's submission so they can resubmit fresh documents.
--
-- The RPC marks the verification REJECTED, clears the submitted document
-- paths, and returns the removed paths. The actual storage objects are removed
-- by the admin client through the Storage API
-- (supabase.storage.from('verification-documents').remove(paths)) after the
-- RPC returns, because a raw SQL delete on storage.objects is blocked by the
-- storage.protect_delete() trigger. The verification_documents_admin_delete
-- policy below lets the admin client perform that removal.
--
-- Idempotent / re-runnable. Requires public.is_admin(boolean)
-- (admin-rbac-permissions.sql). The matching resubmit_worker_verification_documents
-- reset is shipped in the ayos-final migration
-- 20260902000000_admin_worker_verification_reject.sql.

create or replace function public.admin_reject_worker_verification(
  p_verification_id uuid,
  p_notes text default null
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  verification public.worker_verifications;
  removed_paths text[] := '{}';
begin
  if not public.is_admin(true) then
    raise exception using errcode = '42501', message = 'ADMIN_REQUIRED';
  end if;

  select *
  into verification
  from public.worker_verifications
  where id = p_verification_id
  for update;

  if verification.id is null then
    raise exception using errcode = 'P0002', message = 'VERIFICATION_NOT_FOUND';
  end if;

  if verification.status not in ('PENDING', 'NEEDS_DOCUMENTS') then
    raise exception using errcode = '55000', message = 'VERIFICATION_NOT_ACTIONABLE';
  end if;

  removed_paths := coalesce(verification.document_paths, '{}');

  update public.worker_verifications
  set status = 'REJECTED',
      requested_notes = nullif(btrim(p_notes), ''),
      reviewed_by = auth.uid(),
      reviewed_at = now(),
      document_paths = '{}',
      updated_at = now()
  where id = verification.id;

  update public.worker_profiles
  set approval_status = 'REJECTED',
      approved_at = null,
      is_available = false,
      updated_at = now()
  where account_id = verification.worker_id;

  insert into public.audit_logs(actor_id, action, entity_type, entity_id, metadata)
  values (
    auth.uid(),
    'WORKER_VERIFICATION_REJECTED',
    'worker_verification',
    verification.id::text,
    jsonb_build_object(
      'worker_id', verification.worker_id,
      'decision', 'REJECTED',
      'cleared_documents', removed_paths
    )
  );

  return jsonb_build_object(
    'verification_id', verification.id,
    'worker_id', verification.worker_id,
    'removed_document_paths', removed_paths
  );
end;
$$;

revoke all on function public.admin_reject_worker_verification(uuid, text) from public, anon;
grant execute on function public.admin_reject_worker_verification(uuid, text) to authenticated;

-- Allow the admin client to remove verification-document objects through the
-- Storage API (supabase.storage.remove) after a reject.
drop policy if exists verification_documents_admin_delete on storage.objects;
create policy verification_documents_admin_delete
on storage.objects for delete to authenticated
using (
  bucket_id = 'verification-documents'
  and public.is_admin(true)
);

notify pgrst, 'reload schema';
