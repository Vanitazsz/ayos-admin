import { supabase, status } from './adminShared';

const buildRevenueSeries = (payload) =>
  (payload?.series ?? []).map((row) => {
    const month = new Date(`${String(row.month).slice(0, 10)}T00:00:00`);
    const year = month.getFullYear();
    return {
      month,
      period: row.period,
      label: row.period,
      yearLabel: `${row.period} '${String(year).slice(2)}`,
      revenue: Number(row.revenue ?? 0),
      profit: Number(row.profit ?? 0),
    };
  });

const buildBookings = (series) =>
  [...(series ?? []).reduce((map, row) => {
    const entry = map.get(row.month) ?? { name: row.month, completed: 0, cancelled: 0, pending: 0 };
    if (row.status === 'completed') entry.completed += Number(row.booking_count ?? 0);
    else if (row.status === 'cancelled') entry.cancelled += Number(row.booking_count ?? 0);
    else entry.pending += Number(row.booking_count ?? 0);
    map.set(row.month, entry);
    return map;
  }, new Map()).values()];

export async function loadDashboard() {
  const [overview, revenuePayload] = await Promise.all([
    supabase.rpc('admin_dashboard_overview'),
    supabase.rpc('admin_dashboard_revenue', { p_months: 24 }),
  ]);
  if (overview.error) throw overview.error;
  const value = overview.data ?? {};
  return {
    metrics: value.metrics ?? {},
    activities: (value.activities ?? []).map((row) => ({
      id: row.id,
      user: row.entity_type ?? '',
      action: status(row.action),
      time: new Date(row.created_at).toLocaleString(),
      type: row.entity_type ?? '',
    })),
    revenueData: revenuePayload.error ? [] : buildRevenueSeries(revenuePayload.data),
    bookingsData: buildBookings(value.bookings),
    pendingWorkers: value.pending_workers ?? [],
    recentUsers: value.recent_users ?? [],
    systemNotifications: value.system_notifications ?? [],
  };
}
