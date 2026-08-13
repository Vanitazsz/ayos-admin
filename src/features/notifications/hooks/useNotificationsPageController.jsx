import {
  createCampaign,
  updateCampaign,
  deleteCampaign,
  loadNotifications,
  publishCampaign,
} from '../logic/NotificationsPageLogic';
import { useCallback, useEffect, useState } from 'react';
import { Send, MessageSquare, XCircle, Clock } from 'lucide-react';
import { useDataFetch } from '../../../hooks/useDataFetch';
import { useRealtime } from '../../../hooks/useRealtime';
import { useToast } from '../../../context/ToastContext';
import { NOTIFICATION_STATUS_BADGE, badgeFor } from '../../../services/statusMeta';
import { status } from '../../../services/adminShared';
import { usePagination } from '../../../hooks/usePagination';
import { useDateFilter } from '../../../hooks/useDateFilter';
import { applyDateFilter, getRowDate } from '../../../lib/dateFilter';

const EMPTY_CAMPAIGN = { title: '', audience: 'EVERYONE', message: '' };

export function useNotificationsPageController() {
  const toast = useToast();
  const dateFilter = useDateFilter({ canModify: true });
  const { data: notifications, isLoading, error, refresh } = useDataFetch(loadNotifications, []);
  useRealtime('notification_campaigns', refresh);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState(null);
  const [campaign, setCampaign] = useState(EMPTY_CAMPAIGN);
  const [selectedCampaign, setSelectedCampaign] = useState(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [confirm, setConfirm] = useState({
    isOpen: false,
    title: '',
    message: '',
    confirmLabel: 'Confirm',
    variant: 'danger',
    requireTypedText: null,
    onConfirm: () => {},
  });

  const closeConfirm = useCallback(
    () => setConfirm((s) => ({ ...s, isOpen: false })),
    [],
  );

  const safeNotifs = notifications ?? [];
  const matchedNotifs = safeNotifs.filter((n) => {
    const matchesSearch = n.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'All' || n.status === filterStatus;
    return matchesSearch && matchesStatus;
  });
  const filteredNotifs = applyDateFilter(matchedNotifs, {
    field: dateFilter.field,
    range: dateFilter.effectiveRange,
    sort: dateFilter.sort,
    getDate: (row) => getRowDate(row, dateFilter.field) ?? getRowDate(row, 'created'),
  });
  const {
    currentPage,
    setCurrentPage,
    totalPages,
    pageData: paginatedNotifs,
  } = usePagination(filteredNotifs, 10);
  const stats = [
    {
      label: 'Sent',
      value: safeNotifs.filter((n) => n.status === 'Sent').length,
      icon: Send,
    },
    {
      label: 'Scheduled',
      value: safeNotifs.filter((n) => n.status === 'Scheduled').length,
      icon: Clock,
    },
    {
      label: 'Drafts',
      value: safeNotifs.filter((n) => n.status === 'Draft').length,
      icon: MessageSquare,
    },
    {
      label: 'Failed',
      value: safeNotifs.filter((n) => n.status === 'Failed').length,
      icon: XCircle,
    },
  ];
  const getStatusColor = (status) => badgeFor(NOTIFICATION_STATUS_BADGE, status);

  const handleCreateNew = useCallback(() => {
    setEditingCampaign(null);
    setCampaign(EMPTY_CAMPAIGN);
    setIsModalOpen(true);
  }, []);

  const handleEditDraft = useCallback(
    (n) => {
      setEditingCampaign(n.id);
      setCampaign({
        title: n.title,
        audience: n.audienceValue ?? 'EVERYONE',
        message: n.message,
      });
      setIsModalOpen(true);
    },
    [],
  );

  const handleViewDetails = useCallback(
    (n) => {
      setSelectedCampaign(n);
      setIsDetailsOpen(true);
    },
    [],
  );

  const handleCloseDetails = useCallback(() => {
    setIsDetailsOpen(false);
    setSelectedCampaign(null);
  }, []);

  const handleMoveToTrash = useCallback(
    (id, title) => {
      setConfirm({
        isOpen: true,
        title: 'Move to Trash',
        message: `Move "${title}" to trash? It will be hidden from the list and can be restored or permanently deleted from the Trash page.`,
        confirmLabel: 'Move to Trash',
        variant: 'danger',
        requireTypedText: null,
        onConfirm: async () => {
          try {
            await deleteCampaign(id);
            toast.success('Notification moved to trash');
            if (selectedCampaign?.id === id) handleCloseDetails();
            await refresh();
          } catch (error) {
            toast.error('Move to trash failed', error.message);
          }
        },
      });
    },
    [refresh, toast, selectedCampaign, handleCloseDetails],
  );

  const handlePublish = useCallback(
    (n) => {
      setConfirm({
        isOpen: true,
        title: 'Submit Notification',
        message: `Submit "${n.title}" now? It will be sent to all ${n.audience} recipients immediately.`,
        confirmLabel: 'Submit',
        variant: 'primary',
        requireTypedText: null,
        onConfirm: async () => {
          try {
            await publishCampaign(n.id);
            toast.success('Notification submitted', `${n.title} was sent to ${n.audience}.`);
            handleCloseDetails();
            await refresh();
          } catch (error) {
            toast.error('Submit failed', error.message);
          }
        },
      });
    },
    [refresh, toast, handleCloseDetails],
  );

  const saveCampaign = async (send) => {
    try {
      if (editingCampaign) {
        const row = await updateCampaign(editingCampaign, campaign);
        if (send) await publishCampaign(row.id);
      } else {
        const row = await createCampaign(campaign);
        if (send) await publishCampaign(row.id);
      }
      setIsModalOpen(false);
      setEditingCampaign(null);
      setCampaign(EMPTY_CAMPAIGN);
      toast.success(
        send ? 'Notification submitted' : 'Notification saved',
        send
          ? `"${campaign.title}" was sent to ${status(campaign.audience)}.`
          : `"${campaign.title}" was saved as a draft.`,
      );
      await refresh();
    } catch (error) {
      toast.error('Save failed', error.message);
    }
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterStatus, dateFilter.sort, dateFilter.field, dateFilter.preset, dateFilter.customRange.from, dateFilter.customRange.to, setCurrentPage]);

  return {
    isLoading,
    error,
    searchTerm,
    setSearchTerm,
    filterStatus,
    setFilterStatus,
    dateFilter,
    currentPage,
    setCurrentPage,
    isModalOpen,
    setIsModalOpen,
    editingCampaign,
    campaign,
    setCampaign,
    selectedCampaign,
    isDetailsOpen,
    setIsDetailsOpen,
    filteredNotifs,
    totalPages,
    paginatedNotifs,
    stats,
    confirm,
    closeConfirm,
    getStatusColor,
    handleCreateNew,
    handleEditDraft,
    handleViewDetails,
    handleCloseDetails,
    handleMoveToTrash,
    handlePublish,
    saveCampaign,
  };
}
