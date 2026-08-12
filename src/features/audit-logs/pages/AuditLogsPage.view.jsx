import {
  Search,
  Filter,
  Monitor,
  Smartphone,
  Globe,
  CheckCircle,
  XCircle,
  ShieldAlert,
} from 'lucide-react';
import Pagination from '../../../components/ui/Pagination';
import TableSkeleton from '../../../components/ui/TableSkeleton';
import StatCard from '../../../components/ui/StatCard';
import Input from '../../../components/ui/Input';
import Select, { SelectItem } from '../../../components/ui/Select';
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

export function AuditLogsView({ model }) {
  const {
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
        <Alert variant="danger" className="mb-4">
          {error}
        </Alert>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((stat, index) => (
          <StatCard key={index} title={stat.label} value={stat.value} icon={stat.icon} />
        ))}
      </div>

      <div className="bg-card rounded-t-xl shadow-sm border-x border-t border-border p-4 flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="relative w-full sm:w-96">
          <Input
            icon={Search}
            aria-label="Search by Admin, Action, or IP..."
            placeholder="Search by Admin, Action, or IP..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex w-full sm:w-auto items-center gap-2">
          <DateFilter model={dateFilter} />
          <div className="w-full sm:w-48">
            <Select
              icon={Filter}
              aria-label="Filter by module"
              value={filterModule}
              onChange={(e) => setFilterModule(e.target.value)}
            >
              <SelectItem value="All">All Modules</SelectItem>
              <SelectItem value="Auth">Authentication</SelectItem>
              <SelectItem value="Workers">Workers</SelectItem>
              <SelectItem value="Bookings">Bookings</SelectItem>
              <SelectItem value="Payments">Payments</SelectItem>
            </Select>
          </div>
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
                    {log.admin || '—'}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {log.module ? (
                      <Badge variant="default">{log.module}</Badge>
                    ) : (
                      <span className="text-foreground-lighter">—</span>
                    )}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    <div className="font-medium text-foreground">{log.action}</div>
                    <div className="text-xs text-foreground-lighter mt-1">
                      Target: {log.target || '—'}
                    </div>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell whitespace-nowrap">
                    <div className="flex items-center text-xs text-foreground-lighter">
                      <Globe size={12} className="mr-1" /> {log.ip || '—'}
                    </div>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell whitespace-nowrap">
                    <div className="flex items-center text-foreground-light text-xs">
                      {log.isMobile ? (
                        <Smartphone size={14} className="mr-2 text-foreground-muted" />
                      ) : (
                        <Monitor size={14} className="mr-2 text-foreground-muted" />
                      )}
                      {[log.device, log.browser].filter(Boolean).join(' • ') || '—'}
                    </div>
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-right">
                    {log.status === 'Success' ? (
                      <Badge variant="success">
                        <CheckCircle size={12} /> Success
                      </Badge>
                    ) : log.status === 'Failed' ? (
                      <Badge variant="danger">
                        <XCircle size={12} /> Failed
                      </Badge>
                    ) : (
                      <span className="text-foreground-lighter">—</span>
                    )}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow hover={false}>
                <TableCell colSpan="7" className="p-0">
                  <EmptyState
                    icon={ShieldAlert}
                    title="No audit logs found"
                    description="No audit logs found matching your criteria."
                  />
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
