import {
  loadCatalog,
  loadMostBookedService,
  saveIndustry,
  saveSkill,
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
  const [filterIndustry, setFilterIndustry] = useState('All');
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
    () => ['All', ...industriesData.map((item) => item.name)],
    [industriesData],
  );

  const filteredSkills = useMemo(
    () =>
      skills.filter((skill) => {
        const matchesSearch =
          skill.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          skill.id.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesIndustry =
          filterIndustry === 'All' || skill.industry === filterIndustry;
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

  const handleDeleteSkill = useCallback(
    (id) => {
      setConfirm({
        isOpen: true,
        title: 'Delete Skill',
        message:
          'Are you sure you want to delete this skill? It will be disabled and hidden from the platform.',
        onConfirm: async () => {
          const skill = skills.find((item) => item.id === id);
          try {
            await saveSkill({ ...skill, status: 'Inactive' }, industriesData);
            await refresh();
          } catch (error) {
            toast.error('Operation failed', error.message);
          }
        },
      });
    },
    [skills, industriesData, refresh, toast],
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

  const handleDeleteIndustry = useCallback(
    (id) => {
      setConfirm({
        isOpen: true,
        title: 'Delete Industry',
        message:
          'Are you sure you want to delete this industry? It will be disabled and hidden from the platform.',
        onConfirm: async () => {
          const industry = industriesData.find((item) => item.id === id);
          try {
            await saveIndustry({ ...industry, status: 'Disabled' });
            await refresh();
          } catch (error) {
            toast.error('Operation failed', error.message);
          }
        },
      });
    },
    [industriesData, refresh, toast],
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
      industries,
      industriesData,
      filteredSkills,
      totalPages,
      paginatedSkills,
      stats,
      handleOpenAddSkillModal,
      handleOpenEditSkillModal,
      handleDeleteSkill,
      handleDuplicateSkill,
      handleSaveSkill,
      handleOpenAddIndustryModal,
      handleOpenEditIndustryModal,
      handleDeleteIndustry,
      toggleIndustryStatus,
      handleSaveIndustry,
    }),
    [
      searchTerm,
      filterIndustry,
      activeTab,
      currentPage,
      isSkillModalOpen,
      isIndustryModalOpen,
      modalMode,
      currentSkill,
      currentIndustry,
      confirm,
      industries,
      industriesData,
      filteredSkills,
      totalPages,
      paginatedSkills,
      stats,
      handleOpenAddSkillModal,
      handleOpenEditSkillModal,
      handleDeleteSkill,
      handleDuplicateSkill,
      handleSaveSkill,
      handleOpenAddIndustryModal,
      handleOpenEditIndustryModal,
      handleDeleteIndustry,
      toggleIndustryStatus,
      handleSaveIndustry,
      closeConfirm,
      setSearchTerm,
      setFilterIndustry,
      setActiveTab,
      setCurrentPage,
      setIsSkillModalOpen,
      setIsIndustryModalOpen,
      setCurrentSkill,
      setCurrentIndustry,
    ],
  );
}
