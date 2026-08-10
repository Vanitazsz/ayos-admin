import { Search, Filter, Monitor, Smartphone, Globe, CheckCircle, XCircle } from 'lucide-react';
import Pagination from '../../../components/ui/Pagination';
import TableSkeleton from '../../../components/ui/TableSkeleton';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '../../../components/ui/Table';

export function AuditLogsView({ model }) {
  const {
    isLoading,
    error,
    searchTerm,
    setSearchTerm,
    filterModule,
    setFilterModule,
    currentPage,
    setCurrentPage,
    filteredLogs,
    totalPages,
    paginatedLogs,
    stats,
  } = model;
  return (
    <div className="p-4 sm:p-6">
      <div className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Security Audit Logs</h1>
          <p className="text-foreground-lighter mt-1">Track and monitor all administrator activities</p>
        </div>
      </div>
      {error && (
        <div
          role="alert"
          className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
        >
          {error}
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat, index) => (
          <div
            key={index}
            className="bg-card rounded-xl shadow-sm border border-border p-6 flex items-center"
          >
            <div className={`p-4 rounded-lg ${stat.bg} mr-4`}>{stat.icon}</div>
            <div>
              <p className="text-sm text-foreground-lighter font-medium">{stat.label}</p>
              <h3 className="text-2xl font-bold text-foreground">{stat.value}</h3>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-card rounded-t-xl shadow-sm border-x border-t border-border p-4 flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="relative w-full sm:w-96">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search size={18} className="text-foreground-muted" />
          </div>
          <input
            type="text"
            aria-label="Search by Admin, Action, or IP..."
            placeholder="Search by Admin, Action, or IP..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="block w-full pl-10 pr-3 py-2 border border-border-strong rounded-lg focus:ring-ring focus:border-brand-500 text-sm"
          />
        </div>
        <div className="flex w-full sm:w-auto items-center gap-2">
          <Filter size={18} className="text-foreground-lighter" />
          <select
            className="w-full flex-1 border border-border-strong rounded-lg px-3 py-2 text-sm focus:ring-ring focus:border-brand-500 sm:w-auto sm:flex-none"
            value={filterModule}
            onChange={(e) => setFilterModule(e.target.value)}
          >
            <option value="All">All Modules</option>
            <option value="Auth">Authentication</option>
            <option value="Workers">Workers</option>
            <option value="Bookings">Bookings</option>
            <option value="Payments">Payments</option>
          </select>
        </div>
      </div>

      <div className="bg-card shadow-sm border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead scope="col">Timestamp</TableHead>
              <TableHead scope="col">Admin</TableHead>
              <TableHead scope="col">Module</TableHead>
              <TableHead scope="col">Action & Target</TableHead>
              <TableHead scope="col" className="hidden lg:table-cell">IP Address</TableHead>
              <TableHead scope="col" className="hidden lg:table-cell">Device</TableHead>
              <TableHead scope="col" className="text-right">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableSkeleton
                rows={6}
                columns={[{}, {}, {}, {}, { className: 'hidden lg:table-cell' }, { className: 'hidden lg:table-cell' }, { className: 'text-right' }]}
              />
            ) : paginatedLogs.length > 0 ? (
              paginatedLogs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="whitespace-nowrap text-foreground-lighter">{log.timestamp}</TableCell>
                  <TableCell className="whitespace-nowrap font-medium text-foreground">
                    {log.admin}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    <span className="bg-surface-200 px-2 py-0.5 rounded text-xs">{log.module}</span>
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    <div className="font-medium text-foreground">{log.action}</div>
                    <div className="text-xs text-foreground-lighter mt-1">Target: {log.target}</div>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell whitespace-nowrap">
                    <div className="flex items-center text-xs text-foreground-lighter">
                      <Globe size={12} className="mr-1" /> {log.ip}
                    </div>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell whitespace-nowrap">
                    <div className="flex items-center text-foreground-light text-xs">
                      {log.isMobile ? (
                        <Smartphone size={14} className="mr-2 text-foreground-muted" />
                      ) : (
                        <Monitor size={14} className="mr-2 text-foreground-muted" />
                      )}
                      {log.device} • {log.browser}
                    </div>
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-right">
                    {log.status === 'Success' ? (
                      <span className="inline-flex items-center text-success font-medium">
                        <CheckCircle size={14} className="mr-1" /> Success
                      </span>
                    ) : log.status === 'Failed' ? (
                      <span className="inline-flex items-center text-destructive font-medium">
                        <XCircle size={14} className="mr-1" /> Failed
                      </span>
                    ) : null}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow hover={false}>
                <TableCell colSpan="7" className="py-12 text-center text-foreground-lighter">
                  No audit logs found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {filteredLogs.length > 0 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
        />
      )}
    </div>
  );
}
