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
  Trash2,
  ExternalLink,
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
import { Tabs, TabsList, TabsTrigger } from '../../../components/ui/Tabs';
import { formatDateTime } from '../../../services/adminShared';
import Skeleton from '../../../components/ui/Skeleton';
import Drawer from '../../../components/ui/Drawer';
import Modal from '../../../components/ui/Modal';
import Button from '../../../components/ui/Button';
import Textarea from '../../../components/ui/Textarea';
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from '../../../components/ui/Tooltip';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuSeparator,
} from '../../../components/ui/DropdownMenu';

export function ReviewsView({ model }) {
  const {
    activeTab,
    setActiveTab,
    searchTerm,
    setSearchTerm,
    filterRating,
    setFilterRating,
    filterStatus,
    setFilterStatus,
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
    trashTarget,
    trashReason,
    setTrashReason,
    isTrashing,
    openTrash,
    closeTrash,
    confirmTrash,
    goToTrash,
  } = model;
  return (
    <TooltipProvider>
    <div className="p-4 sm:p-6">
      <div className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Reviews & Proof of Work</h1>
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

      <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-4">
        <TabsList>
          <TabsTrigger value="customer">Customer Proof of Work</TabsTrigger>
          <TabsTrigger value="worker">Worker Proof of Work</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Filters and Search */}
      <div className="bg-card rounded-t-xl shadow-sm border-x border-t border-border p-4 flex flex-col sm:flex-row justify-between items-center gap-4">
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
              aria-label="Filter by status"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <SelectItem value="All">All Status</SelectItem>
              <SelectItem value="In Trash">In Trash</SelectItem>
            </Select>
          </div>
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
        <CustomerProofsTable
          isLoading={isLoading}
          proofs={paginatedProofs}
          onViewDetails={handleViewDetails}
          onMoveToTrash={openTrash}
          goToTrash={goToTrash}
        />
      ) : (
        <WorkerProofsTable
          isLoading={isLoading}
          proofs={paginatedProofs}
          renderStars={renderStars}
          onViewDetails={handleViewDetails}
          onMoveToTrash={openTrash}
          goToTrash={goToTrash}
        />
      )}

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
        onMoveToTrash={openTrash}
        goToTrash={goToTrash}
      />

      <Modal
        isOpen={Boolean(trashTarget)}
        onClose={closeTrash}
        title="Move Proof of Work to Trash"
      >
        {trashTarget && (
            <div className="space-y-4">
              <p className="text-sm text-foreground-light">
                {trashTarget.worker} · {trashTarget.customer} · {trashTarget.service}
              </p>
              <Textarea
                label="Admin reason"
                value={trashReason}
                onChange={(event) => setTrashReason(event.target.value)}
                maxLength={1000}
                className="min-h-24"
              />
              <div className="flex justify-end gap-3">
                <Button
                  type="button"
                  variant="default"
                  disabled={isTrashing}
                  onClick={closeTrash}
                >
                  Close
                </Button>
                <Button
                  type="button"
                  variant="danger"
                  disabled={isTrashing || trashReason.trim().length < 3}
                  isLoading={isTrashing}
                  loadingText="Moving to trash…"
                  onClick={() => void confirmTrash()}
                >
                  Move to Trash
                </Button>
              </div>
            </div>
        )}
      </Modal>
    </div>
    </TooltipProvider>
  );
}

function ActionsMenu({ proof, onViewDetails, onMoveToTrash, goToTrash }) {
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
        {proof.isTrashed ? (
          <DropdownMenuItem onSelect={() => goToTrash(proof.trashEntryId)} className="cursor-pointer">
            <ExternalLink className="mr-2" /> View in Trash
          </DropdownMenuItem>
        ) : (
          <>
            <DropdownMenuItem
              onSelect={() => onViewDetails(proof)}
              className="cursor-pointer"
            >
              <FileText className="mr-2" /> View Details
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={() => onMoveToTrash(proof)}
              className="cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10 [&_svg]:text-destructive"
            >
              <Trash2 className="mr-2" /> Move to Trash
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function EmptyState({ message, colSpan = 6 }) {
  return (
    <TableRow hover={false}>
      <TableCell colSpan={colSpan} className="text-center">
        <div className="flex flex-col items-center justify-center">
          <MessageSquare size={48} className="text-foreground-muted mb-4" />
          <h3 className="text-lg font-medium text-foreground">{message}</h3>
        </div>
      </TableCell>
    </TableRow>
  );
}

function CustomerProofsTable({ isLoading, proofs, onViewDetails, onMoveToTrash, goToTrash }) {
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
            proofs.map((proof) => {
              const row = (
                <TableRow
                  key={proof.bookingId}
                  onClick={() =>
                    proof.isTrashed
                      ? goToTrash(proof.trashEntryId)
                      : onViewDetails(proof)
                  }
                  className={`cursor-pointer ${proof.isTrashed ? 'opacity-55 grayscale' : ''}`}
                >
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-foreground">{proof.customer}</span>
                      <span className="text-xs text-foreground-lighter mt-1">{proof.date}</span>
                    </div>
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    <span className="text-sm text-foreground">{proof.worker}</span>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-foreground">{proof.service}</span>
                  </TableCell>
                  <TableCell>
                    {proof.isTrashed ? (
                      <span className="inline-flex px-2.5 py-1 rounded-full text-xs font-medium bg-warning/10 text-warning-600 dark:text-warning-400">
                        In Trash
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-sm font-medium text-foreground">
                        <ImageIcon size={16} className="text-foreground-muted" />
                        {proof.customerPhotos.length}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-sm text-foreground">
                    {proof.date}
                  </TableCell>
                  <TableCell
                    className="whitespace-nowrap text-right font-medium"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <ActionsMenu
                      proof={proof}
                      onViewDetails={onViewDetails}
                      onMoveToTrash={onMoveToTrash}
                      goToTrash={goToTrash}
                    />
                  </TableCell>
                </TableRow>
              );
              return proof.isTrashed ? (
                <Tooltip key={proof.bookingId} delayDuration={150}>
                  <TooltipTrigger asChild>{row}</TooltipTrigger>
                  <TooltipContent>In trash — click to open in Trash</TooltipContent>
                </Tooltip>
              ) : (
                row
              );
            })
          ) : (
            <EmptyState message="No customer proof of work found" />
          )}
        </TableBody>
      </Table>
    </div>
  );
}

function WorkerProofsTable({ isLoading, proofs, renderStars, onViewDetails, onMoveToTrash, goToTrash }) {
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
            proofs.map((proof) => {
              const row = (
                <TableRow
                  key={proof.bookingId}
                  onClick={() =>
                    proof.isTrashed
                      ? goToTrash(proof.trashEntryId)
                      : onViewDetails(proof)
                  }
                  className={`cursor-pointer ${proof.isTrashed ? 'opacity-55 grayscale' : ''}`}
                >
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-foreground">{proof.worker}</span>
                      <span className="text-xs text-foreground-lighter mt-1">{proof.date}</span>
                    </div>
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    <span className="text-sm text-foreground">{proof.customer}</span>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-foreground">{proof.service}</span>
                  </TableCell>
                  <TableCell className="whitespace-nowrap">{renderStars(proof.rating)}</TableCell>
                  <TableCell>
                    <p className="text-sm text-foreground-light italic max-w-[240px] truncate">
                      "{proof.comment}"
                    </p>
                  </TableCell>
                  <TableCell>
                    {proof.isTrashed ? (
                      <span className="inline-flex px-2.5 py-1 rounded-full text-xs font-medium bg-warning/10 text-warning-600 dark:text-warning-400">
                        In Trash
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-sm font-medium text-foreground">
                        <ImageIcon size={16} className="text-foreground-muted" />
                        {proof.workerPhotos.length}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-sm text-foreground">
                    {proof.date}
                  </TableCell>
                  <TableCell
                    className="whitespace-nowrap text-right font-medium"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <ActionsMenu
                      proof={proof}
                      onViewDetails={onViewDetails}
                      onMoveToTrash={onMoveToTrash}
                      goToTrash={goToTrash}
                    />
                  </TableCell>
                </TableRow>
              );
              return proof.isTrashed ? (
                <Tooltip key={proof.bookingId} delayDuration={150}>
                  <TooltipTrigger asChild>{row}</TooltipTrigger>
                  <TooltipContent>In trash — click to open in Trash</TooltipContent>
                </Tooltip>
              ) : (
                row
              );
            })
          ) : (
            <EmptyState message="No worker proof of work found" colSpan={8} />
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

function ProofDetailsDrawer({
  proof,
  isOpen,
  onClose,
  media,
  isMediaLoading,
  renderStars,
  onMoveToTrash,
  goToTrash,
}) {
  const schedule = proof?.serviceDetails?.schedule;
  const footer = proof ? (
    proof.isTrashed ? (
      <button
        onClick={() => goToTrash(proof.trashEntryId)}
        className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 font-medium text-foreground transition-colors hover:bg-surface-100"
      >
        <ExternalLink size={16} /> View in Trash
      </button>
    ) : (
      <button
        onClick={() => {
          onClose();
          onMoveToTrash(proof);
        }}
        className="inline-flex items-center gap-2 rounded-lg bg-destructive px-4 py-2 font-medium text-white transition-opacity hover:opacity-90"
      >
        <Trash2 size={16} /> Move to Trash
      </button>
    )
  ) : null;
  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title="Proof of Work Details"
      width="max-w-lg"
      footer={footer}
    >
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
