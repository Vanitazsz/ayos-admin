import { supabase } from './adminShared';
import { cacheable } from '../lib/cacheable';

const rpcArgs = ({ from = null, to = null } = {}) =>
  from || to ? { p_from: from, p_to: to } : {};

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

export const loadAnalytics = cacheable(
  'analytics',
  { ttl: 30_000, persist: false },
  async (range = {}) => {
    const args = rpcArgs(range);
    const [
      { data: summary, error: summaryError },
      { data: topServices, error: topServicesError },
      { data: revenuePayload, error: revenueSeriesError },
    ] = await Promise.all([
      supabase.rpc('admin_analytics_summary', args),
      supabase.rpc('admin_top_services', args),
      supabase.rpc('admin_revenue_series', args),
    ]);
    if (summaryError) throw summaryError;
    if (topServicesError) throw topServicesError;
    if (revenueSeriesError) throw revenueSeriesError;
    const payload = revenuePayload ?? {};
    return {
      summary: summary?.[0] ?? null,
      topServices: topServices ?? [],
      revenueData: {
        day: buildRevenueSeries(payload.day),
        month: buildRevenueSeries(payload.month),
        year: buildRevenueSeries(payload.year),
      },
    };
  },
);

export const loadWorkerEarnings = cacheable(
  'analytics',
  { ttl: 30_000, persist: false },
  async (range = {}) => {
    const { data, error } = await supabase.rpc('admin_analytics_summary', rpcArgs(range));
    if (error) throw error;
    return {
      totalEarnings: Number(data?.[0]?.worker_earnings_total ?? 0),
      workerCount: Number(data?.[0]?.workers_with_earnings ?? 0),
    };
  },
);
