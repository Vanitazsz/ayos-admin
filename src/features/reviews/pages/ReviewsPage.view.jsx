import {
  Search,
  Filter,
  MoreVertical,
  MessageSquare,
  CheckCircle,
  Clock,
  FileText,
  Calendar,
  Star,
  Image as ImageIcon,
  ChevronDown,
} from 'lucide-react';
import Pagination from '../../../components/ui/Pagination';
import TableSkeleton from '../../../components/ui/TableSkeleton';
import StatCard from '../../../components/ui/StatCard';
import DateFilter from '../../../components/ui/DateFilter';
import Input from '../../../components/ui/Input';
import Select, { SelectItem } from '../../../components/ui/Select';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '../../../components/ui/Table';
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from '../../../components/ui/Tabs';
import { formatDateTime } from '../../../services/adminShared';
import Skeleton from '../../../components/ui/Skeleton';
import Drawer from '../../../components/ui/Drawer';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
} from '../../../components/ui/DropdownMenu';

export function ReviewsView({ model }) {
  const {
    activeTab,
    setActiveTab,
    searchTerm,
    setSearchTerm,
    filterRating,
    setFilterRating,
    mediaFilter,
    setMediaFilter,
    dateFilter,
    currentPage,
    setCurrentPage,
    isLoading,
    filteredProofs,
    totalPages,
    paginatedProofs,
    stats,
    handleViewDetails,
    selectedProof,
    isProofDetailsOpen,
    proofMedia,
    isProofMediaLoading,
    closeProofDetails,
    renderStars,
  } = model;
  return (
    <div className="p-4 sm:p-6">
      <div className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Proof of Work</h1>
          <p className="text-foreground-lighter mt-1">
            Proof photos and worker feedback attached to completed bookings
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((stat, index) => (
          <StatCard key={index} title={stat.label} value={stat.value} icon={stat.icon} />
        ))}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="customer">Customer Proof of Work</TabsTrigger>
          <TabsTrigger value="worker">Worker Proof of Work</TabsTrigger>
        </TabsList>

        {/* Filters and Search */}
        <div className="mt-4 bg-card rounded-t-xl shadow-sm border-x border-t border-border p-4 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="w-full sm:w-96">
            <Input
              icon={Search}
              aria-label="Search by customer, worker, service, or comment..."
              placeholder="Search by customer, worker, service, or comment..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex w-full sm:w-auto items-center gap-2">
            <DateFilter model={dateFilter} />
            <div className="w-full sm:w-40">
              <Select
                icon={Filter}
                aria-label="Filter by worker rating"
                value={filterRating}
                onChange={(e) => setFilterRating(e.target.value)}
              >
                <SelectItem value="All">All Ratings</SelectItem>
                <SelectItem value="5">5 Stars</SelectItem>
                <SelectItem value="4">4 Stars</SelectItem>
                <SelectItem value="3">3 Stars</SelectItem>
                <SelectItem value="2">2 Stars</SelectItem>
                <SelectItem value="1">1 Star</SelectItem>
              </Select>
            </div>
            <div className="w-full sm:w-40">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    aria-label="Filter proofs by photos"
                    className="flex h-9 w-full items-center justify-between gap-2 rounded-lg border border-border bg-card px-3 text-sm text-foreground shadow-sm transition-colors hover:bg-surface-100 dark:hover:bg-surface-900"
                  >
                    <span className="flex items-center gap-2">
                      <ImageIcon className="size-4 text-foreground-lighter" />
                      <span>Media</span>
                      {mediaFilter.length > 0 && (
                        <span className="rounded-full bg-brand-600 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                          {mediaFilter.length}
                        </span>
                      )}
                    </span>
                    <ChevronDown className="size-4 text-foreground-lighter" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuCheckboxItem
                    checked={mediaFilter.includes('image')}
                    onCheckedChange={(checked) =>
                      setMediaFilter((current) =>
                        checked
                          ? [...current, 'image']
                          : current.filter((value) => value !== 'image'),
                      )
                    }
                    className="cursor-pointer"
                  >
                    <ImageIcon className="mr-2 size-4" /> Has photos
                  </DropdownMenuCheckboxItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>

        {activeTab === 'customer' ? (
          <TabsContent value="customer">
            <CustomerProofsTable
              isLoading={isLoading}
              proofs={paginatedProofs}
              onViewDetails={handleViewDetails}
            />
          </TabsContent>
        ) : (
          <TabsContent value="worker">
            <WorkerProofsTable
              isLoading={isLoading}
              proofs={paginatedProofs}
              renderStars={renderStars}
              onViewDetails={handleViewDetails}
            />
          </TabsContent>
        )}
      </Tabs>

      {filteredProofs.length > 0 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
        />
      )}

      <ProofDetailsDrawer
        proof={selectedProof}
        isOpen={isProofDetailsOpen}
        onClose={closeProofDetails}
        media={proofMedia}
        isMediaLoading={isProofMediaLoading}
        renderStars={renderStars}
      />
    </div>
  );
}

function ActionsMenu({ proof, onViewDetails }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          aria-label={`Open actions for ${proof.worker}`}
          className="inline-flex items-center justify-center rounded-full p-1.5 text-foreground-muted transition-colors hover:bg-surface-200 hover:text-foreground"
        >
          <MoreVertical size={20} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuItem
          onSelect={() => onViewDetails(proof)}
          className="cursor-pointer"
        >
          <FileText className="mr-2" /> View Details
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function EmptyState({ message }) {
  return (
    <TableRow hover={false}>
      <TableCell colSpan="6" className="text-center">
        <div className="flex flex-col items-center justify-center">
          <MessageSquare size={48} className="text-foreground-muted mb-4" />
          <h3 className="text-lg font-medium text-foreground">{message}</h3>
        </div>
      </TableCell>
    </TableRow>
  );
}

function CustomerProofsTable({ isLoading, proofs, onViewDetails }) {
  return (
    <div className="bg-card shadow-sm border border-border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead scope="col">Customer</TableHead>
            <TableHead scope="col">Worker</TableHead>
            <TableHead scope="col">Service</TableHead>
            <TableHead scope="col">Photos</TableHead>
            <TableHead scope="col">Completed</TableHead>
            <TableHead scope="col" className="text-right">
              Actions
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableSkeleton rows={6} columns={[{}, {}, {}, {}, {}, { className: 'text-right' }]} />
          ) : proofs.length > 0 ? (
            proofs.map((proof) => (
              <TableRow
                key={proof.bookingId}
                onClick={() => onViewDetails(proof)}
                className="cursor-pointer"
              >
                <TableCell>
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-foreground">{proof.customer}</span>
                    <span className="text-xs text-foreground-lighter mt-1">{proof.date}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <span className="text-sm text-foreground">{proof.worker}</span>
                </TableCell>
                <TableCell>
                  <span className="text-sm text-foreground">{proof.service}</span>
                </TableCell>
                <TableCell>
                  <span className="inline-flex items-center gap-1.5 text-sm text-foreground">
                    <ImageIcon size={16} className="text-foreground-muted" />
                    {proof.customerPhotos.length}
                  </span>
                </TableCell>
                <TableCell className="whitespace-nowrap text-sm text-foreground">
                  {proof.date}
                </TableCell>
                <TableCell
                  className="whitespace-nowrap text-right font-medium"
                  onClick={(e) => e.stopPropagation()}
                >
                  <ActionsMenu proof={proof} onViewDetails={onViewDetails} />
                </TableCell>
              </TableRow>
            ))
          ) : (
            <EmptyState message="No customer proof of work found" />
          )}
        </TableBody>
      </Table>
    </div>
  );
}

function WorkerProofsTable({ isLoading, proofs, renderStars, onViewDetails }) {
  return (
    <div className="bg-card shadow-sm border border-border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead scope="col">Worker</TableHead>
            <TableHead scope="col">Customer</TableHead>
            <TableHead scope="col">Service</TableHead>
            <TableHead scope="col">Rating</TableHead>
            <TableHead scope="col">Comment</TableHead>
            <TableHead scope="col">Photos</TableHead>
            <TableHead scope="col">Completed</TableHead>
            <TableHead scope="col" className="text-right">
              Actions
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableSkeleton
              rows={6}
              columns={[{}, {}, {}, {}, {}, {}, {}, { className: 'text-right' }]}
            />
          ) : proofs.length > 0 ? (
            proofs.map((proof) => (
              <TableRow
                key={proof.bookingId}
                onClick={() => onViewDetails(proof)}
                className="cursor-pointer"
              >
                <TableCell>
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-foreground">{proof.worker}</span>
                    <span className="text-xs text-foreground-lighter mt-1">{proof.date}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <span className="text-sm text-foreground">{proof.customer}</span>
                </TableCell>
                <TableCell>
                  <span className="text-sm text-foreground">{proof.service}</span>
                </TableCell>
                <TableCell className="whitespace-nowrap">{renderStars(proof.rating)}</TableCell>
                <TableCell>
                  <p className="text-sm text-foreground-light italic max-w-xs truncate">
                    "{proof.comment}"
                  </p>
                </TableCell>
                <TableCell>
                  <span className="inline-flex items-center gap-1.5 text-sm text-foreground">
                    <ImageIcon size={16} className="text-foreground-muted" />
                    {proof.workerPhotos.length}
                  </span>
                </TableCell>
                <TableCell className="whitespace-nowrap text-sm text-foreground">
                  {proof.date}
                </TableCell>
                <TableCell
                  className="whitespace-nowrap text-right font-medium"
                  onClick={(e) => e.stopPropagation()}
                >
                  <ActionsMenu proof={proof} onViewDetails={onViewDetails} />
                </TableCell>
              </TableRow>
            ))
          ) : (
            <EmptyState message="No worker proof of work found" />
          )}
        </TableBody>
      </Table>
    </div>
  );
}

function DetailRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start gap-3">
      <Icon size={16} className="mt-0.5 shrink-0 text-foreground-muted" />
      <div className="min-w-0">
        <p className="text-xs text-foreground-muted">{label}</p>
        <p className="text-sm text-foreground">{value || '—'}</p>
      </div>
    </div>
  );
}

function PhotoGrid({ title, images }) {
  return (
    <div>
      <h4 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-4">
        {title}
      </h4>
      {images?.length ? (
        <div className="grid grid-cols-3 gap-2">
          {images.map((image) => (
            <a
              key={image.path}
              href={image.url}
              target="_blank"
              rel="noreferrer"
              className="block aspect-square rounded-lg overflow-hidden border border-border bg-surface-200"
            >
              <img
                src={image.url}
                alt={`${title} photo`}
                className="h-full w-full object-cover"
              />
            </a>
          ))}
        </div>
      ) : (
        <p className="text-sm text-foreground-lighter">No photos attached.</p>
      )}
    </div>
  );
}

function ProofDetailsDrawer({ proof, isOpen, onClose, media, isMediaLoading, renderStars }) {
  const schedule = proof?.serviceDetails?.schedule;
  return (
    <Drawer isOpen={isOpen} onClose={onClose} title="Proof of Work Details" width="max-w-lg">
      {proof && (
        <div className="space-y-6">
          <div>
            <div className="mb-3">{renderStars(proof.rating)}</div>
            <p className="text-sm text-foreground italic leading-relaxed">"{proof.comment}"</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-border pt-6">
            <DetailRow icon={CheckCircle} label="Worker" value={proof.worker} />
            <DetailRow icon={CheckCircle} label="Customer" value={proof.customer} />
            <DetailRow icon={Star} label="Service" value={proof.service} />
            <DetailRow
              icon={Calendar}
              label="Scheduled"
              value={
                schedule
                  ? `${new Date(schedule).toLocaleDateString()} • ${new Date(schedule).toLocaleTimeString()}`
                  : '—'
              }
            />
            <DetailRow
              icon={Clock}
              label="Completed"
              value={proof.completed_at ? formatDateTime(proof.completed_at) : '—'}
            />
          </div>

          {isMediaLoading ? (
            <Skeleton className="h-24 w-full rounded-lg" />
          ) : (
            <>
              <div className="border-t border-border pt-6">
                <PhotoGrid title="Worker Proof Photos" images={media?.workerImages} />
              </div>
              <div className="border-t border-border pt-6">
                <PhotoGrid title="Customer Proof Photos" images={media?.customerImages} />
              </div>
            </>
          )}
        </div>
      )}
    </Drawer>
  );
}
