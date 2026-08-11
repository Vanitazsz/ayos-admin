import { useEffect, useMemo } from 'react';
import { subscribe } from '../services/realtime';

export function useRealtime(tables, onEvent, options) {
  const tableKey = useMemo(
    () => (Array.isArray(tables) ? tables.slice().sort().join('|') : String(tables)),
    [tables],
  );

  useEffect(() => {
    const tableList = tableKey ? tableKey.split('|') : [];
    const stops = tableList.map((table) => subscribe(table, onEvent, options));
    return () => stops.forEach((stop) => stop());
  }, [tableKey, onEvent, options]);
}
