import { supabase } from './adminShared';

export async function loadCatalog() {
  const [
    { data: industries, error: industryError },
    { data: skills, error: skillError },
  ] = await Promise.all([
    supabase
      .from('industries')
      .select('id,name,description,is_active,sort_order,service_categories(count)')
      .order('sort_order')
      .order('name'),
    supabase
      .from('service_categories')
      .select(
        'id,name,minimum_price_minor,maximum_price_minor,is_safety_critical,is_active,industries(name),worker_skills(count)',
      )
      .order('name'),
  ]);
  if (industryError) throw industryError;
  if (skillError) throw skillError;
  return {
    industries: (industries ?? []).map((row) => ({
      id: row.id,
      name: row.name,
      description: row.description ?? '',
      sortOrder: row.sort_order ?? 0,
      status: row.is_active ? 'Enabled' : 'Disabled',
      skillsCount: row.service_categories?.[0]?.count ?? 0,
    })),
    skills: (skills ?? []).map((row) => ({
      id: row.id,
      name: row.name,
      industry: row.industries?.name ?? '',
      minimumPriceMinor:
        row.minimum_price_minor != null ? Number(row.minimum_price_minor) : null,
      maximumPriceMinor:
        row.maximum_price_minor != null ? Number(row.maximum_price_minor) : null,
      isSafetyCritical: Boolean(row.is_safety_critical),
      status: row.is_active ? 'Active' : 'Inactive',
      workers: row.worker_skills?.[0]?.count ?? 0,
    })),
  };
}

export async function loadMostBookedService() {
  const { data, error } = await supabase.rpc('admin_most_booked_service');
  if (error) throw error;
  return data;
}

export async function saveSkill(value, industries) {
  const industry = industries.find((item) => item.name === value.industry);
  const { data, error } = await supabase.rpc('admin_upsert_skill', {
    p_id: value.id || null,
    p_name: value.name,
    p_industry_id: industry?.id,
    p_minimum_price_minor: Math.round(Number(value.minimumPriceMinor ?? 0)),
    p_maximum_price_minor:
      value.maximumPriceMinor != null ? Math.round(Number(value.maximumPriceMinor)) : null,
    p_is_safety_critical: Boolean(value.isSafetyCritical),
    p_is_active: value.status === 'Active',
  });
  if (error) throw error;
  return data;
}

export async function hardDeleteSkill(id) {
  const { data, error } = await supabase.rpc('admin_hard_delete_skill', { p_id: id });
  if (error) throw error;
  return data;
}

export async function hardDeleteIndustry(id, skillIds) {
  const { data, error } = await supabase.rpc('admin_hard_delete_industry', {
    p_id: id,
    p_skill_ids: skillIds,
  });
  if (error) throw error;
  return data;
}

export async function saveIndustry(value) {
  const { data, error } = await supabase.rpc('admin_upsert_industry', {
    p_id: value.id || null,
    p_name: value.name,
    p_description: value.description || null,
    p_sort_order:
      value.sortOrder != null && Number.isFinite(Number(value.sortOrder))
        ? Math.round(Number(value.sortOrder))
        : null,
    p_is_active: value.status === 'Enabled',
  });
  if (error) throw error;
  return data;
}
