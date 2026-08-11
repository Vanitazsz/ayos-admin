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
  CheckCircle,
  AlertCircle,
  Star,
  Coins,
  UserX,
} from 'lucide-react';
import { Card, CardHeader } from '../../../components/ui/Card';
import { formatDateTime, money, moneyFromMinor } from '../../../services/adminShared';
import { badgeFor, BOOKING_STATUS_BADGE } from '../../../services/statusMeta';
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
import Drawer from '../../../components/ui/Drawer';
import { Badge } from '../../../components/ui/Badge';
import ConfirmModal from '../../../components/ui/ConfirmModal';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '../../../components/ui/DropdownMenu';
import LocationMapPicker from '../../../components/LocationMapPicker';

function LocationSection({ person, locationFor }) {
  const location = locationFor(person);
  if (!location) {
    return (
      <div className="flex items-center text-sm text-foreground-light">
        <MapPin size={16} className="mr-3 text-foreground-muted" /> No location assigned.
      </div>
    );
  }
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <MapPinned className="h-4 w-4 shrink-0 text-brand-600" />
          <span className="truncate font-medium text-foreground">{location.name}</span>
        </div>
        <Badge variant={location.is_active ? 'success' : 'default'}>
          {location.is_active ? 'Active' : 'Inactive'}
        </Badge>
      </div>
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <p className="mb-1 text-xs text-foreground-lighter">Center</p>
          <p className="font-medium text-foreground">
            {Number(location.center_lat).toFixed(6)},{' '}
            {Number(location.center_lng).toFixed(6)}
          </p>
        </div>
        <div>
          <p className="mb-1 text-xs text-foreground-lighter">Radius</p>
          <p className="font-medium text-foreground">
            {Number(location.radius_meters).toLocaleString()} m
          </p>
        </div>
      </div>
      <div className="flex items-center text-sm text-foreground-light">
        <Calendar size={16} className="mr-3 text-foreground-muted" /> Location added{' '}
        {location.created_at ? formatDateTime(location.created_at) : '—'}
      </div>
      <LocationMapPicker
        latitude={location.center_lat}
        longitude={location.center_lng}
        onChange={() => {}}
        readOnly
      />
    </div>
  );
}

export function LocationsView({ model }) {
  const {
    activeTab,
    setActiveTab,
    locations,
    locationFor,
    // Users tab
    users,
    usersCount,
    usersError,
    isUsersLoading,
    usersCurrentPage,
    setUsersCurrentPage,
    usersTotalPages,
    searchQuery,
    setSearchQuery,
    filterStatus,
    setFilterStatus,
    filterVerified,
    setFilterVerified,
    filterLocation,
    setFilterLocation,
    selectedUserIds,
    selectedUserCount,
    isUserSelectionActive,
    userBulkAction,
    isUserBulkLoading,
    toggleSelectUser,
    selectUser,
    toggleSelectAllUsers,
    clearUserSelection,
    handleBulkUserStatus,
    handleBulkUserVerification,
    // Workers tab
    filteredWorkers,
    paginatedWorkers,
    workersTotalPages,
    workersCurrentPage,
    setWorkersCurrentPage,
    searchTerm,
    setSearchTerm,
    workerFilterStatus,
    setWorkerFilterStatus,
    workerFilterVerified,
    setWorkerFilterVerified,
    workerFilterLocation,
    setWorkerFilterLocation,
    isWorkersLoading,
    workersError,
    selectedWorkerIds,
    selectedWorkerCount,
    isWorkerSelectionActive,
    workerBulkAction,
    isWorkerBulkLoading,
    toggleSelectWorker,
    selectWorker,
    toggleSelectAllWorkers,
    clearWorkerSelection,
    handleBulkWorkerStatus,
    handleBulkWorkerVerification,
    // Shared drawer + actions
    isDrawerOpen,
    setIsDrawerOpen,
    selectedUser,
    avatarUrl,
    userVerificationDocs,
    userBookings,
    isBookingsLoading,
    activeBooking,
    setActiveBooking,
    isEditingUser,
    editDraft,
    setEditDraft,
    isSavingUser,
    enterEditUserMode,
    cancelEditUser,
    handleSaveUser,
    handleToggleUserStatus,
    handleToggleUserVerification,
    handleViewBooking,
    handleViewUserProfile,
    handleMoveUserToTrash,
    handleRestoreUser,
    selectedWorker,
    workerVerificationDocs,
    editWorker,
    setEditWorker,
    isEditWorkerOpen,
    setIsEditWorkerOpen,
    isSavingWorker,
    industryGroups,
    toggleSkill,
    toggleIndustry,
    setWorkerRate,
    handleEditWorker,
    handleSaveWorker,
    handleToggleWorkerStatus,
    handleToggleWorkerVerification,
    handleViewWorkerDetails,
    handleMoveWorkerToTrash,
    handleRestoreWorker,
    actionLoadingId,
    confirm,
    closeConfirm,
    getStatusBadge,
  } = model;

  const bookingGroups = userBookings.reduce((groups, booking) => {
    const key = booking.date;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(booking);
    return groups;
  }, new Map());

  return (
    <div className="animate-fade-in space-y-6 p-4 sm:p-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Locations</h1>
          <p className="mt-1 text-foreground-lighter">
            View the locations assigned to customers and workers.
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="workers">Workers</TabsTrigger>
        </TabsList>
        {usersError || workersError ? (
          <div
            role="alert"
            className="mt-4 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
          >
            {usersError || workersError}
          </div>
        ) : null}

        <TabsContent value="users">
          <Card>
            <CardHeader className="flex flex-col items-center justify-between gap-4 border-b border-border py-4 sm:flex-row">
              <div className="w-full sm:w-96">
                <Input
                  icon={Search}
                  aria-label="Search by name, email, or ID..."
                  placeholder="Search by name, email, or ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="flex w-full items-center gap-2 sm:w-auto">
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

            {isUserSelectionActive ? (
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-brand-500/5 px-4 py-2.5">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-foreground">
                    {selectedUserCount} selected
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearUserSelection}
                    disabled={isUserBulkLoading}
                  >
                    <X size={14} className="mr-1.5" /> Clear
                  </Button>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => void handleBulkUserStatus('SUSPENDED')}
                    isLoading={isUserBulkLoading && userBulkAction === 'SUSPENDED'}
                    disabled={isUserBulkLoading && userBulkAction !== 'SUSPENDED'}
                  >
                    <Ban size={14} /> Suspend
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => void handleBulkUserStatus('ACTIVE')}
                    isLoading={isUserBulkLoading && userBulkAction === 'ACTIVE'}
                    disabled={isUserBulkLoading && userBulkAction !== 'ACTIVE'}
                  >
                    <UserCheck size={14} /> Reactivate
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => void handleBulkUserVerification('verified')}
                    isLoading={isUserBulkLoading && userBulkAction === 'verified'}
                    disabled={isUserBulkLoading && userBulkAction !== 'verified'}
                  >
                    <ShieldCheck size={14} /> Verify
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => void handleBulkUserVerification('unverified')}
                    isLoading={isUserBulkLoading && userBulkAction === 'unverified'}
                    disabled={isUserBulkLoading && userBulkAction !== 'unverified'}
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
                    {isUserSelectionActive ? (
                      <TableHead scope="col" className="w-12 text-center">
                        <div className="flex justify-center">
                          <Checkbox
                            aria-label="Select all users"
                            checked={
                              users.length > 0 && users.every((user) => selectedUserIds.has(user.id))
                                ? true
                                : selectedUserCount > 0
                                  ? 'indeterminate'
                                  : false
                            }
                            onCheckedChange={() => toggleSelectAllUsers(users)}
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
                  {isUsersLoading ? (
                    <TableSkeleton
                      rows={6}
                      withSelect={isUserSelectionActive}
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
                            </div>
                          ),
                        },
                      ]}
                    />
                  ) : users.length === 0 ? (
                    <TableRow hover={false}>
                      <TableCell
                        colSpan={isUserSelectionActive ? 9 : 8}
                        className="h-64 text-center"
                      >
                        <div className="flex flex-col items-center justify-center text-foreground-lighter">
                          <Search className="h-12 w-12 text-foreground-muted mb-4" />
                          <p className="text-lg font-medium text-foreground">No users found</p>
                          <p className="text-sm">
                            We couldn't find any users matching your search.
                          </p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    users.map((user) => (
                      <TableRow
                        key={user.id}
                        onClick={() => void handleViewUserProfile(user)}
                        className={`cursor-pointer ${user.isTrashed ? 'opacity-55 grayscale' : ''}`}
                      >
                        {isUserSelectionActive ? (
                          <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                            <div className="flex justify-center">
                              <Checkbox
                                aria-label={`Select ${user.name}`}
                                checked={selectedUserIds.has(user.id)}
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
                              <Phone className="h-3.5 w-3.5 mr-1.5 text-foreground-muted" />{' '}
                              {user.phone}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell text-foreground-lighter">
                          {user.registeredAt}
                        </TableCell>
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
                                onSelect={() => toggleSelectAllUsers(users)}
                                className="cursor-pointer"
                              >
                                <CheckCheck className="mr-2" /> Select All
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onSelect={() => void handleViewUserProfile(user)}
                                className="cursor-pointer"
                              >
                                <Eye className="mr-2" /> More Details
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onSelect={() => void handleToggleUserStatus(user)}
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

            <Pagination
              currentPage={usersCurrentPage}
              totalPages={usersTotalPages}
              onPageChange={setUsersCurrentPage}
              totalCount={usersCount}
              pageSize={10}
            />
          </Card>
        </TabsContent>

        <TabsContent value="workers">
          <Card>
            <CardHeader className="flex flex-col items-center justify-between gap-4 border-b border-border py-4 sm:flex-row">
              <div className="w-full sm:w-96">
                <Input
                  icon={Search}
                  aria-label="Search workers by name, ID, or category..."
                  placeholder="Search workers by name, ID, or category..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="flex w-full items-center gap-2 sm:w-auto">
                <div className="w-full sm:w-44">
                  <Select
                    icon={MapPinned}
                    aria-label="Filter workers by location"
                    value={workerFilterLocation}
                    onChange={(e) => setWorkerFilterLocation(e.target.value)}
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
                    aria-label="Filter workers by verification status"
                    value={workerFilterVerified}
                    onChange={(e) => setWorkerFilterVerified(e.target.value)}
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
                    value={workerFilterStatus}
                    onChange={(e) => setWorkerFilterStatus(e.target.value)}
                  >
                    <option value="All">All Statuses</option>
                    <option value="Active">Active</option>
                    <option value="Suspended">Suspended</option>
                    <option value="Pending">Pending</option>
                    <option value="Trashed">Trashed</option>
                  </Select>
                </div>
              </div>
            </CardHeader>

            {isWorkerSelectionActive ? (
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-brand-500/5 px-4 py-2.5">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-foreground">
                    {selectedWorkerCount} selected
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearWorkerSelection}
                    disabled={isWorkerBulkLoading}
                  >
                    <X size={14} className="mr-1.5" /> Clear
                  </Button>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => void handleBulkWorkerStatus('SUSPENDED')}
                    isLoading={isWorkerBulkLoading && workerBulkAction === 'SUSPENDED'}
                    disabled={isWorkerBulkLoading && workerBulkAction !== 'SUSPENDED'}
                  >
                    <Ban size={14} /> Suspend
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => void handleBulkWorkerStatus('ACTIVE')}
                    isLoading={isWorkerBulkLoading && workerBulkAction === 'ACTIVE'}
                    disabled={isWorkerBulkLoading && workerBulkAction !== 'ACTIVE'}
                  >
                    <UserCheck size={14} /> Reactivate
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => void handleBulkWorkerVerification('verified')}
                    isLoading={isWorkerBulkLoading && workerBulkAction === 'verified'}
                    disabled={isWorkerBulkLoading && workerBulkAction !== 'verified'}
                  >
                    <ShieldCheck size={14} /> Verify
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => void handleBulkWorkerVerification('unverified')}
                    isLoading={isWorkerBulkLoading && workerBulkAction === 'unverified'}
                    disabled={isWorkerBulkLoading && workerBulkAction !== 'unverified'}
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
                    {isWorkerSelectionActive ? (
                      <TableHead scope="col" className="w-12 text-center">
                        <div className="flex justify-center">
                          <Checkbox
                            aria-label="Select all workers"
                            checked={
                              paginatedWorkers.length > 0 &&
                              paginatedWorkers.every((worker) =>
                                selectedWorkerIds.has(worker.id),
                              )
                                ? true
                                : selectedWorkerCount > 0
                                  ? 'indeterminate'
                                  : false
                            }
                            onCheckedChange={() => toggleSelectAllWorkers(paginatedWorkers)}
                          />
                        </div>
                      </TableHead>
                    ) : null}
                    <TableHead scope="col">Worker</TableHead>
                    <TableHead scope="col">Category</TableHead>
                    <TableHead scope="col" className="hidden xl:table-cell">Location</TableHead>
                    <TableHead scope="col">Rating</TableHead>
                    <TableHead scope="col" className="hidden xl:table-cell">Verification</TableHead>
                    <TableHead scope="col" className="hidden lg:table-cell">Matching</TableHead>
                    <TableHead scope="col">Status</TableHead>
                    <TableHead scope="col" className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isWorkersLoading ? (
                    <TableSkeleton
                      rows={6}
                      withSelect={isWorkerSelectionActive}
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
                        { className: 'hidden xl:table-cell' },
                        { className: 'hidden lg:table-cell' },
                        {},
                        {
                          className: 'text-right',
                          children: (
                            <div className="flex justify-end space-x-2">
                              <Skeleton className="h-8 w-8 rounded-lg" />
                            </div>
                          ),
                        },
                      ]}
                    />
                  ) : paginatedWorkers.length === 0 ? (
                    <TableRow hover={false}>
                      <TableCell
                        colSpan={isWorkerSelectionActive ? 9 : 8}
                        className="h-64 text-center"
                      >
                        <div className="flex flex-col items-center justify-center">
                          <UserX size={48} className="text-foreground-muted mb-4" />
                          <h3 className="text-lg font-medium text-foreground">No workers found</h3>
                          <p className="text-foreground-lighter mt-1">
                            Try adjusting your search or filters.
                          </p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedWorkers.map((worker) => (
                      <TableRow
                        key={worker.id}
                        onClick={() => void handleViewWorkerDetails(worker)}
                        className={`cursor-pointer ${worker.isTrashed ? 'opacity-55 grayscale' : ''}`}
                      >
                        {isWorkerSelectionActive ? (
                          <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                            <div className="flex justify-center">
                              <Checkbox
                                aria-label={`Select ${worker.name}`}
                                checked={selectedWorkerIds.has(worker.id)}
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
                              <div className="text-sm font-medium text-foreground">
                                {worker.name}
                              </div>
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
                          <div className="text-sm text-foreground-lighter">
                            {worker.experience} yrs exp
                          </div>
                        </TableCell>
                        <TableCell className="hidden xl:table-cell whitespace-nowrap">
                          <div className="flex items-center text-sm text-foreground">
                            <MapPinned size={16} className="text-brand-600 mr-2 shrink-0" />
                            {worker.location || '—'}
                          </div>
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          <div className="flex items-center text-sm text-foreground">
                            <Star size={16} className="text-warning mr-1 fill-current" />
                            {worker.rating}
                          </div>
                          <div className="text-xs text-foreground-lighter">
                            {worker.jobsCompleted} jobs
                          </div>
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
                        <TableCell
                          className="whitespace-nowrap text-right font-medium"
                          onClick={(e) => e.stopPropagation()}
                        >
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
                                onSelect={() => toggleSelectAllWorkers(paginatedWorkers)}
                                className="cursor-pointer"
                              >
                                <CheckCheck className="mr-2" /> Select All
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onSelect={() => void handleViewWorkerDetails(worker)}
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
                              <DropdownMenuItem
                                onSelect={() => void handleToggleWorkerStatus(worker)}
                                disabled={actionLoadingId === `${worker.id}:status`}
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
                                  onSelect={() => void handleRestoreWorker(worker)}
                                  className="cursor-pointer"
                                >
                                  <ArchiveRestore className="mr-2" /> Restore
                                </DropdownMenuItem>
                              ) : (
                                <DropdownMenuItem
                                  onSelect={() => void handleMoveWorkerToTrash(worker)}
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
                  )}
                </TableBody>
              </Table>
            </div>

            {filteredWorkers.length > 0 && (
              <Pagination
                currentPage={workersCurrentPage}
                totalPages={workersTotalPages}
                onPageChange={setWorkersCurrentPage}
                totalCount={filteredWorkers.length}
              />
            )}
          </Card>
        </TabsContent>
      </Tabs>

      <Drawer
        isOpen={isDrawerOpen}
        onClose={() => {
          setIsDrawerOpen(false);
          setActiveBooking(null);
          cancelEditUser();
        }}
        title={
          activeTab === 'workers'
            ? 'Worker Details'
            : activeBooking
              ? 'Booking Details'
              : 'More Details'
        }
        width="w-[520px]"
      >
        {activeTab === 'workers' && selectedWorker ? (
          <div className="space-y-6">
            <div className="flex items-center">
              <div className="h-16 w-16 rounded-full bg-brand-500/10 flex items-center justify-center text-brand-600 font-bold text-2xl">
                {selectedWorker.name.charAt(0)}
              </div>
              <div className="ml-4">
                <h3 className="text-xl font-bold text-foreground">{selectedWorker.name}</h3>
                <p className="text-foreground-lighter">{selectedWorker.id}</p>
                <div className="mt-1 flex gap-2">
                  <Badge variant={selectedWorker.status === 'Active' ? 'success' : 'danger'}>
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
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => void handleRestoreWorker(selectedWorker)}
                >
                  <ArchiveRestore size={15} /> Restore
                </Button>
              ) : (
                <>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => handleEditWorker(selectedWorker)}
                  >
                    <Edit size={15} /> Edit
                  </Button>
                  <Button
                    size="sm"
                    variant={selectedWorker.verified ? 'outline' : 'primary'}
                    onClick={() => void handleToggleWorkerVerification(selectedWorker)}
                    isLoading={actionLoadingId === `${selectedWorker.id}:verification`}
                  >
                    <ShieldCheck size={15} />
                    {selectedWorker.verified ? 'Unverify' : 'Verify'}
                  </Button>
                  <Button
                    size="sm"
                    variant={selectedWorker.status === 'Active' ? 'warning' : 'primary'}
                    onClick={() => void handleToggleWorkerStatus(selectedWorker)}
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
                  <Mail size={16} className="mr-3 text-foreground-muted" />{' '}
                  {selectedWorker.email}
                </div>
                <div className="flex items-center text-sm text-foreground-light">
                  <Phone size={16} className="mr-3 text-foreground-muted" />{' '}
                  {selectedWorker.phone}
                </div>
                <div className="flex items-center text-sm text-foreground-light">
                  <MapPin size={16} className="mr-3 text-foreground-muted" />{' '}
                  {selectedWorker.location}
                </div>
                <div className="flex items-center text-sm text-foreground-light">
                  <Calendar size={16} className="mr-3 text-foreground-muted" /> Registered{' '}
                  {selectedWorker.registeredDate}
                </div>
              </div>
            </div>

            <div className="border-t border-border pt-6">
              <h4 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-4">
                Location
              </h4>
              <LocationSection person={selectedWorker} locationFor={locationFor} />
            </div>

            <div className="border-t border-border pt-6">
              <h4 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-4">
                Professional Profile
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-surface-200 p-4 rounded-lg">
                  <p className="text-xs text-foreground-lighter mb-1">Experience</p>
                  <p className="font-semibold text-foreground">
                    {selectedWorker.experience} Years
                  </p>
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
                          <p className="truncate text-sm font-medium text-foreground">
                            {skill.name}
                          </p>
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
              {workerVerificationDocs === undefined ? (
                <p className="text-sm text-foreground-lighter">
                  Loading verification documents…
                </p>
              ) : workerVerificationDocs === null ? (
                <p className="text-sm text-foreground-lighter">
                  Couldn't load verification documents.
                </p>
              ) : workerVerificationDocs.documents.length === 0 ? (
                <p className="text-sm text-foreground-lighter">No verification submitted.</p>
              ) : (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center gap-2">
                    {workerVerificationDocs.idType && (
                      <Badge variant="outline">
                        {workerVerificationDocs.idType.replaceAll('_', ' ')}
                      </Badge>
                    )}
                    <Badge
                      variant={workerVerificationDocs.status === 'APPROVED' ? 'success' : 'warning'}
                    >
                      {workerVerificationDocs.status.replaceAll('_', ' ')}
                    </Badge>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {workerVerificationDocs.documents.map((url, index) => (
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
                <Button
                  variant="outline-danger"
                  onClick={() => handleMoveWorkerToTrash(selectedWorker)}
                >
                  <Trash2 size={15} /> Move to trash
                </Button>
              </div>
            )}
          </div>
        ) : activeBooking && selectedUser ? (
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
              ) : activeBooking.media.images.length === 0 && activeBooking.media.audio.length === 0 ? (
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
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => void handleRestoreUser(selectedUser)}
                >
                  <ArchiveRestore size={15} /> Restore
                </Button>
              ) : (
                <>
                  <Button size="sm" variant="secondary" onClick={enterEditUserMode}>
                    <Edit size={15} /> Edit
                  </Button>
                  <Button
                    size="sm"
                    variant={selectedUser.verified ? 'outline' : 'primary'}
                    onClick={() => void handleToggleUserVerification(selectedUser)}
                    isLoading={actionLoadingId === `${selectedUser.id}:verification`}
                  >
                    <ShieldCheck size={15} />
                    {selectedUser.verified ? 'Unverify' : 'Verify'}
                  </Button>
                  <Button
                    size="sm"
                    variant={selectedUser.status === 'Active' ? 'warning' : 'primary'}
                    onClick={() => void handleToggleUserStatus(selectedUser)}
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
              {isEditingUser ? (
                <form onSubmit={handleSaveUser} className="space-y-4">
                  <Input
                    label="Name"
                    required
                    minLength={2}
                    maxLength={120}
                    value={editDraft.name}
                    onChange={(event) => setEditDraft({ ...editDraft, name: event.target.value })}
                  />
                  <Input
                    label="Email"
                    type="email"
                    required
                    value={editDraft.email}
                    onChange={(event) => setEditDraft({ ...editDraft, email: event.target.value })}
                  />
                  <Input
                    label="Phone"
                    value={editDraft.phone}
                    onChange={(event) => setEditDraft({ ...editDraft, phone: event.target.value })}
                    placeholder="+639XXXXXXXXX"
                  />
                  <div className="flex justify-end gap-3 pt-2">
                    <Button type="button" variant="secondary" onClick={cancelEditUser}>
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
                Location
              </h4>
              <LocationSection person={selectedUser} locationFor={locationFor} />
            </div>

            <div className="border-t border-border pt-6">
              <h4 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-4">
                Identity Verification
              </h4>
              {userVerificationDocs === undefined ? (
                <p className="text-sm text-foreground-lighter">
                  Loading verification documents…
                </p>
              ) : userVerificationDocs === null ? (
                <p className="text-sm text-foreground-lighter">
                  Couldn't load verification documents.
                </p>
              ) : userVerificationDocs.frontUrl === '' && userVerificationDocs.backUrl === '' ? (
                <p className="text-sm text-foreground-lighter">No verification submitted.</p>
              ) : (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center gap-2">
                    {userVerificationDocs.idType && (
                      <Badge variant="outline">
                        {userVerificationDocs.idType.replaceAll('_', ' ')}
                      </Badge>
                    )}
                    <Badge
                      variant={userVerificationDocs.status === 'approved' ? 'success' : 'warning'}
                    >
                      {userVerificationDocs.status.replaceAll('_', ' ')}
                    </Badge>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <p className="mb-2 text-sm font-medium text-foreground">Front</p>
                      {userVerificationDocs.frontUrl ? (
                        <a
                          href={userVerificationDocs.frontUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="block aspect-[4/3] overflow-hidden rounded-lg border border-border bg-surface-200"
                        >
                          <img
                            src={userVerificationDocs.frontUrl}
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
                      {userVerificationDocs.backUrl ? (
                        <a
                          href={userVerificationDocs.backUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="block aspect-[4/3] overflow-hidden rounded-lg border border-border bg-surface-200"
                        >
                          <img
                            src={userVerificationDocs.backUrl}
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
                          onClick={() => void handleViewBooking(booking)}
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
                <Button
                  variant="outline-danger"
                  onClick={() => handleMoveUserToTrash(selectedUser)}
                >
                  <Trash2 size={15} /> Move to trash
                </Button>
              </div>
            )}
          </div>
        ) : null}
      </Drawer>

      {/* Edit Worker Drawer */}
      <Drawer
        isOpen={isEditWorkerOpen}
        onClose={() => setIsEditWorkerOpen(false)}
        title="Edit Worker"
        footer={
          <>
            <Button type="button" variant="secondary" onClick={() => setIsEditWorkerOpen(false)}>
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
    </div>
  );
}
