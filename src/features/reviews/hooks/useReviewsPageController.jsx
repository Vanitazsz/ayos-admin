import {
  loadWorkerProofs,
  resolveProofMedia,
  subscribe,
} from '../logic/ReviewsPageLogic';
import { useEffect, useMemo, useState } from 'react';
import { Star, Image as ImageIcon, MessageSquare } from 'lucide-react';
import { usePagination } from '../../../hooks/usePagination';
import { useDateFilter } from '../../../hooks/useDateFilter';
import { applyDateFilter, getRowDate } from '../../../lib/dateFilter';

export function useReviewsPageController() {
  const dateFilter = useDateFilter({ canModify: true });
  const [proofs, setProofs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRating, setFilterRating] = useState('All');
  const [mediaFilter, setMediaFilter] = useState([]);
  const [selectedProof, setSelectedProof] = useState(null);
  const [isProofDetailsOpen, setIsProofDetailsOpen] = useState(false);
  const [proofMedia, setProofMedia] = useState(null);
  const [isProofMediaLoading, setIsProofMediaLoading] = useState(false);

  const refresh = async () => {
    setIsLoading(true);
    try {
      setProofs(await loadWorkerProofs());
    } finally {
      setIsLoading(false);
    }
  };
  useEffect(() => {
    void refresh();
    return subscribe('booking_proof_media', refresh);
  }, []);

  const matchedProofs = proofs.filter((proof) => {
    const term = searchTerm.trim().toLowerCase();
    const matchesSearch =
      !term ||
      proof.worker.toLowerCase().includes(term) ||
      proof.customer.toLowerCase().includes(term) ||
      proof.service.toLowerCase().includes(term) ||
      proof.comment.toLowerCase().includes(term);
    const matchesRating = filterRating === 'All' || proof.rating.toString() === filterRating;
    const matchesMedia =
      mediaFilter.length === 0 ||
      (mediaFilter.includes('image') && proof.proofMedia.length > 0);
    return matchesSearch && matchesRating && matchesMedia;
  });
  const filteredProofs = applyDateFilter(matchedProofs, {
    field: dateFilter.field,
    range: dateFilter.effectiveRange,
    sort: dateFilter.sort,
    getDate: (proof) => getRowDate(proof, dateFilter.field) ?? getRowDate(proof, 'created'),
  });
  const {
    currentPage,
    setCurrentPage,
    totalPages,
    pageData: paginatedProofs,
  } = usePagination(filteredProofs, 10);

  const avgRating = proofs.length
    ? (proofs.reduce((sum, proof) => sum + proof.rating, 0) / proofs.length).toFixed(1)
    : '0.0';
  const stats = useMemo(
    () => [
      { label: 'Total Proofs', value: proofs.length, icon: MessageSquare },
      { label: 'Average Rating', value: avgRating, icon: Star },
      {
        label: 'With Photos',
        value: proofs.filter((proof) => proof.proofMedia.length > 0).length,
        icon: ImageIcon,
      },
      {
        label: 'With Comments',
        value: proofs.filter((proof) => (proof.comment ?? '').trim() !== '').length,
        icon: MessageSquare,
      },
    ],
    [proofs, avgRating],
  );

  const handleViewDetails = async (proof) => {
    setSelectedProof(proof);
    setProofMedia(null);
    setIsProofMediaLoading(true);
    setIsProofDetailsOpen(true);
    try {
      setProofMedia(await resolveProofMedia(proof));
    } catch {
      setProofMedia({ images: [] });
    } finally {
      setIsProofMediaLoading(false);
    }
  };
  const closeProofDetails = () => {
    setIsProofDetailsOpen(false);
    setSelectedProof(null);
    setProofMedia(null);
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
  };
}
