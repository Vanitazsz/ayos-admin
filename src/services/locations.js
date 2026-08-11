import { supabase } from './adminShared';
import { cacheable } from '../lib/cacheable';

export const loadLocations = cacheable('locations', { ttl: 10 * 60_000 }, async () => {
  const { data, error } = await supabase.rpc('admin_list_locations');
  if (error) throw error;
  return data ?? [];
});
