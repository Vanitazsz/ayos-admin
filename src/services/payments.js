import { supabase, status } from './adminShared';

export const mapPayment = (row) => ({
  id: row.id,
  bookingId: row.booking_id,
  customer: row.bookings?.user_profiles?.display_name ?? '',
  worker: row.bookings?.worker_profiles?.display_name ?? '',
  amount: Number(row.service_amount),
  fee: Number(row.commission_amount),
  net: Number(row.worker_net_amount),
  method: status(row.method),
  status: row.status === 'SUCCESSFUL' ? 'Completed' : status(row.status),
  type: 'Payment',
  date: new Date(row.created_at).toLocaleDateString(),
});

const PAYMENT_PAGE_SELECT =
  'id,booking_id,service_amount,commission_amount,worker_net_amount,method,status,created_at,bookings(user_profiles:user_account_id(display_name),worker_profiles:worker_account_id(display_name))';

const PAYMENT_KEY_SELECT =
  'id,status,method,created_at,service_amount,commission_amount,bookings(user_profiles:user_account_id(display_name),worker_profiles:worker_account_id(display_name))';

const paymentStatus = (raw) => (raw === 'SUCCESSFUL' ? 'Completed' : status(raw));

export async function loadPaymentsPage({
  search = '',
  type = 'All',
  tab = 'transactions',
  sort = 'newest',
  dateRange = null,
  page = 1,
  pageSize = 10,
} = {}) {
  const { data: trashedData } = await supabase
    .from('trash_entries')
    .select('entity_id')
    .eq('entity_type', 'payment')
    .is('restored_at', null);
  const trashedIds = new Set((trashedData ?? []).map((t) => t.entity_id));

  const { data: keys, error: keyError } = await supabase
    .from('payments')
    .select(PAYMENT_KEY_SELECT)
    .order('created_at', { ascending: false });
  if (keyError) throw keyError;

  const rows = (keys ?? []).filter((row) => !trashedIds.has(row.id));

  const stats = {
    revenue: rows
      .filter((row) => paymentStatus(row.status) === 'Completed')
      .reduce((sum, row) => sum + Number(row.service_amount), 0),
    commission: rows
      .filter((row) => paymentStatus(row.status) === 'Completed')
      .reduce((sum, row) => sum + Number(row.commission_amount), 0),
    pending: rows
      .filter((row) => paymentStatus(row.status) === 'Pending')
      .reduce((sum, row) => sum + Number(row.service_amount), 0),
    failed: rows.filter((row) => paymentStatus(row.status) === 'Failed').length,
  };

  const term = search.trim().toLowerCase();
  const matched = rows.filter((row) => {
    if (term) {
      const customer = row.bookings?.user_profiles?.display_name ?? '';
      const worker = row.bookings?.worker_profiles?.display_name ?? '';
      if (
        !row.id.toLowerCase().includes(term) &&
        !customer.toLowerCase().includes(term) &&
        !worker.toLowerCase().includes(term)
      ) {
        return false;
      }
    }
    if (type !== 'All' && 'Payment' !== type) return false;
    if (tab === 'refunds' && 'Payment' !== 'Refund') return false;
    if (tab === 'cash') {
      const method = status(row.method);
      if (method !== 'Cash' && method !== 'Bank Transfer') return false;
    }
    if (dateRange) {
      const created = new Date(row.created_at).getTime();
      const from = dateRange.from ? new Date(dateRange.from).getTime() : -Infinity;
      const to = dateRange.to ? new Date(dateRange.to).getTime() : Infinity;
      if (created < from || created > to) return false;
    }
    return true;
  });
  const ordered = matched
    .slice()
    .sort((a, b) =>
      sort === 'oldest'
        ? new Date(a.created_at) - new Date(b.created_at)
        : new Date(b.created_at) - new Date(a.created_at),
    );
  const count = ordered.length;
  const pageIds = ordered
    .slice((page - 1) * pageSize, page * pageSize)
    .map((row) => row.id);

  if (!pageIds.length) return { rows: [], count, stats };

  const { data, error } = await supabase
    .from('payments')
    .select(PAYMENT_PAGE_SELECT)
    .in('id', pageIds);
  if (error) throw error;

  const byId = new Map((data ?? []).map((row) => [row.id, row]));
  return {
    rows: pageIds.map((id) => mapPayment(byId.get(id))).filter(Boolean),
    count,
    stats,
  };
}

export async function movePaymentToTrash(id, reason) {
  const { data, error } = await supabase.rpc('admin_move_payment_to_trash', {
    p_payment_id: id,
    p_reason: reason,
  });
  if (error) throw error;
  return data;
}
