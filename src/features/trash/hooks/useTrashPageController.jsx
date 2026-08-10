import {
  TRASH_TABS,
  loadTrash,
  permanentlyDeleteTrash,
  restoreTrash,
  restoreAccountFromTrash,
  restoreIndustryFromTrash,
  restoreSkillFromTrash,
  hardDeleteAccountFromTrash,
  hardDeleteIndustryFromTrash,
  hardDeleteSkillFromTrash,
} from '../logic/TrashPageLogic';
import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useDataFetch } from '../../../hooks/useDataFetch';
import { useRealtime } from '../../../hooks/useRealtime';
import { useToast } from '../../../context/ToastContext';
import { usePagination } from '../../../hooks/usePagination';
const tabs = TRASH_TABS;
export function useTrashPageController() {
  const toast = useToast();
  const [searchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const entryParam = searchParams.get('entry');
  const [activeTab, setActiveTab] = useState(() =>
    tabParam && TRASH_TABS.includes(tabParam) ? tabParam : 'Users',
  );
  const targetEntryId = entryParam;
  const { data: raw, isLoading, error, refresh } = useDataFetch(loadTrash, []);
  useRealtime('trash_entries', refresh);
  const items = raw ?? Object.fromEntries(tabs.map((tab) => [tab, []]));
  const [searchTerm, setSearchTerm] = useState('');
  const [accountToDelete, setAccountToDelete] = useState(null);
  const [confirm, setConfirm] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  const currentItems = items[activeTab];
  const filteredItems = currentItems.filter(
    (item) =>
      item.item.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.id.toLowerCase().includes(searchTerm.toLowerCase()),
  );
  const {
    currentPage,
    setCurrentPage,
    totalPages,
    pageData: paginatedItems,
  } = usePagination(filteredItems, 10);

  const targetHandled = useRef(false);
  useEffect(() => {
    if (!targetEntryId || targetHandled.current) return;
    const idx = (items[activeTab] ?? []).findIndex(
      (item) => item.id === targetEntryId,
    );
    if (idx === -1) return;
    targetHandled.current = true;
    setSearchTerm('');
    setCurrentPage(Math.floor(idx / 10) + 1);
  }, [items, activeTab, targetEntryId, setCurrentPage, setSearchTerm]);

  const restoreItem = async (item) => {
    if (item.type === 'Industry') await restoreIndustryFromTrash(item.id);
    else if (item.type === 'Skill') await restoreSkillFromTrash(item.id);
    else if (item.type === 'User' || item.type === 'Worker')
      await restoreAccountFromTrash(item.id);
    else await restoreTrash(item.id);
  };

  const deleteItem = async (item) => {
    if (item.type === 'Industry') await hardDeleteIndustryFromTrash(item.id, true);
    else if (item.type === 'Skill') await hardDeleteSkillFromTrash(item.id);
    else if (item.type === 'User' || item.type === 'Worker')
      await hardDeleteAccountFromTrash(item.id, item.email);
    else await permanentlyDeleteTrash(item.id, item.entityId);
  };

  const handleRestore = (item) => {
    setConfirm({
      isOpen: true,
      title: 'Restore Item',
      message: 'Restore this item?',
      onConfirm: async () => {
        try {
          await restoreItem(item);
          await refresh();
        } catch (error) {
          toast.error('Restore failed', error.message);
        }
      },
    });
  };
  const handleDeleteAccountFromTrash = async (_accountId, confirmation) => {
    if (!accountToDelete) throw new Error('No account selected.');
    await hardDeleteAccountFromTrash(accountToDelete.trashId, confirmation);
    await refresh();
  };
  const handlePermanentDelete = (item) => {
    if (item.type === 'User' || item.type === 'Worker') {
      if (!item.email) {
        toast.error('Delete failed', 'Account email not found.');
        return;
      }
      setAccountToDelete({
        id: item.entityId,
        trashId: item.id,
        name: item.item,
        email: item.email,
      });
      return;
    }
    const permanent =
      item.type === 'Industry' || item.type === 'Skill'
        ? `Permanently delete "${item.item}" and ALL data tied to it (service requests, bookings, payments, receipts, reviews, wallet transactions)? This CANNOT be undone.`
        : 'Permanently delete this item? This CANNOT be undone.';
    setConfirm({
      isOpen: true,
      title: 'Permanently Delete',
      message: permanent,
      requireTypedText: 'DELETE',
      industrySkillCount: item.type === 'Industry' ? item.skillCount : undefined,
      onConfirm: async () => {
        try {
          await deleteItem(item);
          await refresh();
        } catch (error) {
          toast.error('Delete failed', error.message);
        }
      },
    });
  };
  const handleRestoreAll = async () => {
    setConfirm({
      isOpen: true,
      title: 'Restore All',
      message: `Restore all ${filteredItems.length} items?`,
      onConfirm: async () => {
        try {
          for (const item of filteredItems) await restoreItem(item);
          await refresh();
        } catch (error) {
          toast.error('Restore failed', error.message);
        }
      },
    });
  };
  const handleEmptyTrash = async () => {
    setConfirm({
      isOpen: true,
      title: 'Empty Trash',
      message: `Permanently delete all ${filteredItems.length} items in ${activeTab} trash? This CANNOT be undone.`,
      requireTypedText: 'DELETE',
      onConfirm: async () => {
        try {
          for (const item of filteredItems) await deleteItem(item);
          await refresh();
        } catch (error) {
          toast.error('Delete failed', error.message);
        }
      },
    });
  };
  const closeConfirm = () => setConfirm((s) => ({ ...s, isOpen: false }));
  return {
    activeTab,
    setActiveTab,
    isLoading,
    error,
    items,
    searchTerm,
    setSearchTerm,
    currentPage,
    setCurrentPage,
    confirm,
    filteredItems,
    totalPages,
    paginatedItems,
    targetEntryId,
    handleRestore,
    handlePermanentDelete,
    handleRestoreAll,
    handleEmptyTrash,
    closeConfirm,
    accountToDelete,
    setAccountToDelete,
    handleDeleteAccountFromTrash,
  };
}
