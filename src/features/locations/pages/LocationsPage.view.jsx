import {
  Search,
  Filter,
  MoreVertical,
  ShieldCheck,
  Mail,
  Phone,
  Eye,
  MapPin,
  Calendar,
  Clock,
  User,
  ArrowLeft,
  MapPinned,
  CheckCircle,
  UserX,
} from 'lucide-react';
import { Card, CardHeader } from '../../../components/ui/Card';
import { formatDateTime, money } from '../../../services/adminShared';
import { badgeFor, BOOKING_STATUS_BADGE } from '../../../services/statusMeta';
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
import Input from '../../../components/ui/Input';
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
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
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
    userDateFilter,
    workerDateFilter,
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
    // Shared drawer + read-only details
    isDrawerOpen,
    setIsDrawerOpen,
    selectedUser,
    avatarUrl,
    userVerificationDocs,
    userBookings,
    isBookingsLoading,
    activeBooking,
    setActiveBooking,
    handleViewBooking,
    handleViewUserProfile,
    selectedWorker,
    workerBookings,
    isWorkerBookingsLoading,
    handleViewWorkerDetails,
    getStatusBadge,
  } = model;

  const groupBookingsByDate = (bookings) =>
    bookings.reduce((groups, booking) => {
      const key = booking.date;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(booking);
      return groups;
    }, new Map());

  const bookingGroups = groupBookingsByDate(userBookings);
  const workerBookingGroups = groupBookingsByDate(workerBookings);

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
                <DateFilter model={userDateFilter} />
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

            <div className="min-h-[400px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead scope="col">User Details</TableHead>
                    <TableHead scope="col" className="hidden xl:table-cell">Location</TableHead>
                    <TableHead scope="col" className="hidden lg:table-cell">Contact</TableHead>
                    <TableHead scope="col" className="hidden lg:table-cell">Registration Date</TableHead>
                    <TableHead scope="col" className="text-right">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isUsersLoading ? (
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
                        { className: 'hidden xl:table-cell' },
                        { className: 'hidden lg:table-cell' },
                        { className: 'hidden lg:table-cell' },
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
                      <TableCell colSpan={5} className="h-64 text-center">
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
                        <TableCell>
                          <div className="flex items-center">
                            <div className="w-10 h-10 rounded-full bg-brand-500/10 text-brand-600 flex items-center justify-center font-bold text-sm shrink-0 mr-3">
                              {user.name.charAt(0)}
                            </div>
                            <div className="min-w-0">
                              <div className="font-medium text-foreground">{user.name}</div>
                              <div
                                className="truncate max-w-[9rem] min-w-0 text-xs text-foreground-lighter"
                                title={user.id}
                              >
                                {user.id}
                              </div>
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
                                onSelect={() => void handleViewUserProfile(user)}
                                className="cursor-pointer"
                              >
                                <Eye className="mr-2" /> More Details
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
                  aria-label="Search workers by name, ID, or email..."
                  placeholder="Search workers by name, ID, or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="flex w-full items-center gap-2 sm:w-auto">
                <DateFilter model={workerDateFilter} />
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

            <div className="min-h-[400px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead scope="col">Worker</TableHead>
                    <TableHead scope="col" className="hidden xl:table-cell">Location</TableHead>
                    <TableHead scope="col" className="hidden lg:table-cell">Contact</TableHead>
                    <TableHead scope="col" className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isWorkersLoading ? (
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
                        { className: 'hidden xl:table-cell' },
                        { className: 'hidden lg:table-cell' },
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
                      <TableCell colSpan={4} className="h-64 text-center">
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
                        <TableCell className="whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="h-10 w-10 flex-shrink-0">
                              <div className="h-10 w-10 rounded-full bg-brand-500/10 flex items-center justify-center text-brand-600 font-bold">
                                {worker.name.charAt(0)}
                              </div>
                            </div>
                            <div className="ml-4 min-w-0">
                              <div className="text-sm font-medium text-foreground">
                                {worker.name}
                              </div>
                              <div
                                className="truncate max-w-[9rem] min-w-0 text-sm text-foreground-lighter"
                                title={worker.id}
                              >
                                {worker.id}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="hidden xl:table-cell whitespace-nowrap">
                          <div className="flex items-center text-sm text-foreground">
                            <MapPinned size={16} className="text-brand-600 mr-2 shrink-0" />
                            {worker.location || '—'}
                          </div>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          <div className="flex flex-col space-y-1">
                            <span className="flex items-center text-sm text-foreground-light">
                              <Mail className="h-3.5 w-3.5 mr-1.5 shrink-0 text-foreground-muted" />
                              <span
                                className="truncate max-w-[12rem] min-w-0"
                                title={worker.email}
                              >
                                {worker.email}
                              </span>
                            </span>
                            <span className="flex items-center text-sm text-foreground-light">
                              <Phone className="h-3.5 w-3.5 mr-1.5 text-foreground-muted" />{' '}
                              {worker.phone}
                            </span>
                          </div>
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
                            <DropdownMenuContent align="end" className="w-48">
                              <DropdownMenuItem
                                onSelect={() => void handleViewWorkerDetails(worker)}
                                className="cursor-pointer"
                              >
                                <Eye className="mr-2" /> View Details
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
        }}
        title={
          activeTab === 'workers'
            ? 'Worker Activity'
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

            <div className="border-t border-border pt-6">
              <h4 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-4">
                Location
              </h4>
              <LocationSection person={selectedWorker} locationFor={locationFor} />
            </div>

            <div className="border-t border-border pt-6">
              <h4 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-4">
                Bookings
              </h4>
              {isWorkerBookingsLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-16 w-full rounded-lg" />
                  <Skeleton className="h-16 w-full rounded-lg" />
                </div>
              ) : workerBookingGroups.size === 0 ? (
                <p className="text-sm text-foreground-lighter">No bookings yet.</p>
              ) : (
                <div className="max-h-[360px] overflow-y-auto custom-scrollbar space-y-3 pr-1">
                  {[...workerBookingGroups.entries()].map(([date, group]) => (
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
                          <div className="mt-1.5 space-y-1 text-xs text-foreground-lighter">
                            <span className="flex items-center">
                              <MapPin size={12} className="mr-1 shrink-0" />
                              <span className="truncate">
                                {booking.address || 'Address not provided'}
                              </span>
                            </span>
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                              <span className="inline-flex items-center">
                                <User size={12} className="mr-1" /> {booking.customer}
                              </span>
                              <span className="inline-flex items-center">
                                <Clock size={12} className="mr-1" /> {money(booking.price)}
                              </span>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : activeBooking && (selectedUser || selectedWorker) ? (
          <div className="space-y-6">
            <button
              type="button"
              onClick={() => setActiveBooking(null)}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-foreground-light transition-colors hover:text-foreground"
            >
              <ArrowLeft size={16} /> Back to {selectedUser?.name ?? selectedWorker?.name}
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

            <div className="border-t border-border pt-6">
              <h4 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-4">
                Contact Information
              </h4>
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
          </div>
        ) : null}
      </Drawer>
    </div>
  );
}
