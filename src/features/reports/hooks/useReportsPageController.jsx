import { downloadReport, generateReport, loadReports } from '../logic/ReportsPageLogic';
import { useMemo, useState } from 'react';
import { FileText, CheckCircle, Clock, AlertTriangle } from 'lucide-react';
import { useDataFetch } from '../../../hooks/useDataFetch';
import { useRealtime } from '../../../hooks/useRealtime';
import { useToast } from '../../../context/ToastContext';
import { usePagination } from '../../../hooks/usePagination';
import { useDateFilter } from '../../../hooks/useDateFilter';
import { applyDateFilter } from '../../../lib/dateFilter';

export function useReportsPageController() {
  const toast = useToast();
  const dateFilter = useDateFilter({ canModify: false });
  const { data: reports, isLoading, error, refresh } = useDataFetch(loadReports, []);
  useRealtime('report_exports', refresh);
  const [searchTerm, setSearchTerm] = useState('');
  const [reportType, setReportType] = useState('All');

  const safeReports = reports ?? [];
  const stats = useMemo(() => {
    const completed = safeReports.filter((r) => r.status === 'Completed').length;
    const processing = safeReports.filter(
      (r) => r.status === 'Pending' || r.status === 'Processing',
    ).length;
    const failed = safeReports.filter((r) => r.status === 'Failed').length;
    return [
      { label: 'Total Reports', value: safeReports.length, icon: FileText },
      { label: 'Completed', value: completed, icon: CheckCircle },
      { label: 'In Progress', value: processing, icon: Clock },
      { label: 'Failed', value: failed, icon: AlertTriangle },
    ];
  }, [safeReports]);
  const matchedReports = safeReports.filter((r) => {
    const matchesSearch =
      r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = reportType === 'All' || r.type === reportType;
    return matchesSearch && matchesType;
  });
  const filteredReports = applyDateFilter(matchedReports, {
    field: 'created',
    range: dateFilter.effectiveRange,
    sort: dateFilter.sort,
  });
  const {
    currentPage,
    setCurrentPage,
    totalPages,
    pageData: paginatedReports,
  } = usePagination(filteredReports, 10);
  const handleDownload = async (id) => {
    const report = safeReports.find((item) => item.id === id);
    if (!report?.storagePath) {
      toast.error('Download failed', 'Report file is not ready');
      return;
    }
    try {
      await downloadReport(report.storagePath);
    } catch (error) {
      toast.error('Download failed', error.message);
    }
  };
  const handleDownloadExcel = (id) => {
    const report = safeReports.find((item) => item.id === id);
    if (!report) return;
    void generateReport(report.reportTypeCode, 'XLSX')
      .then((generated) => downloadReport(generated.storage_path))
      .catch((error) => toast.error('Download failed', error.message));
  };
  const handleDownloadCSV = (id) => {
    const report = safeReports.find((item) => item.id === id);
    if (!report) return;
    void generateReport(report.reportTypeCode, 'CSV')
      .then((generated) => downloadReport(generated.storage_path))
      .catch((error) => toast.error('Download failed', error.message));
  };
  const reportCodes = {
    All: 'FINANCIAL',
    'Financial Summary': 'FINANCIAL',
    'Worker Performance': 'WORKERS',
    'Customer Activity': 'CUSTOMERS',
    'Service Popularity': 'SERVICES',
    'Review Sentiment': 'REVIEWS',
  };
  const handleGenerate = async () => {
    try {
      await generateReport(reportCodes[reportType] ?? 'FINANCIAL', 'PDF');
      await refresh();
    } catch (error) {
      toast.error('Generation failed', error.message);
    }
  };
  return {
    isLoading,
    error,
    stats,
    searchTerm,
    setSearchTerm,
    dateFilter,
    currentPage,
    setCurrentPage,
    reportType,
    setReportType,
    filteredReports,
    totalPages,
    paginatedReports,
    handleDownload,
    handleDownloadExcel,
    handleDownloadCSV,
    handleGenerate,
  };
}
