-- Admin RPCs to edit an existing identity verification record and its
-- submitted documents (ID type + image/document paths). Used by the
-- "Edit" action in the Identity Verification section of the Users and
-- Workers drawers. Editing resets the record to a pending state so the
-- replacement documents go through review again.
-- Run in the Supabase SQL editor.

create or replace function public.admin_update_customer_verification(
  p_verification_id uuid,
  p_id_type text,
  p_id_front_url text,
  p_id_back_url text
)
returns public.customer_verifications
language plpgsql
security definer
set search_path = ''
as $$
declare
  target public.customer_verifications;
  result public.customer_verifications;
begin
  if not public.is_admin(true) then
    raise exception using errcode = '42501', message = 'AAL2_ADMIN_REQUIRED';
  end if;

  select * into target
  from public.customer_verifications verification
  where verification.id = p_verification_id
  for update;

  if target.id is null then
    raise exception using errcode = 'P0002', message = 'VERIFICATION_NOT_FOUND';
  end if;

  if p_id_type is null or btrim(p_id_type) = '' then
    raise exception using errcode = '22023', message = 'INVALID_ID_TYPE';
  end if;

  if p_id_front_url is null or btrim(p_id_front_url) = '' then
    raise exception using errcode = '22023', message = 'INVALID_ID_FRONT_URL';
  end if;

  update public.customer_verifications verification
  set id_type = btrim(p_id_type),
      id_front_url = p_id_front_url,
      id_back_url = nullif(btrim(p_id_back_url), ''),
      status = 'pending'
  where verification.id = p_verification_id
  returning * into result;

  update public.user_profiles profile
  set verification_status = 'pending',
      updated_at = now()
  where profile.account_id = target.customer_id;

  insert into public.audit_logs(actor_id, action, entity_type, entity_id, metadata)
  values (
    auth.uid(),
    'CUSTOMER_VERIFICATION_EDITED',
    'verification',
    p_verification_id::text,
    jsonb_build_object('customer_id', target.customer_id, 'id_type', btrim(p_id_type))
  );

  return result;
end
$$;

revoke all on function public.admin_update_customer_verification(uuid, text, text, text) from public, anon;
grant execute on function public.admin_update_customer_verification(uuid, text, text, text) to authenticated;

create or replace function public.admin_update_worker_verification(
  p_verification_id uuid,
  p_id_type text,
  p_document_paths text[]
)
returns public.worker_verifications
language plpgsql
security definer
set search_path = ''
as $$
declare
  target public.worker_verifications;
  result public.worker_verifications;
begin
  if not public.is_admin(true) then
    raise exception using errcode = '42501', message = 'AAL2_ADMIN_REQUIRED';
  end if;

  select * into target
  from public.worker_verifications verification
  where verification.id = p_verification_id
  for update;

  if target.id is null then
    raise exception using errcode = 'P0002', message = 'VERIFICATION_NOT_FOUND';
  end if;

  if p_id_type is null or btrim(p_id_type) = '' then
    raise exception using errcode = '22023', message = 'INVALID_ID_TYPE';
  end if;

  if p_document_paths is null or array_length(p_document_paths, 1) is null then
    raise exception using errcode = '22023', message = 'INVALID_DOCUMENT_PATHS';
  end if;

  update public.worker_verifications verification
  set identity_data = coalesce(identity_data, '{}'::jsonb) || jsonb_build_object('idType', btrim(p_id_type)),
      document_paths = p_document_paths,
      status = 'PENDING'
  where verification.id = p_verification_id
  returning * into result;

  update public.worker_profiles profile
  set approval_status = 'PENDING',
      approved_at = null,
      is_available = false,
      updated_at = now()
  where profile.account_id = target.worker_id;

  insert into public.audit_logs(actor_id, action, entity_type, entity_id, metadata)
  values (
    auth.uid(),
    'WORKER_VERIFICATION_EDITED',
    'verification',
    p_verification_id::text,
    jsonb_build_object('worker_id', target.worker_id, 'id_type', btrim(p_id_type))
  );

  return result;
end
$$;

revoke all on function public.admin_update_worker_verification(uuid, text, text[]) from public, anon;
grant execute on function public.admin_update_worker_verification(uuid, text, text[]) to authenticated;
