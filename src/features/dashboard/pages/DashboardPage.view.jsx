import { useState, useRef, useEffect } from 'react';
import {
  DollarSign,
  Calendar,
  Users,
  HardHat,
  CheckCircle,
  Trash2,
  Headset,
  UserPlus,
  Bell,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '../../../components/ui/Card';
import Badge from '../../../components/ui/Badge';
import Skeleton from '../../../components/ui/Skeleton';
import EmptyState from '../../../components/ui/EmptyState';
import TableSkeleton from '../../../components/ui/TableSkeleton';
import StatCard from '../../../components/ui/StatCard';
import { Button } from '../../../components/ui/Button';
import {
  ChartTooltip,
  formatMoneyTick,
  chartTick,
  chartGridStroke,
  chartCursor,
} from '../../../components/ui/ChartTooltip';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '../../../components/ui/Table';
import { cn } from '../../../lib/utils';
import { money } from '../../../services/adminShared';
import { Link } from 'react-router-dom';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

const swatch = (color) => (color ? { background: color } : undefined);

const RevenueTooltip = ({ active, payload, granularity = 'month' }) => {
  if (!active || !payload?.length) return null;
  const datum = payload[0].payload;
  const dateOptions = {
    day: { month: 'short', day: 'numeric', year: 'numeric' },
    month: { month: 'long', year: 'numeric' },
    year: { year: 'numeric' },
  };
  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 text-sm shadow-md">
      <p className="mb-1 font-medium text-foreground">
        {datum.month.toLocaleDateString('en-US', dateOptions[granularity])}
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

export function DashboardView({ model }) {
  const {
    isLoading,
    loadError,
    activities,
    metrics,
    revenueData,
    bookingsData,
    pendingWorkers,
    recentUsers,
    systemNotifications,
    handleReviewWorker,
  } = model;
  const bookingsTotal = bookingsData.map((day) => ({
    ...day,
    total: (day.completed ?? 0) + (day.pending ?? 0) + (day.cancelled ?? 0),
  }));
  const periodPending = bookingsTotal.reduce((sum, day) => sum + (day.pending ?? 0), 0);
  const periodCancelled = bookingsTotal.reduce((sum, day) => sum + (day.cancelled ?? 0), 0);
  const isBookingsEmpty =
    bookingsTotal.length === 0 || bookingsTotal.every((month) => month.total === 0);
  const [revenueGranularity, setRevenueGranularity] = useState('month');
  const revenueWindows = {
    day: { window: 90, label: '90-day' },
    month: { window: 12, label: '12-month' },
    year: { window: 5, label: '5-year' },
  };
  const { window: revenueWindow, label: revenueWindowLabel } =
    revenueWindows[revenueGranularity];
  const activeRevenueSeries = revenueData[revenueGranularity] ?? [];
  const revenueWindowRaw = activeRevenueSeries.slice(-revenueWindow);
  const previousRevenueWindow = activeRevenueSeries.slice(-2 * revenueWindow, -revenueWindow);
  const sumRevenue = (series) => series.reduce((total, point) => total + point.revenue, 0);
  const revenueCurrent = sumRevenue(revenueWindowRaw);
  const previousRevenue = sumRevenue(previousRevenueWindow);
  const revenueDelta =
    previousRevenue > 0 ? ((revenueCurrent - previousRevenue) / previousRevenue) * 100 : null;
  const isRevenueEmpty =
    activeRevenueSeries.length === 0 ||
    activeRevenueSeries.every((point) => point.revenue === 0 && point.profit === 0);
  const spansMultipleYears =
    new Set(revenueWindowRaw.map((point) => point.month.getFullYear())).size > 1;
  const revenueChart = revenueWindowRaw.map((point) => ({
    ...point,
    axisLabel: spansMultipleYears ? point.yearLabel : point.period,
  }));
  const maxRevenue = Math.max(0, ...revenueChart.map((point) => point.revenue));
  const yAxisWidth = Math.max(48, Math.min(80, Math.ceil(formatMoneyTick(maxRevenue).length * 8 + 12)));
  const chartScrollRef = useRef(null);
  useEffect(() => {
    chartScrollRef.current?.scrollTo({ left: chartScrollRef.current.scrollWidth });
  }, [revenueChart.length, revenueGranularity]);
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard Overview</h1>
          <p className="text-foreground-lighter mt-1">Here's what's happening in your ecosystem today.</p>
        </div>
        <div className="flex space-x-2">
          <Button
            variant="default"
            size="sm"
            onClick={() => {
              window.location.href = '/admin/reports';
            }}
          >
            Reports
          </Button>
        </div>
      </div>

      {loadError ? (
        <div
          role="alert"
          className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
        >
          {loadError}
        </div>
      ) : null}

      {/* Stat Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard
          title="Total Commission Revenue"
          value={money(metrics.commission_total ?? 0)}
          icon={DollarSign}
          trend="up"
          trendValue="Live"
          subtitle="platform commission"
          isLoading={isLoading}
          to="/admin/payments"
        />
        <StatCard
          title="Active Bookings"
          value={metrics.active_bookings ?? 0}
          icon={Calendar}
          trend="up"
          trendValue="Live"
          subtitle="current"
          isLoading={isLoading}
          to="/admin/bookings"
        />
        <StatCard
          title="Total Users"
          value={metrics.accounts ?? 0}
          icon={Users}
          trend="up"
          trendValue="Live"
          subtitle="current"
          isLoading={isLoading}
          to="/admin/users"
        />
        <StatCard
          title="Verified Workers"
          value={metrics.active_workers ?? 0}
          icon={HardHat}
          trend="up"
          trendValue="Live"
          subtitle="approved"
          isLoading={isLoading}
          to="/admin/workers"
        />
        <StatCard
          title="Support Tickets"
          value={metrics.open_support ?? 0}
          icon={Headset}
          trend="up"
          trendValue="Live"
          subtitle="open"
          isLoading={isLoading}
          to="/admin/support"
        />
      </div>

      {/* Charts Section */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
        {/* Revenue Overview */}
        <div
          data-testid="revenue-chart"
          className="flex flex-col overflow-hidden rounded-lg border border-border bg-surface-100 shadow-sm lg:col-span-4"
        >
          <div className="flex h-8 shrink-0 items-center justify-between gap-2 px-3">
            <div className="flex min-w-0 items-center gap-2">
              <DollarSign className="size-4 shrink-0 text-foreground-muted" strokeWidth={1.5} />
              <h3 className="heading-meta truncate">Revenue Overview</h3>
            </div>
            <div
              className="flex shrink-0 items-center gap-1"
              role="group"
              aria-label="Revenue granularity"
            >
              {[
                { key: 'day', label: 'Daily' },
                { key: 'month', label: 'Monthly' },
                { key: 'year', label: 'Yearly' },
              ].map(({ key, label }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setRevenueGranularity(key)}
                  aria-pressed={revenueGranularity === key}
                  className={cn(
                    'rounded-md px-2 py-1 text-xs font-medium transition-colors focus-ring',
                    revenueGranularity === key
                      ? 'bg-foreground text-foreground-contrast'
                      : 'text-foreground-lighter hover:text-foreground',
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex grow flex-col border-t" data-testid="dashboard-chart">
            {isLoading ? (
              <div className="flex grow items-center px-4 py-6">
                <Skeleton className="h-48 w-full rounded-md" />
              </div>
            ) : isRevenueEmpty ? (
              <EmptyState
                icon={DollarSign}
                title="No revenue data yet"
                description="Revenue from successful payments will appear here once bookings are completed."
              />
            ) : (
              <>
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 px-3 pt-3">
                  <p className="text-2xl font-semibold tracking-tight text-foreground">
                    {money(revenueCurrent)}
                  </p>
                  {revenueDelta != null && (
                    <span
                      className={cn(
                        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
                        revenueDelta >= 0
                          ? 'bg-success/10 text-success'
                          : 'bg-destructive/10 text-destructive',
                      )}
                    >
                      {revenueDelta >= 0 ? (
                        <ArrowUp className="size-3" />
                      ) : (
                        <ArrowDown className="size-3" />
                      )}
                      {Math.abs(revenueDelta).toFixed(1)}%
                    </span>
                  )}
                </div>
                <p className="px-3 pt-1 text-xs text-foreground-lighter">
                  vs previous {revenueWindowLabel} period
                </p>
                <div className="flex h-48 w-full px-3 py-2">
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
                        <BarChart data={revenueChart} margin={{ top: 4, right: 4, left: 4, bottom: 0 }} barCategoryGap={2}>
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
                            content={<RevenueTooltip granularity={revenueGranularity} />}
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
              </>
            )}
          </div>
        </div>

        {/* Daily Bookings */}
        <Link
          to="/admin/bookings"
          data-testid="bookings-chart"
          className="flex flex-col cursor-pointer overflow-hidden rounded-lg border border-border bg-surface-100 shadow-sm transition-colors focus-ring hover:border-border-strong hover:bg-surface-200/50 lg:col-span-3"
        >
          <div className="flex h-8 shrink-0 items-center justify-between gap-2 px-3">
            <div className="flex min-w-0 items-center gap-2">
              <Calendar className="size-4 shrink-0 text-foreground-muted" strokeWidth={1.5} />
              <h3 className="heading-meta truncate">Daily Bookings</h3>
            </div>
            <div className="flex shrink-0 items-center gap-3">
              <span className="text-[11px] font-mono uppercase tracking-wide text-foreground-light">
                Last 14 d
              </span>
              <div className="flex items-center gap-1.5">
                <span className="inline-block size-2 rounded-sm" style={swatch('var(--warning)')} />
                <span className="text-sm font-medium tabular-nums text-foreground">{periodPending}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span
                  className="inline-block size-2 rounded-sm"
                  style={swatch('var(--destructive)')}
                />
                <span className="text-sm font-medium tabular-nums text-foreground">{periodCancelled}</span>
              </div>
            </div>
          </div>
          <div className="flex grow flex-col border-t" data-testid="dashboard-chart">
            {isLoading ? (
              <div className="flex grow items-center px-4 py-6">
                <Skeleton className="h-48 w-full rounded-md" />
              </div>
            ) : isBookingsEmpty ? (
              <EmptyState
                icon={Calendar}
                title="No bookings yet"
                description="Bookings made across the platform will appear here."
              />
            ) : (
              <div className="grow w-full px-3 py-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={bookingsTotal} margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
                    <YAxis hide domain={[0, 'dataMax']} />
                    <XAxis
                      dataKey="name"
                      axisLine={false}
                      tickLine={false}
                      tickMargin={8}
                      interval="preserveStartEnd"
                      minTickGap={18}
                      tick={chartTick}
                    />
                    <Tooltip cursor={chartCursor} content={<ChartTooltip />} />
                    <Bar
                      dataKey="completed"
                      name="Completed"
                      stackId="a"
                      fill="var(--success)"
                      maxBarSize={24}
                    />
                    <Bar
                      dataKey="pending"
                      name="Pending"
                      stackId="a"
                      fill="var(--warning)"
                      maxBarSize={24}
                    />
                    <Bar
                      dataKey="cancelled"
                      name="Cancelled"
                      stackId="a"
                      fill="var(--destructive)"
                      maxBarSize={24}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </Link>
      </div>

      {/* Tables Section */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Recent Activity */}
        <Card className="lg:col-span-1" data-testid="dashboard-live-list">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest actions across the platform.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="isolate">
              {activities.map((activity, index) => (
                <div
                  key={activity.id}
                  className="relative flex items-start pb-4 last:pb-0 animate-fade-in-up transition-all duration-500"
                >
                  <div className="relative z-10 mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-foreground-lighter"></div>
                  {index !== activities.length - 1 && (
                    <div className="absolute top-2 left-[2.5px] bottom-[-0.5rem] w-px bg-border transition-all duration-300"></div>
                  )}
                  <div className="ml-4 space-y-1">
                    <p className="text-sm font-medium text-foreground">{activity.user}</p>
                    <p className="text-sm text-foreground-lighter">{activity.action}</p>
                    <p className="text-xs text-foreground-muted">{activity.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Pending Approvals */}
        <Card className="lg:col-span-2" data-testid="dashboard-live-list">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Pending Worker Approvals</CardTitle>
              <CardDescription>Workers waiting for profile verification.</CardDescription>
            </div>
            <button
              onClick={() => {
                window.location.href = '/admin/workers';
              }}
              className="text-sm text-primary hover:underline font-medium"
            >
              View All
            </button>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                  <TableRow>
                    <TableHead scope="col">Worker</TableHead>
                    <TableHead scope="col">Service</TableHead>
                    <TableHead scope="col">Date Applied</TableHead>
                    <TableHead scope="col" className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableSkeleton rows={4} columns={[{}, {}, {}, { className: 'text-right' }]} />
                  ) : pendingWorkers.length > 0 ? (
                    pendingWorkers.map((worker) => (
                      <TableRow key={worker.id}>
                        <TableCell>
                          <div className="flex items-center">
                            <div className="w-8 h-8 rounded-full bg-surface-300 mr-3 flex items-center justify-center text-xs font-bold text-foreground-lighter">
                              {worker.name.charAt(0)}
                            </div>
                            <div>
                              <div className="font-medium text-foreground">{worker.name}</div>
                              <div className="text-foreground-lighter text-xs">{worker.email}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-foreground-light">{worker.category}</TableCell>
                        <TableCell className="text-foreground-lighter">{worker.registeredDate}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end space-x-2">
                            <button
                              onClick={() => handleReviewWorker(worker, 'APPROVED')}
                              className="text-success hover:bg-success/10 p-1.5 rounded-md transition-colors"
                              title="Approve"
                            >
                              <CheckCircle className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleReviewWorker(worker, 'REJECTED')}
                              className="text-danger hover:bg-danger/10 p-1.5 rounded-md transition-colors"
                              title="Reject"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow hover={false}>
                      <TableCell colSpan="4" className="py-6 text-center text-foreground-lighter">
                        No workers awaiting verification.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
          </CardContent>
        </Card>
      </div>

      {/* Additional Widgets Row */}
      <div className="grid gap-6 md:grid-cols-2 mt-2">
        {/* Recent Registrations */}
        <Card data-testid="dashboard-live-list">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Recent Registrations</CardTitle>
                <CardDescription>Latest users who joined A-yos.</CardDescription>
              </div>
              <div className="p-2 bg-surface-200 rounded-lg">
                <UserPlus className="size-4 text-foreground-muted" strokeWidth={1.5} />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentUsers.map((recentUser) => (
                <div
                  key={recentUser.id}
                  className="flex items-center justify-between border-b border-border last:border-0 pb-3 last:pb-0"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-full bg-surface-200 flex items-center justify-center text-foreground-lighter font-medium">
                      {recentUser.name.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{recentUser.name}</p>
                      <p className="text-xs text-foreground-lighter">Joined {recentUser.registeredAt}</p>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    Customer
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* System Notifications */}
        <Card data-testid="dashboard-live-list">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>System Notifications</CardTitle>
                <CardDescription>Important alerts and updates.</CardDescription>
              </div>
              <div className="p-2 bg-surface-200 rounded-lg">
                <Bell className="size-4 text-foreground-muted" strokeWidth={1.5} />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {systemNotifications.map((notification) => (
                <div
                  key={notification.id}
                  className="flex items-start space-x-3 p-3 bg-info/5 border border-info/20 rounded-lg"
                >
                  <div className="p-1.5 bg-info/10 text-info rounded-md">
                    <Bell size={16} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-info">{notification.title}</p>
                    <p className="text-xs text-foreground-light mt-1">{notification.message}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
