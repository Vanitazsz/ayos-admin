import {
  deleteConversation,
  loadConversationMessages,
  loadConversationsPage,
  toggleConversationModeration,
} from '../logic/MessagesPageLogic';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Ban, Inbox, MessageCircle, MessageSquare } from 'lucide-react';
import { subscribe } from '../../../services/realtime';
import { useServerPagination } from '../../../hooks/useServerPagination';
import { useDebouncedValue } from '../../../hooks/useDebouncedValue';
import { useDateFilter } from '../../../hooks/useDateFilter';
import { useToast } from '../../../context/ToastContext';
import { useAuth } from '../../../context/AuthContext';

export function useMessagesPageController() {
  const toast = useToast();
  const { user } = useAuth();
  const canManage = user?.permissions?.includes('messages.manage') ?? false;

  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebouncedValue(searchTerm);
  const [filterStatus, setFilterStatus] = useState('All');
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [isThreadOpen, setIsThreadOpen] = useState(false);
  const [threadMessages, setThreadMessages] = useState([]);
  const [isThreadLoading, setIsThreadLoading] = useState(false);
  const [confirm, setConfirm] = useState({
    isOpen: false,
    title: '',
    message: '',
    confirmLabel: 'Confirm',
    variant: 'danger',
    requireTypedText: null,
    onConfirm: () => {},
  });

  const closeConfirm = useCallback(
    () => setConfirm((s) => ({ ...s, isOpen: false })),
    [],
  );

  const dateFilter = useDateFilter({ canModify: true });

  const fetchConversations = useCallback(
    ({ page, pageSize }) =>
      loadConversationsPage({
        search: debouncedSearch,
        status: filterStatus,
        sort: dateFilter.sort,
        field: dateFilter.field,
        dateRange: dateFilter.effectiveRange,
        page,
        pageSize,
      }),
    [debouncedSearch, filterStatus, dateFilter],
  );

  const filterKey = `${filterStatus}|${dateFilter.sort}|${dateFilter.field}|${dateFilter.preset}|${dateFilter.customRange.from}|${dateFilter.customRange.to}`;

  const {
    rows: conversations,
    count,
    meta,
    error,
    isLoading,
    refresh,
    currentPage,
    setCurrentPage,
    totalPages,
  } = useServerPagination({ fetchPage: fetchConversations, filterKey });

  const refreshRef = useRef(refresh);
  refreshRef.current = refresh;
  const isThreadOpenRef = useRef(isThreadOpen);
  isThreadOpenRef.current = isThreadOpen;
  const selectedIdRef = useRef(selectedConversation?.id);
  selectedIdRef.current = selectedConversation?.id;

  useEffect(() => {
    const stops = ['conversations', 'messages'].map((table) =>
      subscribe(table, () => {
        void refreshRef.current();
        if (isThreadOpenRef.current && selectedIdRef.current) {
          loadConversationMessages(selectedIdRef.current)
            .then(setThreadMessages)
            .catch(() => {});
        }
      }),
    );
    return () => stops.forEach((stop) => stop());
  }, []);

  const stats = useMemo(() => {
    const s = meta?.stats;
    return [
      { label: 'Active', value: s?.active ?? 0, icon: MessageCircle },
      { label: 'Disabled', value: s?.disabled ?? 0, icon: Ban },
      { label: 'Archived', value: s?.archived ?? 0, icon: Inbox },
      { label: 'Messages', value: s?.messages ?? 0, icon: MessageSquare },
    ];
  }, [meta]);

  const handleViewThread = useCallback(
    async (conversation) => {
      setSelectedConversation(conversation);
      setIsThreadOpen(true);
      setIsThreadLoading(true);
      setThreadMessages([]);
      try {
        const messages = await loadConversationMessages(conversation.id);
        setThreadMessages(messages);
      } catch (err) {
        toast.error('Failed to load thread', err.message);
      } finally {
        setIsThreadLoading(false);
      }
    },
    [toast],
  );

  const handleToggle = useCallback(
    (conversation) => {
      const willDisable = !conversation.disabled_at;
      setConfirm({
        isOpen: true,
        title: willDisable ? 'Disable Conversation' : 'Re-enable Conversation',
        message: willDisable
          ? `Disable this conversation between ${conversation.customerName} and ${conversation.workerName || 'the worker'}? Neither party will be able to send messages in this thread until you re-enable it.`
          : `Re-enable this conversation? ${conversation.customerName} and ${conversation.workerName || 'the worker'} will be able to message each other again.`,
        confirmLabel: willDisable ? 'Disable' : 'Re-enable',
        variant: willDisable ? 'danger' : 'primary',
        requireTypedText: null,
        onConfirm: async () => {
          try {
            await toggleConversationModeration(conversation.id, willDisable);
            toast.success(
              willDisable ? 'Conversation disabled' : 'Conversation re-enabled',
            );
            await refresh();
            setSelectedConversation((prev) =>
              prev?.id === conversation.id
                ? {
                    ...prev,
                    disabled_at: willDisable ? new Date().toISOString() : null,
                    disabledBy: willDisable ? user?.id : null,
                  }
                : prev,
            );
          } catch (err) {
            toast.error('Action failed', err.message);
          }
        },
      });
    },
    [refresh, toast, user?.id],
  );

  const handleDelete = useCallback(
    (conversation) => {
      setConfirm({
        isOpen: true,
        title: 'Delete Conversation',
        message: `Permanently delete the conversation between ${conversation.customerName} and ${conversation.workerName || 'the worker'}? This removes the thread and all ${conversation.messageCount} message(s). This cannot be undone.`,
        confirmLabel: 'Delete',
        variant: 'danger',
        requireTypedText: 'DELETE',
        onConfirm: async () => {
          try {
            await deleteConversation(conversation.id);
            toast.success('Conversation deleted');
            await refresh();
            if (selectedConversation?.id === conversation.id) {
              setIsThreadOpen(false);
              setSelectedConversation(null);
            }
          } catch (err) {
            toast.error('Delete failed', err.message);
          }
        },
      });
    },
    [refresh, toast, selectedConversation],
  );

  return {
    isLoading,
    error,
    searchTerm,
    setSearchTerm,
    filterStatus,
    setFilterStatus,
    dateFilter,
    currentPage,
    setCurrentPage,
    conversations,
    count,
    totalPages,
    stats,
    canManage,
    selectedConversation,
    isThreadOpen,
    setIsThreadOpen,
    threadMessages,
    isThreadLoading,
    confirm,
    closeConfirm,
    handleViewThread,
    handleToggle,
    handleDelete,
  };
}
