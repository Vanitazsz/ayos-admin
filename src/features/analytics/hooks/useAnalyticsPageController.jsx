import { loadAnalytics, loadWorkerEarnings, subscribe } from '../logic/AnalyticsPageLogic';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { money } from '../../../services/adminShared';

function resolveRange(rangeKey) {
  if (rangeKey === 'all-time') return {};
  const now = new Date();
  if (rangeKey === 'last-6') {
    return { from: new Date(now.getFullYear(), now.getMonth() - 5, 1), to: now };
  }
  if (rangeKey === 'this-year') {
    return { from: new Date(now.getFullYear(), 0, 1), to: now };
  }
  return { from: new Date(now.getFullYear(), now.getMonth() - 11, 1), to: now };
}

export function useAnalyticsPageController() {
  const [kpis, setKpis] = useState([]);
  const [revenueData, setRevenueData] = useState({ day: [], month: [], year: [] });
  const [granularity, setGranularity] = useState('month');
  const [topServices, setTopServices] = useState([]);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [mau, setMau] = useState(null);
  const [avgWorkerEarnings, setAvgWorkerEarnings] = useState(null);
  const [rangeKey, setRangeKey] = useState('all-time');
  const [isLoading, setIsLoading] = useState(true);

  const range = useMemo(() => resolveRange(rangeKey), [rangeKey]);

  const refresh = useCallback(async () => {
    try {
      setIsLoading(true);
      const [value, earnings] = await Promise.all([
        loadAnalytics(range),
        loadWorkerEarnings(range),
      ]);
      const summary = value.summary ?? {};
      const totalRevenue = Number(summary.total_revenue ?? 0);
      setTotalRevenue(totalRevenue);
      setRevenueData(value.revenueData ?? { day: [], month: [], year: [] });
      const categories = value.topServices ?? [];
      const max = Math.max(...categories.map((item) => Number(item.request_count)), 1);
      setTopServices(
        [...categories]
          .sort((a, b) => Number(b.request_count) - Number(a.request_count))
          .map(({ name, request_count }) => ({
            name,
            request_count: Number(request_count),
            percentage: Math.round((Number(request_count) / max) * 100),
          })),
      );
      const completed = Number(summary.completed_bookings ?? 0);
      const total = Number(summary.total_bookings ?? 0);
      const completedUsers = Number(summary.completed_users ?? 0);
      setKpis([
        {
          label: 'Completed Booking Rate',
          value: total ? `${Math.round((completed / total) * 100)}%` : '0%',
          trend: 'Live',
          positive: true,
        },
        {
          label: 'Customer LTV',
          value: money(Number(summary.revenue_per_user ?? 0)),
          trend: 'Live',
          positive: true,
        },
        {
          label: 'Avg Booking Value',
          value: money(Number(summary.avg_booking_value ?? 0)),
          trend: 'Live',
          positive: true,
        },
        {
          label: 'Repeat Customers',
          value: completedUsers
            ? `${Math.round((Number(summary.repeat_users ?? 0) / completedUsers) * 100)}%`
            : '0%',
          trend: 'Live',
          positive: true,
        },
      ]);
      setMau(Number(summary.mau ?? 0));
      setAvgWorkerEarnings(
        earnings.workerCount > 0
          ? Math.round(earnings.totalEarnings / earnings.workerCount / 12)
          : 0,
      );
    } finally {
      setIsLoading(false);
    }
  }, [range]);

  useEffect(() => {
    void refresh();
    return subscribe('payments', refresh);
  }, [refresh]);

  return {
    kpis,
    revenueData,
    granularity,
    setGranularity,
    topServices,
    totalRevenue,
    mau,
    avgWorkerEarnings,
    rangeKey,
    setRangeKey,
    isLoading,
  };
}
