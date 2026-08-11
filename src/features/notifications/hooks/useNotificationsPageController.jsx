import {
  createCampaign,
  deleteCampaign,
  loadNotifications,
  publishCampaign,
} from '../logic/NotificationsPageLogic';
import { useState } from 'react';
import { Send, Mail, MessageSquare, Smartphone, XCircle, Clock } from 'lucide-react';
import { useDataFetch } from '../../../hooks/useDataFetch';
import { useRealtime } from '../../../hooks/useRealtime';
import { useToast } from '../../../context/ToastContext';
import { NOTIFICATION_STATUS_BADGE, badgeFor } from '../../../services/statusMeta';
import { usePagination } from '../../../hooks/usePagination';
import { useDateFilter } from '../../../hooks/useDateFilter';
import { applyDateFilter, getRowDate } from '../../../lib/dateFilter';

export function useNotificationsPageController() {
  const toast = useToast();
  const dateFilter = useDateFilter({ canModify: true });
  const { data: notifications, isLoading, error, refresh } = useDataFetch(loadNotifications, []);
  useRealtime('notification_campaigns', refresh);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('All');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [campaign, setCampaign] = useState({ title: '', audience: 'EVERYONE', message: '' });

  const safeNotifs = notifications ?? [];
  const matchedNotifs = safeNotifs.filter((n) => {
    const matchesSearch = n.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'All' || n.type === filterType;
    return matchesSearch && matchesType;
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
  const getTypeIcon = (type) => {
    if (type === 'Email') return <Mail size={16} className="text-foreground-lighter" />;
    if (type === 'SMS') return <MessageSquare size={16} className="text-foreground-lighter" />;
    return <Smartphone size={16} className="text-foreground-lighter" />;
  };
  const getStatusColor = (status) => badgeFor(NOTIFICATION_STATUS_BADGE, status);
  const handleDelete = async (id) => {
    setConfirm({
      isOpen: true,
      title: 'Delete Notification',
      message: 'Delete this notification?',
      onConfirm: async () => {
        try {
          await deleteCampaign(id);
          await refresh();
        } catch (error) {
          toast.error('Delete failed', error.message);
        }
      },
    });
  };
  const saveCampaign = async (send) => {
    try {
      const row = await createCampaign(campaign);
      if (send) await publishCampaign(row.id);
      setIsModalOpen(false);
      setCampaign({ title: '', audience: 'EVERYONE', message: '' });
      await refresh();
    } catch (error) {
      toast.error('Save failed', error.message);
    }
  };
  return {
    isLoading,
    error,
    searchTerm,
    setSearchTerm,
    filterType,
    setFilterType,
    dateFilter,
    currentPage,
    setCurrentPage,
    isModalOpen,
    setIsModalOpen,
    campaign,
    setCampaign,
    filteredNotifs,
    totalPages,
    paginatedNotifs,
    stats,
    getTypeIcon,
    getStatusColor,
    handleDelete,
    saveCampaign,
  };
}
