import { useEffect, useMemo, useState } from 'react';

import { deleteAccount, previewAccountPurge } from '../services/accounts';

const errorMessage = (error) =>
  error instanceof Error
    ? error.message
    : [error?.message, error?.details, error?.hint, error?.code].filter(Boolean).join(' | ') ||
      'Unable to permanently delete account.';

const isAccountGone = (error) =>
  error?.code === 'P0002' && /ACCOUNT_NOT_FOUND/.test(error?.message ?? '');

export function useAccountDeletion({ account, onClose, onDeleted, onDelete }) {
  const [preview, setPreview] = useState(null);
  const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const matches = useMemo(
    () => confirmation.trim().toLowerCase() === account?.email?.trim().toLowerCase(),
    [account?.email, confirmation],
  );

  const accountId = account?.id;

  useEffect(() => {
    if (!accountId) return;
    let cancelled = false;
    setPreview(null);
    setConfirmation('');
    setError('');
    setIsLoading(true);
    void previewAccountPurge(accountId)
      .then((value) => {
        if (!cancelled) setPreview(value);
      })
      .catch((loadError) => {
        if (cancelled) return;
        if (isAccountGone(loadError)) {
          setError('This account no longer exists and may have already been deleted.');
        } else {
          setError(errorMessage(loadError));
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [accountId]);

  const confirmDelete = async () => {
    if (!account || !matches || !preview) return;
    setIsDeleting(true);
    setError('');
    try {
      const performDelete = onDelete ?? deleteAccount;
      await performDelete(account.id, confirmation);
      await onDeleted(account);
      onClose();
    } catch (deleteError) {
      setError(errorMessage(deleteError));
    } finally {
      setIsDeleting(false);
    }
  };

  return {
    confirmation,
    confirmDelete,
    error,
    isDeleting,
    isLoading,
    matches,
    preview,
    setConfirmation,
  };
}
