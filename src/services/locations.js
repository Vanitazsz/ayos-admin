import { supabase } from './adminShared';

export async function loadLocations() {
  const { data, error } = await supabase.rpc('admin_list_locations');
  if (error) throw error;
  return data ?? [];
}

export async function saveLocation(input) {
  const params = {
    p_name: input.name,
    p_lat: Number(input.center_lat),
    p_lng: Number(input.center_lng),
    p_radius_meters: Number(input.radius_meters),
    p_boundary: input.boundary ?? null,
  };
  const { data, error } = input.id
    ? await supabase.rpc('admin_update_location', {
        p_id: input.id,
        ...params,
        p_is_active: Boolean(input.is_active),
      })
    : await supabase.rpc('admin_create_location', params);
  if (error) throw error;
  return data;
}
