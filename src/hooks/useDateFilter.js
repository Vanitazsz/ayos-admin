import { useCallback, useMemo, useState } from 'react';
import { dateFilterLabel, isDateFilterActive, resolveDateRange } from '../lib/dateFilter';

export function useDateFilter({
  canModify = false,
  canUseDeleted = false,
  defaultSort = 'newest',
  defaultField = 'created',
} = {}) {
  const [sort, setSort] = useState(defaultSort);
  const [field, setField] = useState(defaultField);
  const [preset, setPreset] = useState('all');
  const [customRange, setCustomRange] = useState({ from: '', to: '' });
  const [isRangeOpen, setIsRangeOpen] = useState(false);

  const effectiveRange = useMemo(() => resolveDateRange(preset, customRange), [preset, customRange]);

  const label = useMemo(
    () => dateFilterLabel({ sort, preset, customRange, field }),
    [sort, preset, customRange, field],
  );

  const isActive = useMemo(
    () => isDateFilterActive({ preset, sort }) || field !== defaultField,
    [preset, sort, field, defaultField],
  );

  const handleApplyRange = useCallback((from, to) => {
    setCustomRange({ from, to });
    setPreset('custom');
    setIsRangeOpen(false);
  }, []);

  const clear = useCallback(() => {
    setCustomRange({ from: '', to: '' });
    setPreset('all');
    setSort(defaultSort);
    setField(defaultField);
    setIsRangeOpen(false);
  }, [defaultSort, defaultField]);

  return useMemo(
    () => ({
      sort,
      setSort,
      field,
      setField,
      preset,
      setPreset,
      customRange,
      setCustomRange,
      isRangeOpen,
      setIsRangeOpen,
      effectiveRange,
      label,
      isActive,
      handleApplyRange,
      clear,
      canModify,
      canUseDeleted,
      defaultField,
    }),
    [
      sort,
      setSort,
      field,
      setField,
      preset,
      setPreset,
      customRange,
      setCustomRange,
      isRangeOpen,
      setIsRangeOpen,
      effectiveRange,
      label,
      isActive,
      handleApplyRange,
      clear,
      canModify,
      canUseDeleted,
      defaultField,
    ],
  );
}
