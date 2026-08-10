import { supabase, status, identity } from './adminShared';

export const mapPayment = (row) => ({
  id: row.id,
  bookingId: row.booking_id,
  customer: identity(row.bookings?.user_profiles?.display_name, 'Payment customer'),
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
  page = 1,
  pageSize = 10,
} = {}) {
  const { data: keys, error: keyError } = await supabase
    .from('payments')
    .select(PAYMENT_KEY_SELECT)
    .order('created_at', { ascending: false });
  if (keyError) throw keyError;

  const rows = keys ?? [];

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
    return true;
  });
  const count = matched.length;
  const pageIds = matched
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
