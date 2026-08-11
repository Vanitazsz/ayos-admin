import { loadPaymentsPage, movePaymentToTrash } from '../logic/PaymentsPageLogic';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { DollarSign, TrendingUp, CreditCard, ArrowDownRight } from 'lucide-react';
import { money } from '../../../services/adminShared';
import { subscribe } from '../../../services/realtime';
import { PAYMENT_STATUS_BADGE, badgeFor } from '../../../services/statusMeta';
import { useServerPagination } from '../../../hooks/useServerPagination';
import { useToast } from '../../../context/ToastContext';
import { loadSettings, saveSetting } from '../../../services/settings';

const DEFAULT_FEE_SETTINGS = {
  workerFeeEnabled: true,
  workerFeeType: 'percentage',
  workerCommissionRate: 10,
  workerFixedFee: 50,
  workerMinFee: 0,
  workerAutoDeduct: true,
  userFeeEnabled: false,
  userFeeType: 'fixed',
  userFeeRate: 3,
  userFixedFee: 25,
  userMinFee: 0,
  userFeeLabel: 'Platform Service Fee',
  includeVat: false,
};

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
  const [feeSettings, setFeeSettings] = useState(DEFAULT_FEE_SETTINGS);
  const [isSavingFeeSettings, setIsSavingFeeSettings] = useState(false);
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

  const [sort, setSort] = useState('newest');
  const [datePreset, setDatePreset] = useState('all');
  const [customRange, setCustomRange] = useState({ from: '', to: '' });
  const [isDateRangeOpen, setIsDateRangeOpen] = useState(false);

  const effectiveRange = useMemo(() => {
    if (datePreset === 'today') {
      const from = new Date();
      from.setHours(0, 0, 0, 0);
      const to = new Date();
      to.setHours(23, 59, 59, 999);
      return { from, to };
    }
    if (datePreset === '7d') {
      const to = new Date();
      const from = new Date();
      from.setDate(from.getDate() - 6);
      from.setHours(0, 0, 0, 0);
      return { from, to };
    }
    if (datePreset === 'month') {
      const now = new Date();
      return { from: new Date(now.getFullYear(), now.getMonth(), 1), to: now };
    }
    if (datePreset === 'custom') {
      if (!customRange.from && !customRange.to) return null;
      return {
        from: customRange.from ? new Date(`${customRange.from}T00:00:00`) : null,
        to: customRange.to ? new Date(`${customRange.to}T23:59:59.999`) : null,
      };
    }
    return null;
  }, [datePreset, customRange]);

  const dateFilterLabel = useMemo(() => {
    if (datePreset === 'today') return 'Today';
    if (datePreset === '7d') return 'Last 7 Days';
    if (datePreset === 'month') return 'This Month';
    if (datePreset === 'custom') {
      if (customRange.from && customRange.to) {
        return `${customRange.from} → ${customRange.to}`;
      }
      return customRange.from ? `From ${customRange.from}` : customRange.to ? `To ${customRange.to}` : 'Custom Range';
    }
    return sort === 'oldest' ? 'Old to New' : 'Most Recent';
  }, [datePreset, customRange, sort]);

  const fetchPayments = useCallback(
    ({ page, pageSize }) =>
      loadPaymentsPage({
        search: searchTerm,
        type: filterType,
        tab: activeTab,
        sort,
        dateRange: effectiveRange,
        page,
        pageSize,
      }),
    [searchTerm, filterType, activeTab, sort, effectiveRange],
  );

  const filterKey = `${filterType}|${sort}|${datePreset}|${customRange.from}|${customRange.to}`;

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
  } = useServerPagination({ fetchPage: fetchPayments, filterKey });

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

  useEffect(() => {
    let isMounted = true;
    async function fetchFeeSettings() {
      try {
        const settings = await loadSettings();
        if (!isMounted) return;
        setFeeSettings({
          workerFeeEnabled: settings['platform_settings.worker_fee_enabled'] ?? true,
          workerFeeType: settings['platform_settings.worker_fee_type'] ?? 'percentage',
          workerCommissionRate: Number(settings['platform_settings.commission_rate'] ?? 10),
          workerFixedFee: Number(settings['platform_settings.worker_fixed_fee'] ?? 50),
          workerMinFee: Number(settings['platform_settings.worker_min_fee'] ?? 0),
          workerAutoDeduct: settings['platform_settings.worker_auto_deduct'] ?? true,
          userFeeEnabled: settings['platform_settings.user_fee_enabled'] ?? false,
          userFeeType: settings['platform_settings.user_fee_type'] ?? 'fixed',
          userFeeRate: Number(settings['platform_settings.user_fee_rate'] ?? 3),
          userFixedFee: Number(settings['platform_settings.homeowner_charge'] ?? 25),
          userMinFee: Number(settings['platform_settings.user_min_fee'] ?? 0),
          userFeeLabel: settings['platform_settings.user_fee_label'] ?? 'Platform Service Fee',
          includeVat: settings['platform_settings.include_vat'] ?? false,
        });
      } catch (err) {
        console.error('Failed to load fee settings:', err);
      }
    }
    void fetchFeeSettings();
    return () => {
      isMounted = false;
    };
  }, []);

  const saveFeeSettings = useCallback(async () => {
    setIsSavingFeeSettings(true);
    try {
      await Promise.all([
        saveSetting('platform_settings.commission_rate', feeSettings.workerCommissionRate),
        saveSetting('platform_settings.worker_fee_type', feeSettings.workerFeeType),
        saveSetting('platform_settings.worker_fixed_fee', feeSettings.workerFixedFee),
        saveSetting('platform_settings.worker_min_fee', feeSettings.workerMinFee),
        saveSetting('platform_settings.worker_fee_enabled', feeSettings.workerFeeEnabled),
        saveSetting('platform_settings.worker_auto_deduct', feeSettings.workerAutoDeduct),
        saveSetting('platform_settings.user_fee_enabled', feeSettings.userFeeEnabled),
        saveSetting('platform_settings.user_fee_type', feeSettings.userFeeType),
        saveSetting('platform_settings.user_fee_rate', feeSettings.userFeeRate),
        saveSetting('platform_settings.homeowner_charge', feeSettings.userFixedFee),
        saveSetting('platform_settings.user_min_fee', feeSettings.userMinFee),
        saveSetting('platform_settings.user_fee_label', feeSettings.userFeeLabel),
      ]);
      toast.success('Commission & Fee settings saved successfully');
    } catch (err) {
      toast.error('Failed to save fee settings', err.message);
    } finally {
      setIsSavingFeeSettings(false);
    }
  }, [feeSettings, toast]);

  const resetFeeSettingsToDefaults = useCallback(() => {
    setFeeSettings(DEFAULT_FEE_SETTINGS);
    toast.info('Fee settings reset to defaults. Click Save to apply.');
  }, [toast]);

  const handleApplyDateRange = (from, to) => {
    setCustomRange({ from, to });
    setDatePreset('custom');
    setIsDateRangeOpen(false);
  };
  const handleClearDateRange = () => {
    setCustomRange({ from: '', to: '' });
    setDatePreset('all');
    setSort('newest');
    setIsDateRangeOpen(false);
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
    sort,
    setSort,
    datePreset,
    setDatePreset,
    customRange,
    setCustomRange,
    isDateRangeOpen,
    setIsDateRangeOpen,
    dateFilterLabel,
    handleApplyDateRange,
    handleClearDateRange,
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
    feeSettings,
    setFeeSettings,
    saveFeeSettings,
    isSavingFeeSettings,
    resetFeeSettingsToDefaults,
  };
}
