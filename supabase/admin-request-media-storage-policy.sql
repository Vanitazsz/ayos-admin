-- Allow signed URLs for customer request attachments.
-- Run in the Supabase SQL editor AFTER admin-rbac-permissions.sql.
--
-- The mobile app uploads customer attachments to the `request-media` bucket and
-- the admin/booking detail drawer resolves them with createSignedUrls(). That
-- requires a SELECT policy on storage.objects for the bucket, which was missing
-- (only `service-request-media` and `booking-proof` were covered). Without it,
-- every sign request is denied and the drawer shows "No photos or voice notes
-- attached."
--
-- Mirrors the existing authenticated_reads_owned_path pattern: the uploader
-- (storage.foldername(name)[1] = auth.uid()) keeps reading their own files and
-- admins get access via is_admin(false), the same helper booking-proof uses.
-- Re-runnable.

drop policy if exists "request_media_owner_or_admin_read" on storage.objects;

create policy "request_media_owner_or_admin_read"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'request-media'
  and (
    (storage.foldername(name))[1] = (select auth.uid())::text
    or public.is_admin(false)
  )
);
