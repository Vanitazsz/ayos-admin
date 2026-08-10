import { supabase, status, identity } from './adminShared';

export const mapUser = (row) => ({
  id: row.id,
  name: row.user_profiles?.display_name?.trim() || row.email?.split('@')[0] || 'Customer',
  email: row.email,
  phone: row.mobile ?? '',
  address: [row.addresses?.[0]?.line1, row.addresses?.[0]?.barangay, row.addresses?.[0]?.city]
    .filter(Boolean)
    .join(', '),
  registeredAt: new Date(row.created_at).toLocaleDateString(),
  status: status(row.status),
  bookings: row.user_profiles?.bookings?.[0]?.count ?? 0,
  verified: row.user_profiles?.verification_status === 'verified',
  verificationStatus: row.user_profiles?.verification_status ?? 'unverified',
  avatarPath: row.user_profiles?.avatar_path ?? null,
});

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
  const matchesStatus = (row) => status === 'All' || row.status === status;
  const matchesVerified =
    verified === 'All' || (row.user_profiles?.verification_status ?? 'unverified') === verified;
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
    rows: pageIds.map((id) => mapUser(byId.get(id))).filter(Boolean),
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

export async function setCustomerVerification(id, status) {
  const { data, error } = await supabase.rpc('admin_set_customer_verification', {
    p_account_id: id,
    p_status: status,
  });
  if (error) throw error;
  return data;
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
