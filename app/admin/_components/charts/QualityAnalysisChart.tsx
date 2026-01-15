"use client";

import * as React from "react";
import {
  Line,
  LineChart,
  CartesianGrid,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Pie, PieChart, Cell, Label } from "recharts";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertTriangle, TrendingUp, TrendingDown, Star, Flag } from "lucide-react";
import { cn } from "@/lib/utils";
import { EmptyChartState } from "./EmptyChartState";

interface QualityTrendData {
  label: string;
  month: string;
  reports: number;
  resolved: number;
  avgRating: number;
}

interface ReportTypeData {
  label: string;
  value: number;
  color: string;
}

interface QualityAnalysisChartProps {
  trendData: QualityTrendData[];
  reportTypeData: ReportTypeData[];
  currentAvgRating: number;
  pendingReports: number;
  className?: string;
}

const trendChartConfig = {
  reports: {
    label: "Báo cáo mới",
    color: "#ef4444", // Red
  },
  resolved: {
    label: "Đã xử lý",
    color: "#22c55e", // Green
  },
} satisfies ChartConfig;

const pieChartConfig = {
  courseReports: {
    label: "Báo cáo khóa học ",
    color: "#ef4444",
  },
  commentReports: {
    label: "Báo cáo bình luận ",
    color: "#f97316",
  },
  pending: {
    label: "Chờ xử lý ",
    color: "#eab308",
  },
  resolved: {
    label: "Đã xử lý ",
    color: "#22c55e",
  },
} satisfies ChartConfig;

export function QualityAnalysisChart({ 
  trendData, 
  distributionByType = [], 
  distributionByStatus = [],
  currentAvgRating,
  pendingReports,
  className 
}: any) { 
  const chartId = React.useId();
  const [activeTab, setActiveTab] = React.useState<"trend" | "distribution">("trend");

  // Calculate totals
  const totals = React.useMemo(() => ({
    reports: trendData.reduce((acc: any, curr: any) => acc + curr.reports, 0),
    resolved: trendData.reduce((acc: any, curr: any) => acc + curr.resolved, 0),
  }), [trendData]);

  const resolutionRate = totals.reports > 0 
    ? Math.round((totals.resolved / totals.reports) * 100) 
    : 100;

  const isEmpty = trendData.length === 0 && distributionByType.length === 0;

  if (isEmpty) {
    return (
      <Card className={cn("shadow-md border-border/60", className)}>
         {/* ... Existing Empty State Header ... */}
         <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-rose-500" />
            Phân tích chất lượng
          </CardTitle>
          <CardDescription>Thống kê báo cáo và đánh giá theo thời gian</CardDescription>
        </CardHeader>
        <CardContent>
          <EmptyChartState 
            icon="alert"
            title="Chưa có dữ liệu chất lượng"
            message="Không có báo cáo hoặc đánh giá trong khoảng thời gian này"
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("shadow-md border-border/60", className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-rose-500" />
          Phân tích chất lượng
        </CardTitle>
        <CardDescription className="flex flex-wrap gap-4">
          <span className="flex items-center gap-1">
            <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
            Rating TB: <strong className="text-amber-600">{currentAvgRating && currentAvgRating.toFixed(1)}</strong>
          </span>
          <span className="flex items-center gap-1">
            <Flag className="h-3.5 w-3.5 text-rose-500" />
            Chờ xử lý: <strong className="text-rose-600">{pendingReports}</strong>
          </span>
          <span className="text-emerald-600">
            Tỷ lệ xử lý: <strong>{resolutionRate}%</strong>
          </span>
        </CardDescription>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "trend" | "distribution")}>
          <TabsList className="mb-4">
            <TabsTrigger value="trend" className="flex items-center gap-1">
              <TrendingUp className="h-3.5 w-3.5" />
              Xu hướng
            </TabsTrigger>
            <TabsTrigger value="distribution" className="flex items-center gap-1">
              <Flag className="h-3.5 w-3.5" />
              Phân loại và trạng thái
            </TabsTrigger>
          </TabsList>

          {/* Trend Line Chart */}
          <TabsContent value="trend">
             {/* Reuse existing Trend Chart logic */}
             <ChartContainer id={`${chartId}-trend`} config={trendChartConfig} className="aspect-auto h-[280px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trendData} margin={{ left: 12, right: 12, top: 20, bottom: 0 }}>
                    <CartesianGrid vertical={false} strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="label" 
                      tickLine={false} 
                      axisLine={false} 
                      tickMargin={8} 
                      tick={{ fontSize: 10 }}
                      interval="preserveStartEnd"
                      minTickGap={30}
                    />
                    <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11 }} width={40} allowDecimals={false} />
                    <ChartTooltip cursor={{ strokeDasharray: "3 3" }} content={<ChartTooltipContent className="w-[200px] bg-white shadow-lg border" />} />
                    <Legend verticalAlign="top" align="right" wrapperStyle={{ paddingBottom: 10 }} />
                    <Line type="monotone" dataKey="reports" stroke="#ef4444" strokeWidth={2} dot={{ fill: "#ef4444", r: 3 }} name="Báo cáo mới" />
                    <Line type="monotone" dataKey="resolved" stroke="#22c55e" strokeWidth={2} dot={{ fill: "#22c55e", r: 3 }} name="Đã xử lý" />
                  </LineChart>
                </ResponsiveContainer>
              </ChartContainer>
          </TabsContent>

          <TabsContent value="distribution">
            <div className="flex flex-col md:flex-row justify-center items-start gap-12 sm:gap-16">
               <div className="flex flex-col items-center w-full md:w-auto">
                  <h4 className="text-sm font-semibold mb-4 text-muted-foreground">Theo Loại Báo Cáo</h4>
                  <ChartContainer id={`${chartId}-type`} config={pieChartConfig} className="mx-auto aspect-square h-[200px] w-[200px]">
                    <PieChart>
                      <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel className="min-w-[180px]" />} />
                      <Pie data={distributionByType} dataKey="value" nameKey="label" innerRadius={55} outerRadius={80} strokeWidth={2} stroke="hsl(var(--background))">
                        {distributionByType.map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                        <Label
                          content={({ viewBox }) => {
                            if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                              const total = distributionByType.reduce((a: any, b: any) => a + b.value, 0);
                              return (
                                <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle" dominantBaseline="middle">
                                  <tspan x={viewBox.cx} y={viewBox.cy} className="fill-foreground text-2xl font-bold">{total}</tspan>
                                  <tspan x={viewBox.cx} y={(viewBox.cy || 0) + 20} className="fill-muted-foreground text-xs">Loại</tspan>
                                </text>
                              );
                            }
                          }}
                        />
                      </Pie>
                      <Legend 
                        verticalAlign="bottom" 
                        height={36} 
                        iconType="circle" 
                        wrapperStyle={{ fontSize: '12px', paddingTop: '20px' }}
                      />
                    </PieChart>
                  </ChartContainer>
               </div>

               <div className="flex flex-col items-center w-full md:w-auto">
                  <h4 className="text-sm font-semibold mb-4 text-muted-foreground">Theo Trạng Thái</h4>
                  <ChartContainer id={`${chartId}-status`} config={pieChartConfig} className="mx-auto aspect-square h-[200px] w-[200px]">
                    <PieChart>
                      <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel className="min-w-[180px]" />} />
                      <Pie 
                        data={[
                            ...(distributionByStatus.some((d: any) => d.label === "Chờ xử lý") 
                                ? [] 
                                : [{ label: "Chờ xử lý", value: pendingReports, color: "#eab308" }]),
                            ...distributionByStatus 
                        ].filter((item: any) => item.value > 0)} 
                        dataKey="value" 
                        nameKey="label" 
                        innerRadius={55} 
                        outerRadius={80} 
                        strokeWidth={2} 
                        stroke="hsl(var(--background))"
                      >
                        {[
                            ...(distributionByStatus.some((d: any) => d.label === "Chờ xử lý") 
                                ? [] 
                                : [{ label: "Chờ xử lý", value: pendingReports, color: "#eab308" }]),
                            ...distributionByStatus
                        ].filter((item: any) => item.value > 0).map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                        <Label
                          content={({ viewBox }) => {
                            if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                              const total = distributionByStatus.reduce((a: any, b: any) => a + b.value, 0) + pendingReports;
                              return (
                                <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle" dominantBaseline="middle">
                                  <tspan x={viewBox.cx} y={viewBox.cy} className="fill-foreground text-2xl font-bold">{total}</tspan>
                                  <tspan x={viewBox.cx} y={(viewBox.cy || 0) + 20} className="fill-muted-foreground text-xs">Vấn đề</tspan>
                                </text>
                              );
                            }
                          }}
                        />
                      </Pie>
                      <Legend 
                        verticalAlign="bottom" 
                        height={36} 
                        iconType="circle" 
                        wrapperStyle={{ fontSize: '12px', paddingTop: '20px' }}
                      />
                    </PieChart>
                  </ChartContainer>
               </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
