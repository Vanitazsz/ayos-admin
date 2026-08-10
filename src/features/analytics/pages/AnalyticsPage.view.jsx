import {
  TrendingUp,
  Users,
  DollarSign,
  CheckCircle2,
  BarChart3,
  Repeat,
  Wallet,
} from 'lucide-react';
import { money } from '../../../services/adminShared';
import StatCard from '../../../components/ui/StatCard';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '../../../components/ui/Card';
import Select from '../../../components/ui/Select';
import { ChartTooltip, chartTick, chartGridStroke, chartCursor } from '../../../components/ui/ChartTooltip';
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

export function AnalyticsView({ model }) {
  const { kpis, monthlyRevenue, topServices, totalRevenue, mau, avgWorkerEarnings } = model;
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Business Analytics</h1>
          <p className="text-foreground-lighter mt-1">High-level metrics and growth trends</p>
        </div>
        <Select className="w-44" defaultValue="last-12">
          <option value="last-12">Last 12 Months</option>
          <option value="last-6">Last 6 Months</option>
          <option value="this-year">This Year</option>
          <option value="all-time">All Time</option>
        </Select>
      </div>

      {/* Primary Metrics (KPIs) */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi, index) => (
          <StatCard
            key={index}
            title={kpi.label}
            value={kpi.value}
            icon={kpiIcons[index] ?? TrendingUp}
            trend={kpi.positive ? 'up' : 'down'}
            trendValue={kpi.trend}
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
            <h2 className="text-xl font-medium text-foreground">{money(totalRevenue)}</h2>
          </CardHeader>
          <CardContent>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyRevenue} margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
                  <CartesianGrid vertical={false} stroke={chartGridStroke} />
                  <XAxis
                    dataKey="month"
                    axisLine={false}
                    tickLine={false}
                    tickMargin={8}
                    tick={chartTick}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    width={40}
                    tickMargin={8}
                    tick={chartTick}
                  />
                  <Tooltip
                    cursor={chartCursor}
                    content={<ChartTooltip formatter={(value) => `₱${value}k`} />}
                  />
                  <Bar
                    dataKey="value"
                    name="Revenue"
                    fill="var(--chart-1)"
                    radius={[2, 2, 1, 1]}
                    maxBarSize={48}
                    animationDuration={300}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Secondary Chart (Top Services) */}
        <Card>
          <CardHeader>
            <CardTitle>Top Services</CardTitle>
            <CardDescription>Most requested services</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={topServices}
                  layout="vertical"
                  margin={{ top: 0, right: 8, left: 0, bottom: 0 }}
                >
                  <XAxis type="number" hide />
                  <YAxis
                    type="category"
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    width={110}
                    tick={chartTick}
                  />
                  <Tooltip
                    cursor={chartCursor}
                    content={<ChartTooltip formatter={(value) => `${value}%`} />}
                  />
                  <Bar
                    dataKey="percentage"
                    name="Requests"
                    fill="var(--info)"
                    radius={[0, 2, 2, 0]}
                    maxBarSize={16}
                    animationDuration={300}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Extra Analytics Cards */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Monthly Active Users (MAU)</CardTitle>
            <CardDescription>Compared to previous month</CardDescription>
          </CardHeader>
          <CardContent className="flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-success/10">
              <Users className="size-6 text-success" />
            </div>
            <div className="flex items-baseline gap-3">
              <span className="text-2xl font-normal leading-tight text-foreground">
                {mau ?? '—'}
              </span>
              <span className="text-xs font-medium text-success">Live</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Avg. Worker Earnings / Mo</CardTitle>
            <CardDescription>Across all verified workers</CardDescription>
          </CardHeader>
          <CardContent className="flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-warning/10">
              <Wallet className="size-6 text-warning-600 dark:text-warning-400" />
            </div>
            <div className="flex items-baseline gap-3">
              <span className="text-2xl font-normal leading-tight text-foreground">
                {avgWorkerEarnings != null ? money(avgWorkerEarnings) : '—'}
              </span>
              <span className="text-xs font-medium text-success">Annual avg</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
