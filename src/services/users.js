import { supabase, status, identity } from './adminShared';
import { cacheable, invalidate } from '../lib/cacheable';
import { applyDateFilter, getRowDate } from '../lib/dateFilter';
import { getSignedUrl, getSignedUrls } from '../lib/signedUrlCache';

const asProfile = (row) =>
  Array.isArray(row.user_profiles) ? row.user_profiles[0] : row.user_profiles;

const asLocation = (profile) =>
  Array.isArray(profile?.locations) ? profile.locations[0] : profile?.locations;

const normalizeVerificationStatus = (value) => {
  const normalized = String(value ?? '').trim().toLowerCase();
  if (normalized === 'verified') return 'verified';
  if (normalized === '' || normalized === 'unverified') return 'unverified';
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

const USER_KEY_SELECT =
  'id,email,status,created_at,updated_at,user_profiles(display_name,verification_status,locations!user_profiles_location_id_fkey(id,name))';

export const loadUserKeys = cacheable('users', { ttl: 60_000 }, async () => {
  const [{ data: keys, error: keyError }, { data: trashed, error: trashError }] =
    await Promise.all([
      supabase
        .from('accounts')
        .select(USER_KEY_SELECT)
        .eq('role', 'USER')
        .is('deleted_at', null)
        .order('created_at', { ascending: false }),
      supabase
        .from('trash_entries')
        .select('id, entity_type, entity_id')
        .eq('entity_type', 'user')
        .is('restored_at', null),
    ]);
  if (keyError) throw keyError;
  if (trashError) throw trashError;
  return {
    keys: keys ?? [],
    trashById: Object.fromEntries((trashed ?? []).map((row) => [row.entity_id, row.id])),
  };
});

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
  const { keys: allKeys, trashById } = await loadUserKeys();

  const stats = {
    total: allKeys.length,
    active: allKeys.filter((row) => row.status === 'ACTIVE').length,
    suspended: allKeys.filter((row) => row.status === 'SUSPENDED').length,
  };

  const term = search.trim().toLowerCase();
  const matchesSearch = (row) => {
    const name = asProfile(row)?.display_name ?? '';
    return (
      name.toLowerCase().includes(term) ||
      row.email.toLowerCase().includes(term) ||
      row.id.toLowerCase().includes(term)
    );
  };
  const isTrashed = (row) => Boolean(trashById[row.id]);
  const matchesStatus = (row) =>
    status === 'All' ||
    (status === 'Trashed' ? isTrashed(row) : row.status === status);
  const matchesVerified = (row) => {
    const profile = asProfile(row);
    const verificationStatus = normalizeVerificationStatus(profile?.verification_status);
    if (verified === 'All') return verificationStatus !== 'pending';
    return verificationStatus === verified;
  };
  const matchesLocation = (row) => {
    if (location === 'All') return true;
    const profile = asProfile(row);
    return (asLocation(profile)?.name ?? '') === location;
  };
  const matched = allKeys.filter(
    (row) =>
      (!term || matchesSearch(row)) &&
      matchesStatus(row) &&
      matchesVerified(row) &&
      matchesLocation(row),
  );
  const ordered = applyDateFilter(matched, {
    field,
    range: dateRange,
    sort,
    getDate: (row) => getRowDate(row, field) ?? getRowDate(row, 'created'),
  });
  const count = ordered.length;
  const pageIds = ordered
    .slice((page - 1) * pageSize, page * pageSize)
    .map((row) => row.id);

  if (!pageIds.length) return { rows: [], count, stats };

  const data = await loadUserPageRows(pageIds);

  const byId = new Map(data.map((row) => [row.id, row]));
  return {
    rows: pageIds
      .map((id) => {
        const user = mapUser(byId.get(id));
        if (!user) return null;
        const trashEntryId = trashById[id] ?? null;
        return { ...user, isTrashed: Boolean(trashEntryId), trashEntryId };
      })
      .filter(Boolean),
    count,
    stats,
  };
}

export const loadUsersPage = cacheable('users', { ttl: 60_000 }, loadUsersPageRaw);

export const loadCustomerVerifications = cacheable(
  'users',
  { ttl: 60_000 },
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
      ? await supabase.from('accounts').select('id,email,user_profiles(display_name)').in('id', ids)
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
      return {
        ...row,
        customerName: identity(account?.user_profiles?.display_name, 'Verification customer'),
        email: account?.email ?? '',
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
