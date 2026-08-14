import React from 'react';
import { AlertCircle } from 'lucide-react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { useAccountDeletion } from '../../hooks/useAccountDeletion';

const AccountDeleteModal = ({ account, onClose, onDeleted, onDelete }) => {
  const {
    confirmation,
    confirmDelete,
    error,
    isDeleting,
    isLoading,
    matches,
    preview,
    setConfirmation,
  } = useAccountDeletion({ account, onClose, onDeleted, onDelete });

  return (
    <Modal
      isOpen={Boolean(account)}
      onClose={isDeleting ? () => {} : onClose}
      title="Permanently delete account"
    >
      <div className="space-y-4">
        <div className="flex gap-3 rounded-lg border border-destructive/30 bg-destructive/10 p-4">
          <AlertCircle className="mt-0.5 shrink-0 text-destructive" size={22} />
          <div>
            <p className="font-semibold text-destructive">This action cannot be undone.</p>
            <p className="mt-1 text-sm text-destructive-600 dark:text-destructive-400">
              Deleting {account?.name ?? account?.email} also removes all related marketplace
              history, including records shared with other users.
            </p>
          </div>
        </div>

        {isLoading && <p className="text-sm text-foreground-lighter">Calculating deletion impact…</p>}
        {preview && (
          <div className="rounded-lg border border-border p-4 text-sm">
            <p className="font-semibold text-foreground">
              {preview.totalRows.toLocaleString()} database rows and{' '}
              {preview.storageFiles.toLocaleString()} files will be removed.
            </p>
            <div className="mt-3 grid max-h-36 grid-cols-2 gap-x-4 gap-y-1 overflow-y-auto text-foreground-light">
              {preview.tables.map((entry) => (
                <div key={entry.table} className="flex justify-between gap-2">
                  <span className="truncate">{entry.table}</span>
                  <span>{entry.count.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <label className="block text-sm font-medium text-foreground-light">
          Type <span className="font-semibold text-foreground">{account?.email}</span> to confirm
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
            onClick={() => void confirmDelete()}
            disabled={!matches || !preview || isDeleting}
            isLoading={isDeleting}
            loadingText="Deleting…"
          >
            Delete permanently
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default AccountDeleteModal;
