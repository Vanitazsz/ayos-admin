import {
  bulkSetAccountStatus,
  bulkSetCustomerVerification,
  bulkSetWorkerStatus,
  bulkSetWorkerVerification,
  loadBookingsForUser,
  loadCatalog,
  loadLocations,
  loadUserVerificationDocs,
  loadUsersPage,
  loadWorkerVerificationDocs,
  loadWorkers,
  resolveBookingMedia,
  resolveUserAvatar,
  restoreAccountFromTrash,
  setAccountStatus,
  setCustomerVerification,
  softDeleteAccount,
  updateUser,
  updateUserEmail,
  updateWorker,
  updateWorkerEmail,
} from '../logic/LocationsPageLogic';
import { useCallback, useEffect, useMemo, useState } from 'react';
import Badge from '../../../components/ui/Badge';
import { useToast } from '../../../context/ToastContext';
import { useServerPagination } from '../../../hooks/useServerPagination';
import { usePagination } from '../../../hooks/usePagination';
import { useDebouncedRefresh } from '../../../hooks/useDebouncedRefresh';
import { useRealtime } from '../../../hooks/useRealtime';

export function useLocationsPageController() {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState('users');

  // Shared catalog: all locations (filter dropdowns + drawer map enrichment)
  const [locations, setLocations] = useState([]);
  const locationsById = useMemo(
    () => new Map((locations ?? []).map((location) => [location.id, location])),
    [locations],
  );

  // ---- Users tab ----
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [filterVerified, setFilterVerified] = useState('All');
  const [filterLocation, setFilterLocation] = useState('All');
  const [selectedUserIds, setSelectedUserIds] = useState(() => new Set());
  const [userBulkAction, setUserBulkAction] = useState(null);
  const isUserBulkLoading = userBulkAction !== null;
  const [selectedUser, setSelectedUser] = useState(null);
  const [avatarUrl, setAvatarUrl] = useState('');
  const [userVerificationDocs, setUserVerificationDocs] = useState(undefined);
  const [userBookings, setUserBookings] = useState([]);
  const [isBookingsLoading, setIsBookingsLoading] = useState(false);
  const [activeBooking, setActiveBooking] = useState(null);
  const [isEditingUser, setIsEditingUser] = useState(false);
  const [editDraft, setEditDraft] = useState({ name: '', email: '', phone: '' });
  const [isSavingUser, setIsSavingUser] = useState(false);

  const fetchUsers = useCallback(
    ({ page, pageSize }) =>
      loadUsersPage({
        search: searchQuery,
        status: filterStatus,
        verified: filterVerified,
        location: filterLocation,
        page,
        pageSize,
      }),
    [searchQuery, filterStatus, filterVerified, filterLocation],
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
    filterKey: `${filterStatus}|${filterVerified}|${filterLocation}`,
  });

  // ---- Workers tab ----
  const [workers, setWorkers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [workerFilterStatus, setWorkerFilterStatus] = useState('All');
  const [workerFilterVerified, setWorkerFilterVerified] = useState('All');
  const [workerFilterLocation, setWorkerFilterLocation] = useState('All');
  const [isWorkersLoading, setIsWorkersLoading] = useState(true);
  const [workersError, setWorkersError] = useState('');
  const [selectedWorkerIds, setSelectedWorkerIds] = useState(() => new Set());
  const [workerBulkAction, setWorkerBulkAction] = useState(null);
  const isWorkerBulkLoading = workerBulkAction !== null;
  const [selectedWorker, setSelectedWorker] = useState(null);
  const [workerVerificationDocs, setWorkerVerificationDocs] = useState(undefined);
  const [editWorker, setEditWorker] = useState(null);
  const [isEditWorkerOpen, setIsEditWorkerOpen] = useState(false);
  const [isSavingWorker, setIsSavingWorker] = useState(false);
  const [industries, setIndustries] = useState([]);
  const [skills, setSkills] = useState([]);
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
    void loadCatalog()
      .then(({ industries: loadedIndustries, skills: loadedSkills }) => {
        if (!cancelled) {
          setIndustries(loadedIndustries ?? []);
          setSkills(loadedSkills ?? []);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setIndustries([]);
          setSkills([]);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleRealtime = useCallback(() => {
    schedule(async () => {
      await refreshUsers();
      await loadWorkersData();
    });
  }, [schedule, refreshUsers, loadWorkersData]);

  useRealtime(
    ['accounts', 'user_profiles', 'locations', 'worker_profiles', 'worker_verifications'],
    handleRealtime,
  );

  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [confirm, setConfirm] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });
  const closeConfirm = useCallback(() => setConfirm((s) => ({ ...s, isOpen: false })), []);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // ---- Users tab: filtering, selection, bulk ----
  const toggleSelectUser = useCallback((id) => {
    setSelectedUserIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const selectUser = useCallback((id) => {
    setSelectedUserIds((current) => {
      if (current.has(id)) return current;
      const next = new Set(current);
      next.add(id);
      return next;
    });
  }, []);

  const toggleSelectAllUsers = useCallback((users) => {
    setSelectedUserIds((current) => {
      const next = new Set(current);
      const allSelected = users.length > 0 && users.every((user) => next.has(user.id));
      users.forEach((user) => {
        if (allSelected) next.delete(user.id);
        else next.add(user.id);
      });
      return next;
    });
  }, []);

  const clearUserSelection = useCallback(() => setSelectedUserIds(new Set()), []);

  useEffect(() => {
    setSelectedUserIds(new Set());
  }, [searchQuery, filterStatus, filterVerified, filterLocation]);

  const handleBulkUserStatus = useCallback(
    async (nextStatus) => {
      if (!selectedUserIds.size) return;
      const ids = [...selectedUserIds];
      setUserBulkAction(nextStatus);
      try {
        await bulkSetAccountStatus(ids, nextStatus);
        clearUserSelection();
        await refreshUsers();
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
        setUserBulkAction(null);
      }
    },
    [selectedUserIds, refreshUsers, clearUserSelection, toast],
  );

  const handleBulkUserVerification = useCallback(
    async (nextStatus) => {
      if (!selectedUserIds.size) return;
      const ids = [...selectedUserIds];
      setUserBulkAction(nextStatus);
      try {
        await bulkSetCustomerVerification(ids, nextStatus);
        clearUserSelection();
        await refreshUsers();
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
        setUserBulkAction(null);
      }
    },
    [selectedUserIds, refreshUsers, clearUserSelection, toast],
  );

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

  const syncSelectedUser = useCallback((patch) => {
    setSelectedUser((current) => (current ? { ...current, ...patch } : current));
  }, []);

  const enterEditUserMode = useCallback(() => {
    if (!selectedUser) return;
    setEditDraft({
      name: selectedUser.name,
      email: selectedUser.email,
      phone: selectedUser.phone,
    });
    setIsEditingUser(true);
  }, [selectedUser]);

  const cancelEditUser = useCallback(() => {
    setIsEditingUser(false);
    setEditDraft({ name: '', email: '', phone: '' });
  }, []);

  const saveUser = useCallback(
    async (includeEmail) => {
      if (!selectedUser) return;
      setIsSavingUser(true);
      try {
        if (includeEmail) {
          await updateUserEmail(selectedUser.id, editDraft.email.trim().toLowerCase());
        }
        await updateUser(selectedUser.id, editDraft.name, editDraft.phone);
        syncSelectedUser({
          name: editDraft.name.trim(),
          email: editDraft.email.trim(),
          phone: editDraft.phone,
        });
        await refreshUsers();
        setIsEditingUser(false);
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
    [selectedUser, editDraft, refreshUsers, syncSelectedUser, toast],
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

  const handleToggleUserVerification = useCallback(
    async (user) => {
      const nextStatus = user.verified ? 'unverified' : 'verified';
      setActionLoadingId(`${user.id}:verification`);
      try {
        await setCustomerVerification(user.id, nextStatus);
        syncSelectedUser({
          verified: nextStatus === 'verified',
          verificationStatus: nextStatus,
        });
        await refreshUsers();
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
    [refreshUsers, syncSelectedUser, toast],
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

  const handleToggleUserStatus = useCallback(
    async (user) => {
      const nextStatus = user.status === 'Active' ? 'SUSPENDED' : 'ACTIVE';
      setActionLoadingId(`${user.id}:status`);
      try {
        await setAccountStatus(user.id, nextStatus);
        syncSelectedUser({ status: nextStatus === 'SUSPENDED' ? 'Suspended' : 'Active' });
        await refreshUsers();
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
    [refreshUsers, syncSelectedUser, toast],
  );

  const handleMoveUserToTrash = useCallback(
    (user) => {
      setConfirm({
        isOpen: true,
        title: 'Move to Trash',
        message: `Move "${user.name}" to trash? They will be suspended and listed in the Trash page until restored or permanently deleted.`,
        confirmLabel: 'Move to Trash',
        onConfirm: async () => {
          try {
            await softDeleteAccount(user.id);
            setIsDrawerOpen(false);
            await refreshUsers();
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
    [refreshUsers, toast],
  );

  const handleRestoreUser = useCallback(
    (user) => {
      setConfirm({
        isOpen: true,
        title: 'Restore User',
        message: `Restore "${user.name}"? Their account will be reactivated and removed from the Trash page.`,
        confirmLabel: 'Restore',
        onConfirm: async () => {
          try {
            await restoreAccountFromTrash(user.trashEntryId);
            setIsDrawerOpen(false);
            await refreshUsers();
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
    [refreshUsers, toast],
  );

  // ---- Workers tab: filtering, selection, bulk ----
  const filteredWorkers = useMemo(
    () =>
      workers.filter((w) => {
        const matchesSearch =
          w.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          w.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
          w.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (w.categories ?? []).join(' ').toLowerCase().includes(searchTerm.toLowerCase()) ||
          w.category.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus =
          workerFilterStatus === 'All' || workerFilterStatus === 'Trashed'
            ? workerFilterStatus === 'Trashed'
              ? w.isTrashed
              : true
            : w.status === workerFilterStatus;
        const matchesVerified =
          workerFilterVerified === 'All' ||
          (workerFilterVerified === 'verified' ? w.verified : !w.verified);
        const matchesLocation =
          workerFilterLocation === 'All' || (w.location ?? '') === workerFilterLocation;
        return matchesSearch && matchesStatus && matchesVerified && matchesLocation;
      }),
    [
      workers,
      searchTerm,
      workerFilterStatus,
      workerFilterVerified,
      workerFilterLocation,
    ],
  );

  const {
    currentPage: workersCurrentPage,
    setCurrentPage: setWorkersCurrentPage,
    totalPages: workersTotalPages,
    pageData: paginatedWorkers,
  } = usePagination(filteredWorkers, 10);

  const toggleSelectWorker = useCallback((id) => {
    setSelectedWorkerIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const selectWorker = useCallback((id) => {
    setSelectedWorkerIds((current) => {
      if (current.has(id)) return current;
      const next = new Set(current);
      next.add(id);
      return next;
    });
  }, []);

  const toggleSelectAllWorkers = useCallback((workers) => {
    setSelectedWorkerIds((current) => {
      const next = new Set(current);
      const allSelected = workers.length > 0 && workers.every((worker) => next.has(worker.id));
      workers.forEach((worker) => {
        if (allSelected) next.delete(worker.id);
        else next.add(worker.id);
      });
      return next;
    });
  }, []);

  const clearWorkerSelection = useCallback(() => setSelectedWorkerIds(new Set()), []);

  useEffect(() => {
    setSelectedWorkerIds(new Set());
  }, [searchTerm, workerFilterStatus, workerFilterVerified, workerFilterLocation]);

  const handleBulkWorkerStatus = useCallback(
    async (nextStatus) => {
      if (!selectedWorkerIds.size) return;
      const ids = [...selectedWorkerIds];
      setWorkerBulkAction(nextStatus);
      try {
        await bulkSetWorkerStatus(ids, nextStatus);
        clearWorkerSelection();
        await loadWorkersData();
        toast.success(
          nextStatus === 'SUSPENDED' ? 'Workers suspended' : 'Workers reactivated',
          `${ids.length} worker${ids.length === 1 ? '' : 's'} ${
            nextStatus === 'SUSPENDED' ? 'suspended' : 'reactivated'
          }.`,
        );
      } catch (error) {
        toast.error(
          'Bulk status update failed',
          error instanceof Error ? error.message : 'Unable to update statuses.',
        );
      } finally {
        setWorkerBulkAction(null);
      }
    },
    [selectedWorkerIds, loadWorkersData, clearWorkerSelection, toast],
  );

  const handleBulkWorkerVerification = useCallback(
    async (nextStatus) => {
      if (!selectedWorkerIds.size) return;
      const ids = [...selectedWorkerIds];
      setWorkerBulkAction(nextStatus);
      try {
        await bulkSetWorkerVerification(ids, nextStatus);
        clearWorkerSelection();
        await loadWorkersData();
        toast.success(
          nextStatus === 'verified' ? 'Workers verified' : 'Verification removed',
          `${ids.length} worker${ids.length === 1 ? '' : 's'} now ${
            nextStatus === 'verified' ? 'verified' : 'unverified'
          }.`,
        );
      } catch (error) {
        toast.error(
          'Bulk verification update failed',
          error instanceof Error ? error.message : 'Unable to update verification.',
        );
      } finally {
        setWorkerBulkAction(null);
      }
    },
    [selectedWorkerIds, loadWorkersData, clearWorkerSelection, toast],
  );

  // ---- Workers tab: drawer ----
  const handleViewWorkerDetails = useCallback(async (worker) => {
    setSelectedWorker(worker);
    setActiveTab('workers');
    setIsDrawerOpen(true);
    setWorkerVerificationDocs(undefined);
    try {
      const docs = await loadWorkerVerificationDocs(worker.id);
      setWorkerVerificationDocs(
        docs ?? { status: 'NOT_SUBMITTED', idType: '', documents: [] },
      );
    } catch {
      setWorkerVerificationDocs(null);
    }
  }, []);

  const syncSelectedWorker = useCallback((patch) => {
    setSelectedWorker((current) => (current ? { ...current, ...patch } : current));
  }, []);

  const handleEditWorker = useCallback((worker) => {
    setEditWorker({
      id: worker.id,
      name: worker.name,
      email: worker.email,
      originalEmail: worker.email,
      phone: worker.phone,
      bio: worker.bio ?? '',
      serviceArea: worker.location ?? '',
      skillIds: Array.isArray(worker.skillIds) ? [...worker.skillIds] : [],
      rates: Object.fromEntries(
        (worker.skills ?? []).map((skill) => [
          skill.id,
          skill.rateMinor != null ? skill.rateMinor : null,
        ]),
      ),
      experience: worker.experience ?? '',
    });
    setIsEditWorkerOpen(true);
    setIsDrawerOpen(false);
  }, []);

  const toggleSkill = useCallback((skillId) => {
    setEditWorker((current) => {
      if (!current) return current;
      const selected = new Set(current.skillIds);
      if (selected.has(skillId)) selected.delete(skillId);
      else selected.add(skillId);
      return { ...current, skillIds: [...selected] };
    });
  }, []);

  const toggleIndustry = useCallback((industryName) => {
    setEditWorker((current) => {
      if (!current) return current;
      const groupSkills = skills.filter((skill) => skill.industry === industryName);
      const groupSkillIds = groupSkills.map((skill) => skill.id);
      if (groupSkillIds.length === 0) return current;
      const selected = new Set(current.skillIds);
      const allSelected = groupSkillIds.every((id) => selected.has(id));
      groupSkillIds.forEach((id) => {
        if (allSelected) selected.delete(id);
        else selected.add(id);
      });
      return { ...current, skillIds: [...selected] };
    });
  }, [skills]);

  const industryGroups = useMemo(() => {
    const orderByName = new Map(
      [...industries]
        .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name))
        .map((industry) => [industry.name, industry.sortOrder]),
    );
    const grouped = new Map();
    skills.forEach((skill) => {
      const key = skill.industry || 'Uncategorized';
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key).push(skill);
    });
    return [...grouped.entries()]
      .map(([name, groupSkills]) => ({
        name,
        sortOrder: orderByName.get(name) ?? Number.MAX_SAFE_INTEGER,
        skills: [...groupSkills].sort((a, b) => a.name.localeCompare(b.name)),
      }))
      .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
  }, [industries, skills]);

  const setWorkerRate = useCallback((skillId, rateMinor) => {
    setEditWorker((current) =>
      current ? { ...current, rates: { ...current.rates, [skillId]: rateMinor } } : current,
    );
  }, []);

  const saveWorker = useCallback(
    async (includeEmail) => {
      if (!editWorker) return;
      setIsSavingWorker(true);
      try {
        if (includeEmail) {
          await updateWorkerEmail(editWorker.id, editWorker.email.trim().toLowerCase());
        }
        await updateWorker(editWorker.id, editWorker);
        await loadWorkersData();
        setIsEditWorkerOpen(false);
        toast.success('Worker updated', `${editWorker.name.trim()}'s profile was saved.`);
      } catch (error) {
        toast.error(
          'Update failed',
          error instanceof Error ? error.message : 'Unable to update worker.',
        );
      } finally {
        setIsSavingWorker(false);
      }
    },
    [editWorker, loadWorkersData, toast],
  );

  const handleSaveWorker = useCallback(
    (event) => {
      event.preventDefault();
      if (!editWorker) return;
      if (!Array.isArray(editWorker.skillIds) || editWorker.skillIds.length === 0) {
        toast.error('Skills required', 'Select at least one skill.');
        return;
      }
      const normalizedEmail = (editWorker.email || '').trim().toLowerCase();
      const currentEmail = (editWorker.originalEmail || '').trim().toLowerCase();
      if (normalizedEmail !== currentEmail) {
        setConfirm({
          isOpen: true,
          title: 'Change email address?',
          message: `This will change the login email from ${currentEmail} to ${normalizedEmail}. The worker must sign in with the new email going forward.`,
          onConfirm: () => saveWorker(true),
        });
        return;
      }
      void saveWorker(false);
    },
    [editWorker, saveWorker, toast],
  );

  const handleToggleWorkerStatus = useCallback(
    async (worker) => {
      const nextStatus = worker.status === 'Active' ? 'SUSPENDED' : 'ACTIVE';
      setActionLoadingId(`${worker.id}:status`);
      try {
        await setAccountStatus(worker.id, nextStatus);
        syncSelectedWorker({ status: nextStatus === 'SUSPENDED' ? 'Suspended' : 'Active' });
        await loadWorkersData();
        toast.success(
          nextStatus === 'SUSPENDED' ? 'Worker suspended' : 'Worker reactivated',
          `${worker.name} is now ${nextStatus === 'SUSPENDED' ? 'suspended' : 'active'}.`,
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
    [loadWorkersData, syncSelectedWorker, toast],
  );

  const handleToggleWorkerVerification = useCallback(
    async (worker) => {
      const nextStatus = worker.verified ? 'unverified' : 'verified';
      setActionLoadingId(`${worker.id}:verification`);
      try {
        await bulkSetWorkerVerification([worker.id], nextStatus);
        syncSelectedWorker({
          verified: nextStatus === 'verified',
          verificationStatus: nextStatus === 'verified' ? 'APPROVED' : 'PENDING',
        });
        await loadWorkersData();
        toast.success(
          nextStatus === 'verified' ? 'Worker verified' : 'Verification removed',
          `${worker.name} is now ${nextStatus === 'verified' ? 'verified' : 'unverified'}.`,
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
    [loadWorkersData, syncSelectedWorker, toast],
  );

  const handleMoveWorkerToTrash = useCallback(
    (worker) => {
      setConfirm({
        isOpen: true,
        title: 'Move to Trash',
        message: `Move "${worker.name}" to trash? They will be suspended and listed in the Trash page until restored or permanently deleted.`,
        confirmLabel: 'Move to Trash',
        onConfirm: async () => {
          try {
            await softDeleteAccount(worker.id);
            setIsDrawerOpen(false);
            await loadWorkersData();
            toast.success('Worker moved to trash', `${worker.name} was suspended and moved to trash.`);
          } catch (error) {
            toast.error(
              'Operation failed',
              error instanceof Error ? error.message : 'Unable to move worker to trash.',
            );
          }
        },
      });
    },
    [loadWorkersData, toast],
  );

  const handleRestoreWorker = useCallback(
    (worker) => {
      setConfirm({
        isOpen: true,
        title: 'Restore Worker',
        message: `Restore "${worker.name}"? Their account will be reactivated and removed from the Trash page.`,
        confirmLabel: 'Restore',
        onConfirm: async () => {
          try {
            await restoreAccountFromTrash(worker.trashEntryId);
            setIsDrawerOpen(false);
            await loadWorkersData();
            toast.success('Worker restored', `${worker.name}'s account was reactivated.`);
          } catch (error) {
            toast.error(
              'Restore failed',
              error instanceof Error ? error.message : 'Unable to restore worker.',
            );
          }
        },
      });
    },
    [loadWorkersData, toast],
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

  const locationFor = useCallback(
    (person) => (person?.locationId ? locationsById.get(person.locationId) ?? null : null),
    [locationsById],
  );

  const refresh = useCallback(async () => {
    await refreshUsers();
    await loadWorkersData();
  }, [refreshUsers, loadWorkersData]);

  return useMemo(
    () => ({
      activeTab,
      setActiveTab,
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
      filterLocation,
      setFilterLocation,
      selectedUserIds,
      selectedUserCount: selectedUserIds.size,
      isUserSelectionActive: selectedUserIds.size > 0,
      userBulkAction,
      isUserBulkLoading,
      toggleSelectUser,
      selectUser,
      toggleSelectAllUsers,
      clearUserSelection,
      handleBulkUserStatus,
      handleBulkUserVerification,
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
      workerFilterLocation,
      setWorkerFilterLocation,
      isWorkersLoading,
      workersError,
      selectedWorkerIds,
      selectedWorkerCount: selectedWorkerIds.size,
      isWorkerSelectionActive: selectedWorkerIds.size > 0,
      workerBulkAction,
      isWorkerBulkLoading,
      toggleSelectWorker,
      selectWorker,
      toggleSelectAllWorkers,
      clearWorkerSelection,
      handleBulkWorkerStatus,
      handleBulkWorkerVerification,
      // Shared drawer + actions
      isDrawerOpen,
      setIsDrawerOpen,
      selectedUser,
      avatarUrl,
      userVerificationDocs,
      userBookings,
      isBookingsLoading,
      activeBooking,
      setActiveBooking,
      isEditingUser,
      editDraft,
      setEditDraft,
      isSavingUser,
      enterEditUserMode,
      cancelEditUser,
      handleSaveUser,
      handleToggleUserStatus,
      handleToggleUserVerification,
      handleViewBooking,
      handleViewUserProfile,
      handleMoveUserToTrash,
      handleRestoreUser,
      selectedWorker,
      workerVerificationDocs,
      editWorker,
      setEditWorker,
      isEditWorkerOpen,
      setIsEditWorkerOpen,
      isSavingWorker,
      industryGroups,
      toggleSkill,
      toggleIndustry,
      setWorkerRate,
      handleEditWorker,
      handleSaveWorker,
      handleToggleWorkerStatus,
      handleToggleWorkerVerification,
      handleViewWorkerDetails,
      handleMoveWorkerToTrash,
      handleRestoreWorker,
      actionLoadingId,
      confirm,
      closeConfirm,
      getStatusBadge,
      refresh,
    }),
    [
      activeTab,
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
      filterLocation,
      selectedUserIds,
      userBulkAction,
      isUserBulkLoading,
      toggleSelectUser,
      selectUser,
      toggleSelectAllUsers,
      clearUserSelection,
      handleBulkUserStatus,
      handleBulkUserVerification,
      workers,
      filteredWorkers,
      paginatedWorkers,
      workersTotalPages,
      workersCurrentPage,
      setWorkersCurrentPage,
      searchTerm,
      workerFilterStatus,
      workerFilterVerified,
      workerFilterLocation,
      isWorkersLoading,
      workersError,
      selectedWorkerIds,
      workerBulkAction,
      isWorkerBulkLoading,
      toggleSelectWorker,
      selectWorker,
      toggleSelectAllWorkers,
      clearWorkerSelection,
      handleBulkWorkerStatus,
      handleBulkWorkerVerification,
      isDrawerOpen,
      selectedUser,
      avatarUrl,
      userVerificationDocs,
      userBookings,
      isBookingsLoading,
      activeBooking,
      isEditingUser,
      editDraft,
      isSavingUser,
      enterEditUserMode,
      cancelEditUser,
      handleSaveUser,
      handleToggleUserStatus,
      handleToggleUserVerification,
      handleViewBooking,
      handleViewUserProfile,
      handleMoveUserToTrash,
      handleRestoreUser,
      selectedWorker,
      workerVerificationDocs,
      editWorker,
      isEditWorkerOpen,
      isSavingWorker,
      industryGroups,
      toggleSkill,
      toggleIndustry,
      setWorkerRate,
      handleEditWorker,
      handleSaveWorker,
      handleToggleWorkerStatus,
      handleToggleWorkerVerification,
      handleViewWorkerDetails,
      handleMoveWorkerToTrash,
      handleRestoreWorker,
      actionLoadingId,
      confirm,
      closeConfirm,
      getStatusBadge,
      refresh,
    ],
  );
}
