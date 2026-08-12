import {
  REPORT_TYPES,
  downloadReport,
  generateReport,
  loadReportPage,
  loadReportStats,
} from '../logic/ReportsPageLogic';
import { useCallback, useMemo, useState } from 'react';
import { FileText, CheckCircle, Clock, AlertTriangle } from 'lucide-react';
import { useDataFetch } from '../../../hooks/useDataFetch';
import { useRealtime } from '../../../hooks/useRealtime';
import { useToast } from '../../../context/ToastContext';
import { useServerPagination } from '../../../hooks/useServerPagination';
import { useDebouncedValue } from '../../../hooks/useDebouncedValue';
import { useDateFilter } from '../../../hooks/useDateFilter';

const PAGE_SIZE = 10;

const GENERATOR_PRESETS = [
  { key: 'all', label: 'All Time' },
  { key: '7d', label: 'Last 7 Days' },
  { key: 'month', label: 'This Month' },
  { key: 'year', label: 'Last 12 Months' },
];

export function useReportsPageController() {
  const toast = useToast();
  const dateFilter = useDateFilter({ canModify: false });
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebouncedValue(searchTerm, 350);
  const [reportType, setReportType] = useState('All');

  const from = dateFilter.effectiveRange?.from ?? null;
  const to = dateFilter.effectiveRange?.to ?? null;

  const fetchPage = useCallback(
    async ({ page, pageSize }) =>
      loadReportPage({
        page,
        pageSize,
        type: reportType === 'All' ? null : reportType,
        from,
        to,
        query: debouncedSearch,
        sort: dateFilter.sort,
      }),
    [reportType, from, to, debouncedSearch, dateFilter.sort],
  );

  const filterKey = `${reportType}|${from?.toISOString() ?? ''}|${to?.toISOString() ?? ''}|${debouncedSearch}|${dateFilter.sort}`;

  const pagination = useServerPagination({ fetchPage, pageSize: PAGE_SIZE, filterKey });
  const { data: statsData, isLoading: isStatsLoading, refresh: refreshStats } =
    useDataFetch(loadReportStats, []);
  const refreshRows = pagination.refresh;

  const refreshAll = useCallback(() => {
    void refreshRows();
    void refreshStats();
  }, [refreshRows, refreshStats]);

  useRealtime('report_exports', refreshAll);

  const stats = useMemo(() => {
    const s = statsData ?? {};
    return [
      { label: 'Total Reports', value: s.total ?? 0, icon: FileText },
      { label: 'Completed', value: s.completed ?? 0, icon: CheckCircle },
      { label: 'In Progress', value: s.processing ?? 0, icon: Clock },
      { label: 'Failed', value: s.failed ?? 0, icon: AlertTriangle },
    ];
  }, [statsData]);

  const [isGeneratorOpen, setIsGeneratorOpen] = useState(false);
  const [generatorType, setGeneratorType] = useState(REPORT_TYPES[0].code);
  const [generatorFormat, setGeneratorFormat] = useState('PDF');
  const [generatorPreset, setGeneratorPreset] = useState('all');
  const [isGenerating, setIsGenerating] = useState(false);

  const generatorRange = useMemo(() => {
    const now = new Date();
    if (generatorPreset === '7d') {
      const from = new Date();
      from.setDate(from.getDate() - 7);
      return { from, to: now };
    }
    if (generatorPreset === 'month') {
      return { from: new Date(now.getFullYear(), now.getMonth(), 1), to: now };
    }
    if (generatorPreset === 'year') {
      return { from: new Date(now.getFullYear() - 1, now.getMonth(), 1), to: now };
    }
    return {};
  }, [generatorPreset]);

  const openGenerator = useCallback((type) => {
    setGeneratorType(type ?? REPORT_TYPES[0].code);
    setGeneratorFormat('PDF');
    setGeneratorPreset('all');
    setIsGeneratorOpen(true);
  }, []);

  const closeGenerator = useCallback(() => {
    if (isGenerating) return;
    setIsGeneratorOpen(false);
  }, [isGenerating]);

  const handleGenerate = useCallback(async () => {
    try {
      setIsGenerating(true);
      const result = await generateReport(generatorType, generatorFormat, generatorRange);
      if (result.duplicate) {
        toast.info('Report already in progress', 'An export for this report is already being prepared.');
      } else {
        toast.success('Report generation started', 'You can download it from the list once it finishes.');
      }
      setIsGeneratorOpen(false);
      refreshAll();
    } catch (error) {
      toast.error('Generation failed', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setIsGenerating(false);
    }
  }, [generatorType, generatorFormat, generatorRange, toast, refreshAll]);

  const handleRetry = useCallback(
    async (id) => {
      const report = pagination.rows.find((item) => item.id === id);
      if (!report) return;
      try {
        setIsGenerating(true);
        const result = await generateReport(report.type, report.format || 'PDF', {});
        if (result.duplicate) {
          toast.info('Report already in progress', 'An export for this report is already being prepared.');
        } else {
          toast.success('Report generation started', 'You can download it from the list once it finishes.');
        }
        refreshAll();
      } catch (error) {
        toast.error('Generation failed', error instanceof Error ? error.message : 'Please try again.');
      } finally {
        setIsGenerating(false);
      }
    },
    [pagination.rows, toast, refreshAll],
  );

  const handleDownload = useCallback(
    async (id) => {
      const report = pagination.rows.find((item) => item.id === id);
      if (!report?.storagePath) {
        toast.error('Download failed', 'Report file is not ready yet.');
        return;
      }
      try {
        const url = await downloadReport(report.storagePath);
        window.open(url, '_blank', 'noopener,noreferrer');
      } catch (error) {
        toast.error('Download failed', error instanceof Error ? error.message : 'Please try again.');
      }
    },
    [pagination.rows, toast],
  );

  return {
    stats,
    isStatsLoading,
    searchTerm,
    setSearchTerm,
    dateFilter,
    reportType,
    setReportType,
    rows: pagination.rows,
    count: pagination.count,
    isLoading: pagination.isLoading,
    isInitialLoading: pagination.isInitialLoading,
    error: pagination.error,
    empty: pagination.rows.length === 0 && !pagination.isLoading,
    currentPage: pagination.currentPage,
    setCurrentPage: pagination.setCurrentPage,
    totalPages: pagination.totalPages,
    pageWindow: pagination.pageWindow,
    handleDownload,
    handleRetry,
    reportTypes: REPORT_TYPES,
    isGeneratorOpen,
    openGenerator,
    closeGenerator,
    generatorType,
    setGeneratorType,
    generatorFormat,
    setGeneratorFormat,
    generatorPreset,
    setGeneratorPreset,
    presets: GENERATOR_PRESETS,
    isGenerating,
    handleGenerate,
  };
}
