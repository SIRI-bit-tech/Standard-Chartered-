"use client";

import { CartesianGrid, Line, LineChart, XAxis } from "recharts";
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import type { AdminTimeSeriesPoint } from "@/types";

interface AdminUserGrowthChartProps {
  data: AdminTimeSeriesPoint[];
  height?: number;
}

const chartConfig = {
  users: {
    label: "New Users",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig;

export function AdminUserGrowthChart({ data }: AdminUserGrowthChartProps) {
  // Transform AdminTimeSeriesPoint[] to the format expected by the chart
  const chartData = data.map(item => ({
    month: item.label,
    users: item.value,
  }));

  return (
    <ChartContainer config={chartConfig}>
      <LineChart
        accessibilityLayer
        data={chartData}
        margin={{
          left: 12,
          right: 12,
        }}
      >
        <CartesianGrid vertical={false} />
        <XAxis
          axisLine={false}
          dataKey="month"
          tickFormatter={(value) => value.slice(0, 3)}
          tickLine={false}
          tickMargin={8}
        />
        <ChartTooltip
          content={<ChartTooltipContent hideLabel />}
          cursor={false}
          formatter={(value) => [`${value} users`, "New Registrations"]}
        />
        <Line
          dataKey="users"
          dot={false}
          stroke="var(--color-users)"
          strokeWidth={2}
          type="natural"
        />
      </LineChart>
    </ChartContainer>
  );
}
