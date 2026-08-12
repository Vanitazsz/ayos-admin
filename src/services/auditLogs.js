import { supabase } from '../lib/supabase';
import { cacheable } from '../lib/cacheable';
import { describeUserAgent } from './profileData';

const status = (value) =>
  String(value ?? '')
    .toLowerCase()
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

export const loadAuditLogs = cacheable('audit-logs', { ttl: 30_000 }, async () => {
  const { data, error } = await supabase.rpc('admin_list_audit_logs', {
    p_limit: 500,
  });
  if (error) throw error;
  return (data ?? []).map((row) => {
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
  });
});
