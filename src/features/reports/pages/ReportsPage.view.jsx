import {
  FileText,
  Download,
  Search,
  Calendar,
} from 'lucide-react';
import Pagination from '../../../components/ui/Pagination';
import TableSkeleton from '../../../components/ui/TableSkeleton';
import StatCard from '../../../components/ui/StatCard';
import { Button } from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import { Badge } from '../../../components/ui/Badge';
import { Alert } from '../../../components/ui/Alert';
import EmptyState from '../../../components/ui/EmptyState';
import DateFilter from '../../../components/ui/DateFilter';
import { Tabs, TabsList, TabsTrigger } from '../../../components/ui/Tabs';
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

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((stat, index) => (
          <StatCard key={index} title={stat.label} value={stat.value} icon={stat.icon} isLoading={isLoading} />
        ))}
      </div>

      {/* Report Types */}
      <Tabs
        value={reportType}
        onValueChange={(type) => {
          setReportType(type);
          setCurrentPage(1);
        }}
        className="mb-8"
      >
        <TabsList>
          <TabsTrigger value="All">All Reports</TabsTrigger>
          <TabsTrigger value="Financial Summary">Financial</TabsTrigger>
          <TabsTrigger value="Worker Performance">Workers</TabsTrigger>
          <TabsTrigger value="Customer Activity">Customers</TabsTrigger>
          <TabsTrigger value="Service Popularity">Services</TabsTrigger>
          <TabsTrigger value="Review Sentiment">Reviews</TabsTrigger>
        </TabsList>
      </Tabs>

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
        <div className="flex w-full items-center gap-2 sm:w-auto">
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
