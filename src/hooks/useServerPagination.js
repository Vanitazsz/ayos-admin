import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getPageWindow } from './usePagination';

export function useServerPagination({ fetchPage, pageSize = 10, filterKey = '' }) {
  const [currentPage, setCurrentPage] = useState(1);
  const [rows, setRows] = useState([]);
  const [count, setCount] = useState(0);
  const [meta, setMeta] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [error, setError] = useState(null);
  const pageRef = useRef(1);
  const mountedRef = useRef(true);
  const requestIdRef = useRef(0);
  const lastFetchedRef = useRef(null);
  const lastFilterKeyRef = useRef(filterKey);

  const updatePage = useCallback((page) => {
    pageRef.current = page;
    setCurrentPage(page);
  }, []);

  const refresh = useCallback(
    async (pageOverride) => {
      const page = pageOverride ?? pageRef.current;
      setIsLoading(true);
      setError(null);
      const requestId = ++requestIdRef.current;
      try {
        const result = await fetchPage({ page, pageSize });
        if (mountedRef.current && requestId === requestIdRef.current) {
          const { rows: nextRows = [], count: nextCount = 0, ...rest } = result ?? {};
          setRows(nextRows);
          setCount(nextCount);
          setMeta(rest);
        }
      } catch (err) {
        if (mountedRef.current && requestId === requestIdRef.current) {
          setError(err instanceof Error ? err.message : 'An error occurred');
        }
      } finally {
        if (mountedRef.current && requestId === requestIdRef.current) {
          setIsLoading(false);
          setIsInitialLoading(false);
        }
      }
    },
    [fetchPage, pageSize],
  );

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(count / pageSize)),
    [count, pageSize],
  );

  const pageWindow = useMemo(
    () => getPageWindow(currentPage, totalPages),
    [currentPage, totalPages],
  );

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    pageRef.current = 1;
    updatePage(1);
  }, [fetchPage, updatePage]);

  useEffect(() => {
    if (lastFilterKeyRef.current === filterKey) return;
    lastFilterKeyRef.current = filterKey;
    requestIdRef.current += 1;
    lastFetchedRef.current = null;
    pageRef.current = 1;
    updatePage(1);
  }, [filterKey, updatePage]);

  useEffect(() => {
    if (currentPage > totalPages) updatePage(totalPages);
  }, [currentPage, totalPages, updatePage]);

  useEffect(() => {
    const page = pageRef.current;
    if (
      lastFetchedRef.current?.fetchPage === fetchPage &&
      lastFetchedRef.current?.filterKey === filterKey &&
      lastFetchedRef.current?.page === page
    )
      return;
    lastFetchedRef.current = { fetchPage, filterKey, page };
    void refresh();
  }, [refresh, currentPage, fetchPage, filterKey]);

  return {
    rows,
    count,
    meta,
    isLoading,
    isInitialLoading,
    error,
    refresh,
    currentPage,
    setCurrentPage: updatePage,
    totalPages,
    pageWindow,
  };
}
