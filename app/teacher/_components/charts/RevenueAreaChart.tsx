"use client";

import * as React from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  XAxis,
  YAxis,
  ReferenceLine,
  ResponsiveContainer,
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
import { cn } from "@/lib/utils";

interface RevenueChartData {
  label: string;
  value: number;
  prevValue?: number;
  fullDate?: string;
  prevDateLabel?: string;
}

interface RevenueAreaChartProps {
  data: RevenueChartData[];
  avgValue: number;
  granularity: "day" | "month";
  totalCourses?: number;
}

const chartConfig = {
  value: {
    label: "Doanh thu",
    color: "hsl(217 91% 60%)",
  },
} satisfies ChartConfig;

export function RevenueAreaChart({ data, avgValue, granularity, totalCourses = 0 }: RevenueAreaChartProps) {
  const chartId = React.useId();
  
  // Calculate total
  const total = React.useMemo(
    () => data.reduce((acc, curr) => acc + curr.value, 0),
    [data]
  );

  // Format currency
  const formatCurrency = (val: number) =>
    new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(val);

  // Dynamic interval for responsive X-axis
  const xAxisInterval = React.useMemo(() => {
    if (data.length > 24) return Math.ceil(data.length / 6);
    if (data.length > 12) return "preserveStartEnd";
    return 0;
  }, [data.length]);

  // Empty state handling
  // Case 1: New Teacher (No courses) -> Prompt to create
  if (totalCourses === 0 && (data.length === 0 || total === 0)) {
    return (
      <Card className="shadow-md border-border/60">
        <CardHeader>
          <CardTitle>Doanh thu theo thời gian</CardTitle>
          <CardDescription>Chưa có dữ liệu doanh thu</CardDescription>
        </CardHeader>
        <CardContent className="h-[300px] flex items-center justify-center">
          <div className="text-center text-muted-foreground">
            <p className="text-sm">Bắt đầu bán khóa học để thấy dữ liệu tại đây</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Case 2: Active Teacher (Has courses) -> Render Chart (even if 0)
  return (
    <Card className={cn("shadow-md border-border/60", total === 0 && "bg-blue-50/50 border-blue-200")}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Doanh thu theo thời gian
        </CardTitle>
        <CardDescription>
          Tổng: {formatCurrency(total)} | Trung bình: {formatCurrency(avgValue)}/{granularity === "month" ? "tháng" : "ngày"}
        </CardDescription>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        <ChartContainer id={chartId} config={chartConfig} className="aspect-auto h-[300px] w-full">
          <AreaChart
            data={data}
            margin={{ left: 12, right: 12, top: 20, bottom: 0 }}
          >
            <defs>
              <linearGradient id={`fillRevenue-${chartId}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(217 91% 60%)" stopOpacity={0.85} />
                <stop offset="50%" stopColor="hsl(217 91% 60%)" stopOpacity={0.4} />
                <stop offset="95%" stopColor="hsl(217 91% 60%)" stopOpacity={0.05} />
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
            />
            <ChartTooltip
              cursor={{ strokeDasharray: "3 3" }}
              content={
                <ChartTooltipContent
                  className="w-[240px]"
                  formatter={(value, name, item) => {
                    const payload = item.payload as RevenueChartData;
                    const prevValue = payload.prevValue;
                    const dateLabel = payload.fullDate || payload.label;
                    const prevDateLabel = payload.prevDateLabel ? `(${payload.prevDateLabel})` : "";
                    
                    const currentVal = Number(value);
                    const diff = prevValue ? currentVal - prevValue : 0;
                    const diffPercent = prevValue && prevValue > 0 
                      ? Math.round((diff / prevValue) * 100) 
                      : (prevValue === 0 && currentVal > 0 ? 100 : 0);
                    
                    return (
                      <div className="flex flex-col gap-2">
                        <div className="font-bold text-sm border-b pb-1 text-slate-700">Chi tiết {dateLabel}</div>
                        <div className="flex justify-between items-center text-xs">
                           <span className="text-slate-500">Hiện tại:</span>
                           <span className="font-medium text-blue-600">{formatCurrency(currentVal)}</span>
                        </div>
                        {prevValue !== undefined && (
                          <div className="flex justify-between items-center text-xs opacity-80">
                             <span className="text-slate-500">Kỳ trước {prevDateLabel}:</span>
                             <span className="font-medium text-slate-600">{formatCurrency(prevValue)}</span>
                          </div>
                        )}
                        {prevValue !== undefined && (
                           <div className={`text-[11px] font-bold flex items-center ${diff >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {diff >= 0 ? "▲" : "▼"} {Math.abs(diffPercent)}% so với kỳ trước
                           </div>
                        )}
                      </div>
                    );
                  }}
                />
              }
            />
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
            <Area
              dataKey="value"
              type="monotone"
              fill={`url(#fillRevenue-${chartId})`}
              stroke="hsl(217 91% 60%)"
              strokeWidth={2.5}
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
