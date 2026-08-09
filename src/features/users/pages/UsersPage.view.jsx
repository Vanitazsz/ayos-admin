import {
  Search,
  Filter,
  MoreVertical,
  Edit,
  Trash2,
  Ban,
  ShieldCheck,
  Mail,
  Phone,
  Eye,
} from 'lucide-react';
import { Card, CardHeader, CardTitle } from '../../../components/ui/Card';
import { formatDateTime } from '../../../services/adminShared';
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
import Modal from '../../../components/ui/Modal';
import AccountDeleteModal from '../../../components/admin/AccountDeleteModal';
import ConfirmModal from '../../../components/ui/ConfirmModal';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '../../../components/ui/DropdownMenu';

export function UsersView({ model }) {
  const {
    isLoading,
    searchQuery,
    setSearchQuery,
    filterStatus,
    setFilterStatus,
    currentPage,
    setCurrentPage,
    activeTab,
    setActiveTab,
    verifications,
    selectedVerification,
    setSelectedVerification,
    reviewNotes,
    setReviewNotes,
    reviewing,
    loadError,
    confirm,
    closeConfirm,
    selectedUser,
    isProfileModalOpen,
    setIsProfileModalOpen,
    editUser,
    setEditUser,
    isEditModalOpen,
    setIsEditModalOpen,
    isSavingUser,
    actionLoadingId,
    deleteTarget,
    setDeleteTarget,
    toast,
    itemsPerPage,
    refresh,
    decide,
    handleViewProfile,
    handleEditUser,
    handleSaveUser,
    handleToggleStatus,
    handleDelete,
    count,
    totalPages,
    currentUsers,
    getStatusBadge,
    stats,
  } = model;
  return (
    <div className="space-y-6 p-6 animate-fade-in">
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
            <div className="flex w-full sm:w-auto items-center">
              <div className="w-full sm:w-44">
                <Select
                  icon={Filter}
                  aria-label="Filter by status"
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                >
                  <option value="All">All Statuses</option>
                  <option value="ACTIVE">Active</option>
                  <option value="SUSPENDED">Suspended</option>
                </Select>
              </div>
            </div>
          </CardHeader>

          <div className="min-h-[400px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead scope="col" className="w-12 text-center">
                    <div className="flex justify-center">
                      <Checkbox aria-label="Select all users" />
                    </div>
                  </TableHead>
                  <TableHead scope="col">User Details</TableHead>
                  <TableHead scope="col">Contact</TableHead>
                  <TableHead scope="col">Registration Date</TableHead>
                  <TableHead scope="col">Bookings</TableHead>
                  <TableHead scope="col">Verification</TableHead>
                  <TableHead scope="col">Status</TableHead>
                  <TableHead scope="col" className="text-right">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  // Skeleton Rows
                  Array.from({ length: 5 }).map((_, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="text-center">
                        <Skeleton className="h-4 w-4 rounded" />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          <Skeleton className="w-10 h-10 rounded-full mr-3 shrink-0" />
                          <div className="space-y-2">
                            <Skeleton className="h-4 w-32" />
                            <Skeleton className="h-3 w-20" />
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-2">
                          <Skeleton className="h-4 w-40" />
                          <Skeleton className="h-4 w-32" />
                        </div>
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-24" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-6 w-10 rounded-md" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-6 w-20 rounded-full" />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end space-x-2">
                          <Skeleton className="h-8 w-8 rounded-lg" />
                          <Skeleton className="h-8 w-8 rounded-lg" />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : currentUsers.length === 0 ? (
                  <TableRow hover={false}>
                    <TableCell colSpan={8} className="h-64 text-center">
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
                    <TableRow key={user.id}>
                      <TableCell className="text-center">
                        <div className="flex justify-center">
                          <Checkbox aria-label={`Select ${user.name}`} />
                        </div>
                      </TableCell>
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
                      <TableCell>
                        <div className="flex flex-col space-y-1">
                          <span className="flex items-center text-sm text-foreground-light">
                            <Mail className="h-3.5 w-3.5 mr-1.5 text-foreground-muted" /> {user.email}
                          </span>
                          <span className="flex items-center text-sm text-foreground-light">
                            <Phone className="h-3.5 w-3.5 mr-1.5 text-foreground-muted" /> {user.phone}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-foreground-lighter">{user.registeredAt}</TableCell>
                      <TableCell>
                        <span className="font-medium text-foreground bg-surface-200 px-2 py-1 rounded-md">
                          {user.bookings}
                        </span>
                      </TableCell>
                      <TableCell>
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
                      <TableCell className="text-right">
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
                              onSelect={() => handleViewProfile(user)}
                              className="cursor-pointer"
                            >
                              <Eye className="mr-2" /> View Profile
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onSelect={() => handleEditUser(user)}
                              className="cursor-pointer"
                            >
                              <Edit className="mr-2" /> Edit User
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onSelect={() => void handleToggleStatus(user)}
                              disabled={actionLoadingId === `${user.id}:status`}
                              className="cursor-pointer"
                            >
                              <Ban className="mr-2" />
                              {user.status === 'Active' ? 'Suspend' : 'Reactivate'}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onSelect={() => void handleDelete(user)}
                              disabled={actionLoadingId === `${user.id}:delete`}
                              className="cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10 [&_svg]:text-destructive"
                            >
                              <Trash2 className="mr-2" /> Delete Account
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
                {verifications.map((verification) => (
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
                ))}
                {!verifications.length ? (
                  <TableRow>
                    <TableCell colSpan={4} className="py-12 text-center text-foreground-lighter">
                      No pending customer verifications.
                    </TableCell>
                  </TableRow>
                ) : null}
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
      <Modal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        title="User Profile"
      >
        {selectedUser ? (
          <div className="space-y-4 text-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-500/10 text-lg font-bold text-brand-600">
                {selectedUser.name.charAt(0)}
              </div>
              <div>
                <h3 className="font-semibold text-foreground">{selectedUser.name}</h3>
                <p className="text-foreground-lighter">{selectedUser.status}</p>
              </div>
            </div>
            <dl className="grid gap-3 rounded-lg bg-surface-200 p-4">
              <div>
                <dt className="text-foreground-lighter">Email</dt>
                <dd className="font-medium text-foreground">{selectedUser.email}</dd>
              </div>
              <div>
                <dt className="text-foreground-lighter">Phone</dt>
                <dd className="font-medium text-foreground">{selectedUser.phone || 'Not provided'}</dd>
              </div>
              <div>
                <dt className="text-foreground-lighter">Address</dt>
                <dd className="font-medium text-foreground">{selectedUser.address || 'Not provided'}</dd>
              </div>
              <div>
                <dt className="text-foreground-lighter">Registered</dt>
                <dd className="font-medium text-foreground">{selectedUser.registeredAt}</dd>
              </div>
              <div>
                <dt className="text-foreground-lighter">Bookings</dt>
                <dd className="font-medium text-foreground">{selectedUser.bookings}</dd>
              </div>
            </dl>
          </div>
        ) : null}
      </Modal>
      <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="Edit User">
        {editUser ? (
          <form onSubmit={handleSaveUser} className="space-y-4">
            <Input
              label="Name"
              required
              minLength={2}
              maxLength={120}
              value={editUser.name}
              onChange={(event) => setEditUser({ ...editUser, name: event.target.value })}
            />
            <Input
              label="Email"
              value={editUser.email}
              readOnly
              inputClassName="bg-surface-200 text-foreground-lighter"
            />
            <Input
              label="Phone"
              value={editUser.phone}
              onChange={(event) => setEditUser({ ...editUser, phone: event.target.value })}
              placeholder="+639XXXXXXXXX"
            />
            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="secondary" onClick={() => setIsEditModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" isLoading={isSavingUser}>
                Save Changes
              </Button>
            </div>
          </form>
        ) : null}
      </Modal>
      <AccountDeleteModal
        account={deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onDeleted={async (deletedUser) => {
          await refresh();
          toast.success(
            'User deleted',
            `${deletedUser.name} and all related records were permanently deleted.`,
          );
        }}
      />
      <ConfirmModal
        isOpen={confirm.isOpen}
        onClose={closeConfirm}
        title={confirm.title}
        message={confirm.message}
        onConfirm={confirm.onConfirm}
        confirmLabel="Yes"
        variant="danger"
      />
    </div>
  );
}
