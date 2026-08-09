import {
  loadCatalog,
  loadMostBookedService,
  saveIndustry,
  saveSkill,
  hardDeleteSkill,
  hardDeleteIndustry,
  subscribe,
} from '../logic/ServicesPageLogic';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Layers, ArrowUpRight, CheckCircle, Grid } from 'lucide-react';
import { useToast } from '../../../context/ToastContext';
import { usePagination } from '../../../hooks/usePagination';

export function useServicesPageController() {
  const [skills, setSkills] = useState([]);
  const [industriesData, setIndustriesData] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterIndustry, setFilterIndustry] = useState('All Statuses');
  const [industrySearch, setIndustrySearch] = useState('');
  const [filterIndustryStatus, setFilterIndustryStatus] = useState('All');
  const [activeTab, setActiveTab] = useState('skills');
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
  const toast = useToast();

  const refresh = useCallback(async () => {
    const [value, booked] = await Promise.all([
      loadCatalog(),
      loadMostBookedService(),
    ]);
    setSkills(value.skills);
    setIndustriesData(value.industries);
    setMostBooked(booked);
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

  const handleHardDeleteSkill = useCallback(
    (skill) => {
      setConfirm({
        isOpen: true,
        title: 'Hard Delete Skill',
        message: `Permanently delete "${skill.name}" and ALL data tied to it (${
          skill.workers ?? 0
        } worker assignments, service requests, bookings, payments, receipts, reviews, wallet transactions)? This CANNOT be undone.`,
        confirmLabel: 'Hard Delete',
        onConfirm: async () => {
          try {
            const result = await hardDeleteSkill(skill.id);
            toast.success(
              `Skill "${result.name}" deleted (${result.bookings} bookings, ${result.service_requests} requests)`,
            );
            setDetails(null);
            await refresh();
          } catch (error) {
            toast.error('Operation failed', error.message);
          }
        },
      });
    },
    [hardDeleteSkill, refresh, toast],
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

  const [industryDelete, setIndustryDelete] = useState(null);
  const industrySkills = useMemo(
    () =>
      industryDelete
        ? skills.filter(
            (skill) => skill.industry === industryDelete.industry.name,
          )
        : [],
    [skills, industryDelete],
  );
  const openIndustryDelete = useCallback(
    (industry) => {
      const industrySkillIds = skills
        .filter((skill) => skill.industry === industry.name)
        .map((skill) => skill.id);
      setIndustryDelete({
        industry,
        selected: Object.fromEntries(industrySkillIds.map((id) => [id, true])),
      });
    },
    [skills],
  );
  const toggleIndustrySkillSelection = useCallback((skillId) => {
    setIndustryDelete((cur) => {
      if (!cur) return cur;
      const selected = { ...cur.selected };
      if (selected[skillId]) delete selected[skillId];
      else selected[skillId] = true;
      return { ...cur, selected };
    });
  }, []);
  const allIndustrySkillsSelected = useMemo(
    () =>
      industryDelete !== null &&
      industrySkills.length > 0 &&
      Object.keys(industryDelete.selected).length === industrySkills.length,
    [industryDelete, industrySkills],
  );
  const handleConfirmHardDeleteIndustry = useCallback(async () => {
    if (!industryDelete) return;
    try {
      const result = await hardDeleteIndustry(
        industryDelete.industry.id,
        Object.keys(industryDelete.selected),
      );
      toast.success(
        `Industry "${result.name}" deleted (${result.skills} skills, ${result.bookings} bookings)`,
      );
      setIndustryDelete(null);
      setDetails(null);
      await refresh();
    } catch (error) {
      toast.error('Operation failed', error.message);
    }
  }, [industryDelete, hardDeleteIndustry, refresh, toast]);
  const closeIndustryDelete = useCallback(() => setIndustryDelete(null), []);

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
      handleHardDeleteSkill,
      handleDeactivateSkill,
      industryDelete,
      closeIndustryDelete,
      industrySkills,
      openIndustryDelete,
      toggleIndustrySkillSelection,
      allIndustrySkillsSelected,
      handleConfirmHardDeleteIndustry,
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
      industryDelete,
      industrySkills,
      allIndustrySkillsSelected,
      handleOpenAddSkillModal,
      handleOpenEditSkillModal,
      handleHardDeleteSkill,
      handleDeactivateSkill,
      handleDuplicateSkill,
      handleSaveSkill,
      handleOpenAddIndustryModal,
      handleOpenEditIndustryModal,
      handleDeactivateIndustry,
      handleConfirmHardDeleteIndustry,
      toggleIndustrySkillSelection,
      toggleIndustryStatus,
      handleSaveIndustry,
      closeConfirm,
      closeDetails,
      closeIndustryDelete,
      openSkillDetails,
      openIndustryDetails,
      openIndustryDelete,
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
