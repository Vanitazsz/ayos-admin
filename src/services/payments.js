import { supabase, status } from './adminShared';
import { cacheable, invalidate } from '../lib/cacheable';
import { getSignedUrl } from '../lib/signedUrlCache';

export const PAYMENT_STATUS_LABELS = {
  SUCCESSFUL: 'Completed',
  PENDING: 'Pending',
  AWAITING_CONFIRMATIONS: 'Awaiting Confirmation',
  REQUIRES_ACTION: 'Requires Action',
  PROCESSING: 'Processing',
  FAILED: 'Failed',
  EXPIRED: 'Expired',
  CANCELLED: 'Cancelled',
  REFUNDED: 'Refunded',
};

const paymentStatus = (raw) => PAYMENT_STATUS_LABELS[raw] ?? status(raw);

export const mapPayment = (row) => ({
  id: row.id,
  bookingId: row.booking_id,
  customer: row.bookings?.user_profiles?.display_name ?? '',
  worker: row.bookings?.worker_profiles?.display_name ?? '',
  amount: Number(row.service_amount),
  fee: Number(row.commission_amount),
  net: Number(row.worker_net_amount),
  method: status(row.method),
  status: paymentStatus(row.status),
  type: 'Payment',
  proofPath: row.proof_path ?? null,
  date: new Date(row.created_at).toLocaleDateString(),
  created_at: row.created_at,
  updated_at: row.updated_at ?? null,
});

const PAYMENT_PAGE_SELECT =
  'id,booking_id,service_amount,commission_amount,worker_net_amount,method,status,created_at,updated_at,proof_path,bookings(user_profiles:user_account_id(display_name),worker_profiles:worker_account_id(display_name))';

const PAYMENT_CASH_METHODS = ['CASH', 'cash', 'Cash', 'BANK_TRANSFER', 'bank_transfer', 'Bank Transfer'];

const chunk = (items, size) => {
  const out = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
};

export const loadPaymentPageRows = cacheable('payments', { ttl: 60_000 }, async (ids) => {
  const { data, error } = await supabase
    .from('payments')
    .select(PAYMENT_PAGE_SELECT)
    .in('id', ids);
  if (error) throw error;
  return data ?? [];
});

export const loadPaymentStats = cacheable(
  'payments',
  { ttl: 60_000, key: 'stats' },
  async () => {
    const { data, error } = await supabase.rpc('get_payment_stats');
    if (error) throw error;
    return data ?? { revenue: 0, commission: 0, pending: 0, failed: 0 };
  },
);

const loadTrashedPaymentIds = cacheable(
  'payments',
  { ttl: 60_000, key: 'trashed' },
  async () => {
    const { data, error } = await supabase
      .from('trash_entries')
      .select('entity_id')
      .eq('entity_type', 'payment')
      .is('restored_at', null);
    if (error) throw error;
    return (data ?? []).map((row) => row.entity_id);
  },
);

const loadPaymentIdsByName = cacheable('payments', { ttl: 60_000 }, async (term) => {
  const [userData, workerData] = await Promise.all([
    supabase.from('user_profiles').select('id').ilike('display_name', `%${term}%`),
    supabase.from('worker_profiles').select('id').ilike('display_name', `%${term}%`),
  ]);
  if (userData.error) throw userData.error;
  if (workerData.error) throw workerData.error;
  const profileIds = [
    ...(userData.data ?? []).map((row) => row.id),
    ...(workerData.data ?? []).map((row) => row.id),
  ];
  if (!profileIds.length) return [];

  const bookingIds = [];
  for (const batch of chunk(profileIds, 200)) {
    const { data, error } = await supabase
      .from('bookings')
      .select('id')
      .or(`user_account_id.in.(${batch.join(',')}),worker_account_id.in.(${batch.join(',')})`);
    if (error) throw error;
    bookingIds.push(...(data ?? []).map((row) => row.id));
  }
  if (!bookingIds.length) return [];

  const paymentIds = [];
  for (const batch of chunk(bookingIds, 200)) {
    const { data, error } = await supabase
      .from('payments')
      .select('id')
      .in('booking_id', batch);
    if (error) throw error;
    paymentIds.push(...(data ?? []).map((row) => row.id));
  }
  return paymentIds;
});

function buildPaymentIdQuery({ trashedIds, tab, dateRange, field, sort, page, pageSize }) {
  let query = supabase.from('payments').select('id', { count: 'exact' });
  if (trashedIds.length > 0) {
    query = query.not('id', 'in', `(${trashedIds.join(',')})`);
  }
  if (tab === 'cash') {
    query = query.in('method', PAYMENT_CASH_METHODS);
  }
  const column = field === 'modified' ? 'updated_at' : 'created_at';
  if (dateRange && (dateRange.from || dateRange.to)) {
    if (dateRange.from) query = query.gte(column, dateRange.from.toISOString());
    if (dateRange.to) query = query.lte(column, dateRange.to.toISOString());
  }
  const from = (page - 1) * pageSize;
  return query.order(column, { ascending: sort === 'oldest' }).range(from, from + pageSize - 1);
}

async function loadPaymentPageIds({
  search = '',
  tab = 'transactions',
  sort = 'newest',
  field = 'created',
  dateRange = null,
  page = 1,
  pageSize = 10,
} = {}) {
  if (tab === 'refunds') return { ids: [], count: 0 };

  const trashedIds = await loadTrashedPaymentIds();
  const term = search.trim().toLowerCase();

  if (!term) {
    const { data, count, error } = await buildPaymentIdQuery({
      trashedIds,
      tab,
      dateRange,
      field,
      sort,
      page,
      pageSize,
    });
    if (error) throw error;
    return { ids: (data ?? []).map((row) => row.id), count: count ?? 0 };
  }

  const cleanTerm = term.replace(/[(),.*%_]/g, '');
  const nameMatches = await loadPaymentIdsByName(term);
  const batches = nameMatches.length ? chunk(nameMatches, 200) : [null];
  const ids = new Set();
  let count = 0;

  for (const batch of batches) {
    let query = supabase.from('payments').select('id', { count: 'exact' });
    if (trashedIds.length > 0) {
      query = query.not('id', 'in', `(${trashedIds.join(',')})`);
    }
    if (tab === 'cash') {
      query = query.in('method', PAYMENT_CASH_METHODS);
    }
    query = batch
      ? query.or(`id.ilike.*${cleanTerm}*,booking_id.in.(${batch.join(',')})`)
      : query.ilike('id', `%${cleanTerm}%`);
    const column = field === 'modified' ? 'updated_at' : 'created_at';
    if (dateRange && (dateRange.from || dateRange.to)) {
      if (dateRange.from) query = query.gte(column, dateRange.from.toISOString());
      if (dateRange.to) query = query.lte(column, dateRange.to.toISOString());
    }
    const from = (page - 1) * pageSize;
    query = query.order(column, { ascending: sort === 'oldest' }).range(from, from + pageSize - 1);

    const { data, count: batchCount, error } = await query;
    if (error) throw error;
    for (const row of data ?? []) ids.add(row.id);
    count += batchCount ?? 0;
  }

  return { ids: [...ids], count };
}

export async function loadPaymentsPageRaw({
  search = '',
  tab = 'transactions',
  sort = 'newest',
  field = 'created',
  dateRange = null,
  page = 1,
  pageSize = 10,
} = {}) {
  const [{ revenue = 0, commission = 0, pending = 0, failed = 0 } = {}, pageResult] =
    await Promise.all([
      loadPaymentStats(),
      loadPaymentPageIds({ search, tab, sort, field, dateRange, page, pageSize }),
    ]);

  const stats = { revenue, commission, pending, failed };
  if (!pageResult.ids.length) return { rows: [], count: pageResult.count, stats };

  const data = await loadPaymentPageRows(pageResult.ids);
  const byId = new Map(data.map((row) => [row.id, row]));
  return {
    rows: pageResult.ids
      .map((id) => {
        const row = byId.get(id);
        if (!row) return null;
        return mapPayment(row);
      })
      .filter(Boolean),
    count: pageResult.count,
    stats,
  };
}

export const loadPaymentsPage = cacheable('payments', { ttl: 60_000 }, loadPaymentsPageRaw);

export async function movePaymentToTrash(id, reason) {
  const { data, error } = await supabase.rpc('admin_move_payment_to_trash', {
    p_payment_id: id,
    p_reason: reason,
  });
  if (error) throw error;
  invalidate('payments');
  return data;
}

export async function confirmCashPayment(id, notes) {
  const { data, error } = await supabase.rpc('admin_confirm_cash_payment', {
    p_payment_id: id,
    p_notes: notes,
  });
  if (error) throw error;
  invalidate('payments');
  return data;
}

export async function resolvePaymentProof(payment) {
  const path = payment?.proofPath ?? null;
  if (!path) return null;
  return getSignedUrl('booking-proof', path);
}
