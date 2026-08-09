import {
  loadCustomerVerifications,
  loadUsersPage,
  reviewCustomerVerification,
  setAccountStatus,
  subscribe,
  updateUser,
} from '../logic/UsersPageLogic';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Badge from '../../../components/ui/Badge';
import { useToast } from '../../../context/ToastContext';
import { useServerPagination } from '../../../hooks/useServerPagination';

export function useUsersPageController() {
  const [searchQuery, setSearchQuery] = useState('');
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
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isSavingUser, setIsSavingUser] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const toast = useToast();

  const fetchUsers = useCallback(
    ({ page, pageSize }) => loadUsersPage({ search: searchQuery, page, pageSize }),
    [searchQuery],
  );

  const {
    rows: users,
    count,
    error,
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

  const handleViewProfile = useCallback((user) => {
    setSelectedUser(user);
    setIsProfileModalOpen(true);
    setActionMenuOpenId(null);
  }, []);

  const handleEditUser = useCallback((user) => {
    setEditUser({ ...user });
    setIsEditModalOpen(true);
    setActionMenuOpenId(null);
  }, []);

  const handleSaveUser = useCallback(
    async (event) => {
      event.preventDefault();
      if (!editUser) return;
      setIsSavingUser(true);
      try {
        await updateUser(editUser.id, editUser.name, editUser.phone);
        await refresh();
        setIsEditModalOpen(false);
        toast.success('User updated', `${editUser.name}'s profile was saved.`);
      } catch (error) {
        toast.error(
          'Update failed',
          error instanceof Error ? error.message : 'Unable to update user.',
        );
      } finally {
        setIsSavingUser(false);
      }
    },
    [editUser, refresh, toast],
  );

  const handleToggleStatus = useCallback(
    async (user) => {
      const nextStatus = user.status === 'Active' ? 'SUSPENDED' : 'ACTIVE';
      setActionLoadingId(`${user.id}:status`);
      setActionMenuOpenId(null);
      try {
        await setAccountStatus(user.id, nextStatus);
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
    [refresh, toast],
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
      isProfileModalOpen,
      setIsProfileModalOpen,
      editUser,
      setEditUser,
      isEditModalOpen,
      setIsEditModalOpen,
      isSavingUser,
      actionLoadingId,
      deleteTarget,
      setDeleteTarget,
      toast,
      itemsPerPage: 10,
      refresh,
      decide,
      toggleActionMenu,
      handleViewProfile,
      handleEditUser,
      handleSaveUser,
      handleToggleStatus,
      handleDelete,
      count,
      totalPages,
      currentUsers: users,
      getStatusBadge,
    }),
    [
      isLoading,
      searchQuery,
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
      isProfileModalOpen,
      editUser,
      isEditModalOpen,
      isSavingUser,
      actionLoadingId,
      deleteTarget,
      refresh,
      decide,
      toggleActionMenu,
      handleViewProfile,
      handleEditUser,
      handleSaveUser,
      handleToggleStatus,
      handleDelete,
      count,
      totalPages,
      users,
      getStatusBadge,
      closeConfirm,
      setCurrentPage,
      setSelectedVerification,
      setReviewNotes,
      setIsProfileModalOpen,
      setEditUser,
      setIsEditModalOpen,
      setDeleteTarget,
      toast,
    ],
  );
}
