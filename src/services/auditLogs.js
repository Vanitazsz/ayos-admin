import { supabase } from '../lib/supabase';
import { cacheable } from '../lib/cacheable';
import { describeUserAgent } from './profileData';

const status = (value) =>
  String(value ?? '')
    .toLowerCase()
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

const mapLogRow = (row) => {
  const agent = describeUserAgent(row.user_agent);
  return {
    id: row.id,
    timestamp: new Date(row.created_at).toLocaleString(),
    created_at: row.created_at,
    admin: row.admin_name ?? '',
    action: status(row.action),
    module: row.entity_type ?? '',
    target: row.entity_id ?? '',
    status: row.metadata?.status ? status(row.metadata.status) : '',
    device: agent.device,
    browser: agent.browser,
    isMobile: agent.mobile,
    ip: row.ip_address ?? '',
    metadata: row.metadata,
  };
};

export const loadAuditLogPage = cacheable(
  'audit-logs',
  { ttl: 30_000 },
  async ({
    page = 1,
    pageSize = 12,
    from = null,
    to = null,
    search = '',
    module = null,
    actorId = null,
  } = {}) => {
    const { data, error } = await supabase.rpc('admin_list_audit_logs_page', {
      p_page: page,
      p_page_size: pageSize,
      p_from: from ?? null,
      p_to: to ?? null,
      p_search: search?.trim() || null,
      p_module: module ?? null,
      p_actor_id: actorId ?? null,
    });
    if (error) throw error;
    const rows = data ?? [];
    return {
      rows: rows.map(mapLogRow),
      count: Number(rows[0]?.total_count ?? 0),
    };
  },
);

export const loadAuditStats = cacheable(
  'audit-logs',
  { ttl: 30_000, key: 'stats' },
  async () => {
    const { data, error } = await supabase.rpc('admin_audit_logs_stats', {
      p_from: null,
      p_to: null,
    });
    if (error) throw error;
    const [row] = data ?? [];
    return {
      recentActivities: Number(row?.recent_activities ?? 0),
      failed: Number(row?.failed ?? 0),
      critical: Number(row?.critical ?? 0),
    };
  },
);


