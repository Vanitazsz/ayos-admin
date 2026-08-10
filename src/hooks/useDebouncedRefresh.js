import { useCallback, useEffect, useRef } from 'react';

export function useDebouncedRefresh({ debounceMs = 1500, cooldownMs = 2000 } = {}) {
  const timerRef = useRef(null);
  const lastRefreshAtRef = useRef(0);

  const schedule = useCallback(
    (fn) => {
      const now = Date.now();
      if (now - lastRefreshAtRef.current < cooldownMs) return;
      if (timerRef.current) window.clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(() => {
        lastRefreshAtRef.current = Date.now();
        void fn();
      }, debounceMs);
    },
    [debounceMs, cooldownMs],
  );

  const mark = useCallback(() => {
    lastRefreshAtRef.current = Date.now();
  }, []);

  useEffect(
    () => () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    },
    [],
  );

  return { schedule, mark };
}
