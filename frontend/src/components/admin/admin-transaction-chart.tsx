"use client";

import { Bar, BarChart, CartesianGrid, XAxis } from "recharts";
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import type { AdminTimeSeriesPoint } from "@/types";

interface AdminTransactionChartProps {
  data: AdminTimeSeriesPoint[];
  height?: number;
}

const chartConfig = {
  volume: {
    label: "Transaction Volume",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig;

export function AdminTransactionChart({ data }: AdminTransactionChartProps) {
  // Transform AdminTimeSeriesPoint[] to the format expected by the chart
  const chartData = data.map(item => ({
    date: item.label,
    volume: item.value,
  }));

  return (
    <ChartContainer
      className="aspect-auto h-[250px] w-full"
      config={chartConfig}
    >
      <BarChart
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
          dataKey="date"
          minTickGap={32}
          tickLine={false}
          tickMargin={8}
        />
        <ChartTooltip
          content={
            <ChartTooltipContent
              className="w-[150px]"
              nameKey="volume"
              formatter={(value) => [`${value} transactions`, "Volume"]}
            />
          }
        />
        <Bar dataKey="volume" fill={`var(--color-volume)}`} />
      </BarChart>
    </ChartContainer>
  );
}
