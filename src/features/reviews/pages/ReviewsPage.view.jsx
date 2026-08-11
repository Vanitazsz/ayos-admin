import {
  Search,
  Filter,
  MoreVertical,
  MessageSquare,
  AlertTriangle,
  CheckCircle,
  EyeOff,
  Trash2,
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
  REVIEW_STATUS_BADGE,
  badgeFor,
} from '../../../services/statusMeta';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '../../../components/ui/DropdownMenu';

export function ReviewsView({ model }) {
  const {
    searchTerm,
    setSearchTerm,
    filterRating,
    setFilterRating,
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
    toggleStatus,
    deleteReview,
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

      {/* Filters and Search */}
      <div className="bg-card rounded-t-xl shadow-sm border-x border-t border-border p-4 flex flex-col sm:flex-row justify-between items-center gap-4">
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

      {/* Reviews Table/List */}
      <div className="bg-card shadow-sm border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead scope="col">Customer / Worker</TableHead>
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
            ) : paginatedReviews.length > 0 ? (
              paginatedReviews.map((review) => (
                <TableRow
                  key={review.id}
                  className={review.status === 'Hidden' ? 'opacity-60 bg-surface-200' : ''}
                >
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-foreground">{review.customer}</span>
                      <span className="text-xs text-foreground-lighter flex items-center mt-1">
                        Reviewed{' '}
                        <span className="font-medium text-brand-600 mx-1">{review.worker}</span>
                      </span>
                      <span className="text-xs text-foreground-muted mt-1">
                        {review.date} • {review.service}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <div className="mb-2">{renderStars(review.rating)}</div>
                      <p className="text-sm text-foreground-light italic">"{review.comment}"</p>
                    </div>
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    <span
                      className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${badgeFor(REVIEW_STATUS_BADGE, review.status)}`}
                    >
                      {review.status === 'Published' && (
                        <CheckCircle size={12} className="mr-1" />
                      )}
                      {review.status === 'Hidden' && (
                        <EyeOff size={12} className="mr-1" />
                      )}
                      {review.status === 'Flagged' && (
                        <AlertTriangle size={12} className="mr-1" />
                      )}
                      {review.status === 'Published'
                        ? 'Published'
                        : review.status === 'Hidden'
                          ? 'Hidden'
                          : `Flagged (${review.reportCount})`}
                    </span>
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-right font-medium">
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
                        {review.status !== 'Hidden' ? (
                          <DropdownMenuItem
                            onSelect={() => toggleStatus(review.id, 'Hidden')}
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
                          onSelect={() => deleteReview(review.id)}
                          className="cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10 [&_svg]:text-destructive"
                        >
                          <Trash2 className="mr-2" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
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
    </div>
  );
}
