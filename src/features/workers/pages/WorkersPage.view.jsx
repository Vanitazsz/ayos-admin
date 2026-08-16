import {
  Search,
  Filter,
  MoreVertical,
  CheckCircle,
  ShieldCheck,
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
  Coins,
  ArchiveRestore,
  MapPinned,
  Upload,
  XCircle,
} from 'lucide-react';
import Drawer from '../../../components/ui/Drawer';
import Modal from '../../../components/ui/Modal';
import Pagination from '../../../components/ui/Pagination';
import Input from '../../../components/ui/Input';
import Select, { SelectItem } from '../../../components/ui/Select';
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
import DateFilter from '../../../components/ui/DateFilter';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '../../../components/ui/DropdownMenu';

export function WorkersView({ model }) {
  const {
    count,
    pendingReviewCount,
    searchTerm,
    setSearchTerm,
    filterStatus,
    setFilterStatus,
    filterVerified,
    setFilterVerified,
    dateFilter,
    currentPage,
    setCurrentPage,
    selectedWorker,
    isDrawerOpen,
    setIsDrawerOpen,
    activeTab,
    setActiveTab,
    isRejectModalOpen,
    setIsRejectModalOpen,
    rejectNotes,
    setRejectNotes,
    workerToReject,
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
    handleApproveDocs,
    openRejectModal,
    submitReject,
    verificationDocs,
    isEditingVerification,
    workerVerificationDraft,
    setWorkerVerificationDraft,
    isSavingVerification,
    enterVerificationEdit,
    cancelVerificationEdit,
    handleSaveVerificationEdit,
    confirm,
    closeConfirm,
  } = model;

  const ID_TYPE_OPTIONS = [
    { value: 'NATIONAL_ID', label: 'National ID' },
    { value: 'DRIVERS_LICENSE', label: "Driver's License" },
    { value: 'PASSPORT', label: 'Passport' },
    { value: 'UMID', label: 'UMID' },
    { value: 'PRC_ID', label: 'PRC ID' },
    { value: 'POSTAL_ID', label: 'Postal ID' },
    { value: 'VOTERS_ID', label: "Voter's ID" },
    { value: 'TIN_ID', label: 'TIN ID' },
    { value: 'OTHER', label: 'Other' },
  ];

  const MATCHING_REQUIREMENTS = [
    { key: 'approval', label: 'Verification approval' },
    { key: 'skills', label: 'At least one skill assigned' },
    { key: 'service area', label: 'Service area set' },
    { key: 'online status', label: 'Available for bookings' },
  ];
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
            {pendingReviewCount > 0 && (
              <span
                className={`ml-2 py-0.5 px-2 rounded-full text-xs ${activeTab === 'review' ? 'bg-brand-500/10 text-brand-700 dark:text-brand-300' : 'bg-surface-200 text-foreground'}`}
              >
                {pendingReviewCount}
              </span>
            )}
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {loadError ? (
        <div
          role="alert"
          className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
        >
          {loadError}
        </div>
      ) : null}

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
          <DateFilter model={dateFilter} />
          <div className="w-full sm:w-44">
            <Select
              icon={ShieldCheck}
              aria-label="Filter workers by verification status"
              value={filterVerified}
              onChange={(e) => setFilterVerified(e.target.value)}
            >
              <SelectItem value="All">All Verifications</SelectItem>
              <SelectItem value="verified">Verified</SelectItem>
              <SelectItem value="unverified">Unverified</SelectItem>
            </Select>
          </div>
          <div className="w-full sm:w-40">
            <Select
              icon={Filter}
              aria-label="Filter workers by account status"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <SelectItem value="All">All Statuses</SelectItem>
              <SelectItem value="Active">Active</SelectItem>
              <SelectItem value="Suspended">Suspended</SelectItem>
              <SelectItem value="Pending">Pending</SelectItem>
              <SelectItem value="Trashed">Trashed</SelectItem>
            </Select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-card shadow-sm border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead scope="col">
                Worker
              </TableHead>
              <TableHead scope="col">
                Category
              </TableHead>
              <TableHead scope="col" className="hidden xl:table-cell">
                Location
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
                  { className: 'hidden xl:table-cell' },
                  {},
                  {
                    className: 'hidden xl:table-cell',
                    children: <Skeleton className="h-6 w-16 rounded-full" />,
                  },
                  {
                    className: 'hidden lg:table-cell',
                    children: <Skeleton className="h-6 w-16 rounded-full" />,
                  },
                  {
                    children: <Skeleton className="h-6 w-16 rounded-full" />,
                  },
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
                  <TableCell className="whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="h-10 w-10 flex-shrink-0">
                        <div className="h-10 w-10 rounded-full bg-brand-500/10 flex items-center justify-center text-brand-600 font-bold">
                          {worker.name.charAt(0)}
                        </div>
                      </div>
                      <div className="ml-4 min-w-0">
                        <div className="text-sm font-medium text-foreground">{worker.name}</div>
                        <div
                          className="truncate max-w-[8rem] min-w-0 text-sm text-foreground-lighter"
                          title={worker.id}
                        >
                          {worker.id}
                        </div>
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
                  <TableCell className="hidden xl:table-cell">
                    <div className="flex items-center text-sm text-foreground">
                      <MapPinned size={16} className="text-brand-600 mr-2 shrink-0" />
                      <span
                        className="truncate max-w-[8rem] min-w-0"
                        title={worker.location}
                      >
                        {worker.location || '—'}
                      </span>
                    </div>
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
                              onSelect={() => openRejectModal(worker)}
                              className="cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10 [&_svg]:text-destructive"
                            >
                              <XCircle className="mr-2" /> Reject Worker
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
                <TableCell colSpan={7} className="text-center">
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
          totalCount={count}
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
                Matching Readiness
              </h4>
              {selectedWorker.matchingReady ? (
                <div className="flex items-start gap-3 rounded-lg border border-success/30 bg-success/10 p-4">
                  <CheckCircle
                    size={18}
                    className="mt-0.5 shrink-0 text-success-600 dark:text-success-400"
                  />
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      Ready for matching
                    </p>
                    <p className="mt-0.5 text-sm text-foreground-muted">
                      All requirements are complete and this worker can receive
                      bookings.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-start gap-3 rounded-lg border border-warning/30 bg-warning/10 p-4">
                    <AlertCircle
                      size={18}
                      className="mt-0.5 shrink-0 text-warning-600 dark:text-warning-400"
                    />
                    <div>
                      <p className="text-sm font-semibold text-foreground">
                        Incomplete — not matchable yet
                      </p>
                      <p className="mt-0.5 text-sm text-foreground-muted">
                        Complete the items below before this worker can be
                        matched.
                      </p>
                    </div>
                  </div>
                  <ul className="space-y-2">
                    {MATCHING_REQUIREMENTS.map((requirement) => {
                      const done = !selectedWorker.matchingMissing.includes(
                        requirement.key,
                      );
                      return (
                        <li
                          key={requirement.key}
                          className="flex items-center justify-between gap-3 rounded-lg bg-surface-200 px-3 py-2.5"
                        >
                          <div className="flex min-w-0 items-center gap-2.5">
                            {done ? (
                              <CheckCircle
                                size={16}
                                className="shrink-0 text-success-600 dark:text-success-400"
                              />
                            ) : (
                              <XCircle
                                size={16}
                                className="shrink-0 text-destructive-600 dark:text-destructive-400"
                              />
                            )}
                            <span
                              className={`text-sm ${
                                done ? 'text-foreground-light' : 'font-medium text-foreground'
                              }`}
                            >
                              {requirement.label}
                            </span>
                          </div>
                          {!done && (
                            <Badge variant="warning">Missing</Badge>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </div>

            <div className="border-t border-border pt-6">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-sm font-semibold text-foreground uppercase tracking-wider">
                  Identity Verification
                </h4>
                {verificationDocs?.id && !isEditingVerification && (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={enterVerificationEdit}
                  >
                    Edit
                  </Button>
                )}
              </div>
              {verificationDocs === undefined ? (
                <p className="text-sm text-foreground-lighter">Loading verification documents…</p>
              ) : verificationDocs === null ? (
                <p className="text-sm text-foreground-lighter">
                  Couldn't load verification documents.
                </p>
              ) : isEditingVerification ? (
                <div className="space-y-4">
                  <Select
                    label="Document Type"
                    value={workerVerificationDraft?.idType ?? ''}
                    onChange={(event) =>
                      setWorkerVerificationDraft({
                        ...workerVerificationDraft,
                        idType: event.target.value,
                      })
                    }
                  >
                    <SelectItem value="">Select document type…</SelectItem>
                    {ID_TYPE_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </Select>
                  <div className="grid gap-4 sm:grid-cols-2">
                    {(workerVerificationDraft?.documents ?? []).map((doc, index) => (
                      <div key={index}>
                        <p className="mb-2 text-sm font-medium text-foreground">
                          Document {index + 1}
                        </p>
                        {doc.preview ? (
                          <img
                            src={doc.preview}
                            alt={`ID document ${index + 1}`}
                            className="mb-2 aspect-[4/3] w-full rounded-lg border border-border bg-surface-200 object-cover"
                          />
                        ) : (
                          <p className="mb-2 text-sm text-foreground-lighter">
                            No document
                          </p>
                        )}
                        <label className="flex h-24 cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-border text-foreground-muted transition-colors hover:border-brand-400 hover:text-brand-500">
                          <Upload size={18} />
                          <span className="text-xs">
                            {doc.preview ? 'Replace' : 'Upload'} document
                          </span>
                          <input
                            type="file"
                            accept="image/jpeg,image/png,image/webp,image/heic"
                            className="hidden"
                            onChange={(event) => {
                              const file = event.target.files?.[0];
                              if (!file) return;
                              setWorkerVerificationDraft((current) => ({
                                ...current,
                                documents: (current?.documents ?? []).map((existing, i) =>
                                  i === index
                                    ? {
                                        ...existing,
                                        file,
                                        preview: URL.createObjectURL(file),
                                      }
                                    : existing,
                                ),
                              }));
                            }}
                          />
                        </label>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={isSavingVerification}
                      onClick={cancelVerificationEdit}
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      isLoading={isSavingVerification}
                      onClick={() => void handleSaveVerificationEdit()}
                    >
                      Save Changes
                    </Button>
                  </div>
                </div>
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
                  {verificationDocs.status !== 'APPROVED' && (
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        variant="outline-danger"
                        disabled={!selectedWorker.verificationId}
                        onClick={() => openRejectModal(selectedWorker)}
                      >
                        <XCircle size={15} /> Reject
                      </Button>
                      <Button
                        size="sm"
                        disabled={!selectedWorker.verificationId}
                        onClick={() => void handleApproveDocs()}
                      >
                        <CheckCircle size={15} /> Approve
                      </Button>
                    </div>
                  )}
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

      {/* Reject Worker Verification Modal */}
      <Modal
        isOpen={isRejectModalOpen}
        onClose={() => setIsRejectModalOpen(false)}
        title="Reject Worker Verification"
      >
        <div className="pb-4">
          <p className="text-sm text-foreground-light mb-4">
            Rejecting{' '}
            <span className="font-semibold text-foreground">{workerToReject?.name}</span>
            &apos;s verification will delete their submitted documents so they can
            resubmit with new ones. This cannot be undone.
          </p>
          <Textarea
            value={rejectNotes}
            onChange={(e) => setRejectNotes(e.target.value)}
            placeholder="Optional note to the worker, e.g. Invalid or expired ID submitted..."
            className="min-h-[120px]"
          />
          <div className="flex w-full space-x-3 mt-6">
            <Button
              type="button"
              variant="secondary"
              className="flex-1"
              onClick={() => setIsRejectModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              className="flex-1"
              onClick={() => void submitReject()}
            >
              Reject
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
