import { supabase } from './adminShared';
import { cacheable, invalidate } from '../lib/cacheable';
import { applyDateFilter, getRowDate } from '../lib/dateFilter';

export const mapConversation = (row) => ({
  id: row.id,
  bookingId: row.booking_id,
  serviceRequestId: row.service_request_id,
  customerId: row.customer_id,
  customerName: row.customer_name,
  customerEmail: row.customer_email,
  workerId: row.worker_id,
  workerName: row.worker_name,
  workerEmail: row.worker_email,
  messageCount: Number(row.message_count ?? 0),
  lastMessageBody: row.last_message_body,
  lastMessageSenderId: row.last_message_sender_id,
  lastMessageAt: row.last_message_at,
  created_at: row.created_at,
  updated_at: row.updated_at,
  archived_at: row.archived_at,
  disabled_at: row.disabled_at,
  disabledBy: row.disabled_by,
});

async function loadConversationsRaw({ p_search } = {}) {
  const { data, error } = await supabase.rpc(
    'admin_list_conversations',
    p_search ? { p_search } : {},
  );
  if (error) throw error;
  return (data ?? []).map(mapConversation);
}

export const loadConversations = cacheable('messages', { ttl: 60_000 }, loadConversationsRaw);

export async function loadConversationMessages(conversationId) {
  const { data, error } = await supabase.rpc('admin_get_conversation_messages', {
    p_conversation_id: conversationId,
  });
  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: row.id,
    conversationId: row.conversation_id,
    senderId: row.sender_id,
    senderName: row.sender_name,
    senderRole: row.sender_role,
    body: row.body,
    createdAt: row.created_at,
    attachmentCount: Number(row.attachment_count ?? 0),
  }));
}

async function loadConversationsPageRaw({
  search = '',
  status = 'All',
  sort = 'newest',
  field = 'created',
  dateRange = null,
  page = 1,
  pageSize = 10,
} = {}) {
  const term = search.trim().toLowerCase();
  const rows = await loadConversations(term ? { p_search: term } : {});
  const matched = rows.filter((row) => {
    const isDisabled = Boolean(row.disabled_at);
    if (status === 'Active' && isDisabled) return false;
    if (status === 'Disabled' && !isDisabled) return false;
    if (status === 'Archived' && !row.archived_at) return false;
    if (status === 'Unarchived' && row.archived_at) return false;
    return true;
  });
  const ordered = applyDateFilter(matched, {
    field,
    range: dateRange,
    sort,
    getDate: (row) => getRowDate(row, field) ?? getRowDate(row, 'created'),
  });
  const stats = {
    total: rows.length,
    active: rows.filter((row) => !row.disabled_at && !row.archived_at).length,
    disabled: rows.filter((row) => row.disabled_at).length,
    archived: rows.filter((row) => row.archived_at).length,
    messages: rows.reduce((sum, row) => sum + row.messageCount, 0),
  };
  return {
    rows: ordered.slice((page - 1) * pageSize, page * pageSize),
    count: ordered.length,
    stats,
  };
}

export const loadConversationsPage = cacheable(
  'messages',
  { ttl: 60_000 },
  loadConversationsPageRaw,
);

export async function toggleConversationModeration(conversationId, disabled) {
  const { data, error } = await supabase.rpc('admin_toggle_conversation_moderation', {
    p_conversation_id: conversationId,
    p_disabled: disabled,
  });
  if (error) throw error;
  invalidate('messages');
  return data;
}

export async function deleteConversation(conversationId) {
  const { data, error } = await supabase.rpc('admin_delete_conversation', {
    p_conversation_id: conversationId,
  });
  if (error) throw error;
  invalidate('messages');
  return data;
}
