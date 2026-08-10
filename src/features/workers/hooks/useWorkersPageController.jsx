import {
  bulkSetWorkerStatus,
  bulkSetWorkerVerification,
  loadWorkerVerificationDocs,
  loadWorkers,
  reviewWorker,
  setAccountStatus,
  updateWorker,
  updateWorkerEmail,
  loadCatalog,
} from '../logic/WorkersPageLogic';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { UserCheck, UserX, AlertCircle, Briefcase } from 'lucide-react';
import { useRealtime } from '../../../hooks/useRealtime';
import { useToast } from '../../../context/ToastContext';
import { usePagination } from '../../../hooks/usePagination';
import { useDebouncedRefresh } from '../../../hooks/useDebouncedRefresh';

export function useWorkersPageController() {
  const toast = useToast();
  const [workers, setWorkers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [filterVerified, setFilterVerified] = useState('All');
  const [selectedWorker, setSelectedWorker] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [workerToDelete, setWorkerToDelete] = useState(null);
  const [actionMenuOpenId, setActionMenuOpenId] = useState(null);
  const [activeTab, setActiveTab] = useState('all');
  const [isRemarksModalOpen, setIsRemarksModalOpen] = useState(false);
  const [remarks, setRemarks] = useState('');
  const [workerToReview, setWorkerToReview] = useState(null);
  const [editWorker, setEditWorker] = useState(null);
  const [isEditDrawerOpen, setIsEditDrawerOpen] = useState(false);
  const [isSavingWorker, setIsSavingWorker] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [industries, setIndustries] = useState([]);
  const [skills, setSkills] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [bulkAction, setBulkAction] = useState(null);
  const [verificationDocs, setVerificationDocs] = useState(null);
  const [confirm, setConfirm] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });
  const isBulkLoading = bulkAction !== null;
  const { schedule, mark } = useDebouncedRefresh();

  const refresh = useCallback(async () => {
    try {
      setLoadError('');
      setWorkers(await loadWorkers());
    } catch (error) {
      setLoadError(
        error instanceof Error ? error.message : 'Unable to load workers.',
      );
    } finally {
      setIsLoading(false);
      mark();
    }
  }, [mark]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    let cancelled = false;
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

  const handleRealtime = useCallback(() => schedule(refresh), [schedule, refresh]);

  useRealtime(['worker_profiles', 'worker_verifications'], handleRealtime);

  const needsReview = useCallback(
    (worker) =>
      Boolean(worker.verificationId) &&
      worker.verificationStatus !== 'APPROVED',
    [],
  );

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
          filterStatus === 'All' || w.status === filterStatus;
        const matchesVerified =
          filterVerified === 'All' ||
          (filterVerified === 'verified' ? w.verified : !w.verified);
        const matchesTab =
          activeTab === 'all' ||
          (activeTab === 'review' && needsReview(w));
        return matchesSearch && matchesStatus && matchesVerified && matchesTab;
      }),
    [workers, searchTerm, filterStatus, filterVerified, activeTab, needsReview],
  );

  const {
    currentPage,
    setCurrentPage,
    totalPages,
    pageData: paginatedWorkers,
  } = usePagination(filteredWorkers, 10);

  const stats = useMemo(
    () => [
      {
        label: 'Total Workers',
        value: workers.length,
        icon: Briefcase,
      },
      {
        label: 'Active Workers',
        value: workers.filter((w) => w.status === 'Active').length,
        icon: UserCheck,
      },
      {
        label: 'Pending Verification',
        value: workers.filter(needsReview).length,
        icon: AlertCircle,
      },
      {
        label: 'Suspended',
        value: workers.filter((w) => w.status === 'Suspended').length,
        icon: UserX,
      },
    ],
    [workers, needsReview],
  );

  const toggleActionMenu = useCallback((id) => {
    setActionMenuOpenId((current) => (current === id ? null : id));
  }, []);

  const closeConfirm = useCallback(
    () => setConfirm((s) => ({ ...s, isOpen: false })),
    [],
  );

  const toggleSelectWorker = useCallback((id) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const selectWorker = useCallback((id) => {
    setActionMenuOpenId(null);
    setSelectedIds((current) => {
      if (current.has(id)) return current;
      const next = new Set(current);
      next.add(id);
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback((workers) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      const allSelected = workers.length > 0 && workers.every((worker) => next.has(worker.id));
      workers.forEach((worker) => {
        if (allSelected) next.delete(worker.id);
        else next.add(worker.id);
      });
      return next;
    });
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  useEffect(() => {
    setSelectedIds(new Set());
  }, [searchTerm, filterStatus, filterVerified, activeTab]);

  const handleBulkStatus = useCallback(
    async (nextStatus) => {
      if (!selectedIds.size) return;
      const ids = [...selectedIds];
      setBulkAction(nextStatus);
      try {
        await bulkSetWorkerStatus(ids, nextStatus);
        clearSelection();
        await refresh();
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
        await bulkSetWorkerVerification(ids, nextStatus);
        clearSelection();
        await refresh();
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
        setBulkAction(null);
      }
    },
    [selectedIds, refresh, clearSelection, toast],
  );

  const handleViewDetails = useCallback(async (worker) => {
    setSelectedWorker(worker);
    setIsDrawerOpen(true);
    setActionMenuOpenId(null);
    setVerificationDocs(undefined);
    try {
      const docs = await loadWorkerVerificationDocs(worker.id);
      setVerificationDocs(
        docs ?? { status: 'NOT_SUBMITTED', idType: '', documents: [] },
      );
    } catch {
      setVerificationDocs(null);
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
    setIsEditDrawerOpen(true);
    setActionMenuOpenId(null);
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
        await refresh();
        setIsEditDrawerOpen(false);
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
    [editWorker, refresh, toast],
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

  const handleDeleteClick = useCallback((worker) => {
    setWorkerToDelete(worker);
    setActionMenuOpenId(null);
  }, []);

  const toggleStatus = useCallback(
    async (worker) => {
      const nextStatus = worker.status === 'Active' ? 'SUSPENDED' : 'ACTIVE';
      setActionLoadingId(`${worker.id}:status`);
      try {
        await setAccountStatus(worker.id, nextStatus);
        syncSelectedWorker({ status: nextStatus === 'SUSPENDED' ? 'Suspended' : 'Active' });
        await refresh();
        toast.success(
          nextStatus === 'SUSPENDED' ? 'Worker suspended' : 'Worker reactivated',
          `${worker.name} is now ${nextStatus === 'SUSPENDED' ? 'suspended' : 'active'}.`,
        );
      } catch (error) {
        toast.error('Status update failed', error.message);
      } finally {
        setActionLoadingId(null);
        setActionMenuOpenId(null);
      }
    },
    [refresh, syncSelectedWorker, toast],
  );

  const toggleWorkerVerification = useCallback(
    async (worker) => {
      const nextStatus = worker.verified ? 'unverified' : 'verified';
      setActionLoadingId(`${worker.id}:verification`);
      try {
        await bulkSetWorkerVerification([worker.id], nextStatus);
        syncSelectedWorker({
          verified: nextStatus === 'verified',
          verificationStatus: nextStatus === 'verified' ? 'APPROVED' : 'PENDING',
        });
        await refresh();
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
        setActionMenuOpenId(null);
      }
    },
    [refresh, syncSelectedWorker, toast],
  );

  const approveWorker = useCallback(
    async (worker) => {
      try {
        if (!worker.verificationId)
          throw new Error('No pending verification');
        await reviewWorker(worker.verificationId, 'APPROVED', null);
        await refresh();
      } catch (error) {
        toast.error('Approval failed', error.message);
      } finally {
        setActionMenuOpenId(null);
      }
    },
    [refresh, toast],
  );

  const openRemarksModal = useCallback((worker) => {
    setWorkerToReview(worker);
    setRemarks('');
    setIsRemarksModalOpen(true);
    setActionMenuOpenId(null);
  }, []);

  const submitRemarks = useCallback(async () => {
    try {
      if (!workerToReview?.verificationId)
        throw new Error('No pending verification');
      await reviewWorker(
        workerToReview.verificationId,
        'NEEDS_DOCUMENTS',
        remarks,
      );
      await refresh();
      setIsRemarksModalOpen(false);
    } catch (error) {
      toast.error('Document request failed', error.message);
    }
  }, [workerToReview, remarks, refresh, toast]);

  return useMemo(
    () => ({
      workers,
      searchTerm,
      setSearchTerm,
      filterStatus,
      setFilterStatus,
      filterVerified,
      setFilterVerified,
      currentPage,
      setCurrentPage,
      selectedWorker,
      isDrawerOpen,
      setIsDrawerOpen,
      workerToDelete,
      setWorkerToDelete,
      actionMenuOpenId,
      activeTab,
      setActiveTab,
      isRemarksModalOpen,
      setIsRemarksModalOpen,
      remarks,
      setRemarks,
      workerToReview,
      editWorker,
      setEditWorker,
      isEditDrawerOpen,
      setIsEditDrawerOpen,
      isSavingWorker,
      actionLoadingId,
      industries,
      skills,
      industryGroups,
      toggleSkill,
      toggleIndustry,
      setWorkerRate,
      isLoading,
      loadError,
      refresh,
      needsReview,
      filteredWorkers,
      totalPages,
      paginatedWorkers,
      stats,
      toggleActionMenu,
      handleViewDetails,
      handleEditWorker,
      handleSaveWorker,
      handleDeleteClick,
      toggleStatus,
      toggleWorkerVerification,
      approveWorker,
      openRemarksModal,
      submitRemarks,
      selectedIds,
      selectedCount: selectedIds.size,
      isSelectionActive: selectedIds.size > 0,
      bulkAction,
      isBulkLoading,
      toggleSelectWorker,
      selectWorker,
      toggleSelectAll,
      clearSelection,
      handleBulkStatus,
      handleBulkVerification,
      verificationDocs,
      confirm,
      closeConfirm,
    }),
    [
      workers,
      searchTerm,
      filterStatus,
      filterVerified,
      currentPage,
      selectedWorker,
      isDrawerOpen,
      workerToDelete,
      actionMenuOpenId,
      activeTab,
      isRemarksModalOpen,
      remarks,
      workerToReview,
      editWorker,
      isEditDrawerOpen,
      isSavingWorker,
      actionLoadingId,
      industries,
      skills,
      industryGroups,
      toggleSkill,
      toggleIndustry,
      setWorkerRate,
      isLoading,
      loadError,
      refresh,
      needsReview,
      filteredWorkers,
      totalPages,
      paginatedWorkers,
      stats,
      toggleActionMenu,
      handleViewDetails,
      handleEditWorker,
      handleSaveWorker,
      handleDeleteClick,
      toggleStatus,
      toggleWorkerVerification,
      approveWorker,
      openRemarksModal,
      submitRemarks,
      toggleSelectWorker,
      selectWorker,
      toggleSelectAll,
      clearSelection,
      handleBulkStatus,
      handleBulkVerification,
      setEditWorker,
      setIsEditDrawerOpen,
      selectedIds,
      bulkAction,
      isBulkLoading,
      verificationDocs,
      confirm,
      closeConfirm,
      setFilterStatus,
      setFilterVerified,
      setCurrentPage,
      setIsDrawerOpen,
      setWorkerToDelete,
      setActiveTab,
      setIsRemarksModalOpen,
      setRemarks,
      toast,
    ],
  );
}
