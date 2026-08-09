import {
  cancelBookingAsAdmin,
  loadBookingsPage,
  reassignBookingAsAdmin,
  subscribe,
} from '../logic/BookingsPageLogic';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Calendar, Clock, CheckCircle, PlayCircle } from 'lucide-react';
import { useToast } from '../../../context/ToastContext';
import { BOOKING_STATUS_BADGE, badgeFor } from '../../../services/statusMeta';
import { useServerPagination } from '../../../hooks/useServerPagination';

export function useBookingsPageController() {
  const toast = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [actionMenuOpenId, setActionMenuOpenId] = useState(null);
  const [action, setAction] = useState(null);
  const [actionReason, setActionReason] = useState('');
  const [replacementWorker, setReplacementWorker] = useState('');
  const [savingAction, setSavingAction] = useState(false);
  const [confirm, setConfirm] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });
  const closeConfirm = useCallback(
    () => setConfirm((s) => ({ ...s, isOpen: false })),
    [],
  );

  const fetchBookings = useCallback(
    ({ page, pageSize }) =>
      loadBookingsPage({ search: searchTerm, status: filterStatus, page, pageSize }),
    [searchTerm, filterStatus],
  );

  const {
    rows: bookings,
    count,
    meta,
    error,
    isInitialLoading: isLoading,
    refresh,
    currentPage,
    setCurrentPage,
    totalPages,
  } = useServerPagination({ fetchPage: fetchBookings });

  const refreshRef = useRef(refresh);
  refreshRef.current = refresh;

  useEffect(() => {
    const stop = subscribe('bookings', () => {
      void refreshRef.current();
    });
    return stop;
  }, []);

  const stats = useMemo(() => {
    const s = meta?.stats;
    return [
      {
        label: "Today's Bookings",
        value: s?.today ?? 0,
        icon: Calendar,
      },
      {
        label: 'Pending / Unassigned',
        value: s?.pending ?? 0,
        icon: Clock,
      },
      {
        label: 'Ongoing Services',
        value: s?.ongoing ?? 0,
        icon: PlayCircle,
      },
      {
        label: 'Completed Today',
        value: s?.completedToday ?? 0,
        icon: CheckCircle,
      },
    ];
  }, [meta]);

  const getStatusColor = useCallback(
    (status) => badgeFor(BOOKING_STATUS_BADGE, status),
    [],
  );

  const toggleActionMenu = useCallback((id) => {
    setActionMenuOpenId((current) => (current === id ? null : id));
  }, []);

  const handleViewDetails = useCallback((booking) => {
    setSelectedBooking(booking);
    setIsDrawerOpen(true);
    setActionMenuOpenId(null);
  }, []);

  const openAction = useCallback((type, booking) => {
    setAction({ type, booking });
    setActionReason('');
    setReplacementWorker(booking.candidates?.[0]?.id ?? '');
    setActionMenuOpenId(null);
  }, []);

  const executeAction = useCallback(async () => {
    if (!action || actionReason.trim().length < 3) return;
    if (action.type === 'reassign' && !replacementWorker) return;
    setSavingAction(true);
    try {
      if (action.type === 'cancel')
        await cancelBookingAsAdmin(action.booking.id, actionReason.trim());
      else
        await reassignBookingAsAdmin(
          action.booking.id,
          replacementWorker,
          actionReason.trim(),
        );
      setAction(null);
      await refresh();
      setIsDrawerOpen(false);
    } catch (error) {
      toast.error('Action failed', error.message);
    } finally {
      setSavingAction(false);
    }
  }, [action, actionReason, replacementWorker, refresh, toast]);

  const submitAction = useCallback(() => {
    if (!action || actionReason.trim().length < 3) return;
    if (action.type === 'reassign' && !replacementWorker) return;
    const label =
      action.type === 'cancel' ? 'cancel this booking' : 'reassign this booking';
    setConfirm({
      isOpen: true,
      title: 'Confirm Action',
      message: `Confirm that you want to ${label}?`,
      onConfirm: executeAction,
    });
  }, [action, actionReason, replacementWorker, executeAction]);

  return useMemo(
    () => ({
      searchTerm,
      setSearchTerm,
      filterStatus,
      setFilterStatus,
      currentPage,
      setCurrentPage,
      selectedBooking,
      isDrawerOpen,
      setIsDrawerOpen,
      actionMenuOpenId,
      action,
      setAction,
      actionReason,
      setActionReason,
      replacementWorker,
      setReplacementWorker,
      savingAction,
      confirm,
      closeConfirm,
      isLoading,
      error,
      count,
      refresh,
      totalPages,
      paginatedBookings: bookings,
      stats,
      getStatusColor,
      toggleActionMenu,
      handleViewDetails,
      openAction,
      submitAction,
    }),
    [
      searchTerm,
      filterStatus,
      currentPage,
      selectedBooking,
      isDrawerOpen,
      actionMenuOpenId,
      action,
      actionReason,
      replacementWorker,
      savingAction,
      confirm,
      isLoading,
      error,
      count,
      refresh,
      totalPages,
      bookings,
      stats,
      getStatusColor,
      toggleActionMenu,
      handleViewDetails,
      openAction,
      submitAction,
      closeConfirm,
      setFilterStatus,
      setCurrentPage,
      setIsDrawerOpen,
      setAction,
      setActionReason,
      setReplacementWorker,
      toast,
    ],
  );
}
