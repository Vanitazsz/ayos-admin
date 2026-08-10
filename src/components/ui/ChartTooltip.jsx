import { cn } from '../../lib/utils';

export const chartGridStroke = 'var(--border)';
export const chartTick = { fontSize: 12, fill: 'var(--foreground-muted)' };
export const chartCursor = { fill: 'var(--control)' };

export function formatMoneyTick(value) {
  const num = Number(value ?? 0);
  const abs = Math.abs(num);
  const sign = num < 0 ? '-' : '';
  const fmt = (v, suffix) => {
    const s = v >= 100 ? v.toFixed(0) : v.toFixed(1);
    return `${s.replace(/\.0$/, '')}${suffix}`;
  };
  if (abs >= 1_000_000) return `${sign}₱${fmt(abs / 1_000_000, 'M')}`;
  if (abs >= 1_000) return `${sign}₱${fmt(abs / 1_000, 'K')}`;
  return `${sign}₱${Number.isInteger(abs) ? String(abs) : abs.toFixed(2)}`;
}

const swatch = (color) =>
  color && color !== 'none' ? { background: color } : { background: 'var(--chart-1)' };

export function ChartTooltip({ active, payload, label, formatter, labelFormatter, className }) {
  if (!active || !payload?.length) return null;
  return (
    <div
      className={cn(
        'rounded-lg border border-border bg-popover px-3 py-2 text-sm shadow-md',
        className,
      )}
    >
      {label != null ? (
        <p className="mb-1 font-medium text-foreground">
          {labelFormatter ? labelFormatter(label) : label}
        </p>
      ) : null}
      <div className="space-y-0.5">
        {payload.map((entry, index) => (
          <div key={index} className="flex items-center gap-2">
            <span
              className="inline-block size-2 shrink-0 rounded-sm"
              style={swatch(entry.color)}
            />
            <span className="text-foreground-lighter">{entry.name}:</span>
            <span className="font-medium text-foreground">
              {formatter ? formatter(entry.value, entry) : entry.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
