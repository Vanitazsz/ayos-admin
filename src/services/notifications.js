import { supabase, status } from './adminShared';
import { cacheable, invalidate } from '../lib/cacheable';

async function fetchCampaignStats(campaignIds) {
  if (!campaignIds.length) return new Map();
  const { data, error } = await supabase.rpc(
    'admin_get_notification_campaign_stats',
    { p_campaign_ids: campaignIds },
  );
  if (!error) {
    return new Map((data ?? []).map((row) => [row.notification_id, row]));
  }
  if (error.code !== 'PGRST202' && error.code !== '404') throw error;
  const { data: deliveries, error: fallbackError } = await supabase
    .from('notification_deliveries')
    .select('notification_id,read_at')
    .in('notification_id', campaignIds);
  if (fallbackError) throw fallbackError;
  const totals = new Map();
  for (const delivery of deliveries ?? []) {
    const entry = totals.get(delivery.notification_id) ?? { total: 0, read: 0 };
    entry.total += 1;
    if (delivery.read_at) entry.read += 1;
    totals.set(delivery.notification_id, entry);
  }
  return totals;
}

export const loadNotifications = cacheable('notifications', { ttl: 60_000 }, async () => {
  const { data, error } = await supabase
    .from('notification_campaigns')
    .select('id,title,body,audience,status,created_at,updated_at,sent_at')
    .is('deleted_at', null)
    .order('created_at', { ascending: false });
  if (error) throw error;
  const rows = data ?? [];
  const statsById = await fetchCampaignStats(rows.map((row) => row.id));
  return rows.map((row) => {
    const stats = statsById.get(row.id);
    const total = Number(stats?.total ?? 0);
    const read = Number(stats?.read ?? 0);
    return {
      id: row.id,
      title: row.title,
      message: row.body,
      audience: status(row.audience),
      audienceValue: row.audience,
      status: status(row.status),
      date: new Date(row.created_at).toLocaleDateString(),
      openRate: total ? `${Math.round((read / total) * 100)}%` : '0%',
      created_at: row.created_at,
      updated_at: row.updated_at ?? null,
      sent_at: row.sent_at ?? null,
    };
  });
});

export async function createCampaign(input) {
  const { data, error } = await supabase.rpc('admin_create_notification_draft', {
    p_title: input.title,
    p_body: input.message,
    p_audience: input.audience,
  });
  if (error) throw error;
  invalidate('notifications');
  return data;
}

export async function updateCampaign(id, input) {
  const { data, error } = await supabase.rpc('admin_update_notification_draft', {
    p_campaign_id: id,
    p_title: input.title,
    p_body: input.message,
    p_audience: input.audience,
  });
  if (error) throw error;
  invalidate('notifications');
  return data;
}

export async function deleteCampaign(id) {
  const { error } = await supabase.rpc('admin_archive_notification', { p_notification_id: id });
  if (error) throw error;
  invalidate('notifications');
}

export async function publishCampaign(id) {
  const { data, error } = await supabase.rpc('admin_publish_campaign', { p_campaign_id: id });
  if (error) throw error;
  invalidate('notifications');
  invalidate('dashboard');
  return data;
}
