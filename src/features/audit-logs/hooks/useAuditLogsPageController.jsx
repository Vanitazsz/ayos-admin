import { useCallback, useState } from 'react';
import { ShieldAlert, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import {
  loadAuditLogPage,
  loadAuditStats,
} from '../logic/AuditLogsPageLogic';
import { useServerPagination } from '../../../hooks/useServerPagination';
import { useDataFetch } from '../../../hooks/useDataFetch';
import { useActiveSessionCount } from '../../../hooks/useActiveSessionCount';
import { useDateFilter } from '../../../hooks/useDateFilter';
import { useDebouncedValue } from '../../../hooks/useDebouncedValue';

export function useAuditLogsPageController() {
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebouncedValue(searchTerm);
  const [filterModule, setFilterModule] = useState('All');
  const dateFilter = useDateFilter({ canModify: false });
  const activeSessions = useActiveSessionCount();

  const range = dateFilter.effectiveRange;

  const fetchLogs = useCallback(
    ({ page, pageSize }) =>
      loadAuditLogPage({
        page,
        pageSize,
        from: range?.from ?? null,
        to: range?.to ?? null,
        search: debouncedSearch,
        module: filterModule === 'All' ? null : filterModule,
      }),
    [debouncedSearch, filterModule, range],
  );

  const {
    rows: filteredLogs,
    error,
    isLoading,
    currentPage,
    setCurrentPage,
    totalPages,
  } = useServerPagination({ fetchPage: fetchLogs, pageSize: 12 });

  const paginatedLogs = filteredLogs;

  const { data: auditStats } = useDataFetch(loadAuditStats, []);

  const stats = [
    {
      label: 'Recent Activities',
      value: auditStats?.recentActivities ?? 0,
      icon: ShieldAlert,
    },
    {
      label: 'Failed Actions',
      value: auditStats?.failed ?? 0,
      icon: XCircle,
    },
    {
      label: 'Critical Actions',
      value: auditStats?.critical ?? 0,
      icon: AlertTriangle,
    },
    {
      label: 'Active Sessions',
      value: activeSessions,
      icon: CheckCircle,
    },
  ];

  return {
    isLoading,
    error,
    searchTerm,
    setSearchTerm,
    filterModule,
    setFilterModule,
    dateFilter,
    currentPage,
    setCurrentPage,
    filteredLogs,
    totalPages,
    paginatedLogs,
    stats,
  };
}
