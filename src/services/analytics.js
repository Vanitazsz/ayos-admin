import { supabase } from './adminShared';

export async function loadAnalytics() {
  const [
    { data: summary, error: summaryError },
    { data: topServices, error: topServicesError },
    { data: revenueSeries, error: revenueSeriesError },
  ] = await Promise.all([
    supabase.rpc('admin_analytics_summary'),
    supabase.rpc('admin_top_services'),
    supabase.rpc('admin_revenue_series'),
  ]);
  if (summaryError) throw summaryError;
  if (topServicesError) throw topServicesError;
  if (revenueSeriesError) throw revenueSeriesError;
  return {
    summary: summary?.[0] ?? null,
    topServices: topServices ?? [],
    revenueSeries: revenueSeries ?? [],
  };
}

export async function loadWorkerEarnings() {
  const { data, error } = await supabase.rpc('admin_analytics_summary');
  if (error) throw error;
  return {
    totalEarnings: Number(data?.[0]?.worker_earnings_total ?? 0),
    workerCount: Number(data?.[0]?.workers_with_earnings ?? 0),
  };
}
