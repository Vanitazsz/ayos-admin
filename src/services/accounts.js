import { supabase } from './adminShared';
import { invalidate } from '../lib/cacheable';

export async function deleteAccount(id, email) {
  const { error } = await supabase.rpc('admin_delete_account', {
    p_account_id: id,
    p_confirmation_email: email,
  });
  if (error) throw error;
  invalidate('users');
  invalidate('workers');
  invalidate('trash');
}

export async function previewAccountPurge(id) {
  const { data, error } = await supabase.rpc('admin_preview_account_purge', {
    p_account_id: id,
  });
  if (error) throw error;
  return {
    totalRows: Number(data?.total_rows ?? 0),
    storageFiles: Number(data?.storage_files ?? 0),
    tables: Object.entries(data?.tables ?? {})
      .map(([table, count]) => ({ table, count: Number(count) }))
      .sort((left, right) => right.count - left.count || left.table.localeCompare(right.table)),
  };
}

export async function setAccountStatus(id, nextStatus) {
  const { data, error } = await supabase.rpc('set_account_status', {
    account_id: id,
    next_status: nextStatus,
  });
  if (error) throw error;
  invalidate('users');
  invalidate('workers');
  invalidate('team');
  return data;
}

export async function bulkSetAccountStatus(ids, nextStatus) {
  const { data, error } = await supabase.rpc('admin_bulk_set_account_status', {
    p_account_ids: ids,
    p_next_status: nextStatus,
  });
  if (error) throw error;
  invalidate('users');
  invalidate('workers');
  invalidate('team');
  return Number(data ?? 0);
}

export async function bulkSetWorkerStatus(ids, nextStatus) {
  const { data, error } = await supabase.rpc('admin_bulk_set_worker_status', {
    p_account_ids: ids,
    p_next_status: nextStatus,
  });
  if (error) throw error;
  invalidate('workers');
  return Number(data ?? 0);
}

export async function softDeleteAccount(id) {
  const { data, error } = await supabase.rpc('admin_move_account_to_trash', {
    p_account_id: id,
  });
  if (error) throw error;
  invalidate('users');
  invalidate('workers');
  invalidate('trash');
  return data;
}

export async function restoreAccountFromTrash(trashId) {
  const { data, error } = await supabase.rpc('admin_restore_account_from_trash', {
    p_trash_id: trashId,
  });
  if (error) throw error;
  invalidate('users');
  invalidate('workers');
  invalidate('trash');
  return data;
}
