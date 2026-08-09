import { supabase, status, identity } from './adminShared';

export const mapBooking = (row) => ({
  id: row.id,
  requestId: row.service_request_id,
  version: row.version,
  customer: identity(row.user_profiles?.display_name, 'Booking customer'),
  worker: row.worker_profiles?.display_name ?? '',
  service: identity(row.service_requests?.description, 'Booking request'),
  category: identity(row.service_requests?.service_categories?.name, 'Booking category'),
  address: [
    row.service_requests?.addresses?.line1,
    row.service_requests?.addresses?.barangay,
    row.service_requests?.addresses?.city,
  ]
    .filter(Boolean)
    .join(', '),
  date: new Date(row.service_requests?.scheduled_at ?? row.created_at).toLocaleDateString(),
  schedule: new Date(row.service_requests?.scheduled_at ?? row.created_at).toLocaleTimeString(),
  duration: '',
  price: row.agreed_service_amount == null ? null : Number(row.agreed_service_amount),
  payment: status(row.payments?.[0]?.method),
  status: status(row.status),
  events: (row.booking_status_events ?? []).sort(
    (a, b) => new Date(a.created_at) - new Date(b.created_at),
  ),
  cancellation: row.cancellations?.[0] ?? null,
  refund: row.payments?.[0]?.refunds?.[0] ?? null,
  candidates: (row.service_requests?.match_candidates ?? [])
    .filter((item) => item.eligible)
    .sort((a, b) => Number(b.score) - Number(a.score))
    .map((item) => ({
      id: item.worker_id,
      name: item.worker_profiles?.display_name ?? item.worker_id,
      score: Number(item.score),
    })),
});

const BOOKING_PAGE_SELECT =
  'id,service_request_id,status,version,created_at,agreed_service_amount,user_profiles:user_account_id(display_name),worker_profiles:worker_account_id(display_name),service_requests(description,scheduled_at,addresses(line1,barangay,city),service_categories(name),match_candidates(worker_id,score,eligible,worker_profiles:worker_id(display_name))),payments(method,status,service_amount,homeowner_platform_charge,refunds(status,reason)),cancellations(reason,fee_amount,refund_amount,resolution_status),booking_status_events(from_status,to_status,reason,created_at)';

const BOOKING_KEY_SELECT =
  'id,status,created_at,user_profiles:user_account_id(display_name),service_requests(description,scheduled_at)';

const bookingStats = (keys, todayStr) => ({
  today: keys.filter(
    (row) =>
      new Date(row.service_requests?.scheduled_at ?? row.created_at).toLocaleDateString() ===
      todayStr,
  ).length,
  pending: keys.filter((row) => status(row.status) === 'Pending').length,
  ongoing: keys.filter((row) => status(row.status) === 'Ongoing').length,
  completedToday: keys.filter(
    (row) =>
      status(row.status) === 'Completed' &&
      new Date(row.service_requests?.scheduled_at ?? row.created_at).toLocaleDateString() ===
        todayStr,
  ).length,
});

export async function loadBookingsPage({
  search = '',
  status: filterStatus = 'All',
  page = 1,
  pageSize = 10,
} = {}) {
  const todayStr = new Date().toLocaleDateString();
  const { data: keys, error: keyError } = await supabase
    .from('bookings')
    .select(BOOKING_KEY_SELECT)
    .order('created_at', { ascending: false });
  if (keyError) throw keyError;

  const rows = keys ?? [];
  const stats = bookingStats(rows, todayStr);
  const term = search.trim().toLowerCase();

  const matched = term
    ? rows.filter((row) => {
        const customer = row.user_profiles?.display_name ?? '';
        const service = row.service_requests?.description ?? '';
        return (
          customer.toLowerCase().includes(term) ||
          row.id.toLowerCase().includes(term) ||
          service.toLowerCase().includes(term)
        );
      })
    : rows;
  const statusFiltered =
    filterStatus === 'All'
      ? matched
      : matched.filter((row) => status(row.status) === filterStatus);
  const count = statusFiltered.length;
  const pageIds = statusFiltered
    .slice((page - 1) * pageSize, page * pageSize)
    .map((row) => row.id);

  if (!pageIds.length) return { rows: [], count, stats };

  const { data, error } = await supabase
    .from('bookings')
    .select(BOOKING_PAGE_SELECT)
    .in('id', pageIds);
  if (error) throw error;

  const byId = new Map((data ?? []).map((row) => [row.id, row]));
  return {
    rows: pageIds.map((id) => mapBooking(byId.get(id))).filter(Boolean),
    count,
    stats,
  };
}

export async function cancelBookingAsAdmin(id, reason) {
  const { data, error } = await supabase.rpc('admin_cancel_booking', {
    p_booking_id: id,
    p_reason: reason,
  });
  if (error) throw error;
  return data;
}

export async function reassignBookingAsAdmin(id, workerId, reason) {
  const { data, error } = await supabase.rpc('admin_reassign_booking', {
    p_booking_id: id,
    p_worker_id: workerId,
    p_reason: reason,
  });
  if (error) throw error;
  return data;
}
