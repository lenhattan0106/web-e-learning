"use client";

import * as React from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  XAxis,
  YAxis,
  ReferenceLine,
} from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Crown, TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface PremiumRevenueChartData {
  label: string;
  value: number;
  prevValue?: number;
  fullDate?: string;
  prevDateLabel?: string;
}

interface PremiumRevenueChartProps {
  data: PremiumRevenueChartData[];
  avgValue: number;
  granularity: "day" | "week" | "month";
  className?: string;
}

const chartConfig = {
  value: {
    label: "Doanh thu Premium",
    color: "#f59e0b",
  },
} satisfies ChartConfig;

const formatCurrency = (val: number) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(val);

export function PremiumRevenueChart({ data, avgValue, granularity, className }: PremiumRevenueChartProps) {
  const chartId = React.useId();

  // Calculate total
  const total = React.useMemo(
    () => data.reduce((acc, curr) => acc + curr.value, 0),
    [data]
  );

  // Dynamic interval for responsive X-axis
  const xAxisInterval = React.useMemo(() => {
    if (data.length > 24) return Math.ceil(data.length / 6);
    if (data.length > 12) return "preserveStartEnd";
    return 0;
  }, [data.length]);

  // REMOVED: Empty state - Always show chart structure with zero values
  // This provides a more professional appearance and consistent UX

  return (
    <Card className={cn("shadow-md border-border/60", className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Crown className="h-5 w-5 text-amber-500" />
          Doanh thu Premium
        </CardTitle>
        <CardDescription>
          Tổng: <strong className="text-amber-600">{formatCurrency(total)}</strong>
          <span className="mx-2">|</span>
          Trung bình: {formatCurrency(avgValue)}/{granularity === "month" ? "tháng" : granularity === "week" ? "tuần" : "ngày"}
        </CardDescription>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        <ChartContainer id={chartId} config={chartConfig} className="aspect-auto h-[300px] w-full">
          <AreaChart
            data={data}
            margin={{ left: 12, right: 12, top: 20, bottom: 0 }}
          >
            <defs>
              <linearGradient id={`fillPremium-${chartId}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.85} />
                <stop offset="50%" stopColor="#f59e0b" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} strokeDasharray="3 3" />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              interval={xAxisInterval as number | "preserveStartEnd"}
              tick={{ fontSize: 11 }}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickFormatter={(val) => {
                if (val === 0) return "0";
                if (val >= 1000000) return `${(val / 1000000).toFixed(1)}tr`;
                if (val >= 1000) return `${(val / 1000).toFixed(0)}k`;
                return `${val}`;
              }}
              tick={{ fontSize: 11 }}
              width={50}
              domain={[0, 'auto']}
            />
            <ChartTooltip
              cursor={{ strokeDasharray: "3 3" }}
              content={
                <ChartTooltipContent
                  className="w-[240px] bg-white shadow-lg border"
                  formatter={(value, name, item) => {
                    const payload = item.payload as PremiumRevenueChartData;
                    const prevValue = payload.prevValue;
                    const dateLabel = payload.label;
                    const prevDateLabel = payload.prevDateLabel ? `(${payload.prevDateLabel})` : "";

                    const currentVal = Number(value);
                    const diff = prevValue ? currentVal - prevValue : 0;
                    const diffPercent = prevValue && prevValue > 0
                      ? Math.round((diff / prevValue) * 100)
                      : (prevValue === 0 && currentVal > 0 ? 100 : 0);

                    return (
                      <div className="flex flex-col gap-2">
                        <div className="font-bold text-sm border-b pb-1 text-slate-700">
                          Chi tiết {dateLabel}
                        </div>
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-slate-500">Hiện tại:</span>
                          <span className="font-medium text-amber-600">{formatCurrency(currentVal)}</span>
                        </div>
                        {prevValue !== undefined && (
                          <div className="flex justify-between items-center text-xs opacity-80">
                            <span className="text-slate-500">Kỳ trước {prevDateLabel}:</span>
                            <span className="font-medium text-slate-600">{formatCurrency(prevValue)}</span>
                          </div>
                        )}
                        {prevValue !== undefined && (
                          <div className={`text-[11px] font-bold flex items-center gap-1 ${diff >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {diff >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                            {diff >= 0 ? "+" : ""}{Math.abs(diffPercent)}% so với kỳ trước
                          </div>
                        )}
                      </div>
                    );
                  }}
                />
              }
            />
            {avgValue > 0 && (
              <ReferenceLine
                y={avgValue}
                stroke="#f59e0b"
                strokeDasharray="5 5"
                label={{
                  value: "TB",
                  position: "right",
                  fill: "#f59e0b",
                  fontSize: 12,
                }}
              />
            )}
            <Area
              dataKey="value"
              type="monotone"
              fill={`url(#fillPremium-${chartId})`}
              stroke="#f59e0b"
              strokeWidth={2.5}
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
