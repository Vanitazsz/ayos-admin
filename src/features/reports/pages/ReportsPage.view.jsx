import {
  FileText,
  Download,
  RefreshCw,
  Search,
  Plus,
  Loader2,
  AlertCircle,
  Calendar,
  Trash2,
} from 'lucide-react';
import Pagination from '../../../components/ui/Pagination';
import TableSkeleton from '../../../components/ui/TableSkeleton';
import Skeleton from '../../../components/ui/Skeleton';
import StatCard from '../../../components/ui/StatCard';
import { Button } from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import { Badge } from '../../../components/ui/Badge';
import { Alert } from '../../../components/ui/Alert';
import EmptyState from '../../../components/ui/EmptyState';
import DateFilter from '../../../components/ui/DateFilter';
import Modal from '../../../components/ui/Modal';
import ConfirmModal from '../../../components/ui/ConfirmModal';
import { Select, SelectItem } from '../../../components/ui/Select';
import { Tabs, TabsList, TabsTrigger } from '../../../components/ui/Tabs';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '../../../components/ui/Table';
import { cn } from '../../../lib/utils';

const STATUS_VARIANT = {
  completed: 'success',
  processing: 'info',
  pending: 'warning',
  failed: 'danger',
};

const STATUS_LABEL = {
  completed: 'Completed',
  processing: 'Processing',
  pending: 'Pending',
  failed: 'Failed',
};

const TAB_LABELS = {
  All: 'All',
  FINANCIAL: 'Financial',
  WORKERS: 'Workers',
  CUSTOMERS: 'Customers',
  SERVICES: 'Services',
  REVIEWS: 'Reviews',
};

export function ReportsView({ model }) {
  const {
    stats,
    isStatsLoading,
    searchTerm,
    setSearchTerm,
    dateFilter,
    reportType,
    setReportType,
    rows,
    count,
    isInitialLoading,
    error,
    empty,
    currentPage,
    setCurrentPage,
    totalPages,
    handleDownload,
    handleRetry,
    trashTarget,
    handleMoveToTrash,
    closeTrashConfirm,
    confirmTrashMove,
    reportTypes,
    isGeneratorOpen,
    openGenerator,
    closeGenerator,
    generatorType,
    setGeneratorType,
    generatorFormat,
    setGeneratorFormat,
    generatorPreset,
    setGeneratorPreset,
    presets,
    isGenerating,
    handleGenerate,
  } = model;

  return (
    <div className="p-4 sm:p-6">
      <div className="mb-8 flex flex-col justify-between items-start gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Reports Center</h1>
          <p className="mt-1 text-foreground-lighter">
            Generate and download comprehensive system reports
          </p>
        </div>
        <Button onClick={() => openGenerator()}>
          <Plus size={18} /> New Report
        </Button>
      </div>

      {error && (
        <Alert variant="danger" className="mb-4">
          <AlertCircle className="size-4" /> {error}
        </Alert>
      )}

      <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, index) => (
          <StatCard
            key={index}
            title={stat.label}
            value={stat.value}
            icon={stat.icon}
            isLoading={isStatsLoading}
          />
        ))}
      </div>

      <div className="mb-8">
        <h2 className="mb-3 text-sm font-semibold text-foreground-lighter">
          Available Reports
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {reportTypes.map((type) => (
            <button
              key={type.code}
              type="button"
              onClick={() => openGenerator(type.code)}
              className="group flex flex-col rounded-xl border border-border bg-surface-75 p-4 text-left transition-colors hover:border-brand-500/40 hover:bg-surface-100"
            >
              <div className="mb-2 flex items-center justify-between">
                <span className="flex size-8 items-center justify-center rounded-lg bg-brand-500/10 text-brand-700 dark:text-brand-300">
                  <FileText className="size-4" />
                </span>
                <Plus className="size-4 text-foreground-muted opacity-0 transition-opacity group-hover:opacity-100" />
              </div>
              <span className="text-sm font-bold text-foreground">{type.label}</span>
              <span className="mt-1 text-xs text-foreground-lighter">{type.description}</span>
            </button>
          ))}
        </div>
      </div>

      <Tabs
        value={reportType}
        onValueChange={(type) => {
          setReportType(type);
          setCurrentPage(1);
        }}
        className="mb-6"
      >
        <TabsList className="flex-wrap">
          {Object.entries(TAB_LABELS).map(([value, label]) => (
            <TabsTrigger key={value} value={value}>
              {label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <div className="flex flex-col justify-between items-center gap-4 rounded-t-xl border-x border-t border-border bg-surface-100 p-4 sm:flex-row">
        <div className="relative w-full sm:w-96">
          <Input
            icon={Search}
            aria-label="Search reports"
            placeholder="Search by report or requester..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <DateFilter model={dateFilter} />
      </div>

      <div className="overflow-hidden rounded-b-xl border border-border bg-surface-100">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Report</TableHead>
              <TableHead>Format / Range</TableHead>
              <TableHead>Requested By</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isInitialLoading ? (
              <TableSkeleton
                rows={6}
                columns={[
                  {
                    children: (
                      <div className="flex items-center">
                        <Skeleton className="size-9 rounded-lg mr-3 shrink-0" />
                        <div className="space-y-2">
                          <Skeleton className="h-4 w-32" />
                          <Skeleton className="h-3 w-20" />
                        </div>
                      </div>
                    ),
                  },
                  {},
                  {},
                  {},
                  {
                    children: <Skeleton className="h-6 w-16 rounded-full" />,
                  },
                  { className: 'text-right' },
                ]}
              />
            ) : !empty ? (
              rows.map((report) => {
                const variant = STATUS_VARIANT[report.statusKey] ?? 'default';
                return (
                  <TableRow key={report.id}>
                    <TableCell>
                      <div className="flex items-center">
                        <div className="mr-3 flex size-9 shrink-0 items-center justify-center rounded-lg bg-surface-200 text-foreground-light">
                          <FileText className="size-4" />
                        </div>
                        <div>
                          <div className="text-sm font-bold text-foreground">{report.name}</div>
                          <div className="text-xs text-foreground-lighter">{report.typeLabel}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      <div className="text-sm text-foreground">{report.format || 'PDF'}</div>
                      <div className="mt-0.5 text-xs text-foreground-lighter">{report.range}</div>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-sm text-foreground">
                      {report.requestedBy}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      <div className="flex items-center text-sm text-foreground">
                        <Calendar className="mr-1 size-3.5 text-foreground-muted" />
                        {report.createdAt}
                      </div>
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      <Badge variant={variant}>{STATUS_LABEL[report.statusKey] ?? report.status}</Badge>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-right font-medium">
                      {report.statusKey === 'completed' ? (
                        <div className="flex items-center justify-end gap-1.5">
                          <Button size="sm" onClick={() => void handleDownload(report.id)}>
                            <Download size={14} /> Download
                          </Button>
                          <Button
                            size="icon-sm"
                            variant="ghost"
                            aria-label="Move to trash"
                            title="Move to trash"
                            onClick={() => handleMoveToTrash(report.id)}
                          >
                            <Trash2 size={14} />
                          </Button>
                        </div>
                      ) : report.statusKey === 'failed' ? (
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => void handleRetry(report.id)}
                            disabled={isGenerating}
                          >
                            <RefreshCw size={14} /> Retry
                          </Button>
                          <Button
                            size="icon-sm"
                            variant="ghost"
                            aria-label="Move to trash"
                            title="Move to trash"
                            onClick={() => handleMoveToTrash(report.id)}
                          >
                            <Trash2 size={14} />
                          </Button>
                        </div>
                      ) : (
                        <span className="inline-flex items-center text-sm text-foreground-lighter">
                          <Loader2 className="mr-1 size-3.5 animate-spin" /> In progress
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            ) : (
              <TableRow hover={false}>
                <TableCell colSpan="6" className="p-0">
                  <EmptyState
                    icon={FileText}
                    title="No reports found"
                    description="No reports match your current filters. Try generating a new report."
                    actions={
                      <Button onClick={() => openGenerator()}>
                        <Plus size={16} /> New Report
                      </Button>
                    }
                  />
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        {!isInitialLoading && totalPages > 1 && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalCount={count}
            onPageChange={setCurrentPage}
          />
        )}
      </div>

      <Modal
        isOpen={isGeneratorOpen}
        onClose={closeGenerator}
        title="Generate New Report"
        maxWidth="max-w-md"
      >
        <div className="space-y-5">
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-foreground-lighter">
              Report type
            </label>
            <Select value={generatorType} onValueChange={setGeneratorType}>
              {reportTypes.map((type) => (
                <SelectItem key={type.code} value={type.code}>
                  {type.label}
                </SelectItem>
              ))}
            </Select>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-foreground-lighter">
              Format
            </label>
            <div className="flex items-center gap-1 rounded-lg bg-surface-200 p-1">
              {['PDF', 'CSV', 'XLSX'].map((format) => (
                <button
                  key={format}
                  type="button"
                  onClick={() => setGeneratorFormat(format)}
                  className={cn(
                    'flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                    generatorFormat === format
                      ? 'bg-surface-100 text-foreground shadow-sm'
                      : 'text-foreground-lighter hover:text-foreground',
                  )}
                >
                  {format}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-foreground-lighter">
              Date range
            </label>
            <div className="flex flex-wrap items-center gap-1 rounded-lg bg-surface-200 p-1">
              {presets.map((preset) => (
                <button
                  key={preset.key}
                  type="button"
                  onClick={() => setGeneratorPreset(preset.key)}
                  className={cn(
                    'flex-1 rounded-md px-2 py-1.5 text-xs font-medium transition-colors',
                    generatorPreset === preset.key
                      ? 'bg-surface-100 text-foreground shadow-sm'
                      : 'text-foreground-lighter hover:text-foreground',
                  )}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" onClick={closeGenerator} disabled={isGenerating}>
              Cancel
            </Button>
            <Button onClick={() => void handleGenerate()} disabled={isGenerating}>
              {isGenerating ? <Loader2 className="size-4 animate-spin" /> : <Plus size={16} />}
              {isGenerating ? 'Generating...' : 'Generate Report'}
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmModal
        isOpen={Boolean(trashTarget)}
        onClose={closeTrashConfirm}
        title="Move report to trash?"
        message={`Move "${trashTarget?.name ?? 'this report'}" to the Trash page? You can restore it or permanently delete it from the Trash page.`}
        onConfirm={() => void confirmTrashMove()}
      />
    </div>
  );
}
