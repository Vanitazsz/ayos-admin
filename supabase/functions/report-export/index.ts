import { createClient } from 'npm:@supabase/supabase-js@2';
import * as XLSX from 'npm:xlsx@0.18.5';
import PDFDocument from 'npm:pdfkit@0.15.0';

const REPORT_TYPES = ['FINANCIAL', 'WORKERS', 'CUSTOMERS', 'SERVICES'] as const;
type ReportType = (typeof REPORT_TYPES)[number];
type Format = 'PDF' | 'CSV' | 'XLSX';

const REPORT_LABELS: Record<ReportType, string> = {
  FINANCIAL: 'Financial Summary',
  WORKERS: 'Worker Performance',
  CUSTOMERS: 'Customer Activity',
  SERVICES: 'Service Popularity',
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Dataset {
  title: string;
  subtitle: string;
  columns: string[];
  rows: (string | number)[][];
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const url = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !anonKey || !serviceRoleKey) {
    return json({ error: 'Function not configured' }, { status: 500 });
  }

  const authHeader = req.headers.get('Authorization') ?? '';
  if (!authHeader) {
    return json({ error: 'Missing Authorization header' }, { status: 401 });
  }

  const userClient = createClient(url, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  const { data: userData, error: userError } = await userClient.auth.getUser(token);
  if (userError || !userData.user) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  const adminClient = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: caller, error: callerError } = await adminClient
    .from('accounts')
    .select('id,status')
    .eq('id', userData.user.id)
    .single();
  if (callerError || !caller || caller.status !== 'ACTIVE') {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: callerPerms, error: permError } = await userClient.rpc(
    'admin_get_my_permissions',
  );
  if (permError || !(callerPerms ?? []).includes('reports.view')) {
    return json({ error: 'Forbidden: reports.view permission required' }, { status: 403 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const reportType = String(body.reportType ?? '').toUpperCase() as ReportType;
  const format = String(body.format ?? 'PDF').toUpperCase() as Format;
  if (!REPORT_TYPES.includes(reportType)) {
    return json({ error: 'UNSUPPORTED_REPORT_TYPE' }, { status: 400 });
  }
  if (!['PDF', 'CSV', 'XLSX'].includes(format)) {
    return json({ error: 'UNSUPPORTED_FORMAT' }, { status: 400 });
  }
  const from = normalizeDate(body.from);
  const to = normalizeDate(body.to);
  if (from && to && from > to) {
    return json({ error: 'INVALID_RANGE' }, { status: 400 });
  }
  const rpcArgs = from || to ? { p_from: from ?? null, p_to: to ?? null } : {};

  const { data: existing } = await adminClient
    .from('report_exports')
    .select('id')
    .eq('report_type', reportType)
    .eq('requested_by', userData.user.id)
    .is('deleted_at', null)
    .in('status', ['pending', 'processing'])
    .limit(1)
    .maybeSingle();
  if (existing) {
    return json({ ok: true, id: existing.id, status: 'processing', duplicate: true });
  }

  const { data: inserted, error: insertError } = await adminClient
    .from('report_exports')
    .insert({
      report_type: reportType,
      parameters: { format, from, to },
      status: 'processing',
      requested_by: userData.user.id,
    })
    .select('id')
    .single();
  if (insertError) {
    return json({ error: insertError.message }, { status: 500 });
  }
  const exportId = inserted.id;

  const fail = async (reason: string) => {
    await adminClient
      .from('report_exports')
      .update({
        status: 'failed',
        failure_reason: reason,
        completed_at: new Date().toISOString(),
      })
      .eq('id', exportId);
    return json({ error: reason }, { status: 500 });
  };

  try {
    const dataset = await buildDataset(userClient, reportType, rpcArgs);
    const ext = format === 'PDF' ? 'pdf' : format === 'XLSX' ? 'xlsx' : 'csv';
    const fileName = `${REPORT_LABELS[reportType].replace(/\s+/g, '_')}_${Date.now()}.${ext}`;
    const path = `${userData.user.id}/${reportType}/${fileName}`;

    const { bytes, contentType } = await buildFile(dataset, format);
    const { error: uploadError } = await adminClient.storage
      .from('report-exports')
      .upload(path, bytes, { contentType, upsert: true });
    if (uploadError) {
      return await fail(uploadError.message);
    }

    await adminClient
      .from('report_exports')
      .update({
        status: 'completed',
        storage_path: path,
        completed_at: new Date().toISOString(),
      })
      .eq('id', exportId);

    return json({
      ok: true,
      id: exportId,
      status: 'completed',
      storage_path: path,
      name: fileName,
    });
  } catch (err) {
    return await fail(err instanceof Error ? err.message : String(err));
  }
});

function normalizeDate(value: unknown): string | null {
  if (value == null || value === '') return null;
  const d = new Date(String(value));
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

function rangeText(args: Record<string, unknown>): string {
  const from = args.p_from ? new Date(String(args.p_from)) : null;
  const to = args.p_to ? new Date(String(args.p_to)) : null;
  if (!from && !to) return 'Range: All time';
  const fmt = (d: Date) => d.toLocaleDateString('en-US');
  return `Range: ${from ? fmt(from) : 'start'} → ${to ? fmt(to) : 'now'}`;
}

async function runRpc(
  client: any,
  fn: string,
  args: Record<string, unknown> | undefined,
): Promise<any> {
  const { data, error } = await client.rpc(fn, args as any);
  if (error) throw new Error(error.message);
  return data;
}

async function buildDataset(
  userClient: any,
  reportType: ReportType,
  args: Record<string, unknown>,
): Promise<Dataset> {
  const label = REPORT_LABELS[reportType];
  const subtitle = `${rangeText(args)} · Generated ${new Date().toLocaleString('en-US')}`;

  if (reportType === 'FINANCIAL') {
    const seriesData = await runRpc(userClient, 'admin_revenue_series', args);
    const months = (seriesData?.month ?? []) as Array<{
      period: string;
      revenue: number;
      profit: number;
    }>;
    const columns = ['Month', 'Revenue', 'Platform Commission', 'Worker Payout'];
    const rows = months.map((m) => [
      m.period,
      round2(m.revenue),
      round2(m.profit),
      round2(Number(m.revenue) - Number(m.profit)),
    ]);
    const totalRevenue = months.reduce((acc, m) => acc + Number(m.revenue || 0), 0);
    const totalProfit = months.reduce((acc, m) => acc + Number(m.profit || 0), 0);
    rows.push([
      'TOTAL',
      round2(totalRevenue),
      round2(totalProfit),
      round2(totalRevenue - totalProfit),
    ]);
    return {
      title: label,
      subtitle,
      columns,
      rows,
    };
  }

  if (reportType === 'WORKERS') {
    const data = await runRpc(userClient, 'admin_report_workers', args);
    const rows = (data ?? []).map((r: any) => [
      r.worker_name,
      r.worker_email,
      Number(r.completed_bookings ?? 0),
      round2(r.total_revenue),
      round2(r.total_payout),
      round2(r.avg_rating),
    ]);
    return {
      title: label,
      subtitle,
      columns: ['Worker', 'Email', 'Completed Bookings', 'Total Revenue', 'Total Payout', 'Avg Rating'],
      rows,
    };
  }

  if (reportType === 'CUSTOMERS') {
    const data = await runRpc(userClient, 'admin_report_customers', args);
    const rows = (data ?? []).map((r: any) => [
      r.customer_name,
      r.customer_email,
      Number(r.total_bookings ?? 0),
      Number(r.completed_bookings ?? 0),
      round2(r.total_spend),
      Number(r.repeat_bookings ?? 0),
      round2(r.avg_rating_given),
    ]);
    return {
      title: label,
      subtitle,
      columns: ['Customer', 'Email', 'Total Bookings', 'Completed', 'Total Spend', 'Repeat Bookings', 'Avg Rating Given'],
      rows,
    };
  }

  if (reportType === 'SERVICES') {
    const data = await runRpc(userClient, 'admin_report_services', args);
    const rows = (data ?? []).map((r: any) => [
      r.category_name,
      Number(r.request_count ?? 0),
      Number(r.completed_bookings ?? 0),
      round2(r.completion_rate),
      round2(r.revenue),
    ]);
    return {
      title: label,
      subtitle,
      columns: ['Category', 'Requests', 'Completed Bookings', 'Completion Rate (%)', 'Revenue'],
      rows,
    };
  }

  throw new Error(`UNSUPPORTED_REPORT_TYPE: ${reportType}`);
}

async function buildFile(
  dataset: Dataset,
  format: Format,
): Promise<{ bytes: Uint8Array; contentType: string }> {
  if (format === 'CSV') {
    return { bytes: csv(dataset), contentType: 'text/csv' };
  }
  if (format === 'XLSX') {
    return { bytes: xlsx(dataset), contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' };
  }
  return { bytes: await pdf(dataset), contentType: 'application/pdf' };
}

function csv(dataset: Dataset): Uint8Array {
  const esc = (v: string | number) => {
    const s = String(v ?? '');
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [
    dataset.title,
    dataset.subtitle,
    '',
    dataset.columns.map(esc).join(','),
    ...dataset.rows.map((r) => r.map(esc).join(',')),
  ];
  return new TextEncoder().encode(lines.join('\n'));
}

function xlsx(dataset: Dataset): Uint8Array {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([
    [dataset.title],
    [dataset.subtitle],
    [],
    dataset.columns,
    ...dataset.rows,
  ]);
  XLSX.utils.book_append_sheet(wb, ws, 'Report');
  const out = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
  return new Uint8Array(out);
}

function pdf(dataset: Dataset): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 48 });
    const chunks: Uint8Array[] = [];
    doc.on('data', (chunk: Uint8Array) => chunks.push(chunk));
    doc.on('end', () => {
      const total = chunks.reduce((n, c) => n + c.length, 0);
      const out = new Uint8Array(total);
      let offset = 0;
      for (const chunk of chunks) {
        out.set(chunk, offset);
        offset += chunk.length;
      }
      resolve(out);
    });
    doc.on('error', reject);

    doc.fontSize(18).text(dataset.title);
    doc.moveDown(0.3);
    doc.fontSize(10).fillColor('#666666').text(dataset.subtitle).fillColor('#000000');
    doc.moveDown(0.8);

    const left = doc.page.margins.left;
    const right = doc.page.width - doc.page.margins.right;
    const colWidth = Math.min(150, (right - left) / dataset.columns.length);
    const cellOpts = { width: colWidth, height: 12, ellipsis: true, lineBreak: false } as const;

    doc.font('Helvetica-Bold').fontSize(9);
    dataset.columns.forEach((col, i) => {
      doc.text(col, left + i * colWidth, doc.y, cellOpts);
    });
    doc.moveDown(0.2);

    doc.font('Helvetica').fontSize(8.5);
    for (const row of dataset.rows) {
      if (doc.y > doc.page.height - 56) doc.addPage();
      row.forEach((cell, i) => {
        doc.text(String(cell ?? ''), left + i * colWidth, doc.y, cellOpts);
      });
      doc.y += 12;
    }
    doc.end();
  });
}

function round2(value: unknown): number {
  return Math.round(Number(value ?? 0) * 100) / 100;
}

function json(body: unknown, init?: ResponseInit): Response {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: { 'Content-Type': 'application/json', ...corsHeaders, ...init?.headers },
  });
}
