import {
  FileText,
  Download,
  Filter,
  Search,
  Calendar,
  BarChart2,
  Users,
  Briefcase,
  CreditCard,
  Star,
} from 'lucide-react';
import Pagination from '../../../components/ui/Pagination';
import TableSkeleton from '../../../components/ui/TableSkeleton';
import { Button } from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import Select from '../../../components/ui/Select';
import { Badge } from '../../../components/ui/Badge';
import { Alert } from '../../../components/ui/Alert';
import EmptyState from '../../../components/ui/EmptyState';
import DateFilter from '../../../components/ui/DateFilter';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '../../../components/ui/Table';

export function ReportsView({ model }) {
  const {
    isLoading,
    error,
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
  } = model;
  return (
    <div className="p-4 sm:p-6">
      <div className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Reports Center</h1>
          <p className="text-foreground-lighter mt-1">Generate and download comprehensive system reports</p>
        </div>
        <Button
          onClick={() => void handleGenerate()}
          className="mt-4 sm:mt-0"
        >
          <FileText size={18} /> Generate Custom Report
        </Button>
      </div>
      {error && (
        <Alert variant="danger" className="mb-4">
          {error}
        </Alert>
      )}

      {/* Report Types Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        <button
          type="button"
          onClick={() => setReportType('All')}
          className={`rounded-xl shadow-sm border p-4 flex flex-col items-center justify-center transition-all focus-ring ${reportType === 'All' ? 'bg-foreground text-foreground-contrast border-transparent' : 'bg-card border-border hover:shadow-md text-foreground'}`}
        >
          <div
            className={`p-3 rounded-full mb-3 ${reportType === 'All' ? 'bg-background/20 text-foreground-contrast' : 'bg-surface-200 text-foreground-light'}`}
          >
            <Filter size={24} />
          </div>
          <h3 className="text-sm font-bold">All Reports</h3>
        </button>
        {[
          {
            name: 'Financial',
            filterName: 'Financial Summary',
            icon: <CreditCard />,
            bg: 'bg-brand-500/10',
            activeBg: 'bg-brand-600',
            color: 'text-brand-500',
            activeColor: 'text-white',
          },
          {
            name: 'Workers',
            filterName: 'Worker Performance',
            icon: <Briefcase />,
            bg: 'bg-info/10',
            activeBg: 'bg-info',
            color: 'text-info',
            activeColor: 'text-white',
          },
          {
            name: 'Customers',
            filterName: 'Customer Activity',
            icon: <Users />,
            bg: 'bg-success/10',
            activeBg: 'bg-success',
            color: 'text-success',
            activeColor: 'text-white',
          },
          {
            name: 'Services',
            filterName: 'Service Popularity',
            icon: <BarChart2 />,
            bg: 'bg-warning/10',
            activeBg: 'bg-warning',
            color: 'text-warning',
            activeColor: 'text-white',
          },
          {
            name: 'Reviews',
            filterName: 'Review Sentiment',
            icon: <Star className="fill-current" />,
            bg: 'bg-warning/10',
            activeBg: 'bg-warning',
            color: 'text-warning',
            activeColor: 'text-white',
          },
        ].map((type, index) => {
          const isActive = reportType === type.filterName;
          return (
            <button
              type="button"
              key={index}
              onClick={() => {
                setReportType(type.filterName);
                setCurrentPage(1);
              }}
              className={`rounded-xl shadow-sm border p-4 flex flex-col items-center justify-center transition-all focus-ring ${isActive ? type.activeBg + ' border-transparent text-white' : 'bg-card border-border hover:shadow-md text-foreground'}`}
            >
              <div
                className={`p-3 rounded-full mb-3 ${isActive ? 'bg-card/20 text-white' : type.bg + ' ' + type.color}`}
              >
                {type.icon}
              </div>
              <h3 className="text-sm font-bold">{type.name}</h3>
            </button>
          );
        })}
      </div>

      {/* Filters and Search */}
      <div className="bg-card rounded-t-xl shadow-sm border-x border-t border-border p-4 flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="relative w-full sm:w-96">
          <Input
            icon={Search}
            aria-label="Search reports by name or ID..."
            placeholder="Search reports by name or ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
          <div className="w-full flex-1 min-w-0 sm:w-52 sm:flex-none">
            <Select
              icon={Filter}
              aria-label="Filter reports by type"
              value={reportType}
              onChange={(e) => setReportType(e.target.value)}
            >
              <option value="All">All Types</option>
              <option value="Financial Summary">Financial Summary</option>
              <option value="Worker Performance">Worker Performance</option>
              <option value="Customer Activity">Customer Activity</option>
              <option value="Service Popularity">Service Popularity</option>
              <option value="Review Sentiment">Review Sentiment</option>
            </Select>
          </div>
          <DateFilter model={dateFilter} />
        </div>
      </div>

      {/* Table */}
      <div className="bg-card shadow-sm border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead scope="col">Report Name</TableHead>
              <TableHead scope="col">Generated Date</TableHead>
              <TableHead scope="col">Status / Size</TableHead>
              <TableHead scope="col" className="text-right">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableSkeleton rows={6} columns={[{}, {}, {}, { className: 'text-right' }]} />
            ) : paginatedReports.length > 0 ? (
              paginatedReports.map((report) => (
                <TableRow key={report.id}>
                  <TableCell className="whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="p-2 rounded-lg bg-surface-200 mr-3">{report.icon}</div>
                      <div>
                        <div className="text-sm font-bold text-foreground">{report.name}</div>
                        <div className="text-xs text-foreground-lighter">
                          {report.id} • {report.type}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    <div className="text-sm text-foreground flex items-center">
                      <Calendar size={14} className="mr-1 text-foreground-muted" /> {report.dateGenerated}
                    </div>
                    <div className="text-xs text-foreground-lighter mt-1">By {report.generatedBy}</div>
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    <Badge variant="success" className="mb-1">
                      {report.status}
                    </Badge>
                    <div className="text-xs text-foreground-lighter">{report.size}</div>
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-right font-medium">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDownloadCSV(report.id)}
                      >
                        CSV
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-success-600 dark:text-success-400 border-success/30 bg-success/10 hover:bg-success/10"
                        onClick={() => handleDownloadExcel(report.id)}
                      >
                        Excel
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleDownload(report.id)}
                      >
                        <Download size={14} /> PDF
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow hover={false}>
                <TableCell colSpan="4" className="p-0">
                  <EmptyState
                    icon={FileText}
                    title="No reports found"
                    description="No reports found matching your criteria."
                  />
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {filteredReports.length > 0 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
        />
      )}
    </div>
  );
}
