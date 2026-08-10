import {
  loadCatalog,
  loadTrashedEntries,
  loadMostBookedService,
  saveIndustry,
  saveSkill,
  moveSkillToTrash,
  moveIndustryToTrash,
  subscribe,
} from '../logic/ServicesPageLogic';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layers, ArrowUpRight, CheckCircle, Grid } from 'lucide-react';
import { useToast } from '../../../context/ToastContext';
import { usePagination } from '../../../hooks/usePagination';

export function useServicesPageController() {
  const navigate = useNavigate();
  const [skills, setSkills] = useState([]);
  const [industriesData, setIndustriesData] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterIndustry, setFilterIndustry] = useState('All Statuses');
  const [industrySearch, setIndustrySearch] = useState('');
  const [filterIndustryStatus, setFilterIndustryStatus] = useState('All');
  const [activeTab, setActiveTab] = useState('industries');
  const [isSkillModalOpen, setIsSkillModalOpen] = useState(false);
  const [isIndustryModalOpen, setIsIndustryModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('add');
  const [currentSkill, setCurrentSkill] = useState(null);
  const [currentIndustry, setCurrentIndustry] = useState(null);
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
  const [mostBooked, setMostBooked] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const toast = useToast();

  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      const [value, booked, trashed] = await Promise.all([
        loadCatalog(),
        loadMostBookedService(),
        loadTrashedEntries(),
      ]);
      const trashById = new Map(
        trashed.map((entry) => [`${entry.entityType}:${entry.entityId}`, entry.id]),
      );
      setSkills(
        value.skills.map((skill) => {
          const trashEntryId = trashById.get(`skill:${skill.id}`) ?? null;
          return { ...skill, isTrashed: Boolean(trashEntryId), trashEntryId };
        }),
      );
      setIndustriesData(
        value.industries.map((industry) => {
          const trashEntryId = trashById.get(`industry:${industry.id}`) ?? null;
          return { ...industry, isTrashed: Boolean(trashEntryId), trashEntryId };
        }),
      );
      setMostBooked(booked);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const stopSkills = subscribe('service_categories', refresh);
    const stopIndustries = subscribe('industries', refresh);
    return () => {
      stopSkills();
      stopIndustries();
    };
  }, [refresh]);

  const industries = useMemo(
    () => ['All Statuses', ...industriesData.map((item) => item.name)],
    [industriesData],
  );

  const filteredSkills = useMemo(
    () =>
      skills.filter((skill) => {
        const matchesSearch =
          skill.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          skill.id.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesIndustry =
          filterIndustry === 'All Statuses' || skill.industry === filterIndustry;
        return matchesSearch && matchesIndustry;
      }),
    [skills, searchTerm, filterIndustry],
  );

  const {
    currentPage,
    setCurrentPage,
    totalPages,
    pageData: paginatedSkills,
  } = usePagination(filteredSkills, 8);

  const filteredIndustries = useMemo(
    () =>
      industriesData.filter((industry) => {
        const term = industrySearch.trim().toLowerCase();
        const matchesSearch =
          !term ||
          industry.name.toLowerCase().includes(term) ||
          industry.id.toLowerCase().includes(term) ||
          industry.description.toLowerCase().includes(term);
        const matchesStatus =
          filterIndustryStatus === 'All' ||
          industry.status === filterIndustryStatus;
        return matchesSearch && matchesStatus;
      }),
    [industriesData, industrySearch, filterIndustryStatus],
  );

  const stats = useMemo(
    () => [
      {
        label: 'Total Skills',
        value: skills.length,
        icon: Layers,
      },
      {
        label: 'Active Skills',
        value: skills.filter((skill) => skill.status === 'Active').length,
        icon: CheckCircle,
      },
      {
        label: 'Industries',
        value: industriesData.length,
        icon: Grid,
      },
      {
        label: 'Most Booked',
        value: mostBooked ?? '—',
        icon: ArrowUpRight,
      },
    ],
    [skills, industriesData, mostBooked],
  );

  const handleOpenAddSkillModal = useCallback(() => {
    setModalMode('add');
    setCurrentSkill({
      name: '',
      industry: '',
      minimumPriceMinor: null,
      maximumPriceMinor: null,
      isSafetyCritical: false,
      status: 'Active',
    });
    setIsSkillModalOpen(true);
  }, []);

  const handleOpenEditSkillModal = useCallback((skill) => {
    setModalMode('edit');
    setCurrentSkill({ ...skill });
    setIsSkillModalOpen(true);
  }, []);

  const [details, setDetails] = useState(null);
  const openSkillDetails = useCallback(
    (skill) => setDetails({ type: 'skill', item: skill }),
    [],
  );
  const openIndustryDetails = useCallback(
    (industry) => setDetails({ type: 'industry', item: industry }),
    [],
  );
  const closeDetails = useCallback(() => setDetails(null), []);

  const goToTrash = useCallback(
    (entityType, trashEntryId) => {
      if (!trashEntryId) return;
      navigate(
        `/admin/trash?tab=${entityType === 'industry' ? 'Industries' : 'Skills'}&entry=${trashEntryId}`,
      );
    },
    [navigate],
  );

  const handleMoveSkillToTrash = useCallback(
    (skill) => {
      setConfirm({
        isOpen: true,
        title: 'Move Skill to Trash',
        message: `Move "${skill.name}" to trash? It will be disabled on the platform and listed in the Trash page until it is restored or permanently deleted.`,
        confirmLabel: 'Move to Trash',
        onConfirm: async () => {
          try {
            await moveSkillToTrash(skill.id);
            toast.success(`Skill "${skill.name}" moved to trash`);
            setDetails(null);
            await refresh();
          } catch (error) {
            toast.error('Operation failed', error.message);
          }
        },
      });
    },
    [moveSkillToTrash, refresh, toast],
  );

  const handleMoveIndustryToTrash = useCallback(
    (industry) => {
      const skillCount = skills.filter(
        (skill) => skill.industry === industry.name,
      ).length;
      setConfirm({
        isOpen: true,
        title: 'Move Industry to Trash',
        message:
          skillCount > 0
            ? `Move "${industry.name}" and its ${skillCount} skill${skillCount === 1 ? '' : 's'} to trash? They will be disabled on the platform and listed in the Trash page until restored or permanently deleted.`
            : `Move "${industry.name}" to trash? It will be disabled on the platform and listed in the Trash page until restored or permanently deleted.`,
        confirmLabel: 'Move to Trash',
        onConfirm: async () => {
          try {
            const result = await moveIndustryToTrash(industry.id);
            toast.success(
              `Industry "${result.name}" moved to trash (${result.skills} skills)`,
            );
            setDetails(null);
            await refresh();
          } catch (error) {
            toast.error('Operation failed', error.message);
          }
        },
      });
    },
    [moveIndustryToTrash, refresh, skills, toast],
  );

  const handleDeactivateSkill = useCallback(
    (skill) => {
      const deactivating = skill.status === 'Active';
      const action = deactivating ? 'Deactivate' : 'Activate';
      setConfirm({
        isOpen: true,
        title: `${action} Skill`,
        message: deactivating
          ? `Deactivate "${skill.name}"? It will be hidden from the platform, but all of its data will be kept.`
          : `Activate "${skill.name}"? It will be visible and bookable on the platform again.`,
        confirmLabel: action,
        onConfirm: async () => {
          try {
            await saveSkill(
              { ...skill, status: deactivating ? 'Inactive' : 'Active' },
              industriesData,
            );
            toast.success(`Skill "${skill.name}" ${deactivating ? 'deactivated' : 'activated'}`);
            await refresh();
          } catch (error) {
            toast.error('Operation failed', error.message);
          }
        },
      });
    },
    [industriesData, refresh, toast],
  );

  const handleDuplicateSkill = useCallback(
    async (skill) => {
      try {
        await saveSkill(
          { ...skill, id: null, name: `${skill.name} Copy` },
          industriesData,
        );
        await refresh();
      } catch (error) {
        toast.error('Operation failed', error.message);
      }
    },
    [industriesData, refresh, toast],
  );

  const handleSaveSkill = useCallback(
    async (e) => {
      e.preventDefault();
      try {
        await saveSkill(currentSkill, industriesData);
        await refresh();
        setIsSkillModalOpen(false);
      } catch (error) {
        toast.error('Operation failed', error.message);
      }
    },
    [currentSkill, industriesData, refresh, toast],
  );

  const handleOpenAddIndustryModal = useCallback(() => {
    setModalMode('add');
    setCurrentIndustry({ name: '', description: '', status: 'Enabled' });
    setIsIndustryModalOpen(true);
  }, []);

  const handleOpenEditIndustryModal = useCallback((industry) => {
    setModalMode('edit');
    setCurrentIndustry({ ...industry });
    setIsIndustryModalOpen(true);
  }, []);

  const handleDeactivateIndustry = useCallback(
    (industry) => {
      const deactivating = industry.status === 'Enabled';
      const action = deactivating ? 'Deactivate' : 'Activate';
      setConfirm({
        isOpen: true,
        title: `${action} Industry`,
        message: deactivating
          ? `Deactivate "${industry.name}"? It will be hidden from the platform, but all of its data will be kept.`
          : `Activate "${industry.name}"? It will be visible on the platform again.`,
        confirmLabel: action,
        onConfirm: async () => {
          try {
            await saveIndustry({
              ...industry,
              status: deactivating ? 'Disabled' : 'Enabled',
            });
            toast.success(`Industry "${industry.name}" ${deactivating ? 'deactivated' : 'activated'}`);
            await refresh();
          } catch (error) {
            toast.error('Operation failed', error.message);
          }
        },
      });
    },
    [refresh, toast],
  );

  const toggleIndustryStatus = useCallback(
    async (id) => {
      const industry = industriesData.find((item) => item.id === id);
      try {
        await saveIndustry({
          ...industry,
          status: industry.status === 'Enabled' ? 'Disabled' : 'Enabled',
        });
        await refresh();
      } catch (error) {
        toast.error('Operation failed', error.message);
      }
    },
    [industriesData, refresh, toast],
  );

  const handleSaveIndustry = useCallback(
    async (e) => {
      e.preventDefault();
      try {
        await saveIndustry(currentIndustry);
        await refresh();
        setIsIndustryModalOpen(false);
      } catch (error) {
        toast.error('Operation failed', error.message);
      }
    },
    [currentIndustry, refresh, toast],
  );

  return useMemo(
    () => ({
      searchTerm,
      setSearchTerm,
      filterIndustry,
      setFilterIndustry,
      activeTab,
      setActiveTab,
      currentPage,
      setCurrentPage,
      isLoading,
      isSkillModalOpen,
      setIsSkillModalOpen,
      isIndustryModalOpen,
      setIsIndustryModalOpen,
      modalMode,
      currentSkill,
      setCurrentSkill,
      currentIndustry,
      setCurrentIndustry,
      confirm,
      closeConfirm,
      details,
      closeDetails,
      openSkillDetails,
      openIndustryDetails,
      goToTrash,
      handleMoveSkillToTrash,
      handleMoveIndustryToTrash,
      handleDeactivateSkill,
      industries,
      industriesData,
      filteredSkills,
      totalPages,
      paginatedSkills,
      stats,
      industrySearch,
      setIndustrySearch,
      filterIndustryStatus,
      setFilterIndustryStatus,
      filteredIndustries,
      handleOpenAddSkillModal,
      handleOpenEditSkillModal,
      handleDuplicateSkill,
      handleSaveSkill,
      handleOpenAddIndustryModal,
      handleOpenEditIndustryModal,
      handleDeactivateIndustry,
      toggleIndustryStatus,
      handleSaveIndustry,
    }),
    [
      searchTerm,
      filterIndustry,
      industrySearch,
      filterIndustryStatus,
      activeTab,
      currentPage,
      isLoading,
      isSkillModalOpen,
      isIndustryModalOpen,
      modalMode,
      currentSkill,
      currentIndustry,
      confirm,
      details,
      industries,
      industriesData,
      filteredSkills,
      filteredIndustries,
      totalPages,
      paginatedSkills,
      stats,
      handleOpenAddSkillModal,
      handleOpenEditSkillModal,
      handleMoveSkillToTrash,
      handleMoveIndustryToTrash,
      handleDeactivateSkill,
      handleDuplicateSkill,
      handleSaveSkill,
      handleOpenAddIndustryModal,
      handleOpenEditIndustryModal,
      handleDeactivateIndustry,
      toggleIndustryStatus,
      handleSaveIndustry,
      closeConfirm,
      closeDetails,
      openSkillDetails,
      openIndustryDetails,
      goToTrash,
      setSearchTerm,
      setFilterIndustry,
      setIndustrySearch,
      setFilterIndustryStatus,
      setActiveTab,
      setCurrentPage,
      setIsSkillModalOpen,
      setIsIndustryModalOpen,
      setCurrentSkill,
      setCurrentIndustry,
    ],
  );
}
