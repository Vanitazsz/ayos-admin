import { supabase, status, identity } from './adminShared';

export async function loadWorkers() {
  const { data, error } = await supabase
    .from('worker_profiles')
    .select(
      'account_id,display_name,bio,experience,service_area,service_origin,service_radius_meters,approval_status,is_available,created_at,accounts!worker_profiles_account_id_fkey!inner(email,mobile,status,role,deleted_at),worker_skills!worker_skills_worker_id_fkey(years,category_id,service_categories!worker_skills_category_id_fkey(name)),worker_verifications!worker_verifications_worker_id_fkey(id,status),bookings!bookings_worker_account_id_fkey(count)',
    )
    .eq('accounts.role', 'WORKER')
    .is('accounts.deleted_at', null)
    .order('created_at', { ascending: false });
  if (error) throw error;
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
    return {
      id: row.account_id,
      name: identity(row.display_name, 'Worker'),
      email: row.accounts?.email ?? '',
      phone: row.accounts?.mobile ?? '',
      bio: row.bio ?? '',
      category: row.worker_skills?.[0]?.service_categories?.name ?? '',
      categoryId: row.worker_skills?.[0]?.category_id ?? null,
      skillIds: (row.worker_skills ?? [])
        .map((skill) => skill.category_id)
        .filter(Boolean),
      rating: ratingByWorker.get(row.account_id)?.toFixed(1) ?? '0.0',
      jobsCompleted: row.bookings?.[0]?.count ?? 0,
      experience: Math.max(...(row.worker_skills ?? []).map((item) => item.years), 0),
      status: status(row.accounts?.status),
      verified: row.approval_status === 'APPROVED',
      location: row.service_area ?? '',
      registeredDate: row.created_at ? new Date(row.created_at).toLocaleDateString() : '',
      earnings: walletByWorker.get(row.account_id) ?? 0,
      verificationStatus: verification?.status ?? row.approval_status,
      verificationId: verification?.id ?? null,
      matchingReady,
      matchingMissing,
    };
  });
}

export async function reviewWorker(verificationId, decision, notes) {
  const { data, error } = await supabase.rpc('review_worker_verification', {
    verification_id: verificationId,
    decision,
    notes,
  });
  if (error) throw error;
  return data;
}

export async function updateWorker(id, value) {
  const { data, error } = await supabase.rpc('admin_update_worker', {
    p_worker_id: id,
    p_display_name: value.name,
    p_mobile: value.phone || null,
    p_bio: value.bio || null,
    p_service_area: value.serviceArea || null,
    p_category_ids: Array.isArray(value.skillIds) ? value.skillIds : [],
    p_experience:
      value.experience != null && value.experience !== '' ? Number(value.experience) : null,
  });
  if (error) throw error;
  return data;
}
