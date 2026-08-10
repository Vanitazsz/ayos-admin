import { supabase, status, identity } from './adminShared';

const asProfile = (row) =>
  Array.isArray(row.user_profiles) ? row.user_profiles[0] : row.user_profiles;

const normalizeVerificationStatus = (value) =>
  String(value ?? '').trim().toLowerCase() === 'verified' ? 'verified' : 'unverified';

export const mapUser = (row) => {
  const profile = asProfile(row);
  const verificationStatus = normalizeVerificationStatus(profile?.verification_status);
  return {
    id: row.id,
    name: profile?.display_name?.trim() || row.email?.split('@')[0] || 'Customer',
    email: row.email,
    phone: row.mobile ?? '',
    address: [row.addresses?.[0]?.line1, row.addresses?.[0]?.barangay, row.addresses?.[0]?.city]
      .filter(Boolean)
      .join(', '),
    registeredAt: new Date(row.created_at).toLocaleDateString(),
    status: status(row.status),
    bookings: profile?.bookings?.[0]?.count ?? 0,
    verified: verificationStatus === 'verified',
    verificationStatus,
    avatarPath: profile?.avatar_path ?? null,
  };
};

const USER_PAGE_SELECT =
  'id,email,mobile,status,created_at,user_profiles(display_name,verification_status,avatar_path,bookings!bookings_user_account_id_fkey(count)),addresses(line1,barangay,city)';

const USER_KEY_SELECT =
  'id,email,status,created_at,user_profiles(display_name,verification_status)';

export async function loadUsersPage({
  search = '',
  status = 'All',
  verified = 'All',
  page = 1,
  pageSize = 10,
} = {}) {
  const { data: keys, error: keyError } = await supabase
    .from('accounts')
    .select(USER_KEY_SELECT)
    .eq('role', 'USER')
    .is('deleted_at', null)
    .order('created_at', { ascending: false });
  if (keyError) throw keyError;

  const { data: trashed, error: trashError } = await supabase
    .from('trash_entries')
    .select('id, entity_type, entity_id')
    .eq('entity_type', 'user')
    .is('restored_at', null);
  if (trashError) throw trashError;
  const trashById = new Map(
    (trashed ?? []).map((row) => [row.entity_id, row.id]),
  );

  const allKeys = keys ?? [];
  const stats = {
    total: allKeys.length,
    active: allKeys.filter((row) => row.status === 'ACTIVE').length,
    suspended: allKeys.filter((row) => row.status === 'SUSPENDED').length,
  };

  const term = search.trim().toLowerCase();
  const matchesSearch = (row) => {
    const name = row.user_profiles?.display_name ?? '';
    return (
      name.toLowerCase().includes(term) ||
      row.email.toLowerCase().includes(term) ||
      row.id.toLowerCase().includes(term)
    );
  };
  const isTrashed = (row) => trashById.has(row.id);
  const matchesStatus = (row) =>
    status === 'All' ||
    (status === 'Trashed' ? isTrashed(row) : row.status === status);
  const matchesVerified = (row) => {
    if (verified === 'All') return true;
    const profile = asProfile(row);
    return normalizeVerificationStatus(profile?.verification_status) === verified;
  };
  const matched = allKeys.filter(
    (row) => (!term || matchesSearch(row)) && matchesStatus(row) && matchesVerified,
  );
  const count = matched.length;
  const pageIds = matched
    .slice((page - 1) * pageSize, page * pageSize)
    .map((row) => row.id);

  if (!pageIds.length) return { rows: [], count };

  const { data, error } = await supabase
    .from('accounts')
    .select(USER_PAGE_SELECT)
    .eq('role', 'USER')
    .is('deleted_at', null)
    .in('id', pageIds);
  if (error) throw error;

  const byId = new Map((data ?? []).map((row) => [row.id, row]));
  return {
    rows: pageIds
      .map((id) => {
        const user = mapUser(byId.get(id));
        if (!user) return null;
        return { ...user, isTrashed: trashById.has(id), trashEntryId: trashById.get(id) ?? null };
      })
      .filter(Boolean),
    count,
    stats,
  };
}

export async function loadCustomerVerifications() {
  const { data: rows, error } = await supabase
    .from('customer_verifications')
    .select('*')
    .eq('status', 'pending')
    .order('created_at');
  if (error) {
    if (error.code === '42P01' || error.code === 'PGRST205') return [];
    throw error;
  }
  const ids = [...new Set((rows ?? []).map((row) => row.customer_id))];
  const { data: accounts, error: accountError } = ids.length
    ? await supabase.from('accounts').select('id,email,user_profiles(display_name)').in('id', ids)
    : { data: [], error: null };
  if (accountError) throw accountError;
  const byId = new Map((accounts ?? []).map((account) => [account.id, account]));
  return Promise.all(
    (rows ?? []).map(async (row) => {
      const account = byId.get(row.customer_id);
      const [front, back] = await Promise.all([
        supabase.storage.from('verification-documents').createSignedUrl(row.id_front_url, 900),
        row.id_back_url
          ? supabase.storage.from('verification-documents').createSignedUrl(row.id_back_url, 900)
          : Promise.resolve({ data: null, error: null }),
      ]);
      if (front.error) throw front.error;
      if (back.error) throw back.error;
      return {
        ...row,
        customerName: identity(account?.user_profiles?.display_name, 'Verification customer'),
        email: account?.email ?? '',
        frontUrl: front.data?.signedUrl ?? '',
        backUrl: back.data?.signedUrl ?? '',
      };
    }),
  );
}

export async function reviewCustomerVerification(id, decision, notes) {
  const { data, error } = await supabase.rpc('admin_review_customer_verification', {
    p_verification_id: id,
    p_decision: decision,
    p_notes: notes || null,
  });
  if (error) throw error;
  return data;
}

export async function updateUser(id, displayName, mobile) {
  const { data, error } = await supabase.rpc('admin_update_user', {
    p_account_id: id,
    p_display_name: displayName,
    p_mobile: mobile || null,
  });
  if (error) throw error;
  return data;
}

export async function updateUserEmail(id, email) {
  const { data, error } = await supabase.rpc('admin_update_user_email', {
    p_account_id: id,
    p_email: email,
  });
  if (error) throw error;
  return data;
}

export async function setCustomerVerification(id, status) {
  const { data, error } = await supabase.rpc('admin_set_customer_verification', {
    p_account_id: id,
    p_status: status,
  });
  if (error) throw error;
  return data;
}

export async function bulkSetCustomerVerification(ids, status) {
  const { data, error } = await supabase.rpc('admin_bulk_set_customer_verification', {
    p_account_ids: ids,
    p_status: status,
  });
  if (error) throw error;
  return Number(data ?? 0);
}

export async function resolveUserAvatar(path) {
  if (!path) return '';
  if (/^https?:\/\//i.test(path)) return path;
  const { data, error } = await supabase.storage
    .from('profile-avatars')
    .createSignedUrl(path, 3600);
  if (error) throw error;
  return data.signedUrl;
}

export async function loadUserVerificationDocs(accountId) {
  const { data, error } = await supabase
    .from('customer_verifications')
    .select('id,id_type,status,id_front_url,id_back_url')
    .eq('customer_id', accountId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const [front, back] = await Promise.all([
    supabase.storage.from('verification-documents').createSignedUrl(data.id_front_url, 900),
    data.id_back_url
      ? supabase.storage.from('verification-documents').createSignedUrl(data.id_back_url, 900)
      : Promise.resolve({ data: null, error: null }),
  ]);
  return {
    id: data.id,
    status: data.status,
    idType: data.id_type,
    frontUrl: front.data?.signedUrl ?? '',
    backUrl: back.data?.signedUrl ?? '',
  };
}
