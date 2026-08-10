import {
  loadSafetyCases,
  loadSupport,
  sendSupportReply,
  updateSupport,
} from '../logic/SupportPageLogic';
import { useCallback, useEffect, useState } from 'react';
import { MessageSquare, Clock, AlertCircle, CheckCircle } from 'lucide-react';
import { useRealtime } from '../../../hooks/useRealtime';
import { useToast } from '../../../context/ToastContext';
import { SUPPORT_STATUS_BADGE, badgeFor } from '../../../services/statusMeta';
import { usePagination } from '../../../hooks/usePagination';

export function useSupportPageController() {
  const toast = useToast();
  const [tickets, setTickets] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [safetyCases, setSafetyCases] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      const [rows, cases] = await Promise.all([loadSupport(), loadSafetyCases()]);
      setTickets(rows);
      setSafetyCases(cases);
      setSelectedTicket((current) =>
        current ? (rows.find((row) => row.id === current.id) ?? null) : null,
      );
    } finally {
      setIsLoading(false);
    }
  }, []);
  useEffect(() => {
    void refresh();
  }, [refresh]);
  useRealtime(['support_tickets', 'account_reports', 'booking_disputes'], refresh);
  const filteredTickets = tickets.filter((t) => {
    const matchesSearch =
      t.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'All' || t.status === filterStatus;
    return matchesSearch && matchesStatus;
  });
  const {
    currentPage,
    setCurrentPage,
    totalPages,
    pageData: paginatedTickets,
  } = usePagination(filteredTickets, 10);
  const stats = [
    {
      label: 'Open Tickets',
      value: tickets.filter((t) => t.status === 'Open').length,
      icon: <MessageSquare className="text-brand-500" />,
      bg: 'bg-brand-500/10',
    },
    {
      label: 'High Priority',
      value: tickets.filter((t) => t.priority === 'High' && t.status !== 'Resolved').length,
      icon: <AlertCircle className="text-destructive" />,
      bg: 'bg-destructive/10',
    },
    {
      label: 'Pending User',
      value: tickets.filter((t) => t.status === 'Pending').length,
      icon: <Clock className="text-warning" />,
      bg: 'bg-warning/10',
    },
    {
      label: 'Resolved',
      value: tickets.filter((t) => t.status === 'Resolved').length,
      icon: <CheckCircle className="text-success" />,
      bg: 'bg-success/10',
    },
  ];
  const getPriorityColor = (priority) => {
    if (priority === 'High') return 'bg-destructive/10 text-destructive-600 dark:text-destructive-400';
    if (priority === 'Medium') return 'bg-warning/10 text-warning-600 dark:text-warning-400';
    return 'bg-brand-500/10 text-brand-700 dark:text-brand-300';
  };
  const getStatusColor = (status) => badgeFor(SUPPORT_STATUS_BADGE, status);
  const openTicket = (ticket) => {
    setSelectedTicket(ticket);
    setIsDrawerOpen(true);
  };
  const handleSendReply = async () => {
    if (!replyText.trim()) return;
    try {
      await sendSupportReply(selectedTicket.id, replyText.trim());
      if (selectedTicket.status === 'Open') await updateSupport(selectedTicket.id, 'PENDING');
      setReplyText('');
      await refresh();
    } catch (error) {
      toast.error('Send failed', error.message);
    }
  };
  const markResolved = async () => {
    try {
      await updateSupport(
        selectedTicket.id,
        'RESOLVED',
        replyText.trim() || 'Resolved by administrator',
      );
      await refresh();
      setSelectedTicket({ ...selectedTicket, status: 'Resolved' });
    } catch (error) {
      toast.error('Send failed', error.message);
    }
  };
  const escalateTicket = async () => {
    try {
      await updateSupport(selectedTicket.id, 'ESCALATED');
      await refresh();
      setSelectedTicket({ ...selectedTicket, status: 'Escalated' });
    } catch (error) {
      toast.error('Send failed', error.message);
    }
  };
  const reopenTicket = async () => {
    try {
      await updateSupport(selectedTicket.id, 'OPEN');
      await refresh();
      setSelectedTicket({ ...selectedTicket, status: 'Open' });
    } catch (error) {
      toast.error('Send failed', error.message);
    }
  };
  return {
    searchTerm,
    setSearchTerm,
    filterStatus,
    setFilterStatus,
    currentPage,
    setCurrentPage,
    selectedTicket,
    isLoading,
    isDrawerOpen,
    setIsDrawerOpen,
    replyText,
    setReplyText,
    safetyCases,
    filteredTickets,
    totalPages,
    paginatedTickets,
    stats,
    getPriorityColor,
    getStatusColor,
    openTicket,
    handleSendReply,
    markResolved,
    escalateTicket,
    reopenTicket,
  };
}
