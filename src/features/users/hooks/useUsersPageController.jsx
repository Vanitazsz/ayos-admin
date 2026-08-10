import {
  bulkSetAccountStatus,
  loadBookingsForUser,
  loadCustomerVerifications,
  loadUsersPage,
  resolveBookingMedia,
  resolveUserAvatar,
  reviewCustomerVerification,
  bulkSetCustomerVerification,
  setAccountStatus,
  setCustomerVerification,
  subscribe,
  updateUser,
} from '../logic/UsersPageLogic';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Badge from '../../../components/ui/Badge';
import { Users, UserCheck, UserX, AlertCircle } from 'lucide-react';
import { useToast } from '../../../context/ToastContext';
import { useServerPagination } from '../../../hooks/useServerPagination';

export function useUsersPageController() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [filterVerified, setFilterVerified] = useState('All');
  const [actionMenuOpenId, setActionMenuOpenId] = useState(null);
  const [activeTab, setActiveTab] = useState('customers');
  const [verifications, setVerifications] = useState([]);
  const [selectedVerification, setSelectedVerification] = useState(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [reviewing, setReviewing] = useState(false);
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
  const [selectedUser, setSelectedUser] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState('');
  const [userBookings, setUserBookings] = useState([]);
  const [isBookingsLoading, setIsBookingsLoading] = useState(false);
  const [activeBooking, setActiveBooking] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editDraft, setEditDraft] = useState({ name: '', phone: '' });
  const [isSavingUser, setIsSavingUser] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [bulkAction, setBulkAction] = useState(null);
  const isBulkLoading = bulkAction !== null;
  const toast = useToast();

  const fetchUsers = useCallback(
    ({ page, pageSize }) =>
      loadUsersPage({
        search: searchQuery,
        status: filterStatus,
        verified: filterVerified,
        page,
        pageSize,
      }),
    [searchQuery, filterStatus, filterVerified],
  );

  const {
    rows: users,
    count,
    error,
    meta,
    isInitialLoading: isLoading,
    refresh: refreshUsers,
    currentPage,
    setCurrentPage,
    totalPages,
  } = useServerPagination({ fetchPage: fetchUsers });

  const loadVerifications = useCallback(async () => {
    try {
      setVerifications(await loadCustomerVerifications());
    } catch {
      setVerifications([]);
    }
  }, []);

  const refresh = useCallback(async () => {
    await refreshUsers();
    await loadVerifications();
  }, [refreshUsers, loadVerifications]);

  const stats = useMemo(
    () => [
      {
        label: 'Total Users',
        value: meta?.stats?.total ?? 0,
        icon: Users,
      },
      {
        label: 'Active Users',
        value: meta?.stats?.active ?? 0,
        icon: UserCheck,
      },
      {
        label: 'Pending Verification',
        value: verifications.length,
        icon: AlertCircle,
      },
      {
        label: 'Suspended Users',
        value: meta?.stats?.suspended ?? 0,
        icon: UserX,
      },
    ],
    [meta, verifications],
  );

  const refreshRef = useRef(refresh);
  refreshRef.current = refresh;

  useEffect(() => {
    const stops = [
      subscribe('accounts', () => {
        void refreshRef.current();
      }),
      subscribe('customer_verifications', () => {
        void refreshRef.current();
      }),
    ];
    return () => {
      stops.forEach((stop) => stop());
    };
  }, []);

  const decide = useCallback(
    (decision) => {
      if (!selectedVerification) return;
      const label = decision === 'approved' ? 'Approve' : 'Reject';
      setConfirm({
        isOpen: true,
        title: `${label} Verification`,
        message: `${label} this identity verification?`,
        onConfirm: async () => {
          setReviewing(true);
          try {
            await reviewCustomerVerification(
              selectedVerification.id,
              decision,
              reviewNotes,
            );
            setSelectedVerification(null);
            setReviewNotes('');
            await refresh();
          } catch (error) {
            toast.error(
              'Verification failed',
              error instanceof Error
                ? error.message
                : 'Unable to complete verification.',
            );
          } finally {
            setReviewing(false);
          }
        },
      });
    },
    [selectedVerification, reviewNotes, refresh, toast],
  );

  const toggleActionMenu = useCallback(
    (id) => {
      setActionMenuOpenId((current) => (current === id ? null : id));
    },
    [],
  );

  const toggleSelectUser = useCallback((id) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const selectUser = useCallback((id) => {
    setActionMenuOpenId(null);
    setSelectedIds((current) => {
      if (current.has(id)) return current;
      const next = new Set(current);
      next.add(id);
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback((users) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      const allSelected = users.length > 0 && users.every((user) => next.has(user.id));
      users.forEach((user) => {
        if (allSelected) next.delete(user.id);
        else next.add(user.id);
      });
      return next;
    });
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  useEffect(() => {
    setSelectedIds(new Set());
  }, [searchQuery, filterStatus, filterVerified]);

  const handleBulkStatus = useCallback(
    async (nextStatus) => {
      if (!selectedIds.size) return;
      const ids = [...selectedIds];
      setBulkAction(nextStatus);
      try {
        await bulkSetAccountStatus(ids, nextStatus);
        clearSelection();
        await refresh();
        toast.success(
          nextStatus === 'SUSPENDED' ? 'Users suspended' : 'Users reactivated',
          `${ids.length} user${ids.length === 1 ? '' : 's'} ${
            nextStatus === 'SUSPENDED' ? 'suspended' : 'reactivated'
          }.`,
        );
      } catch (error) {
        toast.error(
          'Bulk status update failed',
          error instanceof Error ? error.message : 'Unable to update statuses.',
        );
      } finally {
        setBulkAction(null);
      }
    },
    [selectedIds, refresh, clearSelection, toast],
  );

  const handleBulkVerification = useCallback(
    async (nextStatus) => {
      if (!selectedIds.size) return;
      const ids = [...selectedIds];
      setBulkAction(nextStatus);
      try {
        await bulkSetCustomerVerification(ids, nextStatus);
        clearSelection();
        await refresh();
        toast.success(
          nextStatus === 'verified' ? 'Users verified' : 'Verification removed',
          `${ids.length} user${ids.length === 1 ? '' : 's'} now ${
            nextStatus === 'verified' ? 'verified' : 'unverified'
          }.`,
        );
      } catch (error) {
        toast.error(
          'Bulk verification update failed',
          error instanceof Error ? error.message : 'Unable to update verification.',
        );
      } finally {
        setBulkAction(null);
      }
    },
    [selectedIds, refresh, clearSelection, toast],
  );

  const handleViewProfile = useCallback(async (user) => {
    setSelectedUser(user);
    setIsDrawerOpen(true);
    setActiveBooking(null);
    setActionMenuOpenId(null);
    setAvatarUrl('');
    try {
      setAvatarUrl(await resolveUserAvatar(user.avatarPath));
    } catch {
      setAvatarUrl('');
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

  const enterEditMode = useCallback(() => {
    if (!selectedUser) return;
    setEditDraft({ name: selectedUser.name, phone: selectedUser.phone });
    setIsEditing(true);
  }, [selectedUser]);

  const cancelEdit = useCallback(() => {
    setIsEditing(false);
    setEditDraft({ name: '', phone: '' });
  }, []);

  const syncSelectedUser = useCallback((patch) => {
    setSelectedUser((current) => (current ? { ...current, ...patch } : current));
  }, []);

  const handleSaveUser = useCallback(
    async (event) => {
      event.preventDefault();
      if (!selectedUser) return;
      setIsSavingUser(true);
      try {
        await updateUser(selectedUser.id, editDraft.name, editDraft.phone);
        syncSelectedUser({ name: editDraft.name.trim(), phone: editDraft.phone });
        await refresh();
        setIsEditing(false);
        toast.success('User updated', `${editDraft.name.trim()}'s profile was saved.`);
      } catch (error) {
        toast.error(
          'Update failed',
          error instanceof Error ? error.message : 'Unable to update user.',
        );
      } finally {
        setIsSavingUser(false);
      }
    },
    [selectedUser, editDraft, refresh, syncSelectedUser, toast],
  );

  const handleToggleVerification = useCallback(
    async (user) => {
      const nextStatus = user.verified ? 'unverified' : 'verified';
      setActionLoadingId(`${user.id}:verification`);
      setActionMenuOpenId(null);
      try {
        await setCustomerVerification(user.id, nextStatus);
        syncSelectedUser({
          verified: nextStatus === 'verified',
          verificationStatus: nextStatus,
        });
        await refresh();
        toast.success(
          nextStatus === 'verified' ? 'User verified' : 'Verification removed',
          `${user.name} is now ${nextStatus === 'verified' ? 'verified' : 'unverified'}.`,
        );
      } catch (error) {
        toast.error(
          'Verification update failed',
          error instanceof Error ? error.message : 'Unable to update verification.',
        );
      } finally {
        setActionLoadingId(null);
      }
    },
    [refresh, syncSelectedUser, toast],
  );

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

  const handleToggleStatus = useCallback(
    async (user) => {
      const nextStatus = user.status === 'Active' ? 'SUSPENDED' : 'ACTIVE';
      setActionLoadingId(`${user.id}:status`);
      setActionMenuOpenId(null);
      try {
        await setAccountStatus(user.id, nextStatus);
        syncSelectedUser({ status: nextStatus === 'SUSPENDED' ? 'Suspended' : 'Active' });
        await refresh();
        toast.success(
          nextStatus === 'SUSPENDED' ? 'User suspended' : 'User reactivated',
          `${user.name} is now ${nextStatus === 'SUSPENDED' ? 'suspended' : 'active'}.`,
        );
      } catch (error) {
        toast.error(
          'Status update failed',
          error instanceof Error ? error.message : 'Unable to update status.',
        );
      } finally {
        setActionLoadingId(null);
      }
    },
    [refresh, syncSelectedUser, toast],
  );

  const handleDelete = useCallback((user) => {
    setActionMenuOpenId(null);
    setDeleteTarget(user);
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

  return useMemo(
    () => ({
      isLoading,
      searchQuery,
      setSearchQuery,
      filterStatus,
      setFilterStatus,
      filterVerified,
      setFilterVerified,
      currentPage,
      setCurrentPage,
      actionMenuOpenId,
      activeTab,
      setActiveTab,
      verifications,
      selectedVerification,
      setSelectedVerification,
      reviewNotes,
      setReviewNotes,
      reviewing,
      loadError: error,
      confirm,
      closeConfirm,
      selectedUser,
      avatarUrl,
      userBookings,
      isBookingsLoading,
      activeBooking,
      setActiveBooking,
      isDrawerOpen,
      setIsDrawerOpen,
      isEditing,
      editDraft,
      setEditDraft,
      isSavingUser,
      actionLoadingId,
      deleteTarget,
      setDeleteTarget,
      selectedIds,
      selectedCount: selectedIds.size,
      isSelectionActive: selectedIds.size > 0,
      bulkAction,
      isBulkLoading,
      toast,
      itemsPerPage: 10,
      refresh,
      decide,
      toggleActionMenu,
      handleViewProfile,
      enterEditMode,
      cancelEdit,
      handleSaveUser,
      handleToggleStatus,
      handleToggleVerification,
      handleViewBooking,
      handleDelete,
      toggleSelectUser,
      selectUser,
      toggleSelectAll,
      clearSelection,
      handleBulkStatus,
      handleBulkVerification,
      count,
      totalPages,
      currentUsers: users,
      getStatusBadge,
      stats,
    }),
    [
      isLoading,
      searchQuery,
      filterStatus,
      filterVerified,
      currentPage,
      actionMenuOpenId,
      activeTab,
      verifications,
      selectedVerification,
      reviewNotes,
      reviewing,
      error,
      confirm,
      selectedUser,
      avatarUrl,
      userBookings,
      isBookingsLoading,
      activeBooking,
      isDrawerOpen,
      isEditing,
      editDraft,
      isSavingUser,
      actionLoadingId,
      deleteTarget,
      refresh,
      decide,
      toggleActionMenu,
      handleViewProfile,
      enterEditMode,
      cancelEdit,
      handleSaveUser,
      handleToggleStatus,
      handleToggleVerification,
      handleViewBooking,
      handleDelete,
      toggleSelectUser,
      selectUser,
      toggleSelectAll,
      clearSelection,
      handleBulkStatus,
      handleBulkVerification,
      selectedIds,
      bulkAction,
      isBulkLoading,
      count,
      totalPages,
      users,
      getStatusBadge,
      stats,
      closeConfirm,
      setCurrentPage,
      setFilterStatus,
      setFilterVerified,
      setSelectedVerification,
      setReviewNotes,
      setIsDrawerOpen,
      setActiveBooking,
      setEditDraft,
      setDeleteTarget,
      toast,
    ],
  );
}
