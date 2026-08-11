import { supabase, status, identity } from './adminShared';
import { cacheable, invalidate } from '../lib/cacheable';

export async function loadWorkersRaw() {
  const { data, error } = await supabase
    .from('worker_profiles')
    .select(
      'account_id,display_name,bio,experience,service_area,service_origin,service_radius_meters,approval_status,is_available,created_at,accounts!worker_profiles_account_id_fkey!inner(email,mobile,status,role,deleted_at),locations!worker_profiles_location_id_fkey(name),worker_skills!worker_skills_worker_id_fkey(years,rate_minor,category_id,service_categories!worker_skills_category_id_fkey(id,name)),worker_verifications!worker_verifications_worker_id_fkey(id,status),bookings!bookings_worker_account_id_fkey(count)',
    )
    .eq('accounts.role', 'WORKER')
    .is('accounts.deleted_at', null)
    .order('created_at', { ascending: false });
  if (error) throw error;
  const { data: trashed, error: trashError } = await supabase
    .from('trash_entries')
    .select('id, entity_type, entity_id')
    .eq('entity_type', 'worker')
    .is('restored_at', null);
  if (trashError) throw trashError;
  const trashById = new Map(
    (trashed ?? []).map((row) => [row.entity_id, row.id]),
  );
  const rows = data ?? [];
  const workerIds = rows.map((row) => row.account_id);
  const [
    { data: walletBalances, error: walletBalancesError },
    { data: ratings, error: ratingsError },
  ] = workerIds.length
    ? await Promise.all([
        supabase.rpc('get_worker_wallet_balances', { p_worker_ids: workerIds }),
        supabase.rpc('get_worker_rating_stats', { p_worker_ids: workerIds }),
      ])
    : [{ data: [], error: null }, { data: [], error: null }];
  if (walletBalancesError) throw walletBalancesError;
  if (ratingsError) throw ratingsError;
  const walletByWorker = new Map(
    (walletBalances ?? []).map((wallet) => [
      wallet.worker_id,
      Number(wallet.available_amount ?? 0),
    ]),
  );
  const ratingByWorker = new Map(
    (ratings ?? []).map((rating) => [rating.worker_id, Number(rating.avg_rating ?? 0)]),
  );

  return rows.map((row) => {
    const verification = Array.isArray(row.worker_verifications)
      ? row.worker_verifications[0]
      : row.worker_verifications;
    const skillsReady = (row.worker_skills?.length ?? 0) > 0;
    const serviceAreaReady = Boolean(row.service_origin && row.service_radius_meters);
    const matchingReady = Boolean(
      row.approval_status === 'APPROVED' &&
        skillsReady &&
        serviceAreaReady &&
        row.is_available,
    );
    const matchingMissing = [
      row.approval_status !== 'APPROVED' ? 'approval' : null,
      !skillsReady ? 'skills' : null,
      !serviceAreaReady ? 'service area' : null,
      !row.is_available ? 'online status' : null,
    ].filter(Boolean);
    const skills = (row.worker_skills ?? [])
      .map((skill) => ({
        id: skill.category_id,
        name: skill.service_categories?.name ?? '',
        years: skill.years ?? 0,
        rateMinor: skill.rate_minor != null ? Number(skill.rate_minor) : null,
      }))
      .filter((skill) => skill.id);
    return {
      id: row.account_id,
      name: identity(row.display_name, 'Worker'),
      email: row.accounts?.email ?? '',
      phone: row.accounts?.mobile ?? '',
      bio: row.bio ?? '',
      category: skills[0]?.name ?? '',
      categoryId: skills[0]?.id ?? null,
      categories: [...new Set(skills.map((skill) => skill.name).filter(Boolean))],
      skills,
      skillIds: skills.map((skill) => skill.id),
      rating: ratingByWorker.get(row.account_id)?.toFixed(1) ?? '0.0',
      jobsCompleted: row.bookings?.[0]?.count ?? 0,
      experience: Math.max(...skills.map((skill) => skill.years), 0),
      status: status(row.accounts?.status),
      verified: row.approval_status === 'APPROVED',
      location: row.locations?.name ?? row.service_area ?? '',
      locationId: row.locations?.id ?? null,
      registeredDate: row.created_at ? new Date(row.created_at).toLocaleDateString() : '',
      earnings: walletByWorker.get(row.account_id) ?? 0,
      verificationStatus: verification?.status ?? row.approval_status,
      verificationId: verification?.id ?? null,
      isTrashed: trashById.has(row.account_id),
      trashEntryId: trashById.get(row.account_id) ?? null,
      matchingReady,
      matchingMissing,
    };
  });
}

export const loadWorkers = cacheable('workers', { ttl: 60_000 }, loadWorkersRaw);

export async function reviewWorker(verificationId, decision, notes) {
  const { data, error } = await supabase.rpc('review_worker_verification', {
    verification_id: verificationId,
    decision,
    notes,
  });
  if (error) throw error;
  invalidate('workers');
  return data;
}

export async function updateWorker(id, value) {
  const skillIds = Array.isArray(value.skillIds) ? value.skillIds : [];
  const rateMinors = skillIds.map((skillId) =>
    value.rates?.[skillId] != null ? Math.round(Number(value.rates[skillId])) : null,
  );
  const { data, error } = await supabase.rpc('admin_update_worker', {
    p_worker_id: id,
    p_display_name: value.name,
    p_mobile: value.phone || null,
    p_bio: value.bio || null,
    p_service_area: value.serviceArea || null,
    p_category_ids: skillIds,
    p_experience:
      value.experience != null && value.experience !== '' ? Number(value.experience) : null,
    p_rate_minors: rateMinors,
  });
  if (error) throw error;
  invalidate('workers');
  return data;
}

export async function bulkSetWorkerVerification(ids, status) {
  const { data, error } = await supabase.rpc('admin_bulk_set_worker_verification', {
    p_worker_ids: ids,
    p_status: status,
  });
  if (error) throw error;
  invalidate('workers');
  return Number(data ?? 0);
}

export async function updateWorkerEmail(id, email) {
  const { data, error } = await supabase.rpc('admin_update_worker_email', {
    p_worker_id: id,
    p_email: email,
  });
  if (error) throw error;
  invalidate('workers');
  return data;
}

export const loadWorkerVerificationDocs = cacheable(
  'workers',
  { ttl: 30_000 },
  async (workerId) => {
    const { data, error } = await supabase
      .from('worker_verifications')
      .select('id,status,identity_data,document_paths')
      .eq('worker_id', workerId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;
    const paths = Array.isArray(data.document_paths) ? data.document_paths : [];
    const signed = await Promise.all(
      paths.map((path) =>
        supabase.storage.from('verification-documents').createSignedUrl(path, 900),
      ),
    );
    return {
      id: data.id,
      status: data.status,
      idType: data.identity_data?.idType ?? '',
      documents: signed
        .map((result) => result.data?.signedUrl ?? '')
        .filter(Boolean),
    };
  },
);
