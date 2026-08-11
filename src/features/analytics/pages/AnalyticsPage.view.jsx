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
        <div className="w-44">
          <Select defaultValue="last-12" aria-label="Analytics time range">
            <option value="last-12">Last 12 Months</option>
            <option value="last-6">Last 6 Months</option>
            <option value="this-year">This Year</option>
            <option value="all-time">All Time</option>
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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <StatCard
          title="Monthly Active Users (MAU)"
          value={mau ?? '—'}
          icon={Users}
          trend="up"
          trendValue="Live"
          subtitle="Compared to previous month"
        />
        <StatCard
          title="Avg. Worker Earnings / Mo"
          value={avgWorkerEarnings != null ? money(avgWorkerEarnings) : '—'}
          icon={Wallet}
          trend="up"
          trendValue="Annual avg"
          subtitle="Across all verified workers"
        />
      </div>
    </div>
  );
}
