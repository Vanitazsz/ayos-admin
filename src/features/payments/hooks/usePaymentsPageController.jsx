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
    feeSettings,
    setFeeSettings,
    saveFeeSettings,
    isSavingFeeSettings,
    resetFeeSettingsToDefaults,
  };
}
