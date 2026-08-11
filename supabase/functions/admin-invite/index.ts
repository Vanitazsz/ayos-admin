import { createClient } from 'npm:@supabase/supabase-js@2';
import { Resend } from 'npm:resend@4';

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

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
  const resendKey = Deno.env.get('RESEND_API_KEY');
  const resendFrom = Deno.env.get('RESEND_FROM');
  if (!url || !anonKey || !serviceRoleKey) {
    return json({ error: 'Function not configured' }, { status: 500 });
  }
  if (!resendKey) {
    return json({ error: 'RESEND_API_KEY not configured' }, { status: 500 });
  }

  const authHeader = req.headers.get('Authorization') ?? '';
  if (!authHeader) {
    return json({ error: 'Missing Authorization header' }, { status: 401 });
  }

  const userClient = createClient(url, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: userData, error: userError } = await userClient.auth.getUser();
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
  if (permError || !(callerPerms ?? []).includes('team.manage')) {
    return json({ error: 'Forbidden: team.manage permission required' }, { status: 403 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const email = String(body.email ?? '').trim().toLowerCase();
  const displayName = String(body.display_name ?? '').trim();
  const adminRole = String(body.admin_role ?? 'ADMIN').toUpperCase();
  const redirectTo = String(body.redirect_to ?? '').trim();

  if (!EMAIL_RE.test(email)) {
    return json({ error: 'INVALID_EMAIL' }, { status: 400 });
  }
  if (displayName.length < 2 || displayName.length > 120) {
    return json({ error: 'INVALID_DISPLAY_NAME' }, { status: 400 });
  }
  if (!redirectTo.startsWith('https://') && !redirectTo.startsWith('http://localhost')) {
    return json({ error: 'INVALID_REDIRECT' }, { status: 400 });
  }

  const { data: token, error: tokenError } = await userClient.rpc(
    'admin_issue_bootstrap_token',
    {
      p_email: email,
      p_display_name: displayName,
      p_admin_role: adminRole,
    },
  );
  if (tokenError) {
    const message = tokenError.message ?? '';
    if (/EMAIL_ALREADY_IN_USE/.test(message)) {
      return json({ error: 'EMAIL_ALREADY_IN_USE' }, { status: 409 });
    }
    if (/UNKNOWN_ROLE/.test(message)) {
      return json({ error: 'UNKNOWN_ROLE' }, { status: 400 });
    }
    return json({ error: message }, { status: 500 });
  }

  const origin = redirectTo.replace(/\/login\/?$/, '');
  const inviteUrl = `${origin}/create-account?token=${encodeURIComponent(token)}&email=${encodeURIComponent(email)}&role=${encodeURIComponent(adminRole)}`;

  const resend = new Resend(resendKey);
  const { error: emailError } = await resend.emails.send({
    from: resendFrom ?? 'A-yos Admin <no-reply@resend.dev>',
    to: [email],
    subject: `You're invited to join A-yos Admin`,
    html: [
      `<div style="font-family:Arial,Helvetica,sans-serif;color:#1a202c;max-width:560px;margin:0 auto;">`,
      `<h2 style="margin:0 0 16px;">Welcome to A-yos Admin</h2>`,
      `<p style="margin:0 0 16px;">Hi ${escapeHtml(displayName)},</p>`,
      `<p style="margin:0 0 16px;">An administrator has invited you to join A-yos Admin as <strong>${escapeHtml(adminRole)}</strong>. To finish creating your account, click the button below (the invitation expires in 10 minutes):</p>`,
      `<p style="margin:0 0 16px;text-align:center;">`,
      `<a href="${inviteUrl}" style="display:inline-block;background:#1a73e8;color:#ffffff;padding:12px 20px;border-radius:6px;text-decoration:none;font-weight:600;">Accept invitation</a>`,
      `</p>`,
      `<p style="margin:0 0 16px;">If the button does not work, open this link in your browser:</p>`,
      `<p style="margin:0 0 16px;word-break:break-all;"><a href="${inviteUrl}" style="color:#1a73e8;">${inviteUrl}</a></p>`,
      `<p style="margin:0 0 16px;">Or enter this registration token on the sign-up page:</p>`,
      `<p style="margin:0 0 16px;text-align:center;"><code style="display:inline-block;background:#f7fafc;border:1px solid #e2e8f0;border-radius:6px;padding:10px 14px;font-size:14px;">${escapeHtml(token)}</code></p>`,
      `<p style="margin:0;color:#718096;font-size:12px;">If you did not expect this email, you can safely ignore it.</p>`,
      `</div>`,
    ].join(''),
    text: [
      `Welcome to A-yos Admin`,
      ``,
      `Hi ${displayName},`,
      ``,
      `An administrator has invited you to join A-yos Admin as ${adminRole}. To finish creating your account, open the link below (the invitation expires in 10 minutes):`,
      ``,
      inviteUrl,
      ``,
      `Or enter this registration token on the sign-up page:`,
      ``,
      token,
      ``,
      `If you did not expect this email, you can safely ignore it.`,
    ].join('\n'),
  });
  if (emailError) {
    await adminClient.from('private.admin_bootstrap_requests').delete().eq('email', email).then(
      () => {},
      () => {},
    );
    return json({ error: emailError.message }, { status: 500 });
  }

  await adminClient.from('audit_logs').insert({
    actor_id: userData.user.id,
    action: 'TEAM_MEMBER_INVITED',
    entity_type: 'admin',
    entity_id: email,
    metadata: { email, display_name: displayName, admin_role: adminRole },
  });

  return json({ ok: true, email, admin_role: adminRole });
});

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function json(body: unknown, init?: ResponseInit): Response {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: { 'Content-Type': 'application/json', ...corsHeaders, ...init?.headers },
  });
}
