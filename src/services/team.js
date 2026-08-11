import { supabase } from './adminShared';

const rpcErrorMessage = (error) => {
  const message = error?.message;
  if (!message) return 'The request could not be completed.';
  const marker = message.match(/(?:message"\]?\s*[:=]\s*"|message=|:\s*")([A-Z0-9_]+)/i);
  return marker ? marker[1] : message;
};

export async function loadTeam() {
  const { data, error } = await supabase.rpc('admin_list_team');
  if (error) throw error;
  return (data ?? []).map((row) => ({
    ...row,
    permissions: Array.isArray(row.permissions) ? row.permissions : [],
  }));
}

export async function loadTeamPage({
  search = '',
  role = 'All',
  page = 1,
  pageSize = 10,
} = {}) {
  const rows = await loadTeam();
  const term = search.trim().toLowerCase();
  const matched = rows.filter(
    (row) =>
      (!term ||
        row.display_name?.toLowerCase().includes(term) ||
        row.email?.toLowerCase().includes(term) ||
        (row.role_name ?? '').toLowerCase().includes(term)) &&
      (role === 'All' || row.admin_role === role),
  );
  const stats = {
    total: rows.length,
    superAdmins: rows.filter((row) => row.admin_role === 'SUPER_ADMIN').length,
    active: rows.filter((row) => row.status === 'ACTIVE').length,
    suspended: rows.filter((row) => row.status === 'SUSPENDED').length,
  };
  return {
    rows: matched.slice((page - 1) * pageSize, page * pageSize),
    count: matched.length,
    stats,
  };
}

export async function loadRoles() {
  const { data, error } = await supabase.rpc('admin_get_roles');
  if (error) throw error;
  return (data ?? []).map((row) => ({
    code: row.code,
    name: row.name,
    description: row.description,
    permissions: Array.isArray(row.permissions) ? row.permissions : [],
  }));
}

export async function loadMyPermissions() {
  const { data, error } = await supabase.rpc('admin_get_my_permissions');
  if (error) return [];
  return data ?? [];
}

export async function setMemberRole(accountId, role) {
  const { data, error } = await supabase.rpc('admin_set_member_role', {
    p_account_id: accountId,
    p_admin_role: role,
  });
  if (error) throw error;
  return data;
}

export async function inviteMember({ email, displayName, role, redirectTo }) {
  const { data, error } = await supabase.functions.invoke('admin-invite', {
    body: {
      email,
      display_name: displayName,
      admin_role: role,
      redirect_to: redirectTo,
    },
  });
  if (error) throw new Error(rpcErrorMessage(error));
  return data;
}
