import { useEffect } from 'react';
import { subscribe } from '../services/realtime';

export function useRealtime(tables, onEvent, options) {
  useEffect(() => {
    const tableList = Array.isArray(tables) ? tables : [tables];
    const stops = tableList.map((table) => subscribe(table, onEvent, options));
    return () => stops.forEach((stop) => stop());
  }, [tables, onEvent, options]);
}
