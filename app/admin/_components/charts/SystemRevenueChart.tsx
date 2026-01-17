"use client";

import * as React from "react";
import {
  Bar,
  Line,
  ComposedChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Legend,
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
import { Wallet, TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { EmptyChartState } from "./EmptyChartState";

interface SystemRevenueChartData {
  label: string;
  date: string;
  premiumRevenue: number;
  platformFee: number;
  total: number;
}

interface SystemRevenueChartProps {
  data: SystemRevenueChartData[];
  growth?: number;
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

export function SystemRevenueChart({ data, growth, className }: SystemRevenueChartProps) {
  const chartId = React.useId();

  // Calculate totals
  const totals = React.useMemo(() => ({
    premium: data.reduce((acc, curr) => acc + curr.premiumRevenue, 0),
    platform: data.reduce((acc, curr) => acc + curr.platformFee, 0),
    total: data.reduce((acc, curr) => acc + curr.total, 0),
  }), [data]);

  // Empty state
  if (data.length === 0 || totals.total === 0) {
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
            title="Chưa có doanh thu"
            message="Không có dữ liệu dòng tiền trong khoảng thời gian này"
          />
        </CardContent>
      </Card>
    );
  }

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
            <ComposedChart
              data={data}
              margin={{ left: 12, right: 12, top: 20, bottom: 0 }}
            >
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                tick={{ fontSize: 11 }}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickFormatter={formatShortCurrency}
                tick={{ fontSize: 11 }}
                width={50}
              />
              <ChartTooltip
                cursor={{ fill: "rgba(0, 0, 0, 0.05)" }}
                content={
                  <ChartTooltipContent
                    className="w-[220px] bg-white shadow-lg border"
                    formatter={(value, name, item) => {
                      const payload = item.payload as SystemRevenueChartData;
                      const dataKey = item.dataKey as string;
                      
                      if (dataKey === "total") {
                        return (
                          <div className="flex flex-col gap-2 p-1">
                            <div className="font-bold text-sm border-b pb-1 text-slate-700">
                              📅 {payload.label}
                            </div>
                            <div className="flex justify-between items-center text-xs">
                              <span className="text-amber-600 flex items-center gap-1">
                                <span className="w-2 h-2 rounded-full bg-amber-500" />
                                Premium:
                              </span>
                              <span className="font-medium">{formatCurrency(payload.premiumRevenue)}</span>
                            </div>
                            <div className="flex justify-between items-center text-xs">
                              <span className="text-blue-600 flex items-center gap-1">
                                <span className="w-2 h-2 rounded-full bg-blue-500" />
                                Phí sàn (5%):
                              </span>
                              <span className="font-medium">{formatCurrency(payload.platformFee)}</span>
                            </div>
                            <div className="flex justify-between items-center text-sm font-bold pt-1 border-t">
                              <span className="text-emerald-600">Tổng:</span>
                              <span className="text-emerald-600">{formatCurrency(payload.total)}</span>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                }
              />
              <Legend
                verticalAlign="top"
                align="right"
                wrapperStyle={{ paddingBottom: 10 }}
                formatter={(value: string) => (
                  <span className="text-sm font-medium">{value}</span>
                )}
              />
              {/* Stacked Bars: Premium + Platform Fee */}
              <Bar
                dataKey="premiumRevenue"
                stackId="revenue"
                fill="#f59e0b"
                radius={[0, 0, 0, 0]}
                maxBarSize={45}
                name="Premium"
              />
              <Bar
                dataKey="platformFee"
                stackId="revenue"
                fill="#3b82f6"
                radius={[4, 4, 0, 0]}
                maxBarSize={45}
                name="Phí sàn"
              />
              {/* Line: Total Cash Flow */}
              <Line
                type="monotone"
                dataKey="total"
                stroke="#10b981"
                strokeWidth={2.5}
                dot={{ fill: "#10b981", strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, fill: "#10b981" }}
                name="Tổng"
              />
            </ComposedChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
