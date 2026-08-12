import { useState, useRef, useEffect } from 'react';
import {
  TrendingUp,
  Users,
  DollarSign,
  CheckCircle2,
  BarChart3,
  Repeat,
  Wallet,
  Star,
} from 'lucide-react';
import { money } from '../../../services/adminShared';
import StatCard from '../../../components/ui/StatCard';
import Skeleton from '../../../components/ui/Skeleton';
import EmptyState from '../../../components/ui/EmptyState';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '../../../components/ui/Card';
import Select, { SelectItem } from '../../../components/ui/Select';
import {
  formatMoneyTick,
  chartTick,
  chartGridStroke,
  chartCursor,
} from '../../../components/ui/ChartTooltip';
import { cn } from '../../../lib/utils';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

const kpiIcons = [CheckCircle2, DollarSign, BarChart3, Repeat];

function TopServicesList({ services, isLoading }) {
  const [activeIndex, setActiveIndex] = useState(null);
  if (isLoading) {
    return (
      <div className="flex items-center px-4 py-6">
        <Skeleton className="h-40 w-full rounded-md" />
      </div>
    );
  }
  if (!services.length) {
    return (
      <EmptyState
        icon={Star}
        title="No service requests yet"
        description="Top services will appear here once requests are made."
      />
    );
  }
  return (
    <ul className="max-h-60 space-y-1 overflow-y-auto pr-1">
      {services.map((service, index) => {
        const active = activeIndex === index;
        return (
          <li key={service.name}>
            <button
              type="button"
              aria-expanded={active}
              onClick={() => setActiveIndex(active ? null : index)}
              className={`w-full rounded-lg px-2.5 py-2 text-left transition-colors focus-ring-btn ${active ? 'bg-surface-200' : 'hover:bg-surface-100'}`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="flex min-w-0 items-center gap-2">
                  <span className="w-4 shrink-0 text-xs font-semibold tabular-nums text-foreground-muted">
                    {index + 1}
                  </span>
                  <span className="truncate text-sm font-medium text-foreground">
                    {service.name}
                  </span>
                </span>
                <span className="shrink-0 text-xs tabular-nums text-foreground-lighter">
                  {service.request_count} req
                </span>
              </div>
              <div className="ml-6 mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface-200">
                <div
                  className="h-full rounded-full bg-info transition-all duration-500"
                  style={{ width: `${Math.max(service.percentage, 4)}%` }}
                />
              </div>
              {active && (
                <p className="ml-6 mt-2 text-xs text-foreground-lighter">
                  {service.request_count} requests · {service.percentage}% of the top service
                </p>
              )}
            </button>
          </li>
        );
      })}
    </ul>
  );
}

const swatch = (color) => (color ? { background: color } : undefined);

const revenueGranularities = [
  { key: 'day', label: 'Daily' },
  { key: 'month', label: 'Monthly' },
  { key: 'year', label: 'Yearly' },
];

const RevenueTooltip = ({ active, payload, granularity = 'month' }) => {
  if (!active || !payload?.length) return null;
  const datum = payload[0].payload;
  const dateOptions = {
    day: { month: 'short', day: 'numeric', year: 'numeric' },
    month: { month: 'long', year: 'numeric' },
    year: { year: 'numeric' },
  };
  const isLegacyDate = datum.month.getFullYear() === 2000;
  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 text-sm shadow-md">
      <p className="mb-1 font-medium text-foreground">
        {isLegacyDate
          ? datum.period
          : datum.month.toLocaleDateString('en-US', dateOptions[granularity])}
      </p>
      <div className="space-y-0.5">
        <div className="flex items-center gap-2">
          <span className="inline-block size-2 shrink-0 rounded-sm" style={swatch('var(--chart-1)')} />
          <span className="text-foreground-lighter">Worker payout:</span>
          <span className="font-medium text-foreground">{money(datum.workerPayout)}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-block size-2 shrink-0 rounded-sm" style={swatch('hsl(var(--chart-2))')} />
          <span className="text-foreground-lighter">Platform commission:</span>
          <span className="font-medium text-foreground">{money(datum.commission)}</span>
        </div>
      </div>
    </div>
  );
};

export function AnalyticsView({ model }) {
  const {
    kpis,
    revenueData,
    granularity,
    setGranularity,
    topServices,
    totalRevenue,
    mau,
    avgWorkerEarnings,
    rangeKey,
    setRangeKey,
    isLoading,
  } = model;
  const activeRevenueSeries = revenueData[granularity] ?? [];
  const isRevenueEmpty =
    activeRevenueSeries.length === 0 ||
    activeRevenueSeries.every((point) => point.revenue === 0 && point.profit === 0);
  const spansMultipleYears =
    new Set(activeRevenueSeries.map((point) => point.month.getFullYear())).size > 1;
  const revenueChart = activeRevenueSeries.map((point) => ({
    ...point,
    axisLabel: spansMultipleYears ? point.yearLabel : point.period,
  }));
  const maxRevenue = Math.max(0, ...revenueChart.map((point) => point.revenue));
  const yAxisWidth = Math.max(
    48,
    Math.min(80, Math.ceil(formatMoneyTick(maxRevenue).length * 8 + 12)),
  );
  const chartScrollRef = useRef(null);
  useEffect(() => {
    chartScrollRef.current?.scrollTo({ left: chartScrollRef.current.scrollWidth });
  }, [revenueChart.length, granularity]);
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Business Analytics</h1>
          <p className="text-foreground-lighter mt-1">High-level metrics and growth trends</p>
        </div>
        <div className="w-44">
          <Select
            value={rangeKey}
            onChange={(e) => setRangeKey(e.target.value)}
            aria-label="Analytics time range"
          >
            <SelectItem value="last-12">Last 12 Months</SelectItem>
            <SelectItem value="last-6">Last 6 Months</SelectItem>
            <SelectItem value="this-year">This Year</SelectItem>
            <SelectItem value="all-time">All Time</SelectItem>
          </Select>
        </div>
      </div>

      {/* Primary Metrics (KPIs) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi, index) => (
          <StatCard
            key={index}
            title={kpi.label}
            value={kpi.value}
            icon={kpiIcons[index] ?? TrendingUp}
            trend={kpi.positive ? 'up' : 'down'}
            trendValue={kpi.trend}
            isLoading={isLoading}
          />
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Main Chart (Revenue Trend) */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between">
            <div>
              <CardTitle>Revenue Trend</CardTitle>
              <CardDescription>Gross revenue over the selected period</CardDescription>
            </div>
            <div className="flex shrink-0 items-center gap-3">
              <div
                className="flex shrink-0 items-center gap-1"
                role="group"
                aria-label="Revenue granularity"
              >
                {revenueGranularities.map(({ key, label }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setGranularity(key)}
                    aria-pressed={granularity === key}
                    className={cn(
                      'rounded-md px-2 py-1 text-xs font-medium transition-colors focus-ring-btn',
                      granularity === key
                        ? 'bg-foreground text-foreground-contrast'
                        : 'text-foreground-lighter hover:text-foreground',
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <h2 className="text-xl font-medium text-foreground">{money(totalRevenue)}</h2>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center px-4 py-6">
                <Skeleton className="h-44 w-full rounded-md" />
              </div>
            ) : isRevenueEmpty ? (
              <EmptyState
                icon={DollarSign}
                title="No revenue data yet"
                description="Revenue from successful payments will appear here once bookings are completed."
              />
            ) : (
              <div className="flex h-56 w-full">
                <div className="h-full shrink-0" style={{ width: yAxisWidth + 8 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={revenueChart} margin={{ top: 4, right: 0, left: 4, bottom: 30 }}>
                      <YAxis
                        domain={[0, maxRevenue]}
                        axisLine={false}
                        tickLine={false}
                        width={yAxisWidth}
                        tickMargin={8}
                        tick={chartTick}
                        tickFormatter={formatMoneyTick}
                        includeHidden
                      />
                      <Bar dataKey="commission" hide />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="h-full min-w-0 flex-1 overflow-x-auto" ref={chartScrollRef}>
                  <div
                    className="h-full"
                    style={{
                      width: `${Math.max(revenueChart.length * 28, 100)}px`,
                      minWidth: '100%',
                    }}
                  >
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={revenueChart}
                        margin={{ top: 4, right: 4, left: 4, bottom: 0 }}
                        barCategoryGap={2}
                      >
                        <CartesianGrid vertical={false} stroke={chartGridStroke} />
                        <XAxis
                          dataKey="axisLabel"
                          axisLine={false}
                          tickLine={false}
                          tickMargin={8}
                          interval="preserveStartEnd"
                          minTickGap={12}
                          tick={chartTick}
                        />
                        <YAxis hide domain={[0, maxRevenue]} />
                        <Tooltip
                          cursor={chartCursor}
                          defaultIndex={revenueChart.length - 1}
                          content={<RevenueTooltip granularity={granularity} />}
                        />
                        <Bar
                          dataKey="workerPayout"
                          name="Worker payout"
                          stackId="rev"
                          fill="var(--chart-1)"
                          radius={[2, 2, 1, 1]}
                          maxBarSize={48}
                          animationDuration={300}
                        />
                        <Bar
                          dataKey="commission"
                          name="Platform commission"
                          stackId="rev"
                          fill="hsl(var(--chart-2))"
                          radius={[0, 0, 1, 1]}
                          maxBarSize={48}
                          animationDuration={300}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Secondary Chart (Top Services) */}
        <Card>
          <CardHeader>
            <CardTitle>Top Services</CardTitle>
            <CardDescription>Most requested services</CardDescription>
          </CardHeader>
          <CardContent>
            <TopServicesList services={topServices} isLoading={isLoading} />
          </CardContent>
        </Card>
      </div>

      {/* Extra Analytics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <StatCard
          title="Monthly Active Users (MAU)"
          value={mau ?? '—'}
          icon={Users}
          trend="up"
          trendValue="Live"
          subtitle="Compared to previous month"
          isLoading={isLoading}
        />
        <StatCard
          title="Avg. Worker Earnings / Mo"
          value={avgWorkerEarnings != null ? money(avgWorkerEarnings) : '—'}
          icon={Wallet}
          trend="up"
          trendValue="Annual avg"
          subtitle="Across all verified workers"
          isLoading={isLoading}
        />
      </div>
    </div>
  );
}
