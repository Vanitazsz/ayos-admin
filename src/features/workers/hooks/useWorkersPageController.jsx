import {
  bulkSetWorkerVerification,
  loadWorkerFinance,
  loadWorkerVerificationDocs,
  loadWorkersPage,
  rejectWorkerVerification,
  reviewWorker,
  setAccountStatus,
  softDeleteAccount,
  restoreAccountFromTrash,
  updateWorker,
  updateWorkerEmail,
  updateWorkerVerification,
  loadCatalog,
} from '../logic/WorkersPageLogic';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { UserCheck, UserX, AlertCircle, Briefcase } from 'lucide-react';
import { uploadVerificationImage, supabase } from '../../../services/adminShared';
import { useToast } from '../../../context/ToastContext';
import { useServerPagination } from '../../../hooks/useServerPagination';
import { useDebouncedValue } from '../../../hooks/useDebouncedValue';
import { useDateFilter } from '../../../hooks/useDateFilter';

export function useWorkersPageController() {
  const toast = useToast();
  const dateFilter = useDateFilter({ canModify: true });
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [filterVerified, setFilterVerified] = useState('All');
  const [selectedWorker, setSelectedWorker] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [actionMenuOpenId, setActionMenuOpenId] = useState(null);
  const [activeTab, setActiveTab] = useState('all');
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [rejectNotes, setRejectNotes] = useState('');
  const [workerToReject, setWorkerToReject] = useState(null);
  const [editWorker, setEditWorker] = useState(null);
  const [isEditDrawerOpen, setIsEditDrawerOpen] = useState(false);
  const [isSavingWorker, setIsSavingWorker] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [industries, setIndustries] = useState([]);
  const [skills, setSkills] = useState([]);
  const [verificationDocs, setVerificationDocs] = useState(null);
  const [isEditingVerification, setIsEditingVerification] = useState(false);
  const [workerVerificationDraft, setWorkerVerificationDraft] = useState(null);
  const [isSavingVerification, setIsSavingVerification] = useState(false);
  const [confirm, setConfirm] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  const debouncedSearch = useDebouncedValue(searchTerm);

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

  const fetchWorkers = useCallback(
    ({ page, pageSize }) =>
      loadWorkersPage({
        search: debouncedSearch,
        status: filterStatus,
        verified: filterVerified,
        reviewOnly: activeTab === 'review',
        sort: dateFilter.sort,
        field: dateFilter.field,
        dateRange: dateFilter.effectiveRange,
        page,
        pageSize,
      }),
    [debouncedSearch, filterStatus, filterVerified, activeTab, dateFilter],
  );

  const {
    rows: filteredWorkers,
    count,
    meta,
    error: loadError,
    isLoading,
    refresh,
    currentPage,
    setCurrentPage,
    totalPages,
  } = useServerPagination({ fetchPage: fetchWorkers });

  const needsReview = useCallback(
    (worker) =>
      Boolean(worker.verificationId) &&
      worker.verificationStatus !== 'APPROVED',
    [],
  );

  const [finance, setFinance] = useState({});

  useEffect(() => {
    const ids = filteredWorkers.map((worker) => worker.id);
    let cancelled = false;
    void loadWorkerFinance(ids)
      .then((statsById) => {
        if (!cancelled) setFinance(statsById);
      })
      .catch(() => {
        if (!cancelled) setFinance({});
      });
    return () => {
      cancelled = true;
    };
  }, [filteredWorkers]);

  const paginatedWorkers = useMemo(
    () =>
      filteredWorkers.map((worker) => {
        const stats = finance[worker.id];
        if (!stats) return worker;
        return {
          ...worker,
          rating:
            stats.rating != null ? Number(stats.rating).toFixed(1) : worker.rating,
          earnings: stats.earnings ?? worker.earnings,
        };
      }),
    [filteredWorkers, finance],
  );

  const stats = useMemo(
    () => [
      {
        label: 'Total Workers',
        value: meta?.stats?.total ?? 0,
        icon: Briefcase,
      },
      {
        label: 'Active Workers',
        value: meta?.stats?.active ?? 0,
        icon: UserCheck,
      },
      {
        label: 'Pending Verification',
        value: meta?.stats?.pendingReview ?? 0,
        icon: AlertCircle,
      },
      {
        label: 'Suspended',
        value: meta?.stats?.suspended ?? 0,
        icon: UserX,
      },
    ],
    [meta],
  );

  const toggleActionMenu = useCallback((id) => {
    setActionMenuOpenId((current) => (current === id ? null : id));
  }, []);

  const closeConfirm = useCallback(
    () => setConfirm((s) => ({ ...s, isOpen: false })),
    [],
  );

  const handleViewDetails = useCallback(async (worker) => {
    setSelectedWorker(worker);
    setIsDrawerOpen(true);
    setActionMenuOpenId(null);
    setVerificationDocs(undefined);
    setIsEditingVerification(false);
    setWorkerVerificationDraft(null);
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
    setIsDrawerOpen(false);
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

  const handleMoveToTrash = useCallback(
    (worker) => {
      setActionMenuOpenId(null);
      setConfirm({
        isOpen: true,
        title: 'Move to Trash',
        message: `Move "${worker.name}" to trash? They will be suspended and listed in the Trash page until restored or permanently deleted.`,
        confirmLabel: 'Move to Trash',
        onConfirm: async () => {
          try {
            await softDeleteAccount(worker.id);
            setIsDrawerOpen(false);
            await refresh();
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
    [refresh, toast],
  );

  const handleRestore = useCallback(
    (worker) => {
      setActionMenuOpenId(null);
      setConfirm({
        isOpen: true,
        title: 'Restore Worker',
        message: `Restore "${worker.name}"? Their account will be reactivated and removed from the Trash page.`,
        confirmLabel: 'Restore',
        onConfirm: async () => {
          try {
            await restoreAccountFromTrash(worker.trashEntryId);
            setIsDrawerOpen(false);
            await refresh();
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
    [refresh, toast],
  );

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
        try {
          const docs = await loadWorkerVerificationDocs(worker.id);
          setVerificationDocs(
            docs ?? { status: 'NOT_SUBMITTED', idType: '', documents: [] },
          );
        } catch {
          // keep the currently displayed docs
        }
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
    [refresh, syncSelectedWorker, toast, loadWorkerVerificationDocs],
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

  const openRejectModal = useCallback((worker) => {
    setWorkerToReject(worker);
    setRejectNotes('');
    setIsRejectModalOpen(true);
    setActionMenuOpenId(null);
  }, []);

  const submitReject = useCallback(async () => {
    try {
      if (!workerToReject?.verificationId)
        throw new Error('No pending verification');
      const result = await rejectWorkerVerification(
        workerToReject.verificationId,
        rejectNotes,
      );
      const removedPaths = Array.isArray(result?.removed_document_paths)
        ? result.removed_document_paths
        : [];
      if (removedPaths.length > 0) {
        try {
          await supabase
            .storage
            .from('verification-documents')
            .remove(removedPaths);
        } catch {
          // Non-fatal: documents are already unlinked server-side; orphaned
          // files can be cleaned up later.
        }
      }
      await refresh();
      setIsRejectModalOpen(false);
      setWorkerToReject(null);
      setRejectNotes('');
    } catch (error) {
      toast.error('Rejection failed', error.message);
    }
  }, [workerToReject, rejectNotes, refresh, toast]);

  const handleApproveDocs = useCallback(async () => {
    if (!selectedWorker) return;
    await approveWorker(selectedWorker);
    try {
      const docs = await loadWorkerVerificationDocs(selectedWorker.id);
      setVerificationDocs(
        docs ?? { status: 'NOT_SUBMITTED', idType: '', documents: [] },
      );
    } catch {
      setVerificationDocs(null);
    }
  }, [selectedWorker, approveWorker]);

  const enterVerificationEdit = useCallback(() => {
    if (!verificationDocs?.id) return;
    setWorkerVerificationDraft({
      idType: verificationDocs.idType ?? '',
      documents: (verificationDocs.documentPaths ?? []).map((path, index) => ({
        path,
        preview: verificationDocs.documents?.[index] ?? '',
        file: null,
      })),
    });
    setIsEditingVerification(true);
  }, [verificationDocs]);

  const cancelVerificationEdit = useCallback(() => {
    setIsEditingVerification(false);
    setWorkerVerificationDraft(null);
  }, []);

  const handleSaveVerificationEdit = useCallback(async () => {
    if (!selectedWorker || !workerVerificationDraft) return;
    if (!workerVerificationDraft.idType.trim()) {
      toast.error('ID type required', 'Select the document type.');
      return;
    }
    const updatedDocuments = workerVerificationDraft.documents.filter(
      (doc) => doc.path || doc.file,
    );
    if (updatedDocuments.length === 0) {
      toast.error('Document required', 'Keep or upload at least one document.');
      return;
    }
    setIsSavingVerification(true);
    try {
      const documentPaths = [];
      for (const doc of updatedDocuments) {
        documentPaths.push(
          doc.file
            ? await uploadVerificationImage(
                doc.file,
                `worker-${selectedWorker.id}`,
              )
            : doc.path,
        );
      }
      await updateWorkerVerification(verificationDocs.id, {
        idType: workerVerificationDraft.idType.trim(),
        documentPaths,
      });
      setIsEditingVerification(false);
      setWorkerVerificationDraft(null);
      await loadWorkerVerificationDocs(selectedWorker.id)
        .then((docs) =>
          setVerificationDocs(
            docs ?? { status: 'NOT_SUBMITTED', idType: '', documents: [] },
          ),
        )
        .catch(() => setVerificationDocs(null));
      syncSelectedWorker({
        verified: false,
        verificationStatus: 'PENDING',
      });
      await refresh();
      toast.success(
        'Verification updated',
        'Documents saved for review. Verification is now pending.',
      );
    } catch (error) {
      toast.error(
        'Update failed',
        error instanceof Error ? error.message : 'Unable to update verification.',
      );
    } finally {
      setIsSavingVerification(false);
    }
  }, [
    selectedWorker,
    workerVerificationDraft,
    verificationDocs,
    syncSelectedWorker,
    refresh,
    toast,
  ]);

  return useMemo(
    () => ({
      workers: filteredWorkers,
      count,
      pendingReviewCount: meta?.stats?.pendingReview ?? 0,
      searchTerm,
      setSearchTerm,
      filterStatus,
      setFilterStatus,
      filterVerified,
      setFilterVerified,
      dateFilter,
      currentPage,
      setCurrentPage,
      selectedWorker,
      isDrawerOpen,
      setIsDrawerOpen,
      actionMenuOpenId,
      activeTab,
      setActiveTab,
      isRejectModalOpen,
      setIsRejectModalOpen,
      rejectNotes,
      setRejectNotes,
      workerToReject,
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
      handleMoveToTrash,
      handleRestore,
      toggleStatus,
      toggleWorkerVerification,
      approveWorker,
      handleApproveDocs,
      openRejectModal,
      submitReject,
      verificationDocs,
      isEditingVerification,
      workerVerificationDraft,
      setWorkerVerificationDraft,
      isSavingVerification,
      enterVerificationEdit,
      cancelVerificationEdit,
      handleSaveVerificationEdit,
      confirm,
      closeConfirm,
    }),
    [
      count,
      meta,
      searchTerm,
      filterStatus,
      filterVerified,
      dateFilter,
      currentPage,
      selectedWorker,
      isDrawerOpen,
      actionMenuOpenId,
      activeTab,
      isRejectModalOpen,
      rejectNotes,
      workerToReject,
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
      handleMoveToTrash,
      handleRestore,
      toggleStatus,
      toggleWorkerVerification,
      approveWorker,
      handleApproveDocs,
      openRejectModal,
      submitReject,
      setEditWorker,
      setIsEditDrawerOpen,
      verificationDocs,
      isEditingVerification,
      workerVerificationDraft,
      isSavingVerification,
      enterVerificationEdit,
      cancelVerificationEdit,
      handleSaveVerificationEdit,
      confirm,
      closeConfirm,
      setFilterStatus,
      setFilterVerified,
      setCurrentPage,
      setIsDrawerOpen,
      setActiveTab,
      setIsRejectModalOpen,
      setRejectNotes,
      toast,
    ],
  );
}
