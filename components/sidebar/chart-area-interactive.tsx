"use client";

import * as React from "react";
import { Bar, BarChart, CartesianGrid, XAxis, ReferenceLine, Tooltip, ResponsiveContainer } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";

interface ChartAreaInteractiveProps {
  data: { date: string; enrollments: number; revenue: number }[];
  metric?: "enrollments" | "revenue"; // Toggle prop
}

const chartConfig = {
    enrollments: {
      label: "Khóa học đã bán",
      color: "#2563eb", // blue-600
    },
    revenue: {
      label: "Doanh thu",
      color: "#16a34a", // green-600
    }
} satisfies ChartConfig;

export function ChartAreaInteractive({ data, metric = "enrollments" }: ChartAreaInteractiveProps) {
  // Use a stable ID for hydration consistency
  const chartId = React.useId();

  // Calculate stats for header
  const totalValue = React.useMemo(() => 
    data.reduce((acc, curr) => acc + (curr[metric] || 0), 0)
  , [data, metric]);

  const activeLabel = chartConfig[metric].label;
  const activeColor = chartConfig[metric].color;

  // Formatter for header display
  const formatValue = (val: number) => {
      if (metric === "revenue") return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(val);
      return val.toString();
  }

  return (
    <Card className="@container/card shadow-md border-border/60">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
            {activeLabel} theo thời gian
        </CardTitle>
        <CardDescription>
          Tổng: {formatValue(totalValue)} trong giai đoạn này
        </CardDescription>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        <ChartContainer id={chartId} config={chartConfig} className="aspect-auto h-[300px] w-full">
            <BarChart
              data={data}
              margin={{ left: 12, right: 12, top: 10, bottom: 0 }}
            >
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                minTickGap={32}
                tickFormatter={(value) => {
                  const date = new Date(value);
                  return date.toLocaleDateString("vi-VN", { month: "short", day: "numeric" });
                }}
              />
              <ChartTooltip
                  cursor={false}
                  content={<ChartTooltipContent className="w-[150px]" />}
               />
              <Bar 
                dataKey={metric} 
                fill={activeColor}
                radius={[4, 4, 0, 0]} 
                maxBarSize={60}
              />
            </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
