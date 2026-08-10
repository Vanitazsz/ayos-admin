import { supabase, status, accountName } from './adminShared';

const TYPE_TABS = {
  user: 'Users',
  worker: 'Workers',
  booking: 'Bookings',
  review: 'Reviews',
  industry: 'Industries',
  skill: 'Skills',
};

export async function loadTrash() {
  const { data, error } = await supabase
    .from('trash_entries')
    .select('*')
    .is('restored_at', null)
    .order('deleted_at', { ascending: false });
  if (error) throw error;
  const rows = data ?? [];

  const accountIds = rows
    .filter((row) => row.entity_type === 'user' || row.entity_type === 'worker')
    .map((row) => row.entity_id);
  const actorIds = [...new Set(rows.map((row) => row.deleted_by).filter(Boolean))];
  const ids = [...new Set([...accountIds, ...actorIds])];

  const namesById = new Map();
  const emailById = new Map();
  if (ids.length) {
    const { data: accounts, error: accountError } = await supabase
      .from('accounts')
      .select(
        'id,email,user_profiles(display_name),worker_profiles(display_name),admin_profiles(display_name)',
      )
      .in('id', ids);
    if (accountError) throw accountError;
    for (const account of accounts ?? []) {
      const name = accountName(account);
      if (name) namesById.set(account.id, name);
      if (account.email) emailById.set(account.id, account.email);
    }
  }

  const industryIds = rows
    .filter((row) => row.entity_type === 'industry')
    .map((row) => row.entity_id);
  const skillCountById = new Map();
  if (industryIds.length) {
    const { data: categories, error: categoryError } = await supabase
      .from('service_categories')
      .select('industry_id')
      .in('industry_id', industryIds);
    if (categoryError) throw categoryError;
    const counts = new Map();
    for (const category of categories ?? []) {
      counts.set(category.industry_id, (counts.get(category.industry_id) ?? 0) + 1);
    }
    for (const industryId of industryIds) {
      skillCountById.set(industryId, counts.get(industryId) ?? 0);
    }
  }

  const groups = Object.fromEntries(
    ['Users', 'Workers', 'Bookings', 'Reviews', 'Industries', 'Skills'].map(
      (tab) => [tab, []],
    ),
  );
  for (const row of rows) {
    const type = status(row.entity_type);
    const key = TYPE_TABS[row.entity_type];
    if (!key) continue;
    groups[key].push({
      id: row.id,
      item:
        namesById.get(row.entity_id) ??
        row.snapshot?.[row.entity_type]?.name ??
        row.entity_id,
      entityId: row.entity_id,
      type,
      email: emailById.get(row.entity_id),
      deletedBy: namesById.get(row.deleted_by) ?? row.deleted_by,
      deletedDate: new Date(row.deleted_at).toLocaleDateString(),
      restoreDeadline: 'Retention policy',
      snapshot: row.snapshot,
      skillCount:
        row.entity_type === 'industry' ? skillCountById.get(row.entity_id) : undefined,
    });
  }
  return groups;
}

export async function restoreTrash(id) {
  const { data, error } = await supabase.rpc('restore_from_trash', { trash_id: id });
  if (error) throw error;
  return data;
}

export async function restoreIndustryFromTrash(id) {
  const { data, error } = await supabase.rpc('admin_restore_industry_from_trash', {
    p_trash_id: id,
  });
  if (error) throw error;
  return data;
}

export async function restoreSkillFromTrash(id) {
  const { data, error } = await supabase.rpc('admin_restore_skill_from_trash', {
    p_trash_id: id,
  });
  if (error) throw error;
  return data;
}

export async function restoreAccountFromTrash(id) {
  const { data, error } = await supabase.rpc('admin_restore_account_from_trash', {
    p_trash_id: id,
  });
  if (error) throw error;
  return data;
}

export async function permanentlyDeleteTrash(id, entityId) {
  const { error } = await supabase.rpc('permanently_delete', {
    trash_id: id,
    p_confirmation: `DELETE ${entityId}`,
  });
  if (error) throw error;
}

export async function hardDeleteAccountFromTrash(id, email) {
  const { data, error } = await supabase.rpc('admin_hard_delete_account_from_trash', {
    p_trash_id: id,
    p_confirmation_email: email,
  });
  if (error) throw error;
  return data;
}

export async function hardDeleteIndustryFromTrash(id, deleteSkills = true) {
  const { data, error } = await supabase.rpc('admin_hard_delete_industry_from_trash', {
    p_trash_id: id,
    p_delete_skills: deleteSkills,
  });
  if (error) throw error;
  return data;
}

export async function hardDeleteSkillFromTrash(id) {
  const { data, error } = await supabase.rpc('admin_hard_delete_skill_from_trash', {
    p_trash_id: id,
  });
  if (error) throw error;
  return data;
}
