import {
  DollarSign,
  CreditCard,
  Search,
  Filter,
  MoreVertical,
  Eye,
} from 'lucide-react';
import Drawer from '../../../components/ui/Drawer';
import Pagination from '../../../components/ui/Pagination';
import StatCard from '../../../components/ui/StatCard';
import TableSkeleton from '../../../components/ui/TableSkeleton';
import { money } from '../../../services/adminShared';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '../../../components/ui/Table';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '../../../components/ui/DropdownMenu';

export function PaymentsView({ model }) {
  const {
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
    activeTab,
    setActiveTab,
    count,
    totalPages,
    paginatedTxns,
    stats,
    getStatusColor,
    handleViewDetails,
  } = model;
  return (
    <div className="p-4 sm:p-6">
      <div className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Financial Overview</h1>
          <p className="text-foreground-lighter mt-1">
            Monitor revenue, worker payouts, and platform commissions
          </p>
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

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((stat, index) => (
          <StatCard key={index} title={stat.label} value={stat.value} icon={stat.icon} />
        ))}
      </div>

      {/* Tabs */}
      <div className="flex space-x-4 mb-6 border-b border-border overflow-x-auto">
        <button
          className={`py-2 px-4 font-medium text-sm border-b-2 whitespace-nowrap ${activeTab === 'transactions' ? 'border-foreground text-foreground' : 'border-transparent text-foreground-lighter hover:text-foreground-light hover:border-border-strong'}`}
          onClick={() => {
            setActiveTab('transactions');
            setCurrentPage(1);
          }}
        >
          All Transactions
        </button>
        <button
          className={`py-2 px-4 font-medium text-sm border-b-2 whitespace-nowrap ${activeTab === 'refunds' ? 'border-foreground text-foreground' : 'border-transparent text-foreground-lighter hover:text-foreground-light hover:border-border-strong'}`}
          onClick={() => {
            setActiveTab('refunds');
            setCurrentPage(1);
          }}
        >
          Refund Management
        </button>
        <button
          className={`py-2 px-4 font-medium text-sm border-b-2 whitespace-nowrap ${activeTab === 'cash' ? 'border-foreground text-foreground' : 'border-transparent text-foreground-lighter hover:text-foreground-light hover:border-border-strong'}`}
          onClick={() => {
            setActiveTab('cash');
            setCurrentPage(1);
          }}
        >
          Cash Records
        </button>
        <button
          className={`py-2 px-4 font-medium text-sm border-b-2 whitespace-nowrap ${activeTab === 'methods' ? 'border-foreground text-foreground' : 'border-transparent text-foreground-lighter hover:text-foreground-light hover:border-border-strong'}`}
          onClick={() => setActiveTab('methods')}
        >
          Payment Methods (Settings)
        </button>
      </div>

      {activeTab !== 'methods' ? (
        <>
          {/* Filters and Search */}
          <div className="bg-card rounded-t-xl shadow-sm border-x border-t border-border p-4 flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="relative w-full sm:w-96">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search size={18} className="text-foreground-muted" />
              </div>
              <input
                type="text"
                aria-label="Search transactions by ID or name..."
                placeholder="Search transactions by ID or name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-border-strong rounded-lg focus:ring-ring focus:border-brand-500 text-sm"
              />
            </div>
            <div className="flex w-full sm:w-auto items-center gap-2">
              <Filter size={18} className="text-foreground-lighter" />
              <select
                className="w-full flex-1 border border-border-strong rounded-lg px-3 py-2 text-sm focus:ring-ring focus:border-brand-500 sm:w-auto sm:flex-none"
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
              >
                <option value="All">All Types</option>
                <option value="Payment">Payments</option>
                <option value="Payout">Worker Payouts</option>
                <option value="Refund">Refunds</option>
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="bg-card shadow-sm border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead scope="col">Transaction</TableHead>
                  <TableHead scope="col">Type / Method</TableHead>
                  <TableHead scope="col">Amount</TableHead>
                  <TableHead scope="col">Status</TableHead>
                  <TableHead scope="col">Date</TableHead>
                  <TableHead scope="col" className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableSkeleton
                    rows={6}
                    columns={[{}, {}, {}, {}, {}, { className: 'text-right' }]}
                  />
                ) : paginatedTxns.length > 0 ? (
                  paginatedTxns.map((txn) => (
                    <TableRow key={txn.id}>
                      <TableCell className="whitespace-nowrap">
                        <div className="text-sm font-medium text-foreground">{txn.id}</div>
                        <div className="text-xs text-foreground-lighter">Booking: {txn.bookingId}</div>
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded text-xs font-medium mb-1 ${
                            txn.type === 'Payment'
                              ? 'bg-brand-500/10 text-brand-700 border border-brand-500/30'
                              : txn.type === 'Payout'
                                ? 'bg-info/10 text-info border border-purple-200'
                                : 'bg-warning/10 text-warning-600 dark:text-warning-400 border border-orange-200'
                          }`}
                        >
                          {txn.type}
                        </span>
                        <div className="text-xs text-foreground-lighter">{txn.method}</div>
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        <div
                          className={`text-sm font-bold ${txn.type === 'Refund' ? 'text-destructive' : 'text-foreground'}`}
                        >
                          {money(txn.amount)}
                        </div>
                        {txn.type === 'Payment' && (
                          <div className="text-xs text-foreground-lighter">Fee: {money(txn.fee)}</div>
                        )}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        <span
                          className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(txn.status)}`}
                        >
                          {txn.status}
                        </span>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-foreground-lighter">
                        {txn.date}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-right font-medium">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button
                              aria-label={`Open actions for ${txn.id}`}
                              className="inline-flex items-center justify-center rounded-full p-1.5 text-foreground-muted transition-colors hover:bg-surface-200 hover:text-foreground"
                            >
                              <MoreVertical size={20} />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem
                              onSelect={() => handleViewDetails(txn)}
                              className="cursor-pointer"
                            >
                              <Eye className="mr-2" /> View Details
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow hover={false}>
                    <TableCell colSpan="6" className="py-12 text-center text-foreground-lighter">
                      No transactions found matching your criteria.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {count > 0 && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          )}
        </>
      ) : (
        /* Payment Methods Settings Tab */
        <div className="bg-card rounded-xl shadow-sm border border-border p-6">
          <h2 className="text-lg font-bold text-foreground mb-6">Payment Methods</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 border border-border rounded-lg">
              <div className="flex items-center">
                <div className="h-12 w-12 bg-brand-500/10 rounded-lg flex items-center justify-center mr-4">
                  <span className="font-bold text-brand-600 text-xl">GC</span>
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">GCash</h3>
                  <p className="text-sm text-foreground-lighter">Integration coming soon</p>
                </div>
              </div>
              <span className="px-3 py-1 bg-surface-200 text-foreground-light text-xs font-medium rounded-full">
                Disabled (Future)
              </span>
            </div>

            <div className="flex items-center justify-between p-4 border border-border rounded-lg">
              <div className="flex items-center">
                <div className="h-12 w-12 bg-success/10 rounded-lg flex items-center justify-center mr-4">
                  <span className="font-bold text-success text-xl">M</span>
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Maya</h3>
                  <p className="text-sm text-foreground-lighter">Integration coming soon</p>
                </div>
              </div>
              <span className="px-3 py-1 bg-surface-200 text-foreground-light text-xs font-medium rounded-full">
                Disabled (Future)
              </span>
            </div>

            <div className="flex items-center justify-between p-4 border border-border rounded-lg">
              <div className="flex items-center">
                <div className="h-12 w-12 bg-info/10 rounded-lg flex items-center justify-center mr-4">
                  <CreditCard className="text-info" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Credit / Debit Card</h3>
                  <p className="text-sm text-foreground-lighter">Integration coming soon</p>
                </div>
              </div>
              <span className="px-3 py-1 bg-surface-200 text-foreground-light text-xs font-medium rounded-full">
                Disabled (Future)
              </span>
            </div>

            <div className="flex items-center justify-between p-4 border border-success/30 bg-success/10 rounded-lg">
              <div className="flex items-center">
                <div className="h-12 w-12 bg-success/10 rounded-lg flex items-center justify-center mr-4">
                  <DollarSign className="text-success" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Cash on Delivery / Direct</h3>
                  <p className="text-sm text-foreground-lighter">
                    Active by default for customer-worker offline payments
                  </p>
                </div>
              </div>
              <span className="px-3 py-1 bg-success/10 text-success-600 dark:text-success-400 text-xs font-medium rounded-full border border-success/30">
                Active
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Transaction Details Drawer */}
      <Drawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        title="Transaction Details"
      >
        {selectedTxn && (
          <div className="space-y-6">
            <div className="text-center py-6 bg-surface-200 rounded-xl">
              <p className="text-sm text-foreground-lighter uppercase tracking-wider font-semibold mb-2">
                {selectedTxn.type}
              </p>
              <h2 className="text-4xl font-bold text-foreground mb-2">
                {money(selectedTxn.amount)}
              </h2>
              <span
                className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(selectedTxn.status)}`}
              >
                {selectedTxn.status}
              </span>
            </div>

            <div className="border-t border-border pt-4 space-y-4">
              <div className="flex justify-between py-2 border-b border-border">
                <span className="text-foreground-lighter">Transaction ID</span>
                <span className="font-medium text-foreground">{selectedTxn.id}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-border">
                <span className="text-foreground-lighter">Date</span>
                <span className="font-medium text-foreground">{selectedTxn.date}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-border">
                <span className="text-foreground-lighter">Payment Method</span>
                <span className="font-medium text-foreground">{selectedTxn.method}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-border">
                <span className="text-foreground-lighter">Related Booking</span>
                <span className="font-medium text-brand-600 hover:underline cursor-pointer">
                  {selectedTxn.bookingId}
                </span>
              </div>
            </div>

            <div className="border-t border-border pt-6">
              <h4 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-4">
                Involved Parties
              </h4>
              <div className="space-y-4">
                <div className="bg-card border border-border p-4 rounded-lg">
                  <p className="text-xs text-foreground-lighter mb-1">Customer (Payer)</p>
                  <p className="font-medium text-foreground">{selectedTxn.customer}</p>
                </div>
                <div className="bg-card border border-border p-4 rounded-lg">
                  <p className="text-xs text-foreground-lighter mb-1">Worker (Payee)</p>
                  <p className="font-medium text-foreground">{selectedTxn.worker}</p>
                </div>
              </div>
            </div>

            {selectedTxn.type === 'Payment' && (
              <div className="border-t border-border pt-6">
                <h4 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-4">
                  Fee Breakdown
                </h4>
                <div className="bg-surface-200 p-4 rounded-lg space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-foreground-light">Subtotal</span>
                    <span className="text-foreground">{money(selectedTxn.amount)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-foreground-light">Platform Commission (15%)</span>
                    <span className="text-destructive">-{money(selectedTxn.fee)}</span>
                  </div>
                  <div className="flex justify-between font-bold pt-3 border-t border-border">
                    <span className="text-foreground">Net to Worker</span>
                    <span className="text-success">{money(selectedTxn.net)}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </Drawer>
    </div>
  );
}
