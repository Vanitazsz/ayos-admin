export const DATE_FIELD_LABELS = {
  created: 'Created',
  modified: 'Modified',
  deleted: 'Deleted',
};

export const getRowDate = (row, field = 'created') => {
  if (!row) return null;
  if (field === 'modified') return row.updated_at ?? row.updatedAt ?? null;
  if (field === 'deleted') return row.deleted_at ?? row.deletedAt ?? null;
  return row.created_at ?? row.createdAt ?? null;
};

export function resolveDateRange(preset, customRange) {
  if (preset === 'today') {
    const from = new Date();
    from.setHours(0, 0, 0, 0);
    const to = new Date();
    to.setHours(23, 59, 59, 999);
    return { from, to };
  }
  if (preset === '7d') {
    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - 6);
    from.setHours(0, 0, 0, 0);
    return { from, to };
  }
  if (preset === 'month') {
    const now = new Date();
    return { from: new Date(now.getFullYear(), now.getMonth(), 1), to: now };
  }
  if (preset === 'custom') {
    if (!customRange?.from && !customRange?.to) return null;
    return {
      from: customRange.from ? new Date(`${customRange.from}T00:00:00`) : null,
      to: customRange.to ? new Date(`${customRange.to}T23:59:59.999`) : null,
    };
  }
  return null;
}

export function dateFilterLabel({ sort = 'newest', preset = 'all', customRange = {}, field } = {}) {
  let rangeLabel;
  if (preset === 'today') rangeLabel = 'Today';
  else if (preset === '7d') rangeLabel = 'Last 7 Days';
  else if (preset === 'month') rangeLabel = 'This Month';
  else if (preset === 'custom') {
    if (customRange.from && customRange.to) rangeLabel = `${customRange.from} → ${customRange.to}`;
    else if (customRange.from) rangeLabel = `From ${customRange.from}`;
    else if (customRange.to) rangeLabel = `To ${customRange.to}`;
    else rangeLabel = 'Custom Range';
  } else {
    rangeLabel = sort === 'oldest' ? 'Old to New' : 'Most Recent';
  }
  if (field && field !== 'created') return `${DATE_FIELD_LABELS[field] ?? field} · ${rangeLabel}`;
  return rangeLabel;
}

export function applyDateFilter(
  rows,
  { field = 'created', range = null, sort = 'newest', getDate } = {},
) {
  const dateOf = getDate ?? ((row) => getRowDate(row, field));
  let out = rows;
  if (!Array.isArray(out)) return out;
  if (range && (range.from || range.to)) {
    const from = range.from ? range.from.getTime() : -Infinity;
    const to = range.to ? range.to.getTime() : Infinity;
    out = rows.filter((row) => {
      const time = new Date(dateOf(row)).getTime();
      if (Number.isNaN(time)) return false;
      return time >= from && time <= to;
    });
  }
  return out.slice().sort((left, right) => {
    const leftTime = new Date(dateOf(left)).getTime();
    const rightTime = new Date(dateOf(right)).getTime();
    const leftValue = Number.isNaN(leftTime) ? -Infinity : leftTime;
    const rightValue = Number.isNaN(rightTime) ? -Infinity : rightTime;
    return sort === 'oldest' ? leftValue - rightValue : rightValue - leftValue;
  });
}

export const isDateFilterActive = ({ preset = 'all', sort = 'newest' } = {}) =>
  preset !== 'all' || sort === 'oldest';
