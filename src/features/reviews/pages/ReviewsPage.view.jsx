import {
  Search,
  Filter,
  MoreVertical,
  MessageSquare,
  CheckCircle,
  EyeOff,
  Clock,
  FileText,
  ThumbsUp,
  ThumbsDown,
  Calendar,
  MapPin,
  Star,
  Trash2,
  ExternalLink,
  Image as ImageIcon,
  ChevronDown,
  ArrowRight,
} from 'lucide-react';
import Pagination from '../../../components/ui/Pagination';
import ConfirmModal from '../../../components/ui/ConfirmModal';
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
import {
  REVIEW_STATUS_BADGE,
  badgeFor,
} from '../../../services/statusMeta';
import { formatDateTime } from '../../../services/adminShared';
import Skeleton from '../../../components/ui/Skeleton';
import Drawer from '../../../components/ui/Drawer';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
} from '../../../components/ui/DropdownMenu';
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from '../../../components/ui/Tooltip';

const STATUS_ICON = {
  Pending: Clock,
  Published: CheckCircle,
  Rejected: EyeOff,
};

function StatusBadge({ status }) {
  const Icon = STATUS_ICON[status] ?? Clock;
  return (
    <span
      className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${badgeFor(REVIEW_STATUS_BADGE, status)}`}
    >
      <Icon size={12} className="mr-1" />
      {status}
    </span>
  );
}

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
    confirm,
    closeConfirm,
    filteredReviews,
    totalPages,
    paginatedReviews,
    stats,
    workerStats,
    toggleStatus,
    confirmReject,
    confirmMoveToTrash,
    goToTrash,
    handleViewDetails,
    selectedReview,
    isReviewDetailsOpen,
    reviewMedia,
    isReviewMediaLoading,
    closeReviewDetails,
    renderStars,
  } = model;
  return (
    <div className="p-4 sm:p-6">
      <div className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Reviews & Moderation</h1>
          <p className="text-foreground-lighter mt-1">Monitor user feedback and moderate flagged reviews</p>
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
          <TabsTrigger value="customer">Customer Reviews</TabsTrigger>
          <TabsTrigger value="worker">Worker Reviews</TabsTrigger>
        </TabsList>

        {/* Filters and Search */}
        <div className="mt-4 bg-card rounded-t-xl shadow-sm border-x border-t border-border p-4 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="w-full sm:w-96">
            <Input
              icon={Search}
              aria-label="Search by ID, customer, worker, email, or service..."
              placeholder="Search by ID, customer, worker, email, or service..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex w-full sm:w-auto items-center gap-2">
            <DateFilter model={dateFilter} />
            <div className="w-full sm:w-48">
              <Select
                icon={Filter}
                aria-label="Filter by moderation status"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <SelectItem value="All">All Statuses</SelectItem>
                <SelectItem value="Pending">Pending</SelectItem>
                <SelectItem value="Published">Published</SelectItem>
                <SelectItem value="Rejected">Rejected</SelectItem>
                <SelectItem value="Trashed">Trashed</SelectItem>
              </Select>
            </div>
            <div className="w-full sm:w-40">
              <Select
                aria-label="Filter by rating"
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
                    aria-label="Filter reviews by attachments"
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
                    <ImageIcon className="mr-2 size-4" /> Has image
                  </DropdownMenuCheckboxItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>

        <TabsContent value="customer">
          <ReviewsTable
            isLoading={isLoading}
            reviews={paginatedReviews}
            renderStars={renderStars}
            workerStats={workerStats}
            toggleStatus={toggleStatus}
            confirmReject={confirmReject}
            confirmMoveToTrash={confirmMoveToTrash}
            goToTrash={goToTrash}
            onViewDetails={handleViewDetails}
            customerFirst
          />
        </TabsContent>
        <TabsContent value="worker">
          <ReviewsTable
            isLoading={isLoading}
            reviews={paginatedReviews}
            renderStars={renderStars}
            workerStats={workerStats}
            toggleStatus={toggleStatus}
            confirmReject={confirmReject}
            confirmMoveToTrash={confirmMoveToTrash}
            goToTrash={goToTrash}
            onViewDetails={handleViewDetails}
            customerFirst={false}
          />
        </TabsContent>
      </Tabs>

      {filteredReviews.length > 0 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
        />
      )}
      <ConfirmModal
        isOpen={confirm.isOpen}
        onClose={closeConfirm}
        title={confirm.title}
        message={confirm.message}
        onConfirm={confirm.onConfirm}
        confirmLabel={confirm.confirmLabel}
        variant="danger"
      />
      <ReviewDetailsDrawer
        review={selectedReview}
        isOpen={isReviewDetailsOpen}
        onClose={closeReviewDetails}
        media={reviewMedia}
        isMediaLoading={isReviewMediaLoading}
        renderStars={renderStars}
      />
    </div>
  );
}

function ReviewsTable({
  isLoading,
  reviews,
  renderStars,
  workerStats,
  toggleStatus,
  confirmReject,
  confirmMoveToTrash,
  goToTrash,
  onViewDetails,
  customerFirst,
}) {
  return (
    <TooltipProvider delayDuration={200}>
      <div className="bg-card shadow-sm border border-border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead scope="col">
              {customerFirst ? (
                <span className="inline-flex items-center gap-1.5">
                  Customer <ArrowRight size={14} className="text-foreground-muted" /> Worker
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5">
                  Worker <ArrowRight size={14} className="text-foreground-muted" /> Customer
                </span>
              )}
            </TableHead>
            <TableHead scope="col">Review</TableHead>
            <TableHead scope="col">Status</TableHead>
            <TableHead scope="col" className="text-right">
              Actions
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableSkeleton rows={6} columns={[{}, {}, {}, { className: 'text-right' }]} />
          ) : reviews.length > 0 ? (
            reviews.map((review) => {
              const workerAvg = workerStats.get(review.worker);
              const primary = customerFirst ? review.customer : review.worker;
              const secondary = customerFirst ? review.worker : review.customer;
              const trashed = Boolean(review.isTrashed);
              const row = (
                <TableRow
                  key={review.id}
                  onClick={() => (trashed ? goToTrash(review.trashEntryId) : onViewDetails(review))}
                  className={`cursor-pointer ${trashed ? 'opacity-55 grayscale' : ''}`}
                >
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-foreground">{primary}</span>
                      <span className="text-xs text-foreground-lighter flex items-center mt-1">
                        <ArrowRight size={12} className="mr-1 text-foreground-muted" />
                        <span className="font-medium text-brand-600">{secondary}</span>
                      </span>
                      <span className="text-xs text-foreground-muted mt-1">
                        {review.date} • {review.service}
                      </span>
                      {!customerFirst && workerAvg && (
                        <span className="mt-1 inline-flex items-center w-fit px-2 py-0.5 rounded-full bg-brand-500/10 text-brand-700 dark:text-brand-300 text-xs font-medium">
                          <Star size={12} className="mr-1 fill-current" />
                          {workerAvg.average} avg ({workerAvg.count})
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <div className="mb-2">{renderStars(review.rating)}</div>
                      <p className="text-sm text-foreground-light italic">"{review.comment}"</p>
                    </div>
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {trashed ? (
                      <span className="inline-flex px-2.5 py-1 rounded-full text-xs font-medium bg-warning/10 text-warning-600 dark:text-warning-400">
                        In Trash
                      </span>
                    ) : (
                      <StatusBadge status={review.status} />
                    )}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-right font-medium" onClick={(e) => e.stopPropagation()}>
                    {trashed ? (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button
                            aria-label={`Open actions for ${review.customer}`}
                            className="inline-flex items-center justify-center rounded-full p-1.5 text-foreground-muted transition-colors hover:bg-surface-200 hover:text-foreground"
                          >
                            <MoreVertical size={20} />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44">
                          <DropdownMenuItem
                            onSelect={() => goToTrash(review.trashEntryId)}
                            className="cursor-pointer"
                          >
                            <ExternalLink className="mr-2" /> View in Trash
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    ) : (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button
                            aria-label={`Open actions for ${review.customer}`}
                            className="inline-flex items-center justify-center rounded-full p-1.5 text-foreground-muted transition-colors hover:bg-surface-200 hover:text-foreground"
                          >
                            <MoreVertical size={20} />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-52">
                          {review.status !== 'Rejected' ? (
                            <DropdownMenuItem
                              onSelect={() => confirmReject(review.id)}
                              className="cursor-pointer"
                            >
                              <EyeOff className="mr-2" /> Hide Review
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem
                              onSelect={() => toggleStatus(review.id, 'Published')}
                              className="cursor-pointer text-success focus:text-success focus:bg-success/10 [&_svg]:text-success"
                            >
                              <CheckCircle className="mr-2" /> Publish Review
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            onSelect={() => onViewDetails(review)}
                            className="cursor-pointer"
                          >
                            <FileText className="mr-2" /> More Details
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onSelect={() => confirmMoveToTrash(review.id)}
                            className="cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10 [&_svg]:text-destructive"
                          >
                            <Trash2 className="mr-2" /> Move to Trash
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </TableCell>
                </TableRow>
              );
              return trashed ? (
                <Tooltip key={review.id} delayDuration={150}>
                  <TooltipTrigger asChild>{row}</TooltipTrigger>
                  <TooltipContent>In trash — click to open in Trash</TooltipContent>
                </Tooltip>
              ) : (
                row
              );
            })
          ) : (
            <TableRow hover={false}>
              <TableCell colSpan="4" className="text-center">
                <div className="flex flex-col items-center justify-center">
                  <MessageSquare size={48} className="text-foreground-muted mb-4" />
                  <h3 className="text-lg font-medium text-foreground">No reviews found</h3>
                </div>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
    </TooltipProvider>
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

function ReviewDetailsDrawer({
  review,
  isOpen,
  onClose,
  media,
  isMediaLoading,
  renderStars,
}) {
  const schedule = review?.serviceDetails?.schedule;
  return (
    <Drawer isOpen={isOpen} onClose={onClose} title="Review Details" width="max-w-lg">
      {review && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <StatusBadge status={review.status} />
            <p className="text-xs text-foreground-muted">{review.date}</p>
          </div>

          <div>
            <div className="mb-3">{renderStars(review.rating)}</div>
            <p className="text-sm text-foreground italic leading-relaxed">"{review.comment}"</p>
            <p className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium">
              {review.recommendWorker ? (
                <>
                  <ThumbsUp size={16} className="text-success" /> Recommended
                </>
              ) : (
                <>
                  <ThumbsDown size={16} className="text-destructive" /> Not recommended
                </>
              )}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-border pt-6">
            <DetailRow icon={CheckCircle} label="Customer" value={review.customer} />
            <DetailRow icon={CheckCircle} label="Worker" value={review.worker} />
            <DetailRow icon={Star} label="Service" value={review.service} />
            <DetailRow
              icon={CheckCircle}
              label="Booking Status"
              value={review.serviceDetails?.bookingStatus}
            />
            <DetailRow
              icon={Calendar}
              label="Scheduled"
              value={
                schedule
                  ? `${new Date(schedule).toLocaleDateString()} • ${new Date(schedule).toLocaleTimeString()}`
                  : '—'
              }
            />
            <DetailRow icon={MapPin} label="Address" value={review.serviceDetails?.address} />
            {review.moderatedAt && (
              <DetailRow icon={Clock} label="Moderated" value={formatDateTime(review.moderatedAt)} />
            )}
          </div>

          <div className="border-t border-border pt-6">
            <h4 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-4">
              Review Photo
            </h4>
            {isMediaLoading ? (
              <Skeleton className="h-24 w-full rounded-lg" />
            ) : media?.images?.length ? (
              <div className="grid grid-cols-3 gap-2">
                {media.images.map((image) => (
                  <a
                    key={image.path}
                    href={image.url}
                    target="_blank"
                    rel="noreferrer"
                    className="block aspect-square rounded-lg overflow-hidden border border-border bg-surface-200"
                  >
                    <img
                      src={image.url}
                      alt="Review attachment"
                      className="h-full w-full object-cover"
                    />
                  </a>
                ))}
              </div>
            ) : (
              <p className="text-sm text-foreground-lighter">No photos attached.</p>
            )}
          </div>
        </div>
      )}
    </Drawer>
  );
}
