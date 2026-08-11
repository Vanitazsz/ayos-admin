import { supabase } from './adminShared';

export async function loadLocations() {
  const { data, error } = await supabase.rpc('admin_list_locations');
  if (error) throw error;
  return data ?? [];
}
