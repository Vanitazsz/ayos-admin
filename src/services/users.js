import { supabase, status, identity } from './adminShared';
import { cacheable, invalidate } from '../lib/cacheable';
import { getSignedUrl, getSignedUrls } from '../lib/signedUrlCache';

const asProfile = (row) =>
  Array.isArray(row.user_profiles) ? row.user_profiles[0] : row.user_profiles;

const normalizeVerificationStatus = (value) => {
  const normalized = String(value ?? '').trim().toLowerCase();
  if (normalized === 'verified' || normalized === 'approved') return 'verified';
  if (normalized === '' || normalized === 'unverified' || normalized === 'rejected')
    return 'unverified';
  return 'pending';
};

export const mapUser = (row) => {
  const profile = asProfile(row);
  const verificationStatus = normalizeVerificationStatus(profile?.verification_status);
  const addresses = (row.addresses ?? []).map((address) => ({
    id: address.id,
    label: address.label ?? '',
    line1: address.line1 ?? '',
    line2: address.line2 ?? '',
    barangay: address.barangay ?? '',
    city: address.city ?? '',
    province: address.province ?? '',
    postalCode: address.postal_code ?? '',
    latitude: address.latitude ?? null,
    longitude: address.longitude ?? null,
    isDefault: Boolean(address.is_default),
    display: [address.line1, address.line2, address.barangay, address.city, address.province]
      .filter(Boolean)
      .join(', '),
    short: [address.city, address.province].filter(Boolean).join(', '),
  }));
  return {
    id: row.id,
    name: profile?.display_name?.trim() || row.email?.split('@')[0] || 'Customer',
    email: row.email,
    phone: row.mobile ?? '',
    addresses,
    location:
      (addresses.find((address) => address.isDefault) ?? addresses[0])?.short ?? '',
    locationCount: addresses.length,
    registeredAt: new Date(row.created_at).toLocaleDateString(),
    created_at: row.created_at,
    updated_at: row.updated_at ?? null,
    status: status(row.status),
    bookings: profile?.bookings?.[0]?.count ?? 0,
    verified: verificationStatus === 'verified',
    verificationStatus,
    avatarPath: profile?.avatar_path ?? null,
  };
};

const USER_PAGE_SELECT =
  'id,email,mobile,status,created_at,updated_at,user_profiles(display_name,verification_status,avatar_path,locations!user_profiles_location_id_fkey(id,name),bookings!bookings_user_account_id_fkey(count)),addresses(id,label,line1,line2,barangay,city,province,postal_code,latitude,longitude,is_default)';

export const loadUserStats = cacheable(
  'users',
  { ttl: 60_000, key: 'stats' },
  async () => {
    const { data, error } = await supabase.rpc('get_user_stats');
    if (error) throw error;
    const [row] = data ?? [];
    return {
      total: Number(row?.total ?? 0),
      active: Number(row?.active ?? 0),
      suspended: Number(row?.suspended ?? 0),
    };
  },
);

const loadTrashedUserIds = cacheable(
  'users',
  { ttl: 60_000, key: 'trashed' },
  async () => {
    const { data, error } = await supabase
      .from('trash_entries')
      .select('entity_id, id')
      .eq('entity_type', 'user')
      .is('restored_at', null);
    if (error) throw error;
    return (data ?? []).map((row) => ({ entityId: row.entity_id, entryId: row.id }));
  },
);

async function loadUserPageIds({
  search = '',
  status: filterStatus = 'All',
  verified = 'All',
  location = 'All',
  sort = 'newest',
  field = 'created',
  dateRange = null,
  page = 1,
  pageSize = 10,
} = {}) {
  const { data, error } = await supabase.rpc('admin_list_user_page', {
    p_search: search?.trim() || null,
    p_status: filterStatus,
    p_verified: verified,
    p_location: location,
    p_field: field,
    p_from: dateRange?.from ? dateRange.from.toISOString() : null,
    p_to: dateRange?.to ? dateRange.to.toISOString() : null,
    p_sort: sort,
    p_page: page,
    p_page_size: pageSize,
  });
  if (error) throw error;
  const [row] = data ?? [];
  return { ids: row?.ids ?? [], count: Number(row?.total_count ?? 0) };
}

export const loadUserPageRows = cacheable('users', { ttl: 60_000 }, async (ids) => {
  const { data, error } = await supabase
    .from('accounts')
    .select(USER_PAGE_SELECT)
    .eq('role', 'USER')
    .is('deleted_at', null)
    .in('id', ids);
  if (error) throw error;
  return data ?? [];
});

export async function loadUsersPageRaw({
  search = '',
  status = 'All',
  verified = 'All',
  location = 'All',
  sort = 'newest',
  field = 'created',
  dateRange = null,
  page = 1,
  pageSize = 10,
} = {}) {
  const [stats, pageResult, trashed] = await Promise.all([
    loadUserStats(),
    loadUserPageIds({ search, status, verified, location, sort, field, dateRange, page, pageSize }),
    loadTrashedUserIds(),
  ]);

  if (!pageResult.ids.length) return { rows: [], count: pageResult.count, stats };

  const data = await loadUserPageRows(pageResult.ids);

  const byId = new Map(data.map((row) => [row.id, row]));
  const trashEntryIdByEntity = new Map(trashed.map((entry) => [entry.entityId, entry.entryId]));
  return {
    rows: pageResult.ids
      .map((id) => {
        const row = byId.get(id);
        if (!row) return null;
        const user = mapUser(row);
        const trashEntryId = trashEntryIdByEntity.get(id) ?? null;
        return { ...user, isTrashed: Boolean(trashEntryId), trashEntryId };
      })
      .filter(Boolean),
    count: pageResult.count,
    stats,
  };
}

export const loadUsersPage = cacheable('users', { ttl: 60_000 }, loadUsersPageRaw);

export const loadCustomerVerifications = cacheable(
  'users',
  { ttl: 60_000, key: 'verifications' },
  async () => {
    const { data: rows, error } = await supabase
      .from('customer_verifications')
      .select('id,customer_id,id_type,status,id_front_url,id_back_url,created_at')
      .eq('status', 'pending')
      .order('created_at');
    if (error) {
      if (error.code === '42P01' || error.code === 'PGRST205') return [];
      throw error;
    }
    const ids = [...new Set((rows ?? []).map((row) => row.customer_id))];
    const { data: accounts, error: accountError } = ids.length
      ? await supabase
          .from('accounts')
          .select(
            'id,email,mobile,status,created_at,user_profiles(display_name,verification_status),addresses(id,label,line1,line2,barangay,city,province,postal_code,is_default)',
          )
          .in('id', ids)
      : { data: [], error: null };
    if (accountError) throw accountError;
    const byId = new Map((accounts ?? []).map((account) => [account.id, account]));

    const frontPaths = (rows ?? []).map((row) => row.id_front_url).filter(Boolean);
    const backPaths = (rows ?? []).map((row) => row.id_back_url).filter(Boolean);
    const [frontUrls, backUrls] = await Promise.all([
      getSignedUrls('verification-documents', frontPaths),
      getSignedUrls('verification-documents', backPaths),
    ]);

    return (rows ?? []).map((row) => {
      const account = byId.get(row.customer_id);
      const profile = asProfile(account);
      const addresses = (account?.addresses ?? []).map((address) => ({
        id: address.id,
        label: address.label ?? '',
        display: [address.line1, address.line2, address.barangay, address.city, address.province]
          .filter(Boolean)
          .join(', '),
        isDefault: Boolean(address.is_default),
      }));
      const primaryAddress = addresses.find((address) => address.isDefault) ?? addresses[0];
      return {
        ...row,
        customerName: identity(profile?.display_name, 'Verification customer'),
        email: account?.email ?? '',
        phone: account?.mobile ?? '',
        accountStatus: status(account?.status),
        registeredAt: account?.created_at
          ? new Date(account.created_at).toLocaleDateString()
          : '',
        addressDisplay: primaryAddress?.display ?? '',
        verificationStatus: (profile?.verification_status ?? '').toLowerCase(),
        frontUrl: frontUrls.get(row.id_front_url) ?? '',
        backUrl: backUrls.get(row.id_back_url) ?? '',
      };
    });
  },
);

export async function reviewCustomerVerification(id, decision, notes) {
  const { data, error } = await supabase.rpc('admin_review_customer_verification', {
    p_verification_id: id,
    p_decision: decision,
    p_notes: notes || null,
  });
  if (error) throw error;
  invalidate('users');
  return data;
}

export async function updateUser(id, displayName, mobile) {
  const { data, error } = await supabase.rpc('admin_update_user', {
    p_account_id: id,
    p_display_name: displayName,
    p_mobile: mobile || null,
  });
  if (error) throw error;
  invalidate('users');
  return data;
}

export async function updateUserEmail(id, email) {
  const { data, error } = await supabase.rpc('admin_update_user_email', {
    p_account_id: id,
    p_email: email,
  });
  if (error) throw error;
  invalidate('users');
  return data;
}

export async function setCustomerVerification(id, status) {
  const { data, error } = await supabase.rpc('admin_set_customer_verification', {
    p_account_id: id,
    p_status: status,
  });
  if (error) throw error;
  invalidate('users');
  return data;
}

export async function bulkSetCustomerVerification(ids, status) {
  const { data, error } = await supabase.rpc('admin_bulk_set_customer_verification', {
    p_account_ids: ids,
    p_status: status,
  });
  if (error) throw error;
  invalidate('users');
  return Number(data ?? 0);
}

export async function updateCustomerVerification(
  verificationId,
  { idType, frontPath, backPath },
) {
  const { data, error } = await supabase.rpc('admin_update_customer_verification', {
    p_verification_id: verificationId,
    p_id_type: idType,
    p_id_front_url: frontPath,
    p_id_back_url: backPath ?? null,
  });
  if (error) throw error;
  invalidate('users');
  return data;
}

export async function resolveUserAvatar(path) {
  if (!path) return '';
  if (/^https?:\/\//i.test(path)) return path;
  return getSignedUrl('profile-avatars', path, { ttl: 30 * 60_000 });
}

export async function deleteUserAddress(addressId) {
  const { error } = await supabase.rpc('admin_delete_user_address', {
    p_address_id: addressId,
  });
  if (error) throw error;
  invalidate('users');
}

export const loadUserVerificationDocs = cacheable(
  'users',
  { ttl: 30_000 },
  async (accountId) => {
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
      getSignedUrl('verification-documents', data.id_front_url),
      getSignedUrl('verification-documents', data.id_back_url),
    ]);
    return {
      id: data.id,
      status: data.status,
      idType: data.id_type,
      frontPath: data.id_front_url ?? '',
      backPath: data.id_back_url ?? '',
      frontUrl: front ?? '',
      backUrl: back ?? '',
    };
  },
);
