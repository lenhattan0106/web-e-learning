"use client";

import * as React from "react";
import {
  Bar,
  Line,
  Area,
  ComposedChart,
  AreaChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Legend,
  ResponsiveContainer,
  BarChart,
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
import { Wallet, TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { EmptyChartState } from "./EmptyChartState";
import type { SystemRevenueData } from "@/app/data/admin/get-system-revenue-stats";

interface SystemRevenueChartProps {
  data: SystemRevenueData[];
  growth?: number;
  granularity?: "day" | "week" | "month";
  className?: string;
}

const chartConfig = {
  premiumRevenue: {
    label: "Doanh thu Premium",
    color: "#f59e0b", // Amber
  },
  platformFee: {
    label: "Phí sàn (5%)",
    color: "#3b82f6", // Blue
  },
  total: {
    label: "Tổng dòng tiền",
    color: "#10b981", // Emerald
  },
} satisfies ChartConfig;

// Format currency helper
const formatCurrency = (val: number) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(val);

const formatShortCurrency = (val: number) => {
  if (val === 0) return "0";
  if (val >= 1000000) return `${(val / 1000000).toFixed(1)}tr`;
  if (val >= 1000) return `${(val / 1000).toFixed(0)}k`;
  return `${val}`;
};

export function SystemRevenueChart({ 
  data, 
  growth, 
  granularity = "month",
  className 
}: SystemRevenueChartProps) {
  const chartId = React.useId();

  // ✅ MOVED HOOKS UP: Calculate totals before any conditional return
  const totals = React.useMemo(() => ({
    premium: data.reduce((acc, curr) => acc + curr.premiumRevenue, 0),
    platform: data.reduce((acc, curr) => acc + curr.platformFee, 0),
    total: data.reduce((acc, curr) => acc + curr.total, 0),
  }), [data]);

  // ✅ MOVED HOOKS UP: Determine chart configuration based on granularity
  const xAxisConfig = React.useMemo(() => {
    if (granularity === "day") {
      return {
        angle: 0,
        interval: data.length > 20 ? "preserveStartEnd" : 0, // Avoid clutter for 30 days
        minTickGap: 30, // Minimum gap between ticks
        tickFormatter: (value: string) => {
           // Value format: 15/01
           return value;
        }
      };
    } else if (granularity === "week") {
       return {
          angle: 0,
          interval: 0,
          minTickGap: 30,
          tickFormatter: (value: string) => value // Already formatted as "Tuần..." or compact date
       }
    }
    return {
      angle: 0,
      interval: 0,
      minTickGap: 30,
      tickFormatter: (value: string) => value
    };
  }, [granularity, data.length]);

  
  const isEmpty = data.length === 0;

  if (isEmpty) {
      return (
        <Card className={cn("shadow-md border-border/60", className)}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5 text-emerald-500" />
              Dòng tiền hệ thống
            </CardTitle>
            <CardDescription>Tổng hợp doanh thu theo thời gian</CardDescription>
          </CardHeader>
          <CardContent>
             <EmptyChartState 
               icon="chart"
               title="Chưa có dữ liệu"
               message="Không có dữ liệu dòng tiền trong khoảng thời gian này"
             />
          </CardContent>
        </Card>
      )
  }

  const isZeroRevenue = totals.total === 0;

  const renderChart = () => {
    if (granularity === "week" || (granularity === "day" && data.length > 60)) {
        return (
          <AreaChart
             data={data}
             margin={{ left: 12, right: 12, top: 20, bottom: 0 }}
          >
             <defs>
                <linearGradient id="fillTotal" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-total)" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="var(--color-total)" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="fillPremium" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-premiumRevenue)" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="var(--color-premiumRevenue)" stopOpacity={0}/>
                </linearGradient>
             </defs>
             <CartesianGrid vertical={false} strokeDasharray="3 3" />
             <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                tick={{ fontSize: 11 }}
                minTickGap={xAxisConfig.minTickGap}
             />
             <YAxis
                tickLine={false}
                axisLine={false}
                tickFormatter={formatShortCurrency}
                tick={{ fontSize: 11 }}
                width={40}
             />
             <ChartTooltip content={<ChartTooltipContent indicator="dot" />} />
             <Legend verticalAlign="top" height={36} iconType="circle" />
             <Area
                dataKey="total"
                type="monotone"
                fill="url(#fillTotal)"
                fillOpacity={0.4}
                stroke="var(--color-total)"
                strokeWidth={2}
                name="Tổng dòng tiền"
             />
             <Area
                dataKey="premiumRevenue"
                type="monotone"
                fill="url(#fillPremium)"
                fillOpacity={0.4}
                stroke="var(--color-premiumRevenue)"
                strokeWidth={2}
                name="Premium"
             />
             {/* Platform fee is usually small, maybe keep as line or stack area if needed. For now Area is good enough */}
          </AreaChart>
        )
    }

    // Case 2: Standard 30 Days or Months -> Composed (Bar + Line)
    return (
      <ComposedChart
        data={data}
        margin={{ 
          left: 12, 
          right: 12, 
          top: 20, 
          bottom: 0
        }}
        barGap={2}
      >
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis
          dataKey="label"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          tick={{ fontSize: 11 }}
          interval={xAxisConfig.interval as any}
          minTickGap={xAxisConfig.minTickGap}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          tickFormatter={formatShortCurrency}
          tick={{ fontSize: 11 }}
        />
        <ChartTooltip
          content={
            <ChartTooltipContent
              hideLabel={false}
              formatter={(value, name) => (
                <div className="flex items-center justify-between gap-4 w-full">
                  <span className="text-muted-foreground">
                    {chartConfig[name as keyof typeof chartConfig]?.label || name}
                  </span>
                  <span className="font-semibold">{formatCurrency(value as number)}</span>
                </div>
              )}
            />
          }
        />
        <Legend
          verticalAlign="top"
          height={36}
          iconType="circle"
          formatter={(value) => chartConfig[value as keyof typeof chartConfig]?.label || value}
        />
        <Bar 
          dataKey="premiumRevenue" 
          fill="var(--color-premiumRevenue)" 
          radius={[4, 4, 0, 0]} 
          stackId="revenue"
          maxBarSize={40}
        />
        <Bar 
          dataKey="platformFee" 
          fill="var(--color-platformFee)" 
          radius={[4, 4, 0, 0]} 
          stackId="revenue"
          maxBarSize={40}
        />
        <Line 
          type="monotone" 
          dataKey="total" 
          stroke="var(--color-total)" 
          strokeWidth={3}
          dot={{ r: 4, fill: "var(--color-total)" }}
          activeDot={{ r: 6 }}
        />
      </ComposedChart>
    );
  };

  return (
    <Card className={cn("shadow-md border-border/60", className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wallet className="h-5 w-5 text-emerald-500" />
          Dòng tiền hệ thống
          {growth !== undefined && (
            <span className={cn(
              "ml-2 text-sm font-normal flex items-center gap-1",
              growth >= 0 ? "text-emerald-600" : "text-red-600"
            )}>
              {growth >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
              {growth >= 0 ? "+" : ""}{growth}%
            </span>
          )}
        </CardTitle>
        <CardDescription className="flex flex-wrap gap-4">
          <span>
            Tổng: <strong className="text-emerald-600">{formatCurrency(totals.total)}</strong>
          </span>
          <span className="text-amber-600">
            Premium: {formatCurrency(totals.premium)}
          </span>
          <span className="text-blue-600">
            Phí sàn: {formatCurrency(totals.platform)}
          </span>
        </CardDescription>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        <ChartContainer id={chartId} config={chartConfig} className="aspect-auto h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
             {renderChart()}
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
