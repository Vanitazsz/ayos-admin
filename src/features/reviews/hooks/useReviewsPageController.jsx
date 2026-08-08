import { loadReviews, moderateReview, subscribe } from '../logic/ReviewsPageLogic';
import { useEffect, useState } from 'react';
import { Star, ThumbsUp, ThumbsDown, AlertTriangle } from 'lucide-react';
import { useToast } from '../../../context/ToastContext';
import { usePagination } from '../../../hooks/usePagination';

export function useReviewsPageController() {
  const toast = useToast();
  const [reviews, setReviews] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRating, setFilterRating] = useState('All');
  const [actionMenuOpenId, setActionMenuOpenId] = useState(null);
  const [confirm, setConfirm] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });
  const closeConfirm = () => setConfirm((s) => ({ ...s, isOpen: false }));

  const refresh = async () => setReviews(await loadReviews());
  useEffect(() => {
    void refresh();
    return subscribe('reviews', refresh);
  }, []);
  const filteredReviews = reviews.filter((r) => {
    const matchesSearch =
      r.customer.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.worker.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.comment.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRating = filterRating === 'All' || r.rating.toString() === filterRating;
    return matchesSearch && matchesRating;
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
  const stats = [
    {
      label: 'Average Rating',
      value: avgRating,
      icon: <Star className="text-warning fill-current" />,
      bg: 'bg-warning/10',
    },
    {
      label: 'Positive Reviews',
      value: reviews.filter((r) => r.rating >= 4).length,
      icon: <ThumbsUp className="text-success" />,
      bg: 'bg-success/10',
    },
    {
      label: 'Negative Reviews',
      value: reviews.filter((r) => r.rating <= 2).length,
      icon: <ThumbsDown className="text-destructive" />,
      bg: 'bg-destructive/10',
    },
    {
      label: 'Flagged / Reported',
      value: reviews.filter((r) => r.status === 'Flagged').length,
      icon: <AlertTriangle className="text-warning" />,
      bg: 'bg-warning/10',
    },
  ];
  const toggleStatus = async (id, newStatus) => {
    try {
      await moderateReview(id, newStatus === 'Published' ? 'PUBLISHED' : 'REJECTED');
      await refresh();
    } catch (error) {
      toast.error('Moderation failed', error.message);
    } finally {
      setActionMenuOpenId(null);
    }
  };
  const deleteReview = async (id) => {
    setConfirm({
      isOpen: true,
      title: 'Reject Review',
      message: 'Reject and hide this review?',
      onConfirm: async () => {
        await toggleStatus(id, 'Hidden');
      },
    });
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
    searchTerm,
    setSearchTerm,
    filterRating,
    setFilterRating,
    currentPage,
    setCurrentPage,
    actionMenuOpenId,
    setActionMenuOpenId,
    confirm,
    closeConfirm,
    filteredReviews,
    totalPages,
    paginatedReviews,
    stats,
    toggleStatus,
    deleteReview,
    renderStars,
  };
}
