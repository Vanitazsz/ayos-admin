import {
  cancelBookingAsAdmin,
  loadBookingsPage,
  reassignBookingAsAdmin,
  resolveBookingMedia,
  resolveBookingProofs,
} from '../logic/BookingsPageLogic';
import { loadReassignWorkers } from '../../../services/workers';
import { useCallback, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Clock, CheckCircle, PlayCircle } from 'lucide-react';
import { useToast } from '../../../context/ToastContext';
import { BOOKING_STATUS_BADGE, badgeFor } from '../../../services/statusMeta';
import { useServerPagination } from '../../../hooks/useServerPagination';
import { useDebouncedValue } from '../../../hooks/useDebouncedValue';
import { useDateFilter } from '../../../hooks/useDateFilter';

export function useBookingsPageController() {
  const toast = useToast();
  const navigate = useNavigate();
  const dateFilter = useDateFilter({ canModify: true });
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebouncedValue(searchTerm);
  const [filterStatus, setFilterStatus] = useState('All');
  const [mediaFilter, setMediaFilter] = useState([]);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [actionMenuOpenId, setActionMenuOpenId] = useState(null);
  const [action, setAction] = useState(null);
  const [actionReason, setActionReason] = useState('');
  const [replacementWorker, setReplacementWorker] = useState('');
  const [reassignWorkers, setReassignWorkers] = useState([]);
  const [loadingReassignWorkers, setLoadingReassignWorkers] = useState(false);
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
      loadBookingsPage({
        search: debouncedSearch,
        status: filterStatus,
        media: mediaFilter,
        sort: dateFilter.sort,
        field: dateFilter.field,
        dateRange: dateFilter.effectiveRange,
        page,
        pageSize,
      }),
    [debouncedSearch, filterStatus, mediaFilter, dateFilter],
  );

  const {
    rows: bookings,
    count,
    meta,
    error,
    isLoading,
    refresh,
    currentPage,
    setCurrentPage,
    totalPages,
  } = useServerPagination({ fetchPage: fetchBookings });

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

  const goToTrash = useCallback(
    (trashEntryId) => {
      if (!trashEntryId) return;
      navigate(`/admin/trash?tab=Bookings&entry=${trashEntryId}`);
    },
    [navigate],
  );

  const handleViewDetails = useCallback(async (booking) => {
    setSelectedBooking(booking);
    setIsDrawerOpen(true);
    setActionMenuOpenId(null);
    try {
      const media = await resolveBookingMedia(booking);
      setSelectedBooking((current) =>
        current && current.id === booking.id ? { ...current, media } : current,
      );
    } catch {
      setSelectedBooking((current) =>
        current && current.id === booking.id ? { ...current, media: null } : current,
      );
    }
    try {
      const proof = await resolveBookingProofs(booking.id);
      setSelectedBooking((current) =>
        current && current.id === booking.id ? { ...current, proof } : current,
      );
    } catch {
      setSelectedBooking((current) =>
        current && current.id === booking.id
          ? { ...current, proof: { workerProof: null, userProof: null } }
          : current,
      );
    }
  }, []);

  const openAction = useCallback((type, booking) => {
    setAction({ type, booking });
    setActionReason('');
    setReplacementWorker(booking.candidates?.[0]?.id ?? '');
    setActionMenuOpenId(null);
    if (type === 'reassign') {
      setLoadingReassignWorkers(true);
      loadReassignWorkers()
        .then((workers) => setReassignWorkers(workers ?? []))
        .catch(() => setReassignWorkers([]))
        .finally(() => setLoadingReassignWorkers(false));
    }
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
      action.type === 'cancel' ? 'move this booking to trash' : 'reassign this booking';
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
      mediaFilter,
      setMediaFilter,
      dateFilter,
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
      reassignWorkers,
      loadingReassignWorkers,
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
      goToTrash,
    }),
    [
      searchTerm,
      filterStatus,
      mediaFilter,
      dateFilter,
      currentPage,
      selectedBooking,
      isDrawerOpen,
      actionMenuOpenId,
      action,
      actionReason,
      replacementWorker,
      reassignWorkers,
      loadingReassignWorkers,
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
      goToTrash,
      closeConfirm,
      setFilterStatus,
      setMediaFilter,
      setCurrentPage,
      setIsDrawerOpen,
      setAction,
      setActionReason,
      setReplacementWorker,
      toast,
    ],
  );
}
