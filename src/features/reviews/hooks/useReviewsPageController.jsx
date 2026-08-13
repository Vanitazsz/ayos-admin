import {
  loadReviews,
  moderateReview,
  resolveReviewMedia,
  moveReviewToTrash,
  subscribe,
} from '../logic/ReviewsPageLogic';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Star, ThumbsUp, ThumbsDown, Clock } from 'lucide-react';
import { useToast } from '../../../context/ToastContext';
import { usePagination } from '../../../hooks/usePagination';
import { useDateFilter } from '../../../hooks/useDateFilter';
import { applyDateFilter, getRowDate } from '../../../lib/dateFilter';

export function useReviewsPageController() {
  const toast = useToast();
  const navigate = useNavigate();
  const dateFilter = useDateFilter({ canModify: true });
  const [reviews, setReviews] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('customer');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRating, setFilterRating] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');
  const [mediaFilter, setMediaFilter] = useState([]);
  const [actionMenuOpenId, setActionMenuOpenId] = useState(null);
  const [confirm, setConfirm] = useState({
    isOpen: false,
    title: '',
    message: '',
    confirmLabel: 'Confirm',
    onConfirm: () => {},
  });
  const closeConfirm = () => setConfirm((s) => ({ ...s, isOpen: false }));
  const [selectedReview, setSelectedReview] = useState(null);
  const [isReviewDetailsOpen, setIsReviewDetailsOpen] = useState(false);
  const [reviewMedia, setReviewMedia] = useState(null);
  const [isReviewMediaLoading, setIsReviewMediaLoading] = useState(false);

  const refresh = async () => {
    setIsLoading(true);
    try {
      setReviews(await loadReviews());
    } finally {
      setIsLoading(false);
    }
  };
  useEffect(() => {
    void refresh();
    return subscribe('reviews', refresh);
  }, []);

  const workerStats = useMemo(() => {
    const byWorker = new Map();
    reviews.forEach((review) => {
      const entry = byWorker.get(review.worker) ?? { total: 0, count: 0 };
      entry.total += review.rating;
      entry.count += 1;
      byWorker.set(review.worker, entry);
    });
    const stats = new Map();
    byWorker.forEach((entry, worker) => {
      stats.set(worker, {
        average: (entry.total / entry.count).toFixed(1),
        count: entry.count,
      });
    });
    return stats;
  }, [reviews]);

  const matchedReviews = reviews.filter((r) => {
    const term = searchTerm.trim().toLowerCase();
    const matchesSearch =
      !term ||
      r.id.toLowerCase().includes(term) ||
      r.customer.toLowerCase().includes(term) ||
      r.worker.toLowerCase().includes(term) ||
      (r.customerEmail ?? '').toLowerCase().includes(term) ||
      (r.workerEmail ?? '').toLowerCase().includes(term) ||
      r.service.toLowerCase().includes(term) ||
      r.comment.toLowerCase().includes(term);
    const matchesRating = filterRating === 'All' || r.rating.toString() === filterRating;
    const matchesStatus =
      filterStatus === 'All' ||
      (filterStatus === 'Trashed' ? r.isTrashed : r.status === filterStatus);
    const matchesMedia =
      mediaFilter.length === 0 || (mediaFilter.includes('image') && r.media.length > 0);
    return matchesSearch && matchesRating && matchesStatus && matchesMedia;
  });
  const filteredReviews = applyDateFilter(matchedReviews, {
    field: dateFilter.field,
    range: dateFilter.effectiveRange,
    sort: dateFilter.sort,
    getDate: (r) => getRowDate(r, dateFilter.field) ?? getRowDate(r, 'created'),
  });
  const {
    currentPage,
    setCurrentPage,
    totalPages,
    pageData: paginatedReviews,
  } = usePagination(filteredReviews, 10);
  const avgRating = reviews.length
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : '0.0';
  const stats = useMemo(() => {
    if (activeTab === 'worker') {
      const averages = [...workerStats.values()];
      const avg = averages.length
        ? (
            averages.reduce((sum, entry) => sum + Number(entry.average), 0) /
            averages.length
          ).toFixed(1)
        : '0.0';
      return [
        {
          label: 'Average Rating',
          value: avg,
          icon: Star,
        },
        {
          label: 'Positive Workers',
          value: averages.filter((entry) => Number(entry.average) >= 4).length,
          icon: ThumbsUp,
        },
        {
          label: 'Negative Workers',
          value: averages.filter((entry) => Number(entry.average) <= 2).length,
          icon: ThumbsDown,
        },
        {
          label: 'Pending Moderation',
          value: reviews.filter((r) => r.status === 'Pending').length,
          icon: Clock,
        },
      ];
    }
    return [
      {
        label: 'Average Rating',
        value: avgRating,
        icon: Star,
      },
      {
        label: 'Positive Reviews',
        value: reviews.filter((r) => r.rating >= 4).length,
        icon: ThumbsUp,
      },
      {
        label: 'Negative Reviews',
        value: reviews.filter((r) => r.rating <= 2).length,
        icon: ThumbsDown,
      },
      {
        label: 'Pending Moderation',
        value: reviews.filter((r) => r.status === 'Pending').length,
        icon: Clock,
      },
    ];
  }, [activeTab, reviews, workerStats, avgRating]);
  const toggleStatus = async (id, newStatus) => {
    try {
      await moderateReview(id, newStatus === 'Rejected' ? 'REJECTED' : 'PUBLISHED');
      await refresh();
    } catch (error) {
      toast.error('Moderation failed', error.message);
    } finally {
      setActionMenuOpenId(null);
    }
  };
  const confirmReject = (id) => {
    setConfirm({
      isOpen: true,
      title: 'Reject Review',
      message: 'Reject and hide this review? You can publish it again later.',
      confirmLabel: 'Reject',
      onConfirm: async () => {
        await toggleStatus(id, 'Rejected');
      },
    });
  };
  const confirmMoveToTrash = (id) => {
    setConfirm({
      isOpen: true,
      title: 'Move Review to Trash',
      message:
        'Move this review to trash? It will be rejected and hidden immediately. You can restore it later from the Trash page.',
      confirmLabel: 'Move to Trash',
      onConfirm: async () => {
        try {
          await moveReviewToTrash(id);
          await refresh();
          toast.success('Review moved to trash');
        } catch (error) {
          toast.error('Failed to move review to trash', error.message);
        }
      },
    });
  };
  const goToTrash = (trashEntryId) => {
    navigate(`/admin/trash?tab=Reviews&entry=${trashEntryId}`);
  };
  const handleViewDetails = async (review) => {
    setSelectedReview(review);
    setReviewMedia(null);
    setIsReviewMediaLoading(true);
    setIsReviewDetailsOpen(true);
    try {
      setReviewMedia(await resolveReviewMedia(review));
    } catch {
      setReviewMedia({ images: [] });
    } finally {
      setIsReviewMediaLoading(false);
    }
  };
  const closeReviewDetails = () => {
    setIsReviewDetailsOpen(false);
    setSelectedReview(null);
    setReviewMedia(null);
  };
  const renderStars = (rating) => {
    return (
      <div className="flex">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            size={16}
            className={`${star <= rating ? 'text-warning fill-current' : 'text-foreground-muted'}`}
          />
        ))}
      </div>
    );
  };
  return {
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
    actionMenuOpenId,
    setActionMenuOpenId,
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
  };
}
