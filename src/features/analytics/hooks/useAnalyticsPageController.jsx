import { loadAnalytics, loadWorkerEarnings, subscribe } from '../logic/AnalyticsPageLogic';
import { useEffect, useState } from 'react';
import { money } from '../../../services/adminShared';

export function useAnalyticsPageController() {
  const [kpis, setKpis] = useState([]);
  const [monthlyRevenue, setMonthlyRevenue] = useState([]);
  const [topServices, setTopServices] = useState([]);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [mau, setMau] = useState(null);
  const [avgWorkerEarnings, setAvgWorkerEarnings] = useState(null);
  useEffect(() => {
    const refresh = async () => {
      const [value, earnings] = await Promise.all([loadAnalytics(), loadWorkerEarnings()]);
      const summary = value.summary ?? {};
      const totalRevenue = Number(summary.total_revenue ?? 0);
      setTotalRevenue(totalRevenue);
      const months = new Map();
      value.revenueSeries.forEach((row) => {
        months.set(row.period, (months.get(row.period) ?? 0) + Number(row.revenue) / 1000);
      });
      setMonthlyRevenue([...months].map(([month, amount]) => ({ month, value: amount })));
      const categories = value.topServices ?? [];
      const max = Math.max(...categories.map((item) => Number(item.request_count)), 1);
      setTopServices(
        [...categories]
          .sort((a, b) => Number(b.request_count) - Number(a.request_count))
          .slice(0, 5)
          .map(({ name, request_count }) => ({
            name,
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
    };
    void refresh();
    return subscribe('payments', refresh);
  }, []);
  return { kpis, monthlyRevenue, topServices, totalRevenue, mau, avgWorkerEarnings };
}
