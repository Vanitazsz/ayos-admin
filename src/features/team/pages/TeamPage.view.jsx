import {
  Search,
  Filter,
  MoreVertical,
  Eye,
  UserPlus,
  ShieldCheck,
  ShieldOff,
  Mail,
  Calendar,
  KeyRound,
  Ban,
  RotateCcw,
  Users,
  X,
} from 'lucide-react';
import { Card, CardHeader } from '../../../components/ui/Card';
import StatCard from '../../../components/ui/StatCard';
import Select from '../../../components/ui/Select';
import DateFilter from '../../../components/ui/DateFilter';
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
import Modal from '../../../components/ui/Modal';
import Drawer from '../../../components/ui/Drawer';
import ConfirmModal from '../../../components/ui/ConfirmModal';
import { Badge } from '../../../components/ui/Badge';
import Skeleton from '../../../components/ui/Skeleton';
import TableSkeleton from '../../../components/ui/TableSkeleton';
import Pagination from '../../../components/ui/Pagination';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '../../../components/ui/DropdownMenu';
import { formatDateTime } from '../../../services/adminShared';

export function TeamView({ model }) {
  const {
    isLoading,
    searchQuery,
    setSearchQuery,
    filterRole,
    setFilterRole,
    dateFilter,
    roles,
    currentPage,
    setCurrentPage,
    totalPages,
    count,
    loadError,
    members,
    stats,
    canManage,
    inviteOpen,
    setInviteOpen,
    inviteEmail,
    setInviteEmail,
    inviteName,
    setInviteName,
    inviteRole,
    setInviteRole,
    inviteError,
    isInviting,
    openInvite,
    submitInvite,
    selectedMember,
    isDrawerOpen,
    setIsDrawerOpen,
    roleMenuOpenId,
    setRoleMenuOpenId,
    actionLoadingId,
    confirm,
    closeConfirm,
    viewMember,
    changeRole,
    toggleStatus,
    getRoleBadgeVariant,
    refresh,
    currentUserId,
  } = model;

  return (
    <div className="space-y-6 p-4 sm:p-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Team Management</h1>
          <p className="text-foreground-lighter mt-1">
            Manage administrator accounts and role-based access control.
          </p>
        </div>
        {canManage && (
          <Button onClick={openInvite}>
            <UserPlus size={15} /> Invite Member
          </Button>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <StatCard key={index} title={stat.label} value={stat.value} icon={stat.icon} />
        ))}
      </div>

      <Card>
        <CardHeader className="py-4 border-b border-border flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="w-full sm:w-96">
            <Input
              icon={Search}
              aria-label="Search team members..."
              placeholder="Search by name, email, or role..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex w-full sm:w-auto items-center gap-2">
            <DateFilter model={dateFilter} />
            <div className="w-full sm:w-48">
              <Select
                icon={Filter}
                aria-label="Filter by role"
                value={filterRole}
                onChange={(e) => setFilterRole(e.target.value)}
              >
                <option value="All">All Roles</option>
                {roles.map((role) => (
                  <option key={role.code} value={role.code}>
                    {role.name}
                  </option>
                ))}
              </Select>
            </div>
            <Button variant="ghost" size="sm" onClick={() => void refresh()} aria-label="Refresh team">
              <RotateCcw size={14} /> Refresh
            </Button>
          </div>
        </CardHeader>

        {loadError ? (
          <div
            role="alert"
            className="m-4 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
          >
            {loadError}
          </div>
        ) : null}

        <div className="min-h-[400px]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead scope="col">Member</TableHead>
                <TableHead scope="col">Email</TableHead>
                <TableHead scope="col">Role</TableHead>
                <TableHead scope="col" className="hidden lg:table-cell">Last Sign-In</TableHead>
                <TableHead scope="col">Status</TableHead>
                <TableHead scope="col" className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableSkeleton
                  rows={6}
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
                    {},
                    {},
                    { className: 'hidden lg:table-cell' },
                    {},
                    { className: 'text-right' },
                  ]}
                />
              ) : members.length === 0 ? (
                <TableRow hover={false}>
                  <TableCell colSpan={6} className="h-64 text-center">
                    <div className="flex flex-col items-center justify-center text-foreground-lighter">
                      <Users className="h-12 w-12 text-foreground-muted mb-4" />
                      <p className="text-lg font-medium text-foreground">
                        {loadError ? 'Unable to load team' : 'No team members found'}
                      </p>
                      <p className="text-sm">
                        {loadError
                          ? 'Review the error above and retry by refreshing the page.'
                          : "We couldn't find any members matching your search."}
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                members.map((member) => (
                  <TableRow key={member.id} className="cursor-pointer" onClick={() => viewMember(member)}>
                    <TableCell>
                      <div className="flex items-center">
                        <div className="w-10 h-10 rounded-full bg-brand-500/10 text-brand-600 flex items-center justify-center font-bold text-sm shrink-0 mr-3">
                          {(member.display_name || member.email || 'A').charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <div className="font-medium text-foreground truncate max-w-[12rem]">
                            {member.display_name || '—'}
                            {member.id === currentUserId && (
                              <span className="ml-1.5 text-xs text-foreground-lighter">(you)</span>
                            )}
                          </div>
                          <div className="text-xs text-foreground-lighter font-mono truncate max-w-[12rem]">
                            {member.id}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-foreground-light truncate max-w-[12rem] block" title={member.email}>
                        {member.email}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getRoleBadgeVariant(member.admin_role)}>
                        {member.role_name || member.admin_role}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-foreground-lighter">
                      {member.last_sign_in_at ? formatDateTime(member.last_sign_in_at) : 'Never'}
                    </TableCell>
                    <TableCell>
                      {member.status === 'ACTIVE' ? (
                        <Badge variant="success">Active</Badge>
                      ) : (
                        <Badge variant="danger">Suspended</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu
                        open={roleMenuOpenId === member.id}
                        onOpenChange={(open) => setRoleMenuOpenId(open ? member.id : null)}
                      >
                        <DropdownMenuTrigger asChild>
                          <button
                            aria-label={`Open actions for ${member.display_name || member.email}`}
                            className="inline-flex items-center justify-center rounded-full p-1.5 text-foreground-muted transition-colors hover:bg-surface-200 hover:text-foreground"
                          >
                            <MoreVertical size={20} />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56">
                          <DropdownMenuItem onSelect={() => viewMember(member)} className="cursor-pointer">
                            <Eye className="mr-2" /> View Details
                          </DropdownMenuItem>
                          {canManage && (
                            <>
                              <div className="px-2 py-1.5 text-xs font-medium text-foreground-muted">
                                Change Role
                              </div>
                              {roles.map((role) => (
                                <DropdownMenuItem
                                  key={role.code}
                                  onSelect={() => void changeRole(member, role.code)}
                                  disabled={actionLoadingId === `${member.id}:role` || role.code === member.admin_role}
                                  className="cursor-pointer"
                                >
                                  <ShieldCheck className="mr-2" /> {role.name}
                                </DropdownMenuItem>
                              ))}
                              <DropdownMenuItem
                                onSelect={() => toggleStatus(member)}
                                disabled={actionLoadingId === `${member.id}:status`}
                                className="cursor-pointer"
                              >
                                {member.status === 'ACTIVE' ? <Ban className="mr-2" /> : <RotateCcw className="mr-2" />}
                                {member.status === 'ACTIVE' ? 'Suspend' : 'Reactivate'}
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
          totalCount={count}
          pageSize={10}
        />
      </Card>

      {/* Invite Modal */}
      <Modal
        isOpen={inviteOpen}
        onClose={() => setInviteOpen(false)}
        title="Invite Team Member"
        maxWidth="max-w-md"
      >
        <form onSubmit={submitInvite} className="space-y-4">
          {inviteError && (
            <div className="bg-danger/10 border-l-4 border-danger p-4 rounded-r-lg flex items-start">
              <div className="flex-1 text-sm text-danger font-medium">{inviteError}</div>
            </div>
          )}
          <Input
            label="Full Name"
            required
            minLength={2}
            maxLength={120}
            value={inviteName}
            onChange={(event) => setInviteName(event.target.value)}
            placeholder="Jane Doe"
          />
          <Input
            label="Email Address"
            type="email"
            required
            value={inviteEmail}
            onChange={(event) => setInviteEmail(event.target.value)}
            placeholder="jane@example.com"
            icon={Mail}
          />
          <div>
            <div className="mb-1.5 block text-sm font-medium text-foreground">Role</div>
            <Select
              value={inviteRole}
              onChange={(event) => setInviteRole(event.target.value)}
              aria-label="Role"
            >
              {roles.map((role) => (
                <option key={role.code} value={role.code}>
                  {role.name}
                </option>
              ))}
            </Select>
            <p className="mt-1.5 text-xs text-foreground-muted">
              {roles.find((role) => role.code === inviteRole)?.description ?? ''}
            </p>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setInviteOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isInviting}>
              <Mail size={15} /> Send Invite
            </Button>
          </div>
        </form>
      </Modal>

      {/* Member Drawer */}
      <Drawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        title="Member Details"
        width="w-[520px]"
      >
        {selectedMember ? (
          <div className="space-y-6">
            <div className="flex items-center">
              <div className="h-16 w-16 rounded-full bg-brand-500/10 flex items-center justify-center text-brand-600 font-bold text-2xl">
                {(selectedMember.display_name || selectedMember.email || 'A').charAt(0)}
              </div>
              <div className="ml-4 min-w-0">
                <h3 className="text-xl font-bold text-foreground truncate">
                  {selectedMember.display_name || '—'}
                </h3>
                <p className="text-xs text-foreground-lighter font-mono truncate">
                  {selectedMember.id}
                </p>
                <div className="mt-1 flex flex-wrap gap-2">
                  <Badge variant={getRoleBadgeVariant(selectedMember.admin_role)}>
                    {selectedMember.role_name || selectedMember.admin_role}
                  </Badge>
                  {selectedMember.status === 'ACTIVE' ? (
                    <Badge variant="success">Active</Badge>
                  ) : (
                    <Badge variant="danger">Suspended</Badge>
                  )}
                </div>
              </div>
            </div>

            {canManage && selectedMember.admin_role !== 'SUPER_ADMIN' && (
              <div className="border-t border-border pt-6">
                <h4 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-3">
                  Change Role
                </h4>
                <div className="flex flex-wrap gap-2">
                  {roles.map((role) => (
                    <Button
                      key={role.code}
                      size="sm"
                      variant={role.code === selectedMember.admin_role ? 'primary' : 'outline'}
                      onClick={() => void changeRole(selectedMember, role.code)}
                      isLoading={actionLoadingId === `${selectedMember.id}:role`}
                      disabled={
                        actionLoadingId === `${selectedMember.id}:role` &&
                        role.code !== selectedMember.admin_role
                      }
                    >
                      {role.name}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            <div className="border-t border-border pt-6">
              <h4 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-4">
                Account Information
              </h4>
              <div className="space-y-3">
                <div className="flex items-center text-sm text-foreground-light">
                  <Mail size={16} className="mr-3 text-foreground-muted" /> {selectedMember.email}
                </div>
                <div className="flex items-center text-sm text-foreground-light">
                  <Calendar size={16} className="mr-3 text-foreground-muted" /> Joined{' '}
                  {formatDateTime(selectedMember.created_at)}
                </div>
                <div className="flex items-center text-sm text-foreground-light">
                  <KeyRound size={16} className="mr-3 text-foreground-muted" /> Last sign-in{' '}
                  {selectedMember.last_sign_in_at
                    ? formatDateTime(selectedMember.last_sign_in_at)
                    : 'Never'}
                </div>
              </div>
            </div>

            <div className="border-t border-border pt-6">
              <h4 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-3">
                Role Permissions
              </h4>
              <p className="text-sm text-foreground-lighter mb-3">
                {selectedMember.role_description}
              </p>
              {selectedMember.permissions.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {selectedMember.permissions.map((permission) => (
                    <span
                      key={permission}
                      className="inline-flex items-center rounded-md bg-surface-200 px-2 py-1 text-xs font-medium text-foreground-light"
                    >
                      {permission}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-foreground-lighter">No permissions assigned.</p>
              )}
            </div>

            {canManage && (
              <div className="border-t border-border pt-6">
                <h4 className="text-sm font-semibold text-destructive uppercase tracking-wider mb-3">
                  Account Status
                </h4>
                <Button
                  variant={selectedMember.status === 'ACTIVE' ? 'outline-danger' : 'primary'}
                  onClick={() => toggleStatus(selectedMember)}
                  isLoading={actionLoadingId === `${selectedMember.id}:status`}
                >
                  {selectedMember.status === 'ACTIVE' ? (
                    <>
                      <Ban size={15} /> Suspend member
                    </>
                  ) : (
                    <>
                      <ShieldOff size={15} /> Reactivate member
                    </>
                  )}
                </Button>
                {selectedMember.id === currentUserId && (
                  <p className="mt-2 text-xs text-foreground-lighter">
                    You are viewing your own account.
                  </p>
                )}
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
        variant={confirm.confirmLabel === 'Suspend' ? 'danger' : 'primary'}
      />

      <div className="flex items-center justify-center gap-1.5 text-xs text-foreground-lighter">
        <X className="size-3" aria-hidden="true" />
        Roles and permissions are enforced across the admin modules.
      </div>
    </div>
  );
}
