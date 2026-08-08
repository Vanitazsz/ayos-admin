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
    currentPage,
    setCurrentPage,
    dateRange,
    setDateRange,
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
    <div className="p-6">
      <div className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Reports Center</h1>
          <p className="text-foreground-lighter mt-1">Generate and download comprehensive system reports</p>
        </div>
        <button
          onClick={() => void handleGenerate()}
          className="mt-4 sm:mt-0 bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-sm flex items-center"
        >
          <FileText size={18} className="mr-2" /> Generate Custom Report
        </button>
      </div>
      {isLoading && (
        <div className="flex justify-center py-8 text-foreground-lighter">
          <div className="animate-spin h-6 w-6 border-2 border-border-strong border-t-brand-600 rounded-full mr-2" />{' '}
          Loading...
        </div>
      )}
      {error && (
        <div
          role="alert"
          className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
        >
          {error}
        </div>
      )}

      {/* Report Types Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        <button
          type="button"
          onClick={() => setReportType('All')}
          className={`rounded-xl shadow-sm border p-4 flex flex-col items-center justify-center transition-all ${reportType === 'All' ? 'bg-foreground text-foreground-contrast border-transparent' : 'bg-card border-border hover:shadow-md text-foreground'}`}
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
              className={`rounded-xl shadow-sm border p-4 flex flex-col items-center justify-center transition-all ${isActive ? type.activeBg + ' border-transparent text-white' : 'bg-card border-border hover:shadow-md text-foreground'}`}
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
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search size={18} className="text-foreground-muted" />
          </div>
          <input
            type="text"
            aria-label="Search reports by name or ID..."
            placeholder="Search reports by name or ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="block w-full pl-10 pr-3 py-2 border border-border-strong rounded-lg focus:ring-ring focus:border-brand-500 text-sm"
          />
        </div>
        <div className="flex w-full sm:w-auto items-center gap-2">
          <Filter size={18} className="text-foreground-lighter" />
          <select
            className="border border-border-strong rounded-lg px-3 py-2 text-sm focus:ring-ring focus:border-brand-500"
            value={reportType}
            onChange={(e) => setReportType(e.target.value)}
          >
            <option value="All">All Types</option>
            <option value="Financial Summary">Financial Summary</option>
            <option value="Worker Performance">Worker Performance</option>
            <option value="Customer Activity">Customer Activity</option>
            <option value="Service Popularity">Service Popularity</option>
            <option value="Review Sentiment">Review Sentiment</option>
          </select>
          <select
            className="border border-border-strong rounded-lg px-3 py-2 text-sm focus:ring-ring focus:border-brand-500 ml-2"
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
          >
            <option value="Last 7 Days">Last 7 Days</option>
            <option value="Last 30 Days">Last 30 Days</option>
            <option value="This Year">This Year</option>
            <option value="All Time">All Time</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-card shadow-sm border border-border overflow-x-auto">
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
            {paginatedReports.length > 0 ? (
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
                    <span className="inline-flex px-2 py-0.5 rounded text-xs font-medium bg-success/10 text-success-600 dark:text-success-400 mb-1">
                      {report.status}
                    </span>
                    <div className="text-xs text-foreground-lighter">{report.size}</div>
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-right font-medium">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => handleDownloadCSV(report.id)}
                        className="text-foreground-light bg-card border border-border-strong hover:bg-surface-200 px-3 py-1.5 rounded-lg font-medium transition-colors text-xs"
                      >
                        CSV
                      </button>
                      <button
                        onClick={() => handleDownloadExcel(report.id)}
                        className="text-success-600 dark:text-success-400 bg-success/10 border border-success/30 hover:bg-success/10 px-3 py-1.5 rounded-lg font-medium transition-colors text-xs"
                      >
                        Excel
                      </button>
                      <button
                        onClick={() => handleDownload(report.id)}
                        className="text-white bg-brand-600 hover:bg-brand-700 px-3 py-1.5 rounded-lg font-medium transition-colors text-xs flex items-center"
                      >
                        <Download size={14} className="mr-1" /> PDF
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow hover={false}>
                <TableCell colSpan="4" className="text-center text-foreground-lighter">
                  No reports found matching your criteria.
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
