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
} from 'lucide-react';
import Pagination from '../../../components/ui/Pagination';
import ConfirmModal from '../../../components/ui/ConfirmModal';
import TableSkeleton from '../../../components/ui/TableSkeleton';
import StatCard from '../../../components/ui/StatCard';
import DateFilter from '../../../components/ui/DateFilter';
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
} from '../../../components/ui/DropdownMenu';

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
          <div className="relative w-full sm:w-96">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search size={18} className="text-foreground-muted" />
            </div>
            <input
              type="text"
              aria-label="Search reviews, customers, or workers..."
              placeholder="Search reviews, customers, or workers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 border border-border-strong rounded-lg focus:ring-ring focus:border-brand-500 text-sm"
            />
          </div>
          <div className="flex w-full sm:w-auto items-center gap-2">
            <DateFilter model={dateFilter} />
            <Filter size={18} className="text-foreground-lighter" />
            <select
              className="w-full flex-1 border border-border-strong rounded-lg px-3 py-2 text-sm focus:ring-ring focus:border-brand-500 sm:w-auto sm:flex-none"
              aria-label="Filter by moderation status"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="All">All Statuses</option>
              <option value="Pending">Pending</option>
              <option value="Published">Published</option>
              <option value="Rejected">Rejected</option>
            </select>
            <select
              className="w-full flex-1 border border-border-strong rounded-lg px-3 py-2 text-sm focus:ring-ring focus:border-brand-500 sm:w-auto sm:flex-none"
              aria-label="Filter by rating"
              value={filterRating}
              onChange={(e) => setFilterRating(e.target.value)}
            >
              <option value="All">All Ratings</option>
              <option value="5">5 Stars</option>
              <option value="4">4 Stars</option>
              <option value="3">3 Stars</option>
              <option value="2">2 Stars</option>
              <option value="1">1 Star</option>
            </select>
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
        confirmLabel="Reject"
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
  onViewDetails,
  customerFirst,
}) {
  return (
    <div className="bg-card shadow-sm border border-border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead scope="col">
              {customerFirst ? 'Customer / Worker' : 'Worker / Customer'}
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
              return (
                <TableRow
                  key={review.id}
                  onClick={() => onViewDetails(review)}
                  className={`cursor-pointer ${review.status === 'Rejected' ? 'opacity-60 bg-surface-200' : ''}`}
                >
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-foreground">{primary}</span>
                      <span className="text-xs text-foreground-lighter flex items-center mt-1">
                        {customerFirst ? (
                          <>
                            Reviewed{' '}
                            <span className="font-medium text-brand-600 mx-1">{secondary}</span>
                          </>
                        ) : (
                          <>
                            Reviewed by{' '}
                            <span className="font-medium text-brand-600 mx-1">{secondary}</span>
                          </>
                        )}
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
                    <StatusBadge status={review.status} />
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-right font-medium" onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          aria-label={`Open actions for ${review.customer}`}
                          className="inline-flex items-center justify-center rounded-full p-1.5 text-foreground-muted transition-colors hover:bg-surface-200 hover:text-foreground"
                        >
                          <MoreVertical size={20} />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
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
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onSelect={() => onViewDetails(review)}
                          className="cursor-pointer"
                        >
                          <FileText className="mr-2" /> More Details
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
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
