import {
  Search,
  Filter,
  MoreVertical,
  CheckCircle,
  ShieldCheck,
  ShieldOff,
  Eye,
  Edit,
  Trash2,
  UserCheck,
  UserX,
  AlertCircle,
  Star,
  MapPin,
  Phone,
  Mail,
  Calendar,
  Ban,
  CheckSquare,
  CheckCheck,
  X,
  Coins,
  ArchiveRestore,
} from 'lucide-react';
import Drawer from '../../../components/ui/Drawer';
import Modal from '../../../components/ui/Modal';
import Pagination from '../../../components/ui/Pagination';
import Input from '../../../components/ui/Input';
import Select from '../../../components/ui/Select';
import Textarea from '../../../components/ui/Textarea';
import Button from '../../../components/ui/Button';
import Checkbox from '../../../components/ui/Checkbox';
import ConfirmModal from '../../../components/ui/ConfirmModal';
import StatCard from '../../../components/ui/StatCard';
import TableSkeleton from '../../../components/ui/TableSkeleton';
import Skeleton from '../../../components/ui/Skeleton';
import { Badge } from '../../../components/ui/Badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../../components/ui/Table';
import {
  Tabs,
  TabsList,
  TabsTrigger,
} from '../../../components/ui/Tabs';
import { money, moneyFromMinor } from '../../../services/adminShared';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '../../../components/ui/DropdownMenu';

export function WorkersView({ model }) {
  const {
    workers,
    searchTerm,
    setSearchTerm,
    filterStatus,
    setFilterStatus,
    filterVerified,
    setFilterVerified,
    currentPage,
    setCurrentPage,
    selectedWorker,
    isDrawerOpen,
    setIsDrawerOpen,
    activeTab,
    setActiveTab,
    isRemarksModalOpen,
    setIsRemarksModalOpen,
    remarks,
    setRemarks,
    workerToReview,
    editWorker,
    setEditWorker,
    isEditDrawerOpen,
    setIsEditDrawerOpen,
    isSavingWorker,
    actionLoadingId,
    industryGroups,
    toggleSkill,
    toggleIndustry,
    setWorkerRate,
    isLoading,
    loadError,
    needsReview,
    filteredWorkers,
    totalPages,
    paginatedWorkers,
    stats,
    handleViewDetails,
    handleEditWorker,
    handleSaveWorker,
    handleMoveToTrash,
    handleRestore,
    toggleStatus,
    toggleWorkerVerification,
    approveWorker,
    openRemarksModal,
    submitRemarks,
    selectedIds,
    selectedCount,
    isSelectionActive,
    bulkAction,
    isBulkLoading,
    toggleSelectWorker,
    selectWorker,
    toggleSelectAll,
    clearSelection,
    handleBulkStatus,
    handleBulkVerification,
    verificationDocs,
    confirm,
    closeConfirm,
  } = model;
  return (
    <div className="p-4 sm:p-6">
      <div className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Workers Management</h1>
          <p className="text-foreground-lighter mt-1">
            Manage platform service providers and their verification
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((stat, index) => (
          <StatCard key={index} title={stat.label} value={stat.value} icon={stat.icon} />
        ))}
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-4">
        <TabsList>
          <TabsTrigger value="all" onClick={() => setCurrentPage(1)}>
            All Workers
          </TabsTrigger>
          <TabsTrigger value="review" onClick={() => setCurrentPage(1)}>
            Review Queue
            {workers.filter(needsReview).length > 0 && (
              <span
                className={`ml-2 py-0.5 px-2 rounded-full text-xs ${activeTab === 'review' ? 'bg-brand-500/10 text-brand-700 dark:text-brand-300' : 'bg-surface-200 text-foreground'}`}
              >
                {workers.filter(needsReview).length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Filters and Search */}
      <div className="bg-card rounded-t-xl shadow-sm border-x border-t border-border p-4 flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="w-full sm:w-96">
          <Input
            icon={Search}
            aria-label="Search workers by name, ID, or category..."
            placeholder="Search workers by name, ID, or category..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex w-full sm:w-auto items-center gap-2">
          <div className="w-full sm:w-44">
            <Select
              icon={ShieldCheck}
              aria-label="Filter workers by verification status"
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
              aria-label="Filter workers by account status"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="All">All Statuses</option>
              <option value="Active">Active</option>
              <option value="Suspended">Suspended</option>
              <option value="Pending">Pending</option>
              <option value="Trashed">Trashed</option>
            </Select>
          </div>
        </div>
      </div>

      {loadError ? (
        <div
          role="alert"
          className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
        >
          {loadError}
        </div>
      ) : null}

      {isSelectionActive ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-t-xl border-x border-t border-border bg-brand-500/5 px-4 py-2.5">
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

      {/* Table */}
      <div className={`bg-card shadow-sm border border-border ${isSelectionActive ? 'rounded-b-xl' : 'rounded-none'}`}>
        <Table>
          <TableHeader>
            <TableRow>
              {isSelectionActive ? (
                <TableHead scope="col" className="w-12 text-center">
                  <div className="flex justify-center">
                    <Checkbox
                      aria-label="Select all workers"
                      checked={
                        paginatedWorkers.length > 0 &&
                        paginatedWorkers.every((worker) => selectedIds.has(worker.id))
                          ? true
                          : selectedCount > 0
                            ? 'indeterminate'
                            : false
                      }
                      onCheckedChange={() => toggleSelectAll(paginatedWorkers)}
                    />
                  </div>
                </TableHead>
              ) : null}
              <TableHead scope="col">
                Worker
              </TableHead>
              <TableHead scope="col">
                Category
              </TableHead>
              <TableHead scope="col">
                Rating
              </TableHead>
              <TableHead scope="col" className="hidden xl:table-cell">
                Verification
              </TableHead>
              <TableHead scope="col" className="hidden lg:table-cell">
                Matching
              </TableHead>
              <TableHead scope="col">
                Status
              </TableHead>
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
                  {},
                  {},
                  { className: 'hidden xl:table-cell' },
                  { className: 'hidden lg:table-cell' },
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
            ) : paginatedWorkers.length > 0 ? (
              paginatedWorkers.map((worker) => (
                <TableRow
                  key={worker.id}
                  onClick={() => handleViewDetails(worker)}
                  className={`cursor-pointer ${worker.isTrashed ? 'opacity-55 grayscale' : ''}`}
                >
                  {isSelectionActive ? (
                    <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                      <div className="flex justify-center">
                        <Checkbox
                          aria-label={`Select ${worker.name}`}
                          checked={selectedIds.has(worker.id)}
                          onCheckedChange={() => toggleSelectWorker(worker.id)}
                        />
                      </div>
                    </TableCell>
                  ) : null}
                  <TableCell className="whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="h-10 w-10 flex-shrink-0">
                        <div className="h-10 w-10 rounded-full bg-brand-500/10 flex items-center justify-center text-brand-600 font-bold">
                          {worker.name.charAt(0)}
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-foreground">{worker.name}</div>
                        <div className="text-sm text-foreground-lighter">{worker.id}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    <div
                      className="max-w-[14rem] truncate text-sm text-foreground"
                      title={(worker.categories ?? []).join(', ')}
                    >
                      {(worker.categories ?? []).join(', ') || '—'}
                    </div>
                    <div className="text-sm text-foreground-lighter">{worker.experience} yrs exp</div>
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    <div className="flex items-center text-sm text-foreground">
                      <Star size={16} className="text-warning mr-1 fill-current" />
                      {worker.rating}
                    </div>
                    <div className="text-xs text-foreground-lighter">{worker.jobsCompleted} jobs</div>
                  </TableCell>
                  <TableCell className="hidden xl:table-cell whitespace-nowrap">
                    {worker.verified ? (
                      <Badge variant="success">
                        <CheckCircle size={12} /> Verified
                      </Badge>
                    ) : worker.verificationId ? (
                      <Badge variant="warning">
                        <AlertCircle size={12} />{' '}
                        {worker.verificationStatus.replaceAll('_', ' ')}
                      </Badge>
                    ) : (
                      <Badge>Not submitted</Badge>
                    )}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell whitespace-nowrap">
                    {worker.matchingReady ? (
                      <Badge variant="success">
                        <CheckCircle size={12} /> Ready
                      </Badge>
                    ) : (
                      <div>
                        <Badge variant="warning">
                          <AlertCircle size={12} /> Incomplete
                        </Badge>
                        <div className="mt-1 text-xs text-foreground-lighter">
                          {worker.matchingMissing.join(', ')}
                        </div>
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    <Badge
                      variant={
                        worker.status === 'Active'
                          ? 'success'
                          : worker.status === 'Suspended'
                            ? 'danger'
                            : 'default'
                      }
                    >
                      {worker.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-right font-medium" onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          aria-label={`Open actions for ${worker.name}`}
                          className="inline-flex items-center justify-center rounded-full p-1.5 text-foreground-muted transition-colors hover:bg-surface-200 hover:text-foreground"
                        >
                          <MoreVertical size={20} />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-52">
                        <DropdownMenuItem
                          onSelect={() => selectWorker(worker.id)}
                          className="cursor-pointer"
                        >
                          <CheckSquare className="mr-2" /> Select
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onSelect={() => toggleSelectAll(paginatedWorkers)}
                          className="cursor-pointer"
                        >
                          <CheckCheck className="mr-2" /> Select All
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onSelect={() => handleViewDetails(worker)}
                          className="cursor-pointer"
                        >
                          <Eye className="mr-2" /> View Details
                        </DropdownMenuItem>

                        <DropdownMenuItem
                          onSelect={() => handleEditWorker(worker)}
                          className="cursor-pointer"
                        >
                          <Edit className="mr-2" /> Edit Worker
                        </DropdownMenuItem>

                        {activeTab === 'review' && needsReview(worker) && (
                          <>
                            <DropdownMenuItem
                              onSelect={() => approveWorker(worker)}
                              className="cursor-pointer text-success-600 dark:text-success-400 focus:text-success-600 dark:focus:text-success-400 focus:bg-success/10 [&_svg]:text-success"
                            >
                              <CheckCircle className="mr-2" /> Approve Worker
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onSelect={() => openRemarksModal(worker)}
                              className="cursor-pointer text-warning-600 dark:text-warning-400 focus:text-warning-600 dark:focus:text-warning-400 focus:bg-warning/10 [&_svg]:text-warning"
                            >
                              <AlertCircle className="mr-2" /> Request Docs
                            </DropdownMenuItem>
                          </>
                        )}

                        <DropdownMenuItem
                          onSelect={() => toggleStatus(worker)}
                          className="cursor-pointer"
                        >
                          {worker.status === 'Active' ? (
                            <UserX className="mr-2" />
                          ) : (
                            <UserCheck className="mr-2" />
                          )}
                          {worker.status === 'Active' ? 'Suspend' : 'Reactivate'}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        {worker.isTrashed ? (
                          <DropdownMenuItem
                            onSelect={() => handleRestore(worker)}
                            className="cursor-pointer"
                          >
                            <ArchiveRestore className="mr-2" /> Restore
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem
                            onSelect={() => handleMoveToTrash(worker)}
                            className="cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10 [&_svg]:text-destructive"
                          >
                            <Trash2 className="mr-2" /> Move to trash
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow hover={false}>
                <TableCell colSpan={isSelectionActive ? 8 : 7} className="text-center">
                  <div className="flex flex-col items-center justify-center">
                    <UserX size={48} className="text-foreground-muted mb-4" />
                    <h3 className="text-lg font-medium text-foreground">No workers found</h3>
                    <p className="text-foreground-lighter mt-1">Try adjusting your search or filters.</p>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {filteredWorkers.length > 0 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
          totalCount={filteredWorkers.length}
        />
      )}

      {/* Worker Details Drawer */}
      <Drawer isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} title="Worker Details">
        {selectedWorker && (
          <div className="space-y-6">
            <div className="flex items-center">
              <div className="h-16 w-16 rounded-full bg-brand-500/10 flex items-center justify-center text-brand-600 font-bold text-2xl">
                {selectedWorker.name.charAt(0)}
              </div>
              <div className="ml-4">
                <h3 className="text-xl font-bold text-foreground">{selectedWorker.name}</h3>
                <p className="text-foreground-lighter">{selectedWorker.id}</p>
                <div className="mt-1 flex gap-2">
                  <Badge
                    variant={
                      selectedWorker.status === 'Active' ? 'success' : 'danger'
                    }
                  >
                    {selectedWorker.status}
                  </Badge>
                  {selectedWorker.verified && (
                    <Badge variant="primary">
                      <CheckCircle size={10} /> Verified
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {selectedWorker.isTrashed ? (
                <Button size="sm" variant="secondary" onClick={() => handleRestore(selectedWorker)}>
                  <ArchiveRestore size={15} /> Restore
                </Button>
              ) : (
                <>
                  <Button size="sm" variant="secondary" onClick={() => handleEditWorker(selectedWorker)}>
                    <Edit size={15} /> Edit
                  </Button>
                  <Button
                    size="sm"
                    variant={selectedWorker.verified ? 'outline' : 'primary'}
                    onClick={() => void toggleWorkerVerification(selectedWorker)}
                    isLoading={actionLoadingId === `${selectedWorker.id}:verification`}
                  >
                    <ShieldCheck size={15} />
                    {selectedWorker.verified ? 'Unverify' : 'Verify'}
                  </Button>
                  <Button
                    size="sm"
                    variant={selectedWorker.status === 'Active' ? 'warning' : 'primary'}
                    onClick={() => void toggleStatus(selectedWorker)}
                    isLoading={actionLoadingId === `${selectedWorker.id}:status`}
                  >
                    <Ban size={15} />
                    {selectedWorker.status === 'Active' ? 'Suspend' : 'Reactivate'}
                  </Button>
                </>
              )}
            </div>

            <div className="border-t border-border pt-6">
              <h4 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-4">
                Contact Information
              </h4>
              <div className="space-y-3">
                <div className="flex items-center text-sm text-foreground-light">
                  <Mail size={16} className="mr-3 text-foreground-muted" /> {selectedWorker.email}
                </div>
                <div className="flex items-center text-sm text-foreground-light">
                  <Phone size={16} className="mr-3 text-foreground-muted" /> {selectedWorker.phone}
                </div>
                <div className="flex items-center text-sm text-foreground-light">
                  <MapPin size={16} className="mr-3 text-foreground-muted" /> {selectedWorker.location}
                </div>
                <div className="flex items-center text-sm text-foreground-light">
                  <Calendar size={16} className="mr-3 text-foreground-muted" /> Registered{' '}
                  {selectedWorker.registeredDate}
                </div>
              </div>
            </div>

            <div className="border-t border-border pt-6">
              <h4 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-4">
                Professional Profile
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-surface-200 p-4 rounded-lg">
                  <p className="text-xs text-foreground-lighter mb-1">Experience</p>
                  <p className="font-semibold text-foreground">{selectedWorker.experience} Years</p>
                </div>
                <div className="bg-surface-200 p-4 rounded-lg">
                  <p className="text-xs text-foreground-lighter mb-1">Jobs Completed</p>
                  <p className="font-semibold text-foreground">{selectedWorker.jobsCompleted}</p>
                </div>
                <div className="bg-surface-200 p-4 rounded-lg">
                  <p className="text-xs text-foreground-lighter mb-1">Earnings</p>
                  <p className="font-semibold text-foreground">
                    {money(selectedWorker.earnings)}
                  </p>
                </div>
              </div>
              {(selectedWorker.categories?.length ?? 0) > 0 && (
                <div className="mt-4">
                  <p className="mb-2 text-xs text-foreground-lighter">Categories</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedWorker.categories.map((category) => (
                      <span
                        key={category}
                        className="rounded-full bg-brand-500/10 px-3 py-1 text-xs font-medium text-brand-700 dark:text-brand-300"
                      >
                        {category}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {(selectedWorker.skills?.length ?? 0) > 0 && (
                <div className="mt-4">
                  <p className="mb-2 text-xs text-foreground-lighter">Skills & Rates</p>
                  <div className="max-h-64 space-y-2 overflow-y-auto pr-1 custom-scrollbar">
                    {selectedWorker.skills.map((skill) => (
                      <div
                        key={skill.id}
                        className="flex items-center justify-between gap-3 rounded-lg bg-surface-200 px-3 py-2"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-foreground">{skill.name}</p>
                          <p className="text-xs text-foreground-lighter">{skill.years} yrs exp</p>
                        </div>
                        <div className="flex shrink-0 items-center gap-1.5 text-sm font-semibold text-foreground">
                          <Coins size={14} className="text-foreground-muted" />
                          {skill.rateMinor != null ? moneyFromMinor(skill.rateMinor) : 'No rate set'}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="border-t border-border pt-6">
              <h4 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-4">
                Identity Verification
              </h4>
              {verificationDocs === undefined ? (
                <p className="text-sm text-foreground-lighter">Loading verification documents…</p>
              ) : verificationDocs === null ? (
                <p className="text-sm text-foreground-lighter">
                  Couldn't load verification documents.
                </p>
              ) : verificationDocs.documents.length === 0 ? (
                <p className="text-sm text-foreground-lighter">No verification submitted.</p>
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
                        verificationDocs.status === 'APPROVED' ? 'success' : 'warning'
                      }
                    >
                      {verificationDocs.status.replaceAll('_', ' ')}
                    </Badge>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {verificationDocs.documents.map((url, index) => (
                      <a
                        key={url}
                        href={url}
                        target="_blank"
                        rel="noreferrer"
                        className="block aspect-[4/3] overflow-hidden rounded-lg border border-border bg-surface-200"
                      >
                        <img
                          src={url}
                          alt={`Submitted ID document ${index + 1}`}
                          className="h-full w-full object-cover"
                        />
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {!selectedWorker.isTrashed && (
              <div className="border-t border-border pt-6">
                <h4 className="text-sm font-semibold text-destructive uppercase tracking-wider mb-3">
                  Danger Zone
                </h4>
                <Button variant="outline-danger" onClick={() => handleMoveToTrash(selectedWorker)}>
                  <Trash2 size={15} /> Move to trash
                </Button>
              </div>
            )}
          </div>
        )}
      </Drawer>

      {/* Edit Worker Drawer */}
      <Drawer
        isOpen={isEditDrawerOpen}
        onClose={() => setIsEditDrawerOpen(false)}
        title="Edit Worker"
        footer={
          <>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsEditDrawerOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" form="edit-worker-form" isLoading={isSavingWorker}>
              Save Changes
            </Button>
          </>
        }
      >
        {editWorker && (
          <form id="edit-worker-form" onSubmit={handleSaveWorker} className="space-y-4">
            <Input
              label="Name"
              required
              minLength={2}
              maxLength={120}
              value={editWorker.name}
              onChange={(e) => setEditWorker({ ...editWorker, name: e.target.value })}
            />
            <Input
              label="Email"
              type="email"
              value={editWorker.email}
              onChange={(e) => setEditWorker({ ...editWorker, email: e.target.value })}
              placeholder="worker@example.com"
            />
            <Input
              label="Phone"
              value={editWorker.phone}
              onChange={(e) => setEditWorker({ ...editWorker, phone: e.target.value })}
              placeholder="+639XXXXXXXXX"
            />
            <div>
              <p className="mb-1 text-sm font-medium text-foreground">Skills</p>
              {industryGroups.length === 0 ? (
                <p className="text-sm text-foreground-lighter">
                  No skills available. Add skills in the Services page first.
                </p>
              ) : (
                <div className="max-h-64 overflow-y-auto space-y-3 rounded-lg border border-border bg-surface-100 p-3">
                  {industryGroups.map((group) => {
                    const selectedCount = group.skills.filter((skill) =>
                      editWorker.skillIds.includes(skill.id),
                    ).length;
                    const allSelected = selectedCount === group.skills.length;
                    return (
                      <div key={group.name}>
                        <div className="flex items-center justify-between gap-2 border-b border-border pb-1.5">
                          <Checkbox
                            label={group.name}
                            checked={allSelected}
                            onCheckedChange={() => toggleIndustry(group.name)}
                          />
                          <span className="text-xs text-foreground-lighter">
                            {selectedCount}/{group.skills.length}
                          </span>
                        </div>
                        <div className="space-y-1.5 pt-1.5">
                          {group.skills.map((skill) => {
                            const isSelected = editWorker.skillIds.includes(skill.id);
                            const rateMinor = editWorker.rates?.[skill.id] ?? null;
                            return (
                              <div
                                key={skill.id}
                                className="flex items-center justify-between gap-3"
                              >
                                <Checkbox
                                  label={skill.name}
                                  className="pl-5"
                                  checked={isSelected}
                                  onCheckedChange={() => toggleSkill(skill.id)}
                                />
                                {isSelected && (
                                  <div className="flex shrink-0 items-center gap-1.5">
                                    <span className="text-xs text-foreground-lighter">₱</span>
                                    <input
                                      type="number"
                                      min={0}
                                      step={0.01}
                                      aria-label={`Rate for ${skill.name}`}
                                      value={
                                        rateMinor != null ? (rateMinor / 100).toFixed(2) : ''
                                      }
                                      placeholder="Rate"
                                      onChange={(e) => {
                                        const pesos = parseFloat(e.target.value);
                                        setWorkerRate(
                                          skill.id,
                                          Number.isFinite(pesos) ? Math.round(pesos * 100) : null,
                                        );
                                      }}
                                      className="w-24 rounded-md border border-border bg-card px-2 py-1 text-sm text-foreground focus-ring"
                                    />
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              <p className="mt-1 text-xs text-foreground-lighter">
                {editWorker.skillIds.length} selected
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Experience (years)"
                type="number"
                min={0}
                max={100}
                value={editWorker.experience}
                onChange={(e) => setEditWorker({ ...editWorker, experience: e.target.value })}
              />
              <Input
                label="Service Area"
                value={editWorker.serviceArea}
                onChange={(e) => setEditWorker({ ...editWorker, serviceArea: e.target.value })}
                placeholder="e.g. Makati, Metro Manila"
              />
            </div>
            <Textarea
              label="Bio"
              rows={4}
              value={editWorker.bio}
              onChange={(e) => setEditWorker({ ...editWorker, bio: e.target.value })}
              placeholder="Short professional summary"
            />
          </form>
        )}
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

      {/* Request Docs Remarks Modal */}
      <Modal
        isOpen={isRemarksModalOpen}
        onClose={() => setIsRemarksModalOpen(false)}
        title="Request Additional Documents"
      >
        <div className="pb-4">
          <p className="text-sm text-foreground-light mb-4">
            Provide remarks on what documents{' '}
            <span className="font-semibold text-foreground">{workerToReview?.name}</span> needs to
            submit for verification.
          </p>
          <Textarea
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            placeholder="e.g. Please upload a clearer copy of your Valid ID..."
            className="min-h-[120px]"
          />
          <div className="flex w-full space-x-3 mt-6">
            <Button
              type="button"
              variant="secondary"
              className="flex-1"
              onClick={() => setIsRemarksModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              className="flex-1"
              onClick={submitRemarks}
              disabled={!remarks.trim()}
            >
              Send Request
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
