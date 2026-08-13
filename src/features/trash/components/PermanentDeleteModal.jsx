import { useState } from 'react';
import { ShieldAlert } from 'lucide-react';
import Modal from '../../../components/ui/Modal';
import Button from '../../../components/ui/Button';

const IMPACT = {
  Booking: 'the linked service request, payments, refunds, receipts, conversations, wallet transactions, and all related records.',
  Payment: 'its refunds, receipts, and all related records.',
  Conversation: 'its message thread, attachments, translations, and participant records.',
  'Booking Proof': "its proof photos and the worker's rating/comment on the booking.",
};

const TITLES = {
  Booking: 'Permanently delete booking',
  Payment: 'Permanently delete payment',
  Conversation: 'Permanently delete conversation',
  'Booking Proof': 'Permanently delete proof of work',
};

const PermanentDeleteModal = ({ item, onClose, onDelete, onDeleted }) => {
  const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const shortCode = item?.entityId?.slice(0, 8);
  const matches =
    confirmation.trim().toLowerCase() === String(shortCode ?? '').toLowerCase();

  const handleConfirm = async () => {
    if (!item || !matches || isDeleting) return;
    setIsDeleting(true);
    setError('');
    try {
      await onDelete(item);
      onDeleted?.();
      onClose?.();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Unable to permanently delete item.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Modal
      isOpen={Boolean(item)}
      onClose={isDeleting ? () => {} : onClose}
      title={TITLES[item?.type] ?? 'Permanently delete item'}
    >
      <div className="space-y-4">
        <div className="flex gap-3 rounded-lg border border-destructive/30 bg-destructive/10 p-4">
          <ShieldAlert className="mt-0.5 shrink-0 text-destructive" size={22} />
          <div>
            <p className="font-semibold text-destructive">This action cannot be undone.</p>
            <p className="mt-1 text-sm text-destructive-600 dark:text-destructive-400">
              Permanently deleting <span className="font-semibold">{item?.item}</span> also
              removes {IMPACT[item?.type]}
            </p>
          </div>
        </div>

        <label className="block text-sm font-medium text-foreground-light">
          Type{' '}
          <span className="font-mono font-semibold text-foreground">
            {shortCode}
          </span>{' '}
          to confirm
          <input
            value={confirmation}
            onChange={(event) => setConfirmation(event.target.value)}
            disabled={isDeleting}
            autoComplete="off"
            className="mt-2 w-full rounded-lg border border-border-strong px-3 py-2 outline-none focus:border-destructive focus:ring-2 focus:ring-destructive/25"
          />
        </label>

        {error && <p className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}

        <div className="flex gap-3">
          <Button
            type="button"
            variant="default"
            className="flex-1"
            onClick={onClose}
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="danger"
            className="flex-1"
            disabled={!matches || isDeleting}
            isLoading={isDeleting}
            loadingText="Deleting…"
            onClick={() => void handleConfirm()}
          >
            Delete permanently
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default PermanentDeleteModal;
