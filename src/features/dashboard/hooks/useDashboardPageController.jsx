import { loadDashboard, reviewWorker, subscribe } from '../logic/DashboardPageLogic';
import { useState, useEffect, useCallback } from 'react';
import { useToast } from '../../../context/ToastContext';
import { useDebouncedRefresh } from '../../../hooks/useDebouncedRefresh';

export function useDashboardPageController() {
  const toast = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [activities, setActivities] = useState([]);
  const [metrics, setMetrics] = useState({});
  const [revenueData, setRevenueData] = useState([]);
  const [bookingsData, setBookingsData] = useState([]);
  const [pendingWorkers, setPendingWorkers] = useState([]);
  const [recentUsers, setRecentUsers] = useState([]);
  const [systemNotifications, setSystemNotifications] = useState([]);
  const { schedule, mark } = useDebouncedRefresh();

  const applyValue = useCallback((value) => {
    setMetrics(value.metrics);
    setActivities(value.activities);
    setRevenueData(value.revenueData);
    setBookingsData(value.bookingsData);
    setPendingWorkers(value.pendingWorkers);
    setRecentUsers(value.recentUsers);
    setSystemNotifications(value.systemNotifications);
  }, []);

  const refreshLive = useCallback(async () => {
    try {
      applyValue(await loadDashboard());
      setLoadError('');
    } catch {
      // Realtime-triggered refreshes must not tear down the page on transient errors.
    }
  }, [applyValue]);

  const refreshAll = useCallback(async () => {
    setLoadError('');
    try {
      applyValue(await loadDashboard());
    } catch (error) {
      setLoadError(
        error instanceof Error ? error.message : 'Unable to load dashboard data.',
      );
    } finally {
      setIsLoading(false);
      mark();
    }
  }, [applyValue, mark]);

  useEffect(() => {
    void refreshAll();
    const stops = [
      subscribe('bookings', () => schedule(refreshLive)),
    ];
    return () => stops.forEach((stop) => stop());
  }, [refreshAll, refreshLive, schedule]);
  const handleReviewWorker = async (worker, decision) => {
    try {
      if (!worker.verificationId) throw new Error('No pending verification');
      await reviewWorker(
        worker.verificationId,
        decision,
        decision === 'REJECTED' ? 'Rejected by administrator' : null,
      );
      await refreshAll();
    } catch (error) {
      toast.error(decision === 'APPROVED' ? 'Approval failed' : 'Rejection failed', error.message);
    }
  };
  return {
    toast,
    isLoading,
    loadError,
    activities,
    metrics,
    revenueData,
    bookingsData,
    pendingWorkers,
    recentUsers,
    systemNotifications,
    handleReviewWorker,
  };
}
