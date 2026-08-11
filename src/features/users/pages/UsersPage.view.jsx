import {
  Search,
  Filter,
  MoreVertical,
  Edit,
  Trash2,
  Ban,
  ShieldCheck,
  ShieldOff,
  CheckSquare,
  CheckCheck,
  Mail,
  Phone,
  Eye,
  MapPin,
  Calendar,
  Clock,
  User,
  UserCheck,
  ArrowLeft,
  X,
  ArchiveRestore,
  MapPinned,
} from 'lucide-react';
import { Card, CardHeader, CardTitle } from '../../../components/ui/Card';
import { formatDateTime, money } from '../../../services/adminShared';
import { badgeFor, BOOKING_STATUS_BADGE } from '../../../services/statusMeta';
import StatCard from '../../../components/ui/StatCard';
import Select from '../../../components/ui/Select';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '../../../components/ui/Table';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import Checkbox from '../../../components/ui/Checkbox';
import Textarea from '../../../components/ui/Textarea';
import Pagination from '../../../components/ui/Pagination';
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from '../../../components/ui/Tabs';
import Skeleton from '../../../components/ui/Skeleton';
import TableSkeleton from '../../../components/ui/TableSkeleton';
import Modal from '../../../components/ui/Modal';
import Drawer from '../../../components/ui/Drawer';
import { Badge } from '../../../components/ui/Badge';
import ConfirmModal from '../../../components/ui/ConfirmModal';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '../../../components/ui/DropdownMenu';

export function UsersView({ model }) {
  const {
    isLoading,
    searchQuery,
    setSearchQuery,
    filterStatus,
    setFilterStatus,
    filterVerified,
    setFilterVerified,
    filterLocation,
    setFilterLocation,
    locations,
    currentPage,
    setCurrentPage,
    activeTab,
    setActiveTab,
    verifications,
    isVerificationsLoading,
    selectedVerification,
    setSelectedVerification,
    reviewNotes,
    setReviewNotes,
    reviewing,
    loadError,
    confirm,
    closeConfirm,
    selectedUser,
    avatarUrl,
    verificationDocs,
    userBookings,
    isBookingsLoading,
    activeBooking,
    setActiveBooking,
    isDrawerOpen,
    setIsDrawerOpen,
    isEditing,
    editDraft,
    setEditDraft,
    isSavingUser,
    actionLoadingId,
    selectedIds,
    selectedCount,
    isSelectionActive,
    bulkAction,
    isBulkLoading,
    toggleSelectUser,
    selectUser,
    toggleSelectAll,
    clearSelection,
    handleBulkStatus,
    handleBulkVerification,
    itemsPerPage,
    decide,
    handleViewProfile,
    enterEditMode,
    cancelEdit,
    handleSaveUser,
    handleToggleStatus,
    handleToggleVerification,
    handleViewBooking,
    handleMoveToTrash,
    handleRestore,
    count,
    totalPages,
    currentUsers,
    getStatusBadge,
    stats,
  } = model;

  const bookingGroups = userBookings.reduce((groups, booking) => {
    const key = booking.date;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(booking);
    return groups;
  }, new Map());

  return (
    <div className="space-y-6 p-4 sm:p-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Users Management</h1>
          <p className="text-foreground-lighter mt-1">
            Manage customer accounts, view details, and handle suspensions.
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <StatCard key={index} title={stat.label} value={stat.value} icon={stat.icon} />
        ))}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="customers">Customers</TabsTrigger>
          <TabsTrigger value="verifications">
            Pending Verification ({verifications.length})
          </TabsTrigger>
        </TabsList>
        {loadError ? (
          <div
            role="alert"
            className="mt-4 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
          >
            {loadError}
          </div>
        ) : null}
        <TabsContent value="customers">
          <Card>
          <CardHeader className="py-4 border-b border-border flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="w-full sm:w-96">
              <Input
                icon={Search}
                aria-label="Search by name, email, or ID..."
                placeholder="Search by name, email, or ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex w-full sm:w-auto items-center gap-2">
              <div className="w-full sm:w-44">
                <Select
                  icon={MapPinned}
                  aria-label="Filter by location"
                  value={filterLocation}
                  onChange={(e) => setFilterLocation(e.target.value)}
                >
                  <option value="All">All Locations</option>
                  {locations.map((location) => (
                    <option key={location.id} value={location.name}>
                      {location.name}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="w-full sm:w-44">
                <Select
                  icon={ShieldCheck}
                  aria-label="Filter by verification status"
                  value={filterVerified}
                  onChange={(e) => setFilterVerified(e.target.value)}
                >
                  <option value="All">All Verifications</option>
                  <option value="verified">Verified</option>
                  <option value="unverified">Unverified</option>
                </Select>
              </div>
              <div className="w-full sm:w-40">
                <Select
                  icon={Filter}
                  aria-label="Filter by account status"
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                >
                  <option value="All">All Statuses</option>
                  <option value="ACTIVE">Active</option>
                  <option value="SUSPENDED">Suspended</option>
                  <option value="Trashed">Trashed</option>
                </Select>
              </div>
            </div>
          </CardHeader>

          {isSelectionActive ? (
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-brand-500/5 px-4 py-2.5">
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-foreground">
                  {selectedCount} selected
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearSelection}
                  disabled={isBulkLoading}
                >
                  <X size={14} className="mr-1.5" /> Clear
                </Button>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => void handleBulkStatus('SUSPENDED')}
                  isLoading={isBulkLoading && bulkAction === 'SUSPENDED'}
                  disabled={isBulkLoading && bulkAction !== 'SUSPENDED'}
                >
                  <Ban size={14} /> Suspend
                </Button>
                <Button
                  size="sm"
                  onClick={() => void handleBulkStatus('ACTIVE')}
                  isLoading={isBulkLoading && bulkAction === 'ACTIVE'}
                  disabled={isBulkLoading && bulkAction !== 'ACTIVE'}
                >
                  <UserCheck size={14} /> Reactivate
                </Button>
                <Button
                  size="sm"
                  onClick={() => void handleBulkVerification('verified')}
                  isLoading={isBulkLoading && bulkAction === 'verified'}
                  disabled={isBulkLoading && bulkAction !== 'verified'}
                >
                  <ShieldCheck size={14} /> Verify
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void handleBulkVerification('unverified')}
                  isLoading={isBulkLoading && bulkAction === 'unverified'}
                  disabled={isBulkLoading && bulkAction !== 'unverified'}
                >
                  <ShieldOff size={14} /> Unverify
                </Button>
              </div>
            </div>
          ) : null}

          <div className="min-h-[400px]">
            <Table>
              <TableHeader>
                <TableRow>
                  {isSelectionActive ? (
                    <TableHead scope="col" className="w-12 text-center">
                      <div className="flex justify-center">
                        <Checkbox
                          aria-label="Select all users"
                          checked={
                            currentUsers.length > 0 &&
                            currentUsers.every((user) => selectedIds.has(user.id))
                              ? true
                              : selectedCount > 0
                                ? 'indeterminate'
                                : false
                          }
                          onCheckedChange={() => toggleSelectAll(currentUsers)}
                        />
                      </div>
                    </TableHead>
                  ) : null}
                  <TableHead scope="col">User Details</TableHead>
                  <TableHead scope="col" className="hidden xl:table-cell">Location</TableHead>
                  <TableHead scope="col" className="hidden lg:table-cell">Contact</TableHead>
                  <TableHead scope="col" className="hidden lg:table-cell">Registration Date</TableHead>
                  <TableHead scope="col">Bookings</TableHead>
                  <TableHead scope="col" className="hidden xl:table-cell">Verification</TableHead>
                  <TableHead scope="col">Status</TableHead>
                  <TableHead scope="col" className="text-right">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableSkeleton
                    rows={6}
                    withSelect={isSelectionActive}
                    columns={[
                      {
                        children: (
                          <div className="flex items-center">
                            <Skeleton className="w-10 h-10 rounded-full mr-3 shrink-0" />
                            <div className="space-y-2">
                              <Skeleton className="h-4 w-32" />
                              <Skeleton className="h-3 w-20" />
                            </div>
                          </div>
                        ),
                      },
                      { className: 'hidden xl:table-cell' },
                      { className: 'hidden lg:table-cell' },
                      { className: 'hidden lg:table-cell' },
                      {},
                      { className: 'hidden xl:table-cell' },
                      {},
                      {
                        className: 'text-right',
                        children: (
                          <div className="flex justify-end space-x-2">
                            <Skeleton className="h-8 w-8 rounded-lg" />
                            <Skeleton className="h-8 w-8 rounded-lg" />
                          </div>
                        ),
                      },
                    ]}
                  />
                ) : currentUsers.length === 0 ? (
                  <TableRow hover={false}>
                    <TableCell colSpan={isSelectionActive ? 9 : 8} className="h-64 text-center">
                      <div className="flex flex-col items-center justify-center text-foreground-lighter">
                        <Search className="h-12 w-12 text-foreground-muted mb-4" />
                        <p className="text-lg font-medium text-foreground">
                          {loadError ? 'Unable to load users' : 'No users found'}
                        </p>
                        <p className="text-sm">
                          {loadError
                            ? 'Review the error above and retry by refreshing the page.'
                            : "We couldn't find any users matching your search."}
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  currentUsers.map((user) => (
                    <TableRow
                      key={user.id}
                      onClick={() => handleViewProfile(user)}
                      className={`cursor-pointer ${user.isTrashed ? 'opacity-55 grayscale' : ''}`}
                    >
                      {isSelectionActive ? (
                        <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                          <div className="flex justify-center">
                            <Checkbox
                              aria-label={`Select ${user.name}`}
                              checked={selectedIds.has(user.id)}
                              onCheckedChange={() => toggleSelectUser(user.id)}
                            />
                          </div>
                        </TableCell>
                      ) : null}
                      <TableCell>
                        <div className="flex items-center">
                          <div className="w-10 h-10 rounded-full bg-brand-500/10 text-brand-600 flex items-center justify-center font-bold text-sm shrink-0 mr-3">
                            {user.name.charAt(0)}
                          </div>
                          <div>
                            <div className="font-medium text-foreground">{user.name}</div>
                            <div className="text-xs text-foreground-lighter">{user.id}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden xl:table-cell">
                        <span className="flex items-center text-sm text-foreground-light">
                          <MapPinned className="h-3.5 w-3.5 mr-1.5 shrink-0 text-foreground-muted" />
                          <span className="truncate max-w-[12rem] min-w-0" title={user.location}>
                            {user.location || '—'}
                          </span>
                        </span>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <div className="flex flex-col space-y-1">
                          <span className="flex items-center text-sm text-foreground-light">
                            <Mail className="h-3.5 w-3.5 mr-1.5 shrink-0 text-foreground-muted" />
                            <span className="truncate max-w-[12rem] min-w-0" title={user.email}>
                              {user.email}
                            </span>
                          </span>
                          <span className="flex items-center text-sm text-foreground-light">
                            <Phone className="h-3.5 w-3.5 mr-1.5 text-foreground-muted" /> {user.phone}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-foreground-lighter">{user.registeredAt}</TableCell>
                      <TableCell>
                        <span className="font-medium text-foreground bg-surface-200 px-2 py-1 rounded-md">
                          {user.bookings}
                        </span>
                      </TableCell>
                      <TableCell className="hidden xl:table-cell">
                        {user.verified ? (
                          <span className="inline-flex items-center text-xs font-medium text-success">
                            <ShieldCheck size={14} className="mr-1" /> Verified
                          </span>
                        ) : (
                          <span className="inline-flex items-center text-xs font-medium text-foreground-lighter">
                            Unverified
                          </span>
                        )}
                      </TableCell>
                      <TableCell>{getStatusBadge(user.status)}</TableCell>
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button
                              aria-label={`Open actions for ${user.name}`}
                              className="inline-flex items-center justify-center rounded-full p-1.5 text-foreground-muted transition-colors hover:bg-surface-200 hover:text-foreground"
                            >
                              <MoreVertical size={20} />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem
                              onSelect={() => selectUser(user.id)}
                              className="cursor-pointer"
                            >
                              <CheckSquare className="mr-2" /> Select
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onSelect={() => toggleSelectAll(currentUsers)}
                              className="cursor-pointer"
                            >
                              <CheckCheck className="mr-2" /> Select All
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onSelect={() => void handleViewProfile(user)}
                              className="cursor-pointer"
                            >
                              <Eye className="mr-2" /> More Details
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onSelect={() => void handleToggleStatus(user)}
                              disabled={actionLoadingId === `${user.id}:status`}
                              className="cursor-pointer"
                            >
                              <Ban className="mr-2" />
                              {user.status === 'Active' ? 'Suspend' : 'Reactivate'}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination Footer */}
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            totalCount={count}
            pageSize={itemsPerPage}
          />
        </Card>
        </TabsContent>
        <TabsContent value="verifications">
        <Card>
          <CardHeader>
            <CardTitle>Customer Verifications</CardTitle>
          </CardHeader>
          <Table>
              <TableHeader>
                <TableRow>
                  <TableHead scope="col">Customer</TableHead>
                  <TableHead scope="col">ID Type</TableHead>
                  <TableHead scope="col">Submitted</TableHead>
                  <TableHead scope="col">Documents</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isVerificationsLoading ? (
                  <TableSkeleton rows={4} columns={4} />
                ) : verifications.length ? (
                  verifications.map((verification) => (
                    <TableRow key={verification.id}>
                      <TableCell>
                        <div className="font-medium text-foreground">{verification.customerName}</div>
                        <div className="text-xs text-foreground-lighter">{verification.email}</div>
                      </TableCell>
                      <TableCell>{verification.id_type.replaceAll('_', ' ')}</TableCell>
                      <TableCell>{formatDateTime(verification.created_at)}</TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          onClick={() => {
                            setSelectedVerification(verification);
                            setReviewNotes('');
                          }}
                        >
                          <Eye size={15} className="mr-1" /> Review
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="py-12 text-center text-foreground-lighter">
                      No pending customer verifications.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>
      <Modal
        isOpen={Boolean(selectedVerification)}
        onClose={() => setSelectedVerification(null)}
        title="Review Customer ID"
        maxWidth="max-w-4xl"
      >
        {selectedVerification ? (
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <p className="mb-2 text-sm font-medium">Front</p>
                <img
                  src={selectedVerification.frontUrl}
                  alt="Government ID front"
                  className="max-h-80 w-full rounded-lg border object-contain"
                />
              </div>
              <div>
                <p className="mb-2 text-sm font-medium">Back</p>
                {selectedVerification.backUrl ? (
                  <img
                    src={selectedVerification.backUrl}
                    alt="Government ID back"
                    className="max-h-80 w-full rounded-lg border object-contain"
                  />
                ) : (
                  <p className="text-sm text-foreground-lighter">No back image</p>
                )}
              </div>
            </div>
            <div>
              <Textarea
                label="Review notes"
                value={reviewNotes}
                onChange={(event) => setReviewNotes(event.target.value)}
                maxLength={2000}
                className="min-h-24"
              />
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="danger" disabled={reviewing} onClick={() => void decide('rejected')}>
                Reject
              </Button>
              <Button disabled={reviewing} onClick={() => void decide('approved')}>
                Approve
              </Button>
            </div>
          </div>
        ) : null}
      </Modal>
      <Drawer
        isOpen={isDrawerOpen}
        onClose={() => {
          setIsDrawerOpen(false);
          setActiveBooking(null);
          cancelEdit();
        }}
        title={activeBooking ? 'Booking Details' : 'More Details'}
        width="w-[520px]"
      >
        {activeBooking ? (
          <div className="space-y-6">
            <button
              type="button"
              onClick={() => setActiveBooking(null)}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-foreground-light transition-colors hover:text-foreground"
            >
              <ArrowLeft size={16} /> Back to {selectedUser?.name ?? 'user'}
            </button>

            <div className="bg-surface-200 p-4 rounded-xl">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-bold text-foreground">{activeBooking.service}</h3>
                  <p className="text-sm text-foreground-lighter">{activeBooking.category}</p>
                </div>
                <span
                  className={`shrink-0 inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${badgeFor(BOOKING_STATUS_BADGE, activeBooking.status)}`}
                >
                  {activeBooking.status}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4 mt-4 text-sm">
                <div>
                  <p className="text-foreground-lighter">Date & Time</p>
                  <p className="font-medium text-foreground">
                    {activeBooking.date} • {activeBooking.schedule}
                  </p>
                </div>
                <div>
                  <p className="text-foreground-lighter">Total Price</p>
                  <p className="font-medium text-foreground">{money(activeBooking.price)}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-foreground-lighter">Service Address</p>
                  <p className="font-medium text-foreground">
                    {activeBooking.address || 'Not provided'}
                  </p>
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
                      {activeBooking.customer.charAt(0)}
                    </div>
                    <span className="font-medium text-sm">{activeBooking.customer}</span>
                  </div>
                </div>
                <div className="flex-1 bg-card border border-border rounded-lg p-3">
                  <p className="text-xs text-foreground-lighter mb-1">Assigned Worker</p>
                  <div className="flex items-center">
                    {activeBooking.worker ? (
                      <>
                        <div className="h-8 w-8 rounded-full bg-success/10 flex items-center justify-center text-success text-xs font-bold mr-2">
                          {activeBooking.worker.charAt(0)}
                        </div>
                        <span className="font-medium text-sm">{activeBooking.worker}</span>
                      </>
                    ) : (
                      <span className="text-sm text-destructive font-medium">Not Assigned</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t border-border pt-6">
              <h4 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-4">
                Customer Attachments
              </h4>
              {activeBooking.media === undefined ? (
                <Skeleton className="h-24 w-full rounded-lg" />
              ) : activeBooking.media === null ? (
                <p className="text-sm text-foreground-lighter">Couldn't load attachments.</p>
              ) : activeBooking.media.images.length === 0 &&
                activeBooking.media.audio.length === 0 ? (
                <p className="text-sm text-foreground-lighter">
                  No photos or voice notes attached.
                </p>
              ) : (
                <div className="space-y-4">
                  {activeBooking.media.images.length > 0 && (
                    <div className="grid grid-cols-3 gap-2">
                      {activeBooking.media.images.map((image) => (
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
                  {activeBooking.media.audio.length > 0 && (
                    <div className="space-y-2">
                      {activeBooking.media.audio.map((clip) => (
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

            <div className="border-t border-border pt-6">
              <h4 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-6">
                Booking Timeline
              </h4>
              {activeBooking.events?.length ? (
                <div className="relative border-l border-border ml-3 space-y-8">
                  {activeBooking.events.map((event, index) => (
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
              ) : (
                <p className="text-sm text-foreground-lighter">No status events recorded.</p>
              )}
            </div>

            {activeBooking.cancellation && (
              <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm">
                <h4 className="font-semibold text-destructive-600 dark:text-destructive-400">
                  Cancellation
                </h4>
                <p className="mt-1 text-destructive">{activeBooking.cancellation.reason}</p>
                <p className="mt-2 text-destructive">
                  Refund: {money(Number(activeBooking.cancellation.refund_amount ?? 0))} · Fee:{' '}
                  {money(Number(activeBooking.cancellation.fee_amount ?? 0))}
                </p>
                {activeBooking.refund && (
                  <p className="mt-1 text-destructive">
                    Refund status: {activeBooking.refund.status} — {activeBooking.refund.reason}
                  </p>
                )}
              </div>
            )}
          </div>
        ) : selectedUser ? (
          <div className="space-y-6">
            <div className="flex items-center">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={`${selectedUser.name}'s profile photo`}
                  className="h-16 w-16 rounded-full object-cover border border-border"
                />
              ) : (
                <div className="h-16 w-16 rounded-full bg-brand-500/10 flex items-center justify-center text-brand-600 font-bold text-2xl">
                  {selectedUser.name.charAt(0)}
                </div>
              )}
              <div className="ml-4 min-w-0">
                <h3 className="text-xl font-bold text-foreground truncate">{selectedUser.name}</h3>
                <p className="text-xs text-foreground-lighter font-mono truncate">
                  {selectedUser.id}
                </p>
                <div className="mt-1 flex gap-2">
                  {getStatusBadge(selectedUser.status)}
                  {selectedUser.verified ? (
                    <Badge variant="success">
                      <ShieldCheck size={12} /> Verified
                    </Badge>
                  ) : (
                    <Badge variant="outline">
                      <ShieldCheck size={12} /> Unverified
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {selectedUser.isTrashed ? (
                <Button size="sm" variant="secondary" onClick={() => handleRestore(selectedUser)}>
                  <ArchiveRestore size={15} /> Restore
                </Button>
              ) : (
                <>
                  <Button size="sm" variant="secondary" onClick={enterEditMode}>
                    <Edit size={15} /> Edit
                  </Button>
                  <Button
                    size="sm"
                    variant={selectedUser.verified ? 'outline' : 'primary'}
                    onClick={() => void handleToggleVerification(selectedUser)}
                    isLoading={actionLoadingId === `${selectedUser.id}:verification`}
                  >
                    <ShieldCheck size={15} />
                    {selectedUser.verified ? 'Unverify' : 'Verify'}
                  </Button>
                  <Button
                    size="sm"
                    variant={selectedUser.status === 'Active' ? 'warning' : 'primary'}
                    onClick={() => void handleToggleStatus(selectedUser)}
                    isLoading={actionLoadingId === `${selectedUser.id}:status`}
                  >
                    <Ban size={15} />
                    {selectedUser.status === 'Active' ? 'Suspend' : 'Reactivate'}
                  </Button>
                </>
              )}
            </div>

            <div className="border-t border-border pt-6">
              <h4 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-4">
                Contact Information
              </h4>
              {isEditing ? (
                <form onSubmit={handleSaveUser} className="space-y-4">
                  <Input
                    label="Name"
                    required
                    minLength={2}
                    maxLength={120}
                    value={editDraft.name}
                    onChange={(event) =>
                      setEditDraft({ ...editDraft, name: event.target.value })
                    }
                  />
                  <Input
                    label="Email"
                    type="email"
                    required
                    value={editDraft.email}
                    onChange={(event) =>
                      setEditDraft({ ...editDraft, email: event.target.value })
                    }
                  />
                  <Input
                    label="Phone"
                    value={editDraft.phone}
                    onChange={(event) =>
                      setEditDraft({ ...editDraft, phone: event.target.value })
                    }
                    placeholder="+639XXXXXXXXX"
                  />
                  <div className="flex justify-end gap-3 pt-2">
                    <Button type="button" variant="secondary" onClick={cancelEdit}>
                      Cancel
                    </Button>
                    <Button type="submit" isLoading={isSavingUser}>
                      Save Changes
                    </Button>
                  </div>
                </form>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center text-sm text-foreground-light">
                    <Mail size={16} className="mr-3 text-foreground-muted" /> {selectedUser.email}
                  </div>
                  <div className="flex items-center text-sm text-foreground-light">
                    <Phone size={16} className="mr-3 text-foreground-muted" />{' '}
                    {selectedUser.phone || 'Not provided'}
                  </div>
                  <div className="flex items-center text-sm text-foreground-light">
                    <MapPin size={16} className="mr-3 text-foreground-muted" />{' '}
                    {selectedUser.address || 'Not provided'}
                  </div>
                  <div className="flex items-center text-sm text-foreground-light">
                    <Calendar size={16} className="mr-3 text-foreground-muted" /> Registered{' '}
                    {selectedUser.registeredAt}
                  </div>
                </div>
              )}
            </div>

            <div className="border-t border-border pt-6">
              <h4 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-4">
                Identity Verification
              </h4>
              {verificationDocs === undefined ? (
                <p className="text-sm text-foreground-lighter">
                  Loading verification documents…
                </p>
              ) : verificationDocs === null ? (
                <p className="text-sm text-foreground-lighter">
                  Couldn't load verification documents.
                </p>
              ) : verificationDocs.frontUrl === '' && verificationDocs.backUrl === '' ? (
                <p className="text-sm text-foreground-lighter">
                  No verification submitted.
                </p>
              ) : (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center gap-2">
                    {verificationDocs.idType && (
                      <Badge variant="outline">
                        {verificationDocs.idType.replaceAll('_', ' ')}
                      </Badge>
                    )}
                    <Badge
                      variant={
                        verificationDocs.status === 'approved' ? 'success' : 'warning'
                      }
                    >
                      {verificationDocs.status.replaceAll('_', ' ')}
                    </Badge>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <p className="mb-2 text-sm font-medium text-foreground">Front</p>
                      {verificationDocs.frontUrl ? (
                        <a
                          href={verificationDocs.frontUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="block aspect-[4/3] overflow-hidden rounded-lg border border-border bg-surface-200"
                        >
                          <img
                            src={verificationDocs.frontUrl}
                            alt="Government ID front"
                            className="h-full w-full object-cover"
                          />
                        </a>
                      ) : (
                        <p className="text-sm text-foreground-lighter">No front image</p>
                      )}
                    </div>
                    <div>
                      <p className="mb-2 text-sm font-medium text-foreground">Back</p>
                      {verificationDocs.backUrl ? (
                        <a
                          href={verificationDocs.backUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="block aspect-[4/3] overflow-hidden rounded-lg border border-border bg-surface-200"
                        >
                          <img
                            src={verificationDocs.backUrl}
                            alt="Government ID back"
                            className="h-full w-full object-cover"
                          />
                        </a>
                      ) : (
                        <p className="text-sm text-foreground-lighter">No back image</p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="border-t border-border pt-6">
              <h4 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-4">
                Bookings
              </h4>
              {isBookingsLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-16 w-full rounded-lg" />
                  <Skeleton className="h-16 w-full rounded-lg" />
                </div>
              ) : bookingGroups.size === 0 ? (
                <p className="text-sm text-foreground-lighter">No bookings yet.</p>
              ) : (
                <div className="max-h-[360px] overflow-y-auto custom-scrollbar space-y-3 pr-1">
                  {[...bookingGroups.entries()].map(([date, group]) => (
                    <div key={date} className="space-y-2">
                      <div className="flex items-center gap-3">
                        <div className="h-px flex-1 bg-border" />
                        <span className="text-xs font-medium text-foreground-lighter">{date}</span>
                        <div className="h-px flex-1 bg-border" />
                      </div>
                      {group.map((booking) => (
                        <button
                          key={booking.id}
                          type="button"
                          onClick={() => handleViewBooking(booking)}
                          className="w-full text-left rounded-lg border border-border bg-card p-3 transition-colors hover:bg-accent"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-sm font-medium text-foreground truncate">
                              {booking.service}
                            </span>
                            <span
                              className={`shrink-0 inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${badgeFor(BOOKING_STATUS_BADGE, booking.status)}`}
                            >
                              {booking.status}
                            </span>
                          </div>
                          <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-foreground-lighter">
                            <span className="inline-flex items-center">
                              <User size={12} className="mr-1" /> {booking.worker || 'Unassigned'}
                            </span>
                            <span className="inline-flex items-center">
                              <Clock size={12} className="mr-1" /> {money(booking.price)}
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {!selectedUser.isTrashed && (
              <div className="border-t border-border pt-6">
                <h4 className="text-sm font-semibold text-destructive uppercase tracking-wider mb-3">
                  Danger Zone
                </h4>
                <Button variant="outline-danger" onClick={() => handleMoveToTrash(selectedUser)}>
                  <Trash2 size={15} /> Move to trash
                </Button>
              </div>
            )}
          </div>
        ) : null}
      </Drawer>
      <ConfirmModal
        isOpen={confirm.isOpen}
        onClose={closeConfirm}
        title={confirm.title}
        message={confirm.message}
        onConfirm={confirm.onConfirm}
        confirmLabel={confirm.confirmLabel || 'Yes'}
        variant="danger"
      />
    </div>
  );
}
