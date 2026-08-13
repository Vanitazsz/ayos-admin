import { supabase, status } from './adminShared';
import { cacheable, invalidate } from '../lib/cacheable';

export const REPORT_TYPES = [
  {
    code: 'FINANCIAL',
    label: 'Financial Summary',
    description: 'Revenue, commission and payouts by period.',
  },
  {
    code: 'WORKERS',
    label: 'Worker Performance',
    description: 'Completed bookings, revenue, payouts and ratings per worker.',
  },
  {
    code: 'CUSTOMERS',
    label: 'Customer Activity',
    description: 'Bookings, spend and repeat behaviour per customer.',
  },
  {
    code: 'SERVICES',
    label: 'Service Popularity',
    description: 'Requests, completion rate and revenue by service category.',
  },
];

const typeLabel = (code) =>
  REPORT_TYPES.find((t) => t.code === code)?.label ?? status(code);

const mapExportRow = (row) => {
  const params = row.parameters ?? {};
  const hasRange = Boolean(params.from || params.to);
  return {
    id: row.id,
    name: typeLabel(row.report_type),
    type: row.report_type,
    typeLabel: typeLabel(row.report_type),
    format: params.format ?? '',
    range: hasRange
      ? `${params.from ? new Date(params.from).toLocaleDateString() : 'Start'} – ${params.to ? new Date(params.to).toLocaleDateString() : 'Now'}`
      : 'All time',
    requestedBy: row.requester_name ?? 'Unknown',
    statusKey: row.status, // 'completed' | 'processing' | 'pending' | 'failed'
    status: status(row.status), // display casing
    createdAt: row.created_at ? new Date(row.created_at).toLocaleString() : '',
    storagePath: row.storage_path,
    failureReason: row.failure_reason,
  };
};

const toIso = (value) => {
  if (value == null || value === '') return null;
  return value instanceof Date ? value.toISOString() : String(value);
};

const loadReportPageCached = cacheable(
  'reports',
  { ttl: 30_000, persist: false },
  async ({
    page = 1,
    pageSize = 10,
    type = null,
    from = null,
    to = null,
    query = '',
    sort = 'newest',
  } = {}) => {
    const { data, error } = await supabase.rpc('admin_report_exports_page', {
      p_page: page,
      p_page_size: pageSize,
      p_type: type || null,
      p_from: toIso(from),
      p_to: toIso(to),
      p_query: query || null,
      p_sort: sort,
    });
    if (error) throw error;
    const payload = data ?? {};
    return {
      rows: (payload.rows ?? []).map(mapExportRow),
      count: Number(payload.total ?? 0),
    };
  },
);

export const loadReportPage = (args = {}) =>
  loadReportPageCached({ ...args, from: toIso(args.from), to: toIso(args.to) });

export const loadReportStats = cacheable(
  'reports',
  { ttl: 30_000, persist: false },
  async () => {
    const { data, error } = await supabase.rpc('admin_report_stats');
    if (error) throw error;
    const payload = data ?? {};
    return {
      total: Number(payload.total ?? 0),
      completed: Number(payload.completed ?? 0),
      processing: Number(payload.processing ?? 0),
      failed: Number(payload.failed ?? 0),
    };
  },
);

export async function generateReport(reportType = 'FINANCIAL', format = 'PDF', range = {}) {
  const { data, error } = await supabase.functions.invoke('report-export', {
    body: {
      reportType,
      format,
      from: range.from ? new Date(range.from).toISOString() : null,
      to: range.to ? new Date(range.to).toISOString() : null,
    },
  });
  if (error) throw error;
  invalidate('reports');
  return data ?? {};
}

export async function moveReportToTrash(id) {
  const { error } = await supabase.rpc('admin_move_report_export_to_trash', {
    p_report_id: id,
  });
  if (error) throw error;
  invalidate('reports');
  invalidate('trash');
}

export async function downloadReport(path) {
  const { data, error } = await supabase.storage
    .from('report-exports')
    .createSignedUrl(path, 60);
  if (error) throw error;
  return data.signedUrl;
}
