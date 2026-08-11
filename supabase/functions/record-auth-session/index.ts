import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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
  const { data, error: userError } = await userClient.auth.getUser();
  if (userError || !data.user) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  const ipAddress = (req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? '')
    .split(',')[0]
    .trim();
  const userAgent = req.headers.get('user-agent') ?? '';

  const adminClient = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error: insertError } = await adminClient.from('authentication_events').insert({
    account_id: data.user.id,
    ip_address: looksLikeIp(ipAddress) ? ipAddress : null,
    user_agent: userAgent || null,
    event_type: 'sign_in',
  });
  if (insertError) {
    return json({ error: insertError.message }, { status: 500 });
  }

  return json({ ok: true });
});

function looksLikeIp(value: string): boolean {
  if (!value) return false;
  if (/^(\d{1,3}\.){3}\d{1,3}$/.test(value)) {
    return value.split('.').every((part) => Number(part) <= 255);
  }
  return value.includes(':') && /^[0-9a-fA-F:.]+$/.test(value);
}

function json(body: unknown, init?: ResponseInit): Response {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: { 'Content-Type': 'application/json', ...corsHeaders, ...init?.headers },
  });
}
