import { supabase } from './adminShared';

export const subscribe = (table, refresh, options = {}) => {
  const { event = '*', filter, onError, onSystem, debug = false } = options;
  const channelName = `admin:${table}:${crypto.randomUUID()}`;

  const channel = supabase.channel(channelName).on(
    'postgres_changes',
    { event, schema: 'public', table, ...(filter ? { filter } : {}) },
    refresh,
  );

  if (typeof onSystem === 'function') {
    channel.onSystem((message) => onSystem(message, table));
  }

  channel.subscribe((status, err) => {
    if (status === 'CHANNEL_ERROR') {
      console.error(`[realtime] channel error on "${table}" (${channelName})`, err);
      if (typeof onError === 'function') onError(err);
    } else if (status === 'TIMED_OUT') {
      console.warn(`[realtime] subscribe timed out on "${table}" (${channelName})`);
      if (typeof onError === 'function') onError(err);
    } else if (debug && status === 'SUBSCRIBED') {
      console.debug(`[realtime] subscribed to "${table}" (${channelName})`);
    }
  });

  return () => {
    void supabase.removeChannel(channel);
  };
};
