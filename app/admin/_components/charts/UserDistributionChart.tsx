"use client";

import * as React from "react";
import { Pie, PieChart, Label, Cell } from "recharts";
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
import { Users, Crown } from "lucide-react";
import { cn } from "@/lib/utils";
import { EmptyChartState } from "./EmptyChartState";

interface UserDistributionData {
  freeUsers: number;
  premiumUsers: number;
  total: number;
}

interface UserDistributionChartProps {
  data: UserDistributionData;
  className?: string;
}

const chartConfig = {
  free: {
    label: "Tài khoản thường",
    color: "#94a3b8", // Slate 400
  },
  premium: {
    label: "Premium",
    color: "#f59e0b", // Amber 500
  },
} satisfies ChartConfig;

export function UserDistributionChart({ data, className }: UserDistributionChartProps) {
  const chartId = React.useId();

  const chartData = React.useMemo(() => [
    { browser: "free", visitors: data.freeUsers, fill: "#94a3b8" },
    { browser: "premium", visitors: data.premiumUsers, fill: "#f59e0b" },
  ], [data]);

  const premiumPercentage = data.total > 0 
    ? ((data.premiumUsers / data.total) * 100).toFixed(1)
    : 0;

  if (data.total === 0) {
    return (
      <Card className={cn("flex flex-col shadow-md border-border/60", className)}>
         <CardHeader>
          <CardTitle className="text-center">Phân bố người dùng</CardTitle>
        </CardHeader>
        <CardContent className="flex-1 pb-0">
          <EmptyChartState 
             icon="chart"
             title="Chưa có người dùng"
             message="Hệ thống chưa ghi nhận tài khoản nào"
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("flex flex-col shadow-md border-border/60", className)}>
      <CardHeader className="items-center pb-0">
        <CardTitle className="text-lg">Phân bố người dùng</CardTitle>
        <CardDescription>Tỷ lệ Premium / Tổng số</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 pb-0">
        <ChartContainer
          id={chartId}
          config={chartConfig}
          className="mx-auto aspect-square max-h-[250px]"
        >
          <PieChart>
            <ChartTooltip
              cursor={false}
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const item = payload[0];
                  const config = chartConfig[item.name as keyof typeof chartConfig];
                  
                  return (
                    <div className="bg-white p-2 border rounded-lg shadow-sm min-w-[150px]">
                       <div className="flex items-center justify-between gap-4">
                          <div className="flex items-center gap-2">
                            <div 
                              className="h-2 w-2 rounded-full"
                              style={{ backgroundColor: item.payload.fill }} 
                            />
                            <span className="text-sm text-muted-foreground">
                              {config?.label || item.name}
                            </span>
                          </div>
                          <span className="font-bold font-mono">
                            {item.value}
                          </span>
                       </div>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Pie
              data={chartData}
              dataKey="visitors"
              nameKey="browser"
              innerRadius={60}
              strokeWidth={5}
            >
              <Label
                content={({ viewBox }) => {
                  if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                    return (
                      <text
                        x={viewBox.cx}
                        y={viewBox.cy}
                        textAnchor="middle"
                        dominantBaseline="middle"
                      >
                        <tspan
                          x={viewBox.cx}
                          y={viewBox.cy}
                          className="fill-foreground text-3xl font-bold"
                        >
                          {data.total.toLocaleString()}
                        </tspan>
                        <tspan
                          x={viewBox.cx}
                          y={(viewBox.cy || 0) + 24}
                          className="fill-muted-foreground"
                        >
                          Người dùng
                        </tspan>
                      </text>
                    );
                  }
                }}
              />
            </Pie>
          </PieChart>
        </ChartContainer>
      </CardContent>
      <div className="p-6 pt-0">
         <div className="flex items-center justify-center gap-6 text-sm">
            <div className="flex items-center gap-2">
               <div className="h-3 w-3 rounded-full bg-slate-400" />
               <span className="text-muted-foreground flex items-center gap-1">
                  <Users className="h-3.5 w-3.5" />
                  Free: <strong>{data.freeUsers}</strong>
               </span>
            </div>
            <div className="flex items-center gap-2">
               <div className="h-3 w-3 rounded-full bg-amber-500" />
               <span className="text-amber-600 font-medium flex items-center gap-1">
                  <Crown className="h-3.5 w-3.5" />
                  Premium: <strong>{data.premiumUsers}</strong>
               </span>
            </div>
         </div>
         <div className="mt-4 text-center text-sm text-muted-foreground">
            Tỷ lệ chuyển đổi Premium: <strong className="text-amber-600">{premiumPercentage}%</strong>
         </div>
      </div>
    </Card>
  );
}
