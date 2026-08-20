import {
  DollarSign,
  CreditCard,
  Search,
  Filter,
  MoreVertical,
  Eye,
  ArrowRight,
  Calendar,
  Hash,
  BookOpen,
  Users,
  Briefcase,
  CheckCircle2,
  Image as ImageIcon,
} from 'lucide-react';
import Drawer from '../../../components/ui/Drawer';
import Pagination from '../../../components/ui/Pagination';
import StatCard from '../../../components/ui/StatCard';
import TableSkeleton from '../../../components/ui/TableSkeleton';
import Skeleton from '../../../components/ui/Skeleton';
import Select, { SelectItem } from '../../../components/ui/Select';
import { Button } from '../../../components/ui/Button';
import Modal from '../../../components/ui/Modal';
import Input from '../../../components/ui/Input';
import Textarea from '../../../components/ui/Textarea';
import { Badge } from '../../../components/ui/Badge';
import { Alert } from '../../../components/ui/Alert';
import EmptyState from '../../../components/ui/EmptyState';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../../components/ui/Tabs';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '../../../components/ui/Card';
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
  DropdownMenuSeparator,
} from '../../../components/ui/DropdownMenu';
import { Trash2 } from 'lucide-react';
import ConfirmModal from '../../../components/ui/ConfirmModal';
import DateFilter from '../../../components/ui/DateFilter';
import { CommissionFeeSettings } from '../components/CommissionFeeSettings';

const txnTypeVariant = {
  Payment: 'primary',
  Payout: 'info',
  Refund: 'warning',
};

const txnStatusVariant = {
  Completed: 'success',
  Pending: 'warning',
  'Awaiting Confirmation': 'info',
  Processing: 'info',
  'Requires Action': 'warning',
  Failed: 'danger',
  Expired: 'default',
  Cancelled: 'default',
  Refunded: 'default',
};

const TransactionsTab = ({ model, onOpenAction, onViewDetails }) => (
  <>
    {/* Filters and Search */}
    <div className="bg-card rounded-t-xl shadow-sm border-x border-t border-border p-4 flex flex-col sm:flex-row justify-between items-center gap-4">
      <div className="relative w-full sm:w-96">
        <Input
          icon={Search}
          aria-label="Search transactions by ID or name..."
          placeholder="Search transactions by ID or name..."
          value={model.searchTerm}
          onChange={(e) => model.setSearchTerm(e.target.value)}
        />
      </div>
        <div className="flex w-full sm:w-auto items-center gap-2">
        <div className="w-full sm:w-48">
          <Select
            icon={Filter}
            aria-label="Filter transactions by type"
            value={model.filterType}
            onChange={(e) => model.setFilterType(e.target.value)}
          >
            <SelectItem value="All">All Types</SelectItem>
            <SelectItem value="Payment">Payments</SelectItem>
          </Select>
        </div>
        <DateFilter model={model} />
      </div>
    </div>

    {/* Table */}
    <div className="bg-card shadow-sm border border-border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead scope="col">Sender → Receiver</TableHead>
            <TableHead scope="col">Type / Method</TableHead>
            <TableHead scope="col">Amount</TableHead>
            <TableHead scope="col">Status</TableHead>
            <TableHead scope="col">Date</TableHead>
            <TableHead scope="col" className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {model.isLoading ? (
            <TableSkeleton
              rows={6}
              columns={[
                {
                  children: (
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-40" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                  ),
                },
                {
                  children: (
                    <div className="space-y-1.5">
                      <Skeleton className="h-5 w-16 rounded-full" />
                      <Skeleton className="h-3 w-20" />
                    </div>
                  ),
                },
                {},
                {
                  children: <Skeleton className="h-6 w-16 rounded-full" />,
                },
                {},
                { className: 'text-right' },
              ]}
            />
          ) : model.paginatedTxns.length > 0 ? (
            model.paginatedTxns.map((txn) => (
              <TableRow
                key={txn.id}
                onClick={() => onViewDetails(txn)}
                className="cursor-pointer"
              >
                <TableCell className="whitespace-nowrap">
                  <div className="flex items-center text-sm font-medium text-foreground">
                    <span className="max-w-44 truncate">{txn.customer || '—'}</span>
                    <ArrowRight className="mx-1.5 size-3 shrink-0 text-foreground-muted" />
                    <span className="max-w-44 truncate">{txn.worker || '—'}</span>
                  </div>
                  <div className="mt-0.5 flex items-center gap-1 text-xs text-foreground-lighter">
                    <span
                      className="min-w-0 max-w-[8rem] truncate font-mono"
                      title={txn.id}
                    >
                      {txn.id}
                    </span>
                    <span className="shrink-0">· Booking:</span>
                    <span
                      className="min-w-0 max-w-[8rem] truncate"
                      title={txn.bookingId}
                    >
                      {txn.bookingId}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  <Badge variant={txnTypeVariant[txn.type] ?? 'default'} className="mb-1">
                    {txn.type}
                  </Badge>
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
                  <Badge variant={txnStatusVariant[txn.status] ?? 'default'}>
                    {txn.status}
                  </Badge>
                </TableCell>
                <TableCell className="whitespace-nowrap text-foreground-lighter">
                  {txn.date}
                </TableCell>
                <TableCell className="whitespace-nowrap text-right font-medium">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        aria-label={`Open actions for ${txn.id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center justify-center rounded-full p-1.5 text-foreground-muted transition-colors hover:bg-surface-200 hover:text-foreground"
                      >
                        <MoreVertical size={20} />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-52">
                      <DropdownMenuItem
                        onSelect={() => onViewDetails(txn)}
                        className="cursor-pointer"
                      >
                        <Eye className="mr-2" /> View Details
                      </DropdownMenuItem>
                      {model.canConfirmCash(txn) && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onSelect={() => onOpenAction('confirmCash', txn)}
                            className="cursor-pointer text-success-600 dark:text-success-400 focus:bg-success/10 [&_svg]:text-success-600 dark:[&_svg]:text-success-400"
                          >
                            <CheckCircle2 className="mr-2" /> Confirm Cash
                          </DropdownMenuItem>
                        </>
                      )}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onSelect={() => onOpenAction('trash', txn)}
                        className="cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10 [&_svg]:text-destructive"
                      >
                        <Trash2 className="mr-2" /> Move to Trash
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow hover={false}>
              <TableCell colSpan="6" className="p-0">
                <EmptyState
                  icon={CreditCard}
                  title="No transactions found"
                  description="No transactions found matching your criteria."
                />
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      {model.count > 0 && (
        <Pagination
          currentPage={model.currentPage}
          totalPages={model.totalPages}
          onPageChange={model.setCurrentPage}
          totalCount={model.count}
        />
      )}
    </div>
  </>
);

function DetailRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start gap-3">
      <Icon size={16} className="mt-0.5 shrink-0 text-foreground-muted" />
      <div className="min-w-0 flex-1">
        <p className="text-xs text-foreground-muted">{label}</p>
        <div className="text-sm text-foreground">{value || '—'}</div>
      </div>
    </div>
  );
}

function DetailSectionTitle({ children }) {
  return (
    <h4 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-4">
      {children}
    </h4>
  );
}

export function PaymentsView({ model }) {
  const {
    error,
    selectedTxn,
    isDrawerOpen,
    setIsDrawerOpen,
    proofUrl,
    isProofLoading,
    activeTab,
    setActiveTab,
    setCurrentPage,
    stats,
    handleViewDetails,
    openAction,
    action,
    setAction,
    actionReason,
    setActionReason,
    savingAction,
    submitAction,
    canConfirmCash,
    confirm,
    closeConfirm,
    feeSettings,
    setFeeSettings,
    saveFeeSettings,
    isSavingFeeSettings,
    resetFeeSettingsToDefaults,
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
        <Alert variant="danger" className="mb-4">
          {error}
        </Alert>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((stat, index) => (
          <StatCard key={index} title={stat.label} value={stat.value} icon={stat.icon} />
        ))}
      </div>

      <Tabs
        value={activeTab}
        onValueChange={(tab) => {
          setActiveTab(tab);
          if (tab !== 'methods' && tab !== 'commission') {
            setCurrentPage(1);
          }
        }}
      >
        {/* Tabs */}
        <TabsList className="space-x-2 mb-6">
          <TabsTrigger value="transactions">All Transactions</TabsTrigger>
          <TabsTrigger value="refunds">Refund Management</TabsTrigger>
          <TabsTrigger value="cash">Cash Records</TabsTrigger>
          <TabsTrigger value="methods">Payment Methods (Settings)</TabsTrigger>
          <TabsTrigger value="commission">Commission & Fee Configuration</TabsTrigger>
        </TabsList>

        <TabsContent value="transactions">
          <TransactionsTab
            model={model}
            onOpenAction={openAction}
            onViewDetails={handleViewDetails}
          />
        </TabsContent>
        <TabsContent value="refunds">
          <TransactionsTab
            model={model}
            onOpenAction={openAction}
            onViewDetails={handleViewDetails}
          />
        </TabsContent>
        <TabsContent value="cash">
          <TransactionsTab
            model={model}
            onOpenAction={openAction}
            onViewDetails={handleViewDetails}
          />
        </TabsContent>
        <TabsContent value="methods">
          {/* Payment Methods Settings Tab */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-bold">Payment Methods</CardTitle>
            </CardHeader>
            <CardContent>
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
                  <Badge variant="default">Disabled (Future)</Badge>
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
                  <Badge variant="default">Disabled (Future)</Badge>
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
                  <Badge variant="default">Disabled (Future)</Badge>
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
                  <Badge variant="success">Active</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="commission">
          <CommissionFeeSettings
            feeSettings={feeSettings}
            onChangeFeeSettings={setFeeSettings}
            onSaveFeeSettings={saveFeeSettings}
            isSaving={isSavingFeeSettings}
            onResetDefaults={resetFeeSettingsToDefaults}
          />
        </TabsContent>
      </Tabs>

      {/* Transaction Details Drawer */}
      <Drawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        title="Transaction Details"
        footer={
          selectedTxn ? (
            <div className="flex w-full gap-3">
              {canConfirmCash(selectedTxn) && (
                <Button
                  variant="primary"
                  size="sm"
                  className="flex-1"
                  onClick={() => openAction('confirmCash', selectedTxn)}
                >
                  <CheckCircle2 /> Confirm Cash
                </Button>
              )}
              <Button
                variant="danger"
                size="sm"
                className="flex-1"
                onClick={() => openAction('trash', selectedTxn)}
              >
                Move to Trash
              </Button>
            </div>
          ) : null
        }
      >
        {selectedTxn && (
          <div className="space-y-6">
            <div className="text-center py-6 bg-surface-200 rounded-xl">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Badge variant={txnTypeVariant[selectedTxn.type] ?? 'default'}>
                  {selectedTxn.type}
                </Badge>
                <Badge
                  variant={txnStatusVariant[selectedTxn.status] ?? 'default'}
                  className="text-sm px-3 py-1"
                >
                  {selectedTxn.status}
                </Badge>
              </div>
              <h2 className="text-4xl font-bold text-foreground mb-2">
                {money(selectedTxn.amount)}
              </h2>
              <p className="text-xs text-foreground-lighter uppercase tracking-wider font-semibold">
                {selectedTxn.method}
              </p>
            </div>

            <div className="border-t border-border pt-6">
              <DetailSectionTitle>Details</DetailSectionTitle>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <DetailRow
                  icon={Hash}
                  label="Transaction ID"
                  value={
                    <span className="font-mono break-all select-all">{selectedTxn.id}</span>
                  }
                />
                <DetailRow icon={Calendar} label="Date" value={selectedTxn.date} />
                <DetailRow icon={CreditCard} label="Payment Method" value={selectedTxn.method} />
                <DetailRow
                  icon={BookOpen}
                  label="Related Booking"
                  value={
                    <button className="font-medium text-brand-600 hover:underline cursor-pointer">
                      {selectedTxn.bookingId}
                    </button>
                  }
                />
              </div>
            </div>

            <div className="border-t border-border pt-6">
              <DetailSectionTitle>Involved Parties</DetailSectionTitle>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-card border border-border rounded-lg p-3">
                  <p className="text-xs text-foreground-lighter mb-2 flex items-center gap-1.5">
                    <Users size={12} className="text-brand-600" /> Customer (Payer)
                  </p>
                  <div className="flex items-center">
                    <div className="h-8 w-8 rounded-full bg-brand-500/10 flex items-center justify-center text-brand-600 text-xs font-bold mr-2 shrink-0">
                      {(selectedTxn.customer || '?').charAt(0)}
                    </div>
                    <span className="min-w-0 text-sm font-medium text-foreground break-words">
                      {selectedTxn.customer || '—'}
                    </span>
                  </div>
                </div>
                <div className="bg-card border border-border rounded-lg p-3">
                  <p className="text-xs text-foreground-lighter mb-2 flex items-center gap-1.5">
                    <Briefcase size={12} className="text-success" /> Worker (Payee)
                  </p>
                  <div className="flex items-center">
                    <div className="h-8 w-8 rounded-full bg-success/10 flex items-center justify-center text-success text-xs font-bold mr-2 shrink-0">
                      {(selectedTxn.worker || '?').charAt(0)}
                    </div>
                    <span className="min-w-0 text-sm font-medium text-foreground break-words">
                      {selectedTxn.worker || '—'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {selectedTxn.type === 'Payment' && (
              <div className="border-t border-border pt-6">
                <DetailSectionTitle>Fee Breakdown</DetailSectionTitle>
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

            <div className="border-t border-border pt-6">
              <DetailSectionTitle>Proof of Payment</DetailSectionTitle>
              {selectedTxn.proofPath ? (
                isProofLoading ? (
                  <Skeleton className="h-56 w-full max-w-64 rounded-lg" />
                ) : proofUrl ? (
                  <a
                    href={proofUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="block aspect-square w-full max-w-64 rounded-lg overflow-hidden border border-border bg-surface-200"
                  >
                    <img
                      src={proofUrl}
                      alt="Proof of payment receipt"
                      className="h-full w-full object-cover"
                    />
                  </a>
                ) : (
                  <p className="text-sm text-foreground-lighter">
                    The proof image could not be loaded.
                  </p>
                )
              ) : (
                <div className="flex items-center gap-3 rounded-lg border border-border bg-surface-200/60 px-4 py-3">
                  <ImageIcon size={16} className="shrink-0 text-foreground-muted" />
                  <p className="text-sm text-foreground-lighter">
                    No proof attached. Customers can attach a receipt when paying for a booking.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </Drawer>

      <Modal
        isOpen={Boolean(action)}
        onClose={() => !savingAction && setAction(null)}
        title={action?.type === 'confirmCash' ? 'Confirm Cash Payment' : 'Move Transaction to Trash'}
      >
        {action && (
          <div className="space-y-4">
            <p className="text-sm text-foreground-light">Transaction {action.txn.id}</p>
            {action.type === 'confirmCash' && (
              <div className="rounded-lg border border-success/30 bg-success/10 px-4 py-3 text-sm text-success">
                <p className="font-medium">Cash payment of {money(action.txn.amount)}</p>
                <p className="mt-0.5 text-xs text-foreground-lighter">
                  Marking this as completed records that the offline cash payment was collected.
                </p>
              </div>
            )}
            <div>
              <Textarea
                label={action.type === 'confirmCash' ? 'Admin notes (optional)' : 'Admin reason'}
                value={actionReason}
                onChange={(e) => setActionReason(e.target.value)}
                maxLength={1000}
                placeholder={
                  action.type === 'confirmCash'
                    ? 'Add any notes about this cash confirmation...'
                    : 'Specify the reason for trashing this transaction...'
                }
                className="min-h-24"
              />
            </div>
            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                disabled={savingAction}
                onClick={() => setAction(null)}
              >
                Close
              </Button>
              <Button
                disabled={
                  savingAction ||
                  (action.type !== 'confirmCash' && actionReason.trim().length < 3)
                }
                onClick={() => void submitAction()}
                isLoading={savingAction}
                loadingText="Saving…"
              >
                Confirm
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmModal
        isOpen={confirm.isOpen}
        onClose={closeConfirm}
        title={confirm.title}
        message={confirm.message}
        onConfirm={confirm.onConfirm}
        confirmLabel="Yes"
        variant="primary"
      />
    </div>
  );
}
