import {
  loadBookingsForUser,
  loadCustomerVerifications,
  loadUsersPage,
  loadUserVerificationDocs,
  resolveBookingMedia,
  resolveUserAvatar,
  reviewCustomerVerification,
  setAccountStatus,
  setCustomerVerification,
  softDeleteAccount,
  restoreAccountFromTrash,
  subscribe,
  updateUser,
  updateUserEmail,
  updateCustomerVerification,
  loadLocations,
} from '../logic/UsersPageLogic';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Badge from '../../../components/ui/Badge';
import { Users, UserCheck, UserX, AlertCircle } from 'lucide-react';
import { useToast } from '../../../context/ToastContext';
import { useServerPagination } from '../../../hooks/useServerPagination';
import { useDebouncedValue } from '../../../hooks/useDebouncedValue';
import { useDateFilter } from '../../../hooks/useDateFilter';
import { applyDateFilter, getRowDate } from '../../../lib/dateFilter';
import { supabase, uploadVerificationImage } from '../../../services/adminShared';

export function useUsersPageController() {
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebouncedValue(searchQuery);
  const [filterStatus, setFilterStatus] = useState('All');
  const [filterVerified, setFilterVerified] = useState('All');
  const [filterLocation, setFilterLocation] = useState('All');
  const [locations, setLocations] = useState([]);
  const dateFilter = useDateFilter({ canModify: true });
  const verificationDateFilter = useDateFilter({ canModify: true });
  const [actionMenuOpenId, setActionMenuOpenId] = useState(null);
  const [activeTab, setActiveTab] = useState('customers');
  const [verifications, setVerifications] = useState([]);
  const [isVerificationsLoading, setIsVerificationsLoading] = useState(false);
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
  const [verificationDocs, setVerificationDocs] = useState(undefined);
  const [userBookings, setUserBookings] = useState([]);
  const [isBookingsLoading, setIsBookingsLoading] = useState(false);
  const [activeBooking, setActiveBooking] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editDraft, setEditDraft] = useState({ name: '', email: '', phone: '' });
  const [isSavingUser, setIsSavingUser] = useState(false);
  const [isEditingVerification, setIsEditingVerification] = useState(false);
  const [verificationDraft, setVerificationDraft] = useState({
    idType: '',
    frontFile: null,
    backFile: null,
    frontPreview: '',
    backPreview: '',
  });
  const [isSavingVerification, setIsSavingVerification] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const toast = useToast();

  const fetchUsers = useCallback(
    ({ page, pageSize }) =>
      loadUsersPage({
        search: debouncedSearch,
        status: filterStatus,
        verified: filterVerified,
        location: filterLocation,
        sort: dateFilter.sort,
        field: dateFilter.field,
        dateRange: dateFilter.effectiveRange,
        page,
        pageSize,
      }),
    [debouncedSearch, filterStatus, filterVerified, filterLocation, dateFilter],
  );

  const {
    rows: users,
    count,
    error,
    meta,
    isLoading,
    refresh: refreshUsers,
    currentPage,
    setCurrentPage,
    totalPages,
  } = useServerPagination({
    fetchPage: fetchUsers,
    filterKey: `${filterStatus}|${filterVerified}|${filterLocation}|${dateFilter.sort}|${dateFilter.field}|${dateFilter.preset}|${dateFilter.customRange.from}|${dateFilter.customRange.to}`,
  });

  const filteredVerifications = useMemo(
    () =>
      applyDateFilter(verifications, {
        field: verificationDateFilter.field,
        range: verificationDateFilter.effectiveRange,
        sort: verificationDateFilter.sort,
        getDate: (row) =>
          getRowDate(row, verificationDateFilter.field) ?? getRowDate(row, 'created'),
      }),
    [verifications, verificationDateFilter],
  );

  const loadVerifications = useCallback(async () => {
    setIsVerificationsLoading(true);
    try {
      setVerifications(await loadCustomerVerifications());
    } catch {
      setVerifications([]);
    } finally {
      setIsVerificationsLoading(false);
    }
  }, []);

  const refresh = useCallback(async () => {
    await refreshUsers();
    await loadVerifications();
  }, [refreshUsers, loadVerifications]);

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

  const refreshUsersRef = useRef(refreshUsers);
  refreshUsersRef.current = refreshUsers;
  const loadVerificationsRef = useRef(loadVerifications);
  loadVerificationsRef.current = loadVerifications;

  useEffect(() => {
    const stops = [
      subscribe('accounts', () => {
        void refreshUsersRef.current();
      }, { debounceMs: 5000 }),
      subscribe('customer_verifications', () => {
        void loadVerificationsRef.current();
      }, { filter: 'status=eq.pending' }),
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

  const syncSelectedUser = useCallback((patch) => {
    setSelectedUser((current) => (current ? { ...current, ...patch } : current));
  }, []);

  const reviewUserDocs = useCallback(
    (decision) => {
      if (!selectedUser || !verificationDocs?.id) return;
      const label = decision === 'approved' ? 'Approve' : 'Reject';
      setConfirm({
        isOpen: true,
        title: `${label} Verification`,
        message: `${label} the submitted documents for ${selectedUser.name}?`,
        onConfirm: async () => {
          setReviewing(true);
          try {
            const documentPaths = [verificationDocs.frontPath, verificationDocs.backPath].filter(Boolean);
            await reviewCustomerVerification(verificationDocs.id, decision, reviewNotes);
            if (decision === 'rejected' && documentPaths.length) {
              try {
                await supabase.storage.from('verification-documents').remove(documentPaths);
              } catch {
                // Non-fatal: URLs are already cleared server-side; orphaned
                // files can be removed later if the removal fails.
              }
            }
            syncSelectedUser({
              verified: decision === 'approved',
              verificationStatus: decision === 'approved' ? 'verified' : 'unverified',
            });
            try {
              const docs = await loadUserVerificationDocs(selectedUser.id);
              setVerificationDocs(
                docs ?? { status: 'NOT_SUBMITTED', idType: '', frontUrl: '', backUrl: '' },
              );
            } catch {
              setVerificationDocs(null);
            }
            setReviewNotes('');
            await refresh();
            toast.success(
              label,
              `${selectedUser.name}'s verification was ${
                decision === 'approved' ? 'approved' : 'rejected'
              }.`,
            );
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
    [selectedUser, verificationDocs, reviewNotes, refresh, syncSelectedUser, toast],
  );

  const enterVerificationEdit = useCallback(() => {
    if (!verificationDocs?.id) return;
    setVerificationDraft({
      idType: verificationDocs.idType ?? '',
      frontFile: null,
      backFile: null,
      frontPreview: verificationDocs.frontUrl ?? '',
      backPreview: verificationDocs.backUrl ?? '',
    });
    setIsEditingVerification(true);
  }, [verificationDocs]);

  const cancelVerificationEdit = useCallback(() => {
    setIsEditingVerification(false);
    setVerificationDraft({
      idType: '',
      frontFile: null,
      backFile: null,
      frontPreview: '',
      backPreview: '',
    });
  }, []);

  const handleSaveVerificationEdit = useCallback(async () => {
    if (!selectedUser || !verificationDocs?.id) return;
    if (!verificationDraft.idType.trim()) {
      toast.error('ID type is required', 'Choose the type of government ID.');
      return;
    }
    if (!verificationDraft.frontFile && !verificationDraft.frontPreview) {
      toast.error('Front image is required', 'Upload a replacement front image.');
      return;
    }
    setIsSavingVerification(true);
    try {
      await updateCustomerVerification(verificationDocs.id, {
        idType: verificationDraft.idType.trim(),
        frontPath: verificationDraft.frontFile
          ? await uploadVerificationImage(verificationDraft.frontFile, `customer-${selectedUser.id}`)
          : verificationDocs.frontPath,
        backPath: verificationDraft.backFile
          ? await uploadVerificationImage(verificationDraft.backFile, `customer-${selectedUser.id}`)
          : verificationDocs.backPath,
      });
      try {
        const docs = await loadUserVerificationDocs(selectedUser.id);
        setVerificationDocs(
          docs ?? { status: 'NOT_SUBMITTED', idType: '', frontUrl: '', backUrl: '' },
        );
      } catch {
        setVerificationDocs(null);
      }
      syncSelectedUser({ verified: false, verificationStatus: 'pending' });
      setIsEditingVerification(false);
      await refresh();
      toast.success('Verification updated', `${selectedUser.name}'s verification was updated.`);
    } catch (error) {
      toast.error(
        'Update failed',
        error instanceof Error ? error.message : 'Unable to update verification.',
      );
    } finally {
      setIsSavingVerification(false);
    }
  }, [selectedUser, verificationDocs, verificationDraft, refresh, syncSelectedUser, toast]);

  const toggleActionMenu = useCallback(
    (id) => {
      setActionMenuOpenId((current) => (current === id ? null : id));
    },
    [],
  );

  const handleViewProfile = useCallback(async (user) => {
    setSelectedUser(user);
    setIsDrawerOpen(true);
    setActiveBooking(null);
    setActionMenuOpenId(null);
    setAvatarUrl('');
    setVerificationDocs(undefined);
    setIsEditingVerification(false);
    setVerificationDraft({
      idType: '',
      frontFile: null,
      backFile: null,
      frontPreview: '',
      backPreview: '',
    });
    try {
      setAvatarUrl(await resolveUserAvatar(user.avatarPath));
    } catch {
      setAvatarUrl('');
    }
    try {
      const docs = await loadUserVerificationDocs(user.id);
      setVerificationDocs(
        docs ?? { status: 'NOT_SUBMITTED', idType: '', frontUrl: '', backUrl: '' },
      );
    } catch {
      setVerificationDocs(null);
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
    setEditDraft({
      name: selectedUser.name,
      email: selectedUser.email,
      phone: selectedUser.phone,
    });
    setIsEditing(true);
  }, [selectedUser]);

  const cancelEdit = useCallback(() => {
    setIsEditing(false);
    setEditDraft({ name: '', email: '', phone: '' });
  }, []);

  const saveUser = useCallback(
    async (includeEmail) => {
      if (!selectedUser) return;
      setIsSavingUser(true);
      try {
        if (includeEmail) {
          await updateUserEmail(
            selectedUser.id,
            editDraft.email.trim().toLowerCase(),
          );
        }
        await updateUser(selectedUser.id, editDraft.name, editDraft.phone);
        syncSelectedUser({
          name: editDraft.name.trim(),
          email: editDraft.email.trim(),
          phone: editDraft.phone,
        });
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

  const handleSaveUser = useCallback(
    (event) => {
      event.preventDefault();
      if (!selectedUser) return;
      const normalizedEmail = editDraft.email.trim().toLowerCase();
      const currentEmail = (selectedUser.email || '').trim().toLowerCase();
      if (normalizedEmail !== currentEmail) {
        setConfirm({
          isOpen: true,
          title: 'Change email address?',
          message: `This will change the login email from ${currentEmail} to ${normalizedEmail}. The user must sign in with the new email going forward.`,
          onConfirm: () => saveUser(true),
        });
        return;
      }
      void saveUser(false);
    },
    [selectedUser, editDraft.email, saveUser],
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

  const handleMoveToTrash = useCallback(
    (user) => {
      setActionMenuOpenId(null);
      setConfirm({
        isOpen: true,
        title: 'Move to Trash',
        message: `Move "${user.name}" to trash? They will be suspended and listed in the Trash page until restored or permanently deleted.`,
        confirmLabel: 'Move to Trash',
        onConfirm: async () => {
          try {
            await softDeleteAccount(user.id);
            setIsDrawerOpen(false);
            await refresh();
            toast.success('User moved to trash', `${user.name} was suspended and moved to trash.`);
          } catch (error) {
            toast.error(
              'Operation failed',
              error instanceof Error ? error.message : 'Unable to move user to trash.',
            );
          }
        },
      });
    },
    [refresh, toast],
  );

  const handleRestore = useCallback(
    (user) => {
      setActionMenuOpenId(null);
      setConfirm({
        isOpen: true,
        title: 'Restore User',
        message: `Restore "${user.name}"? Their account will be reactivated and removed from the Trash page.`,
        confirmLabel: 'Restore',
        onConfirm: async () => {
          try {
            await restoreAccountFromTrash(user.trashEntryId);
            setIsDrawerOpen(false);
            await refresh();
            toast.success('User restored', `${user.name}'s account was reactivated.`);
          } catch (error) {
            toast.error(
              'Restore failed',
              error instanceof Error ? error.message : 'Unable to restore user.',
            );
          }
        },
      });
    },
    [refresh, toast],
  );

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
      filterLocation,
      setFilterLocation,
      locations,
      dateFilter,
      verificationDateFilter,
      currentPage,
      setCurrentPage,
      actionMenuOpenId,
      activeTab,
      setActiveTab,
      verifications: filteredVerifications,
      verificationsCount: verifications.length,
      isVerificationsLoading,
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
      verificationDocs,
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
      isEditingVerification,
      verificationDraft,
      setVerificationDraft,
      isSavingVerification,
      enterVerificationEdit,
      cancelVerificationEdit,
      handleSaveVerificationEdit,
      actionLoadingId,
      toast,
      itemsPerPage: 10,
      refresh,
      decide,
      reviewUserDocs,
      toggleActionMenu,
      handleViewProfile,
      enterEditMode,
      cancelEdit,
      handleSaveUser,
      handleToggleStatus,
      handleToggleVerification,
      handleViewBooking,
      handleMoveToTrash,
      handleRestore,
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
      filterLocation,
      locations,
      dateFilter,
      verificationDateFilter,
      filteredVerifications,
      currentPage,
      actionMenuOpenId,
      activeTab,
      verifications,
      isVerificationsLoading,
      selectedVerification,
      reviewNotes,
      reviewing,
      error,
      confirm,
      selectedUser,
      avatarUrl,
      verificationDocs,
      userBookings,
      isBookingsLoading,
      activeBooking,
      isDrawerOpen,
      isEditing,
      editDraft,
      isSavingUser,
      isEditingVerification,
      verificationDraft,
      isSavingVerification,
      enterVerificationEdit,
      cancelVerificationEdit,
      handleSaveVerificationEdit,
      actionLoadingId,
      refresh,
      decide,
      reviewUserDocs,
      toggleActionMenu,
      handleViewProfile,
      enterEditMode,
      cancelEdit,
      handleSaveUser,
      handleToggleStatus,
      handleToggleVerification,
      handleViewBooking,
      handleMoveToTrash,
      handleRestore,
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
      toast,
    ],
  );
}
