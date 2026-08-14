-- Fix government ID verification documents that were uploaded as PDFs but
-- saved with a `.jpg` path / `image/jpeg` object metadata.
--
-- Background
-- ----------
-- Some customers submit their government IDs as PDF files. The upload flow
-- persisted them with a `.jpg` name and `image/jpeg` metadata, so the admin
-- review popup (which renders the docs with <img>) showed blank panels — the
-- payload is actually `application/pdf` and browsers cannot decode it as an
-- image.
--
-- Fix applied
-- -----------
-- 1. Storage (done via the Storage API, not SQL):
--      - re-uploaded the two objects to `.pdf` paths with
--        `Content-Type: application/pdf` so they are served as PDFs
--      - deleted the old `.jpg` objects
-- 2. Database (this file):
--      - repointed `customer_verifications` to the new `.pdf` paths
--      - (idempotent) normalized `storage.objects.metadata.mimetype`
--        for the affected objects
--
-- The admin frontend also gained an adaptive document preview (img with an
-- on-error fallback to an embedded viewer + "Open document" link) so future
-- PDF submissions render correctly too, regardless of stored metadata.
--
-- Run in the Supabase SQL editor. Re-runnable: updates only the rows that
-- still point at the old `.jpg` names and corrects metadata when present.

-- 1. Repoint the pending verification's documents to the .pdf paths.
update public.customer_verifications
set id_front_url = 'c21f074e-7f6a-47b2-8e8e-6c444764ab27/customer-front-5f5637ef-2713-4b3d-8e30-c7522094e1a2.pdf',
    id_back_url  = 'c21f074e-7f6a-47b2-8e8e-6c444764ab27/customer-back-bc3692b2-735e-4c57-ae47-47b89fbb1be7.pdf'
where id = '3e262b3a-bd70-491e-808c-7c029250b427'
  and (
    id_front_url like '%.jpg'
    or id_back_url like '%.jpg'
    or id_front_url like '%customer-front-5f5637ef%'
  );

-- 2. Normalize mimetype for any lingering mislabeled objects (idempotent).
update storage.objects
set metadata = jsonb_set(metadata, '{mimetype}', to_jsonb('application/pdf'::text))
where bucket_id = 'verification-documents'
  and (
    name = 'c21f074e-7f6a-47b2-8e8e-6c444764ab27/customer-front-5f5637ef-2713-4b3d-8e30-c7522094e1a2.jpg'
    or name = 'c21f074e-7f6a-47b2-8e8e-6c444764ab27/customer-back-bc3692b2-735e-4c57-ae47-47b89fbb1be7.jpg'
    or name = 'c21f074e-7f6a-47b2-8e8e-6c444764ab27/customer-front-5f5637ef-2713-4b3d-8e30-c7522094e1a2.pdf'
    or name = 'c21f074e-7f6a-47b2-8e8e-6c444764ab27/customer-back-bc3692b2-735e-4c57-ae47-47b89fbb1be7.pdf'
  );
