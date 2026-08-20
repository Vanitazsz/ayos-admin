import {
  loadBookingsForUser,
  loadBookingsForWorker,
  loadLocations,
  loadUserVerificationDocs,
  loadUsersPage,
  loadWorkers,
  resolveBookingMedia,
  resolveUserAvatar,
  clearWorkerLocation,
} from '../logic/LocationsPageLogic';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Badge from '../../../components/ui/Badge';
import { useServerPagination } from '../../../hooks/useServerPagination';
import { usePagination } from '../../../hooks/usePagination';
import { useDebouncedValue } from '../../../hooks/useDebouncedValue';
import { useDebouncedRefresh } from '../../../hooks/useDebouncedRefresh';
import { useRealtime } from '../../../hooks/useRealtime';
import { useDateFilter } from '../../../hooks/useDateFilter';
import { applyDateFilter, getRowDate } from '../../../lib/dateFilter';
import { useToast } from '../../../context/ToastContext';

export function useLocationsPageController() {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState('users');
  const userDateFilter = useDateFilter({ canModify: true });
  const workerDateFilter = useDateFilter({ canModify: true });

  // Shared catalog: all locations (filter dropdowns + drawer map enrichment)
  const [locations, setLocations] = useState([]);
  const locationsById = useMemo(
    () => new Map((locations ?? []).map((location) => [location.id, location])),
    [locations],
  );

  // ---- Users tab ----
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebouncedValue(searchQuery);
  const [filterStatus, setFilterStatus] = useState('All');
  const [filterVerified, setFilterVerified] = useState('All');
  const [selectedUser, setSelectedUser] = useState(null);
  const [avatarUrl, setAvatarUrl] = useState('');
  const [userVerificationDocs, setUserVerificationDocs] = useState(undefined);
  const [userBookings, setUserBookings] = useState([]);
  const [isBookingsLoading, setIsBookingsLoading] = useState(false);
  const [activeBooking, setActiveBooking] = useState(null);

  const fetchUsers = useCallback(
    ({ page, pageSize }) =>
      loadUsersPage({
        search: debouncedSearch,
        status: filterStatus,
        verified: filterVerified,
        sort: userDateFilter.sort,
        field: userDateFilter.field,
        dateRange: userDateFilter.effectiveRange,
        page,
        pageSize,
      }),
    [debouncedSearch, filterStatus, filterVerified, userDateFilter],
  );

  const {
    rows: users,
    count: usersCount,
    error: usersError,
    isLoading: isUsersLoading,
    refresh: refreshUsers,
    currentPage: usersCurrentPage,
    setCurrentPage: setUsersCurrentPage,
    totalPages: usersTotalPages,
  } = useServerPagination({
    fetchPage: fetchUsers,
    filterKey: `${filterStatus}|${filterVerified}|${userDateFilter.sort}|${userDateFilter.field}|${userDateFilter.preset}|${userDateFilter.customRange.from}|${userDateFilter.customRange.to}`,
  });

  // ---- Workers tab ----
  const [workers, setWorkers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [workerFilterStatus, setWorkerFilterStatus] = useState('All');
  const [workerFilterVerified, setWorkerFilterVerified] = useState('All');
  const [isWorkersLoading, setIsWorkersLoading] = useState(true);
  const [workersError, setWorkersError] = useState('');
  const [selectedWorker, setSelectedWorker] = useState(null);
  const [workerBookings, setWorkerBookings] = useState([]);
  const [isWorkerBookingsLoading, setIsWorkerBookingsLoading] = useState(false);
  const { schedule, mark } = useDebouncedRefresh();

  const loadWorkersData = useCallback(async () => {
    try {
      setWorkersError('');
      setWorkers(await loadWorkers());
    } catch (error) {
      setWorkersError(error instanceof Error ? error.message : 'Unable to load workers.');
    } finally {
      setIsWorkersLoading(false);
      mark();
    }
  }, [mark]);

  useEffect(() => {
    void loadWorkersData();
  }, [loadWorkersData]);

  useEffect(() => {
    let cancelled = false;
    void loadLocations()
      .then((loadedLocations) => {
        if (!cancelled) setLocations(loadedLocations ?? []);
      })
      .catch(() => {
        if (!cancelled) setLocations([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const activeTabRef = useRef(activeTab);
  activeTabRef.current = activeTab;
  const refreshUsersRef = useRef(refreshUsers);
  refreshUsersRef.current = refreshUsers;
  const loadWorkersDataRef = useRef(loadWorkersData);
  loadWorkersDataRef.current = loadWorkersData;

  const handleRealtime = useCallback(() => {
    schedule(async () => {
      if (activeTabRef.current === 'workers') {
        await loadWorkersDataRef.current();
      } else {
        await refreshUsersRef.current();
      }
    });
  }, [schedule]);

  useRealtime(
    ['accounts', 'user_profiles', 'locations', 'worker_profiles', 'worker_verifications'],
    handleRealtime,
  );

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // ---- Users tab: drawer ----
  const handleViewUserProfile = useCallback(async (user) => {
    setSelectedUser(user);
    setActiveTab('users');
    setIsDrawerOpen(true);
    setActiveBooking(null);
    setAvatarUrl('');
    setUserVerificationDocs(undefined);
    try {
      setAvatarUrl(await resolveUserAvatar(user.avatarPath));
    } catch {
      setAvatarUrl('');
    }
    try {
      const docs = await loadUserVerificationDocs(user.id);
      setUserVerificationDocs(
        docs ?? { status: 'NOT_SUBMITTED', idType: '', frontUrl: '', backUrl: '' },
      );
    } catch {
      setUserVerificationDocs(null);
    }
    setIsBookingsLoading(true);
    try {
      setUserBookings(await loadBookingsForUser(user.id));
    } catch {
      setUserBookings([]);
    } finally {
      setIsBookingsLoading(false);
    }
  }, []);

  const handleViewBooking = useCallback(async (booking) => {
    setActiveBooking(booking);
    try {
      const media = await resolveBookingMedia(booking);
      setActiveBooking((current) =>
        current && current.id === booking.id ? { ...current, media } : current,
      );
    } catch {
      setActiveBooking((current) =>
        current && current.id === booking.id ? { ...current, media: null } : current,
      );
    }
  }, []);

  // ---- Workers tab: filtering ----
  const filteredWorkers = useMemo(() => {
    const matched = workers.filter((w) => {
      const matchesSearch =
        w.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        w.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        w.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (w.categories ?? []).join(' ').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (w.category ?? '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus =
        workerFilterStatus === 'All' || workerFilterStatus === 'Trashed'
          ? workerFilterStatus === 'Trashed'
            ? w.isTrashed
            : true
          : w.status === workerFilterStatus;
      const matchesVerified =
        workerFilterVerified === 'All' ||
        (workerFilterVerified === 'verified' ? w.verified : !w.verified);
      return matchesSearch && matchesStatus && matchesVerified;
    });
    return applyDateFilter(matched, {
      field: workerDateFilter.field,
      range: workerDateFilter.effectiveRange,
      sort: workerDateFilter.sort,
      getDate: (row) => getRowDate(row, workerDateFilter.field) ?? getRowDate(row, 'created'),
    });
  }, [
    workers,
    searchTerm,
    workerFilterStatus,
    workerFilterVerified,
    workerDateFilter,
  ]);

  const {
    currentPage: workersCurrentPage,
    setCurrentPage: setWorkersCurrentPage,
    totalPages: workersTotalPages,
    pageData: paginatedWorkers,
  } = usePagination(filteredWorkers, 10);

  // ---- Workers tab: drawer ----
  const handleViewWorkerDetails = useCallback(async (worker) => {
    setSelectedWorker(worker);
    setActiveTab('workers');
    setIsDrawerOpen(true);
    setActiveBooking(null);
    setWorkerBookings([]);
    setIsWorkerBookingsLoading(true);
    try {
      setWorkerBookings(await loadBookingsForWorker(worker.id));
    } catch {
      setWorkerBookings([]);
    } finally {
      setIsWorkerBookingsLoading(false);
    }
  }, []);

  const getStatusBadge = useCallback((status) => {
    switch (status) {
      case 'Active':
        return <Badge variant="success">Active</Badge>;
      case 'Suspended':
        return <Badge variant="danger">Suspended</Badge>;
      case 'Pending':
        return <Badge variant="warning">Pending</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  }, []);

  const locationFor = useCallback(
    (person) => (person?.locationId ? locationsById.get(person.locationId) ?? null : null),
    [locationsById],
  );

  const refresh = useCallback(async () => {
    await refreshUsers();
    await loadWorkersData();
  }, [refreshUsers, loadWorkersData]);

  const [confirm, setConfirm] = useState({
    isOpen: false,
    title: '',
    message: '',
    confirmLabel: '',
    onConfirm: null,
  });

  const handleClearWorkerLocation = useCallback(
    (worker) => {
      setConfirm({
        isOpen: true,
        title: 'Clear Worker Location',
        message: `Clear the service area and location for "${worker.name}"? They will no longer appear in location-based matching until they re-enter their location.`,
        confirmLabel: 'Clear Location',
        onConfirm: async () => {
          try {
            await clearWorkerLocation(worker.id);
            setSelectedWorker((prev) => prev ? { ...prev, location: '' } : prev);
            await refresh();
            toast.success('Location cleared', `${worker.name}'s service area has been removed.`);
          } catch (error) {
            toast.error(
              'Clear failed',
              error instanceof Error ? error.message : 'Unable to clear location.',
            );
          }
        },
      });
    },
    [refresh, toast],
  );

  return useMemo(
    () => ({
      activeTab,
      setActiveTab,
      userDateFilter,
      workerDateFilter,
      locations,
      locationsById,
      locationFor,
      // Users tab
      users,
      usersCount,
      usersError,
      isUsersLoading,
      usersCurrentPage,
      setUsersCurrentPage,
      usersTotalPages,
      searchQuery,
      setSearchQuery,
      filterStatus,
      setFilterStatus,
      filterVerified,
      setFilterVerified,
      // Workers tab
      workers,
      filteredWorkers,
      paginatedWorkers,
      workersTotalPages,
      workersCurrentPage,
      setWorkersCurrentPage,
      searchTerm,
      setSearchTerm,
      workerFilterStatus,
      setWorkerFilterStatus,
      workerFilterVerified,
      setWorkerFilterVerified,
      isWorkersLoading,
      workersError,
      // Shared drawer + read-only details
      isDrawerOpen,
      setIsDrawerOpen,
      selectedUser,
      avatarUrl,
      userVerificationDocs,
      userBookings,
      isBookingsLoading,
      activeBooking,
      setActiveBooking,
      handleViewBooking,
      handleViewUserProfile,
      selectedWorker,
      workerBookings,
      isWorkerBookingsLoading,
      handleViewWorkerDetails,
      getStatusBadge,
      refresh,
      confirm,
      setConfirm,
      handleClearWorkerLocation,
    }),
    [
      activeTab,
      userDateFilter,
      workerDateFilter,
      locations,
      locationsById,
      locationFor,
      users,
      usersCount,
      usersError,
      isUsersLoading,
      usersCurrentPage,
      setUsersCurrentPage,
      usersTotalPages,
      searchQuery,
      filterStatus,
      filterVerified,
      workers,
      filteredWorkers,
      paginatedWorkers,
      workersTotalPages,
      workersCurrentPage,
      setWorkersCurrentPage,
      searchTerm,
      workerFilterStatus,
      workerFilterVerified,
      isWorkersLoading,
      workersError,
      isDrawerOpen,
      selectedUser,
      avatarUrl,
      userVerificationDocs,
      userBookings,
      isBookingsLoading,
      activeBooking,
      handleViewBooking,
      handleViewUserProfile,
      selectedWorker,
      workerBookings,
      isWorkerBookingsLoading,
      handleViewWorkerDetails,
      getStatusBadge,
      refresh,
      confirm,
      handleClearWorkerLocation,
    ],
  );
}
