import {
  loadWorkers,
  reviewWorker,
  setAccountStatus,
  updateWorker,
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
  const [industries, setIndustries] = useState([]);
  const [skills, setSkills] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
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
          w.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
          w.category.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus =
          filterStatus === 'All' || w.status === filterStatus;
        const matchesTab =
          activeTab === 'all' ||
          (activeTab === 'review' && needsReview(w));
        return matchesSearch && matchesStatus && matchesTab;
      }),
    [workers, searchTerm, filterStatus, activeTab, needsReview],
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

  const handleViewDetails = useCallback((worker) => {
    setSelectedWorker(worker);
    setIsDrawerOpen(true);
    setActionMenuOpenId(null);
  }, []);

  const handleEditWorker = useCallback((worker) => {
    setEditWorker({
      id: worker.id,
      name: worker.name,
      email: worker.email,
      phone: worker.phone,
      bio: worker.bio ?? '',
      serviceArea: worker.location ?? '',
      skillIds: Array.isArray(worker.skillIds) ? [...worker.skillIds] : [],
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

  const handleSaveWorker = useCallback(
    async (event) => {
      event.preventDefault();
      if (!editWorker) return;
      if (!Array.isArray(editWorker.skillIds) || editWorker.skillIds.length === 0) {
        toast.error('Skills required', 'Select at least one skill.');
        return;
      }
      setIsSavingWorker(true);
      try {
        await updateWorker(editWorker.id, editWorker);
        await refresh();
        setIsEditDrawerOpen(false);
        toast.success('Worker updated', `${editWorker.name}'s profile was saved.`);
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

  const handleDeleteClick = useCallback((worker) => {
    setWorkerToDelete(worker);
    setActionMenuOpenId(null);
  }, []);

  const toggleStatus = useCallback(
    async (worker) => {
      try {
        await setAccountStatus(
          worker.id,
          worker.status === 'Active' ? 'SUSPENDED' : 'ACTIVE',
        );
        await refresh();
      } catch (error) {
        toast.error('Status update failed', error.message);
      } finally {
        setActionMenuOpenId(null);
      }
    },
    [refresh, toast],
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
      industries,
      skills,
      industryGroups,
      toggleSkill,
      toggleIndustry,
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
      approveWorker,
      openRemarksModal,
      submitRemarks,
    }),
    [
      workers,
      searchTerm,
      filterStatus,
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
      industries,
      skills,
      industryGroups,
      toggleSkill,
      toggleIndustry,
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
      approveWorker,
      openRemarksModal,
      submitRemarks,
      setFilterStatus,
      setCurrentPage,
      setIsDrawerOpen,
      setWorkerToDelete,
      setActiveTab,
      setIsRemarksModalOpen,
      setRemarks,
      setEditWorker,
      setIsEditDrawerOpen,
      toast,
    ],
  );
}
