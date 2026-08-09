import { loadPaymentsPage } from '../logic/PaymentsPageLogic';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { DollarSign, TrendingUp, CreditCard, ArrowDownRight } from 'lucide-react';
import { money } from '../../../services/adminShared';
import { subscribe } from '../../../services/realtime';
import { PAYMENT_STATUS_BADGE, badgeFor } from '../../../services/statusMeta';
import { useServerPagination } from '../../../hooks/useServerPagination';
import { useState } from 'react';

export function usePaymentsPageController() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('All');
  const [selectedTxn, setSelectedTxn] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [actionMenuOpenId, setActionMenuOpenId] = useState(null);
  const [activeTab, setActiveTab] = useState('transactions');

  const fetchPayments = useCallback(
    ({ page, pageSize }) =>
      loadPaymentsPage({ search: searchTerm, type: filterType, tab: activeTab, page, pageSize }),
    [searchTerm, filterType, activeTab],
  );

  const {
    rows: transactions,
    count,
    meta,
    error,
    isInitialLoading: isLoading,
    refresh,
    currentPage,
    setCurrentPage,
    totalPages,
  } = useServerPagination({ fetchPage: fetchPayments });

  const refreshRef = useRef(refresh);
  refreshRef.current = refresh;

  useEffect(() => {
    const stop = subscribe('payments', () => {
      void refreshRef.current();
    });
    return stop;
  }, []);

  const stats = useMemo(() => {
    const s = meta?.stats;
    return [
      {
        label: 'Total Revenue',
        value: money(s?.revenue ?? 0),
        trend: 'Live',
        icon: <DollarSign className="text-success" />,
        bg: 'bg-success/10',
        positive: true,
      },
      {
        label: 'Platform Commission',
        value: money(s?.commission ?? 0),
        trend: 'Live',
        icon: <TrendingUp className="text-brand-500" />,
        bg: 'bg-brand-500/10',
        positive: true,
      },
      {
        label: 'Pending Payments',
        value: money(s?.pending ?? 0),
        trend: 'Live',
        icon: <CreditCard className="text-warning" />,
        bg: 'bg-warning/10',
        positive: false,
      },
      {
        label: 'Failed Payments',
        value: s?.failed ?? 0,
        trend: 'Live',
        icon: <ArrowDownRight className="text-destructive" />,
        bg: 'bg-destructive/10',
        positive: false,
      },
    ];
  }, [meta]);

  const getStatusColor = (status) => badgeFor(PAYMENT_STATUS_BADGE, status);
  const handleViewDetails = (txn) => {
    setSelectedTxn(txn);
    setIsDrawerOpen(true);
    setActionMenuOpenId(null);
  };
  return {
    isLoading,
    error,
    searchTerm,
    setSearchTerm,
    filterType,
    setFilterType,
    currentPage,
    setCurrentPage,
    selectedTxn,
    isDrawerOpen,
    setIsDrawerOpen,
    actionMenuOpenId,
    setActionMenuOpenId,
    activeTab,
    setActiveTab,
    count,
    totalPages,
    paginatedTxns: transactions,
    stats,
    getStatusColor,
    handleViewDetails,
  };
}
