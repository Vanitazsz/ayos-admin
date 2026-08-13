import {
  loadProofOfWork,
  resolveProofMedia,
  hasWorkerProof,
  hasCustomerProof,
  moveBookingProofToTrash,
  subscribe,
} from '../logic/ReviewsPageLogic';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Star, Image as ImageIcon, MessageSquare } from 'lucide-react';
import { useToast } from '../../../context/ToastContext';
import { usePagination } from '../../../hooks/usePagination';
import { useDateFilter } from '../../../hooks/useDateFilter';
import { applyDateFilter, getRowDate } from '../../../lib/dateFilter';

export function useReviewsPageController() {
  const toast = useToast();
  const navigate = useNavigate();
  const dateFilter = useDateFilter({ canModify: true });
  const [proofs, setProofs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('customer');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRating, setFilterRating] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');
  const [mediaFilter, setMediaFilter] = useState([]);
  const [selectedProof, setSelectedProof] = useState(null);
  const [isProofDetailsOpen, setIsProofDetailsOpen] = useState(false);
  const [proofMedia, setProofMedia] = useState(null);
  const [isProofMediaLoading, setIsProofMediaLoading] = useState(false);
  const [trashTarget, setTrashTarget] = useState(null);
  const [trashReason, setTrashReason] = useState('');
  const [isTrashing, setIsTrashing] = useState(false);

  const refresh = async () => {
    setIsLoading(true);
    try {
      setProofs(await loadProofOfWork());
    } catch (error) {
      toast.error('Failed to load proof of work', error.message);
    } finally {
      setIsLoading(false);
    }
  };
  useEffect(() => {
    void refresh();
    return subscribe('booking_proof_media', refresh);
  }, []);

  const workerProofs = useMemo(() => proofs.filter(hasWorkerProof), [proofs]);
  const customerProofs = useMemo(() => proofs.filter(hasCustomerProof), [proofs]);
  const tabProofs = activeTab === 'customer' ? customerProofs : workerProofs;

  const matchedProofs = tabProofs.filter((proof) => {
    const term = searchTerm.trim().toLowerCase();
    const matchesSearch =
      !term ||
      proof.worker.toLowerCase().includes(term) ||
      proof.customer.toLowerCase().includes(term) ||
      proof.service.toLowerCase().includes(term) ||
      proof.comment.toLowerCase().includes(term);
    const matchesRating =
      filterRating === 'All' || proof.rating?.toString() === filterRating;
    const matchesStatus =
      filterStatus === 'All' ||
      (filterStatus === 'In Trash' ? proof.isTrashed : !proof.isTrashed);
    const hasPhotos =
      activeTab === 'customer'
        ? proof.customerPhotos.length > 0
        : proof.workerPhotos.length > 0;
    const matchesMedia =
      mediaFilter.length === 0 || (mediaFilter.includes('image') && hasPhotos);
    return matchesSearch && matchesRating && matchesStatus && matchesMedia;
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

  const avgOf = (rows) => {
    const rated = rows.filter((proof) => proof.rating);
    return rated.length
      ? (rated.reduce((sum, proof) => sum + proof.rating, 0) / rated.length).toFixed(1)
      : '0.0';
  };
  const stats = useMemo(() => {
    if (activeTab === 'worker') {
      return [
        { label: 'Total Proofs', value: workerProofs.length, icon: MessageSquare },
        { label: 'Average Rating', value: avgOf(workerProofs), icon: Star },
        {
          label: 'With Photos',
          value: workerProofs.filter((proof) => proof.workerPhotos.length > 0).length,
          icon: ImageIcon,
        },
        {
          label: 'With Comments',
          value: workerProofs.filter((proof) => (proof.comment ?? '').trim() !== '').length,
          icon: MessageSquare,
        },
      ];
    }
    return [
      { label: 'Total Proofs', value: customerProofs.length, icon: MessageSquare },
      { label: 'With Photos', value: customerProofs.length, icon: ImageIcon },
      { label: 'Avg Worker Rating', value: avgOf(customerProofs), icon: Star },
      {
        label: 'With Worker Feedback',
        value: customerProofs.filter(
          (proof) => proof.rating || (proof.comment ?? '').trim() !== '',
        ).length,
        icon: MessageSquare,
      },
    ];
  }, [activeTab, workerProofs, customerProofs]);

  const handleViewDetails = async (proof) => {
    setSelectedProof(proof);
    setProofMedia(null);
    setIsProofMediaLoading(true);
    setIsProofDetailsOpen(true);
    try {
      setProofMedia(await resolveProofMedia(proof));
    } catch {
      setProofMedia({ workerImages: [], customerImages: [] });
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

  const openTrash = (proof) => {
    setTrashTarget(proof);
    setTrashReason('');
  };
  const closeTrash = () => {
    if (isTrashing) return;
    setTrashTarget(null);
    setTrashReason('');
  };
  const confirmTrash = async () => {
    if (!trashTarget || trashReason.trim().length < 3 || isTrashing) return;
    setIsTrashing(true);
    try {
      await moveBookingProofToTrash(trashTarget.bookingId, trashReason.trim());
      toast.success(
        'Moved to trash',
        `${trashTarget.worker}'s proof of work was moved to trash.`,
      );
      setTrashTarget(null);
      setTrashReason('');
      await refresh();
    } catch (error) {
      toast.error('Failed to move to trash', error.message);
    } finally {
      setIsTrashing(false);
    }
  };
  const goToTrash = (trashEntryId) => {
    navigate(`/admin/trash?tab=Reviews&entry=${trashEntryId}`);
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
  };
}
