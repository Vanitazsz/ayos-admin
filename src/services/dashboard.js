import { supabase, status } from './adminShared';
import { cacheable } from '../lib/cacheable';

const buildRevenueSeries = (rows) =>
  (rows ?? []).map((row) => {
    const month = new Date(`${String(row.month).slice(0, 10)}T00:00:00`);
    const year = month.getFullYear();
    const revenue = Number(row.revenue ?? 0);
    const commission = Number(row.profit ?? 0);
    return {
      month,
      period: row.period,
      label: row.period,
      yearLabel: `${row.period} '${String(year).slice(2)}`,
      revenue,
      profit: commission,
      commission,
      workerPayout: revenue - commission,
    };
  });

const buildBookings = (series) =>
  [...(series ?? []).reduce((map, row) => {
    const entry = map.get(row.day) ?? { name: row.day, completed: 0, cancelled: 0, pending: 0 };
    if (row.status === 'completed') entry.completed += Number(row.booking_count ?? 0);
    else if (row.status === 'cancelled') entry.cancelled += Number(row.booking_count ?? 0);
    else entry.pending += Number(row.booking_count ?? 0);
    map.set(row.day, entry);
    return map;
  }, new Map()).values()];

export const loadDashboard = cacheable(
  'dashboard',
  { ttl: 30_000, persist: false },
  async () => {
  const [overview, revenuePayload] = await Promise.all([
    supabase.rpc('admin_dashboard_overview'),
    supabase.rpc('admin_dashboard_revenue'),
  ]);
  if (overview.error) throw overview.error;
  const value = overview.data ?? {};
  const revenueData = revenuePayload.error
    ? { day: [], month: [], year: [] }
    : {
        day: buildRevenueSeries(revenuePayload.data?.day),
        month: buildRevenueSeries(revenuePayload.data?.month),
        year: buildRevenueSeries(revenuePayload.data?.year),
      };
  return {
    metrics: value.metrics ?? {},
    activities: (value.activities ?? []).map((row) => ({
      id: row.id,
      user: row.entity_type ?? '',
      action: status(row.action),
      time: new Date(row.created_at).toLocaleString(),
      type: row.entity_type ?? '',
    })),
    revenueData,
    bookingsData: buildBookings(value.bookings),
    pendingWorkers: value.pending_workers ?? [],
    recentUsers: value.recent_users ?? [],
    systemNotifications: value.system_notifications ?? [],
  };
});
