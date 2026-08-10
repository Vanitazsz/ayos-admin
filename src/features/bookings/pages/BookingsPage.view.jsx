import {
  Search,
  Filter,
  MoreVertical,
  Calendar,
  MapPin,
  Clock,
  XCircle,
  Trash2,
  Eye,
  User,
} from 'lucide-react';
import Drawer from '../../../components/ui/Drawer';
import Modal from '../../../components/ui/Modal';
import Pagination from '../../../components/ui/Pagination';
import ConfirmModal from '../../../components/ui/ConfirmModal';
import StatCard from '../../../components/ui/StatCard';
import Input from '../../../components/ui/Input';
import Select from '../../../components/ui/Select';
import Skeleton from '../../../components/ui/Skeleton';
import TableSkeleton from '../../../components/ui/TableSkeleton';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '../../../components/ui/Table';
import { money, formatDateTime } from '../../../services/adminShared';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '../../../components/ui/DropdownMenu';

export function BookingsView({ model }) {
  const {
    searchTerm,
    setSearchTerm,
    filterStatus,
    setFilterStatus,
    currentPage,
    setCurrentPage,
    selectedBooking,
    isDrawerOpen,
    setIsDrawerOpen,
    action,
    setAction,
    actionReason,
    setActionReason,
    replacementWorker,
    setReplacementWorker,
    savingAction,
    confirm,
    closeConfirm,
    error,
    isLoading,
    count,
    totalPages,
    paginatedBookings,
    stats,
    getStatusColor,
    handleViewDetails,
    openAction,
    submitAction,
  } = model;
  return (
    <div className="p-4 sm:p-6">
      <div className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Bookings Management</h1>
          <p className="text-foreground-lighter mt-1">
            Track and manage all service bookings across the platform
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

      {/* Filters and Search */}
      <div className="bg-card rounded-t-xl shadow-sm border-x border-t border-border p-4 flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="w-full sm:w-96">
          <Input
            icon={Search}
            aria-label="Search by ID, customer, or service..."
            placeholder="Search by ID, customer, or service..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="w-full sm:w-48">
          <Select
            icon={Filter}
            aria-label="Filter bookings by status"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="All">All Statuses</option>
            <option value="Pending">Pending</option>
            <option value="Ongoing">Ongoing</option>
            <option value="Completed">Completed</option>
            <option value="Cancelled">Cancelled</option>
          </Select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-card shadow-sm border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead scope="col">Booking ID & Date</TableHead>
              <TableHead scope="col">Service Details</TableHead>
              <TableHead scope="col">Customer & Worker</TableHead>
              <TableHead scope="col">Amount</TableHead>
              <TableHead scope="col">Status</TableHead>
              <TableHead scope="col" className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableSkeleton
                rows={6}
                columns={[
                  {},
                  {},
                  {},
                  {},
                  {},
                  { className: 'text-right' },
                ]}
              />
            ) : paginatedBookings.length > 0 ? (
              paginatedBookings.map((booking) => (
                <TableRow
                  key={booking.id}
                  onClick={() => handleViewDetails(booking)}
                  className="cursor-pointer"
                >
                  <TableCell className="whitespace-nowrap">
                    <div className="text-sm font-medium text-foreground">{booking.id}</div>
                    <div className="text-xs text-foreground-lighter mt-1 flex items-center">
                      <Calendar size={12} className="mr-1" /> {booking.date}
                    </div>
                    <div className="text-xs text-foreground-lighter mt-1 flex items-center">
                      <Clock size={12} className="mr-1" /> {booking.schedule} ({booking.duration})
                    </div>
                  </TableCell>
                  <TableCell>
                    <div
                      className="max-w-[260px] truncate text-sm font-medium text-foreground"
                      title={booking.service}
                    >
                      {booking.service}
                    </div>
                    <div className="text-xs text-foreground-lighter">{booking.category}</div>
                    <div className="text-xs text-foreground-lighter mt-1 truncate" title={booking.address}>
                      <MapPin size={12} className="inline mr-1" /> {booking.address}
                    </div>
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    <div className="text-sm text-foreground flex items-center">
                      <User size={14} className="mr-1 text-foreground-muted" /> {booking.customer}
                    </div>
                    <div
                      className={`text-xs mt-1 font-medium ${!booking.worker ? 'text-destructive' : 'text-brand-600'}`}
                    >
                      Worker: {booking.worker}
                    </div>
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    <div className="text-sm font-medium text-foreground">
                      {money(booking.price)}
                    </div>
                    <div className="text-xs text-foreground-lighter">{booking.payment}</div>
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    <span
                      className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(booking.status)}`}
                    >
                      {booking.status}
                    </span>
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-right font-medium" onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          aria-label={`Open actions for ${booking.id}`}
                          className="inline-flex items-center justify-center rounded-full p-1.5 text-foreground-muted transition-colors hover:bg-surface-200 hover:text-foreground"
                        >
                          <MoreVertical size={20} />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-52">
                        <DropdownMenuItem
                          onSelect={() => handleViewDetails(booking)}
                          className="cursor-pointer"
                        >
                          <Eye className="mr-2" /> View Details
                        </DropdownMenuItem>
                        {!['Completed', 'Cancelled'].includes(booking.status) && (
                          <DropdownMenuItem
                            onSelect={() => openAction('reassign', booking)}
                            className="cursor-pointer"
                          >
                            <User className="mr-2" /> Reassign Worker
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onSelect={() => openAction('cancel', booking)}
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
                <TableCell colSpan="6" className="py-12 text-center">
                  <div className="flex flex-col items-center justify-center">
                    <Calendar size={48} className="text-foreground-muted mb-4" />
                    <h3 className="text-lg font-medium text-foreground">No bookings found</h3>
                    <p className="text-foreground-lighter mt-1">
                      Adjust your search to find what you're looking for.
                    </p>
                  </div>
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

      {/* Booking Details Drawer with Timeline */}
      <Drawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        title={`Booking ${selectedBooking?.id}`}
        width="w-[500px]"
        footer={
          selectedBooking ? (
            <>
              {!['Completed', 'Cancelled'].includes(selectedBooking.status) && (
                <button
                  onClick={() => openAction('reassign', selectedBooking)}
                  className="px-4 py-2 border border-border-strong rounded-lg text-sm font-medium text-foreground-light"
                >
                  Reassign Worker
                </button>
              )}
              <button
                onClick={() => openAction('cancel', selectedBooking)}
                className="px-4 py-2 rounded-lg bg-destructive text-sm font-medium text-white"
              >
                Move to Trash
              </button>
            </>
          ) : null
        }
      >
        {selectedBooking && (
          <div className="space-y-6">
            <div className="bg-surface-200 p-4 rounded-xl">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-bold text-foreground">{selectedBooking.service}</h3>
                  <p className="text-sm text-foreground-lighter">{selectedBooking.category}</p>
                </div>
                <span
                  className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(selectedBooking.status)}`}
                >
                  {selectedBooking.status}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4 mt-4 text-sm">
                <div>
                  <p className="text-foreground-lighter">Date & Time</p>
                  <p className="font-medium text-foreground">
                    {selectedBooking.date} • {selectedBooking.schedule}
                  </p>
                </div>
                <div>
                  <p className="text-foreground-lighter">Total Price</p>
                  <p className="font-medium text-foreground">{money(selectedBooking.price)}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-foreground-lighter">Service Address</p>
                  <p className="font-medium text-foreground">{selectedBooking.address}</p>
                </div>
              </div>
            </div>

            <div className="border-t border-border pt-6">
              <h4 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-4">
                People Involved
              </h4>
              <div className="flex justify-between gap-4">
                <div className="flex-1 bg-card border border-border rounded-lg p-3">
                  <p className="text-xs text-foreground-lighter mb-1">Customer</p>
                  <div className="flex items-center">
                    <div className="h-8 w-8 rounded-full bg-brand-500/10 flex items-center justify-center text-brand-600 text-xs font-bold mr-2">
                      {selectedBooking.customer.charAt(0)}
                    </div>
                    <span className="font-medium text-sm">{selectedBooking.customer}</span>
                  </div>
                </div>
                <div className="flex-1 bg-card border border-border rounded-lg p-3">
                  <p className="text-xs text-foreground-lighter mb-1">Assigned Worker</p>
                  <div className="flex items-center">
                    {selectedBooking.worker ? (
                      <>
                        <div className="h-8 w-8 rounded-full bg-success/10 flex items-center justify-center text-success text-xs font-bold mr-2">
                          {selectedBooking.worker.charAt(0)}
                        </div>
                        <span className="font-medium text-sm">{selectedBooking.worker}</span>
                      </>
                    ) : (
                      <span className="text-sm text-destructive font-medium">Not Assigned</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Customer attachments */}
            <div className="border-t border-border pt-6">
              <h4 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-4">
                Customer Attachments
              </h4>
              {selectedBooking.media === undefined ? (
                <Skeleton className="h-24 w-full rounded-lg" />
              ) : selectedBooking.media === null ? (
                <p className="text-sm text-foreground-lighter">Couldn't load attachments.</p>
              ) : selectedBooking.media.images.length === 0 &&
                selectedBooking.media.audio.length === 0 ? (
                <p className="text-sm text-foreground-lighter">
                  No photos or voice notes attached.
                </p>
              ) : (
                <div className="space-y-4">
                  {selectedBooking.media.images.length > 0 && (
                    <div className="grid grid-cols-3 gap-2">
                      {selectedBooking.media.images.map((image) => (
                        <a
                          key={image.path}
                          href={image.url}
                          target="_blank"
                          rel="noreferrer"
                          className="block aspect-square rounded-lg overflow-hidden border border-border bg-surface-200"
                        >
                          <img
                            src={image.url}
                            alt="Customer attachment"
                            className="h-full w-full object-cover"
                          />
                        </a>
                      ))}
                    </div>
                  )}
                  {selectedBooking.media.audio.length > 0 && (
                    <div className="space-y-2">
                      {selectedBooking.media.audio.map((clip) => (
                        <audio
                          key={clip.path}
                          controls
                          preload="none"
                          className="w-full"
                          src={clip.url}
                        >
                          Your browser does not support audio playback.
                        </audio>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Booking event timeline */}
            <div className="border-t border-border pt-6">
              <h4 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-6">
                Booking Timeline
              </h4>
              <div className="relative border-l border-border ml-3 space-y-8">
                {selectedBooking.events?.map((event, index) => (
                  <div key={`${event.created_at}-${index}`} className="relative pl-6">
                    <span className="absolute -left-[5px] top-1 h-2.5 w-2.5 rounded-full bg-brand-600 ring-4 ring-white"></span>
                    <p className="text-sm font-medium text-foreground">
                      {event.to_status.replaceAll('_', ' ')}
                    </p>
                    <p className="text-xs text-foreground-lighter">
                      {formatDateTime(event.created_at)}
                      {event.reason ? ` • ${event.reason}` : ''}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {selectedBooking.cancellation && (
              <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm">
                <h4 className="font-semibold text-destructive-600 dark:text-destructive-400">Cancellation</h4>
                <p className="mt-1 text-destructive">{selectedBooking.cancellation.reason}</p>
                <p className="mt-2 text-destructive">
                  Refund: {money(Number(selectedBooking.cancellation.refund_amount ?? 0))}{' '}
                  · Fee: {money(Number(selectedBooking.cancellation.fee_amount ?? 0))}
                </p>
                {selectedBooking.refund && (
                  <p className="mt-1 text-destructive">
                    Refund status: {selectedBooking.refund.status} — {selectedBooking.refund.reason}
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </Drawer>
      <Modal
        isOpen={Boolean(action)}
        onClose={() => !savingAction && setAction(null)}
        title={action?.type === 'cancel' ? 'Move Booking to Trash' : 'Reassign Worker'}
      >
        {action && (
          <div className="space-y-4">
            <p className="text-sm text-foreground-light">Booking {action.booking.id}</p>
            {action.type === 'reassign' && (
              <div>
                <label className="mb-1 block text-sm font-medium">Matched worker</label>
                <select
                  value={replacementWorker}
                  onChange={(event) => setReplacementWorker(event.target.value)}
                  className="w-full rounded-lg border border-border-strong px-3 py-2"
                >
                  <option value="">Select a worker</option>
                  {action.booking.candidates?.map((candidate) => (
                    <option key={candidate.id} value={candidate.id}>
                      {candidate.name} · score {candidate.score.toFixed(1)}
                    </option>
                  ))}
                </select>
                {!action.booking.candidates?.length && (
                  <p className="mt-1 text-xs text-destructive">
                    No eligible match candidates are available.
                  </p>
                )}
              </div>
            )}
            <div>
              <label className="mb-1 block text-sm font-medium">Admin reason</label>
              <textarea
                value={actionReason}
                onChange={(event) => setActionReason(event.target.value)}
                maxLength={1000}
                className="min-h-24 w-full rounded-lg border border-border-strong p-3"
              />
            </div>
            <div className="flex justify-end gap-3">
              <button
                disabled={savingAction}
                onClick={() => setAction(null)}
                className="rounded-lg border px-4 py-2"
              >
                Close
              </button>
              <button
                disabled={
                  savingAction ||
                  actionReason.trim().length < 3 ||
                  (action.type === 'reassign' && !replacementWorker)
                }
                onClick={() => void submitAction()}
                className="rounded-lg bg-brand-600 px-4 py-2 font-medium text-white disabled:opacity-50"
              >
                {savingAction ? 'Saving…' : 'Confirm'}
              </button>
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
