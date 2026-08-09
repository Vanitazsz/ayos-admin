import { createClient } from 'npm:@supabase/supabase-js@2';

Deno.serve(async (req) => {
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
    ip_address: ipAddress || null,
    user_agent: userAgent || null,
    event_type: 'sign_in',
  });
  if (insertError) {
    return json({ error: insertError.message }, { status: 500 });
  }

  return json({ ok: true });
});

function json(body: unknown, init?: ResponseInit): Response {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  });
}
