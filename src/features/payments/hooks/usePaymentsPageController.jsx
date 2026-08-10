import { loadPaymentsPage, movePaymentToTrash } from '../logic/PaymentsPageLogic';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { DollarSign, TrendingUp, CreditCard, ArrowDownRight } from 'lucide-react';
import { money } from '../../../services/adminShared';
import { subscribe } from '../../../services/realtime';
import { PAYMENT_STATUS_BADGE, badgeFor } from '../../../services/statusMeta';
import { useServerPagination } from '../../../hooks/useServerPagination';
import { useToast } from '../../../context/ToastContext';

export function usePaymentsPageController() {
  const toast = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('All');
  const [selectedTxn, setSelectedTxn] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [actionMenuOpenId, setActionMenuOpenId] = useState(null);
  const [activeTab, setActiveTab] = useState('transactions');
  const [action, setAction] = useState(null);
  const [actionReason, setActionReason] = useState('');
  const [savingAction, setSavingAction] = useState(false);
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
    isLoading,
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
        icon: DollarSign,
        trend: 'up',
        trendValue: 'Live',
      },
      {
        label: 'Platform Commission',
        value: money(s?.commission ?? 0),
        icon: TrendingUp,
        trend: 'up',
        trendValue: 'Live',
      },
      {
        label: 'Pending Payments',
        value: money(s?.pending ?? 0),
        icon: CreditCard,
        trend: 'down',
        trendValue: 'Live',
      },
      {
        label: 'Failed Payments',
        value: s?.failed ?? 0,
        icon: ArrowDownRight,
        trend: 'down',
        trendValue: 'Live',
      },
    ];
  }, [meta]);

  const getStatusColor = (status) => badgeFor(PAYMENT_STATUS_BADGE, status);
  const handleViewDetails = (txn) => {
    setSelectedTxn(txn);
    setIsDrawerOpen(true);
    setActionMenuOpenId(null);
  };

  const openAction = useCallback((type, txn) => {
    setAction({ type, txn });
    setActionReason('');
    setActionMenuOpenId(null);
  }, []);

  const executeAction = useCallback(async () => {
    if (!action || actionReason.trim().length < 3) return;
    setSavingAction(true);
    try {
      if (action.type === 'trash') {
        await movePaymentToTrash(action.txn.id, actionReason.trim());
        toast.success('Transaction moved to trash');
      }
      setAction(null);
      await refresh();
      setIsDrawerOpen(false);
    } catch (err) {
      toast.error('Action failed', err.message);
    } finally {
      setSavingAction(false);
    }
  }, [action, actionReason, refresh, toast]);

  const submitAction = useCallback(() => {
    if (!action || actionReason.trim().length < 3) return;
    setConfirm({
      isOpen: true,
      title: 'Confirm Action',
      message: 'Confirm that you want to move this transaction to trash?',
      onConfirm: executeAction,
    });
  }, [action, actionReason, executeAction]);

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
    openAction,
    action,
    setAction,
    actionReason,
    setActionReason,
    savingAction,
    submitAction,
    confirm,
    closeConfirm,
  };
}
