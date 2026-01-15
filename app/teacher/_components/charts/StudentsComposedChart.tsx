"use client";

import * as React from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
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
import { Button } from "@/components/ui/button";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface StudentsChartData {
  label: string;
  value: number;
  prevValue?: number;
  fullDate?: string;
  prevDateLabel?: string;
  details?: Array<{
    studentName: string;
    studentEmail: string;
    courseName: string;
    netPrice: number;
  }>;
}

interface StudentsComposedChartProps {
  data: StudentsChartData[];
  avgValue: number;
  granularity: "day" | "month";
  totalCourses?: number;
}

const chartConfig = {
  value: {
    label: "Đăng ký mới",
    color: "hsl(217 91% 60%)",
  },
} satisfies ChartConfig;

export function StudentsComposedChart({ data, avgValue, granularity, totalCourses = 0 }: StudentsComposedChartProps) {
  const chartId = React.useId();
  
  // State for selected bar detail panel
  const [selectedData, setSelectedData] = React.useState<StudentsChartData | null>(null);
  
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

  // Handle bar click - show detail panel
  const handleBarClick = (barData: any) => {
    if (barData?.activePayload?.[0]?.payload) {
      setSelectedData(barData.activePayload[0].payload as StudentsChartData);
    }
  };

  // Navigate between dates in detail panel
  const navigateDetail = (direction: 'prev' | 'next') => {
    if (!selectedData) return;
    const currentIndex = data.findIndex(d => d.label === selectedData.label);
    const newIndex = direction === 'prev' ? currentIndex - 1 : currentIndex + 1;
    if (newIndex >= 0 && newIndex < data.length) {
      setSelectedData(data[newIndex]);
    }
  };

  // Format currency
  const formatVND = (value: number) => 
    new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(value);

  // Empty state handling
  if (totalCourses === 0 && (data.length === 0 || total === 0)) {
    return (
      <Card className="shadow-md border-border/60">
        <CardHeader>
          <CardTitle>Lượt đăng ký học theo thời gian</CardTitle>
          <CardDescription>Chưa có dữ liệu lượt đăng ký học</CardDescription>
        </CardHeader>
        <CardContent className="h-[300px] flex items-center justify-center">
          <div className="text-center text-muted-foreground">
            <p className="text-sm">Tạo khóa học để thu hút học sinh</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("shadow-md border-border/60 relative", total === 0 && "bg-blue-50/50 border-blue-200")}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Lượt đăng ký học theo thời gian
        </CardTitle>
        <CardDescription>
          Tổng cộng: {total} lượt đăng ký học trong kỳ này
          <span className="ml-2 text-blue-600 font-medium">• Click vào cột để xem chi tiết</span>
        </CardDescription>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6 relative">
        {/* Chart */}
        <ChartContainer id={chartId} config={chartConfig} className="aspect-auto h-[300px] w-full">
          <BarChart
            data={data}
            margin={{ left: 12, right: 12, top: 10, bottom: 0 }}
            onClick={handleBarClick}
            style={{ cursor: 'pointer' }}
          >
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
              tick={{ fontSize: 11 }}
              width={40}
              allowDecimals={false}
            />
            <ChartTooltip
              cursor={{ fill: "rgba(59, 130, 246, 0.15)" }}
              content={
                <ChartTooltipContent
                  className="bg-white shadow-lg border"
                  formatter={(value, name, item) => {
                    const payload = item.payload as StudentsChartData;
                    return (
                      <div className="flex flex-col gap-1 p-1">
                        <div className="font-semibold text-sm">
                          📅 {payload.fullDate || payload.label}
                        </div>
                        <div className="flex justify-between items-center text-xs">
                          <span>Lượt đăng ký:</span>
                          <span className="font-bold text-blue-600">{value}</span>
                        </div>
                        {payload.details && payload.details.length > 0 && (
                          <div className="text-xs text-blue-600 font-medium mt-1 border-t pt-1">
                            👆 Click để xem {payload.details.length} giao dịch chi tiết
                          </div>
                        )}
                      </div>
                    );
                  }}
                />
              }
            />
            <Bar
              dataKey="value"
              fill="hsl(217 91% 60%)"
              radius={[4, 4, 0, 0]}
              maxBarSize={50}
              className="cursor-pointer hover:opacity-80 transition-opacity"
            />
          </BarChart>
        </ChartContainer>

        {/* Detail Panel - Appears when a bar is clicked */}
        {selectedData && (
          <div className="absolute inset-0 bg-white/95 backdrop-blur-sm z-10 rounded-lg border-2 border-blue-300 shadow-2xl animate-in fade-in slide-in-from-bottom-2 duration-200">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-blue-50 to-indigo-50">
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => navigateDetail('prev')}
                  disabled={data.findIndex(d => d.label === selectedData.label) === 0}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <div>
                  <h3 className="font-bold text-lg text-slate-800">
                    📅 Chi tiết ngày {selectedData.fullDate || selectedData.label}
                  </h3>
                  <p className="text-sm text-slate-600">
                    {selectedData.value} lượt đăng ký
                    {selectedData.prevValue !== undefined && (
                      <span className={selectedData.value >= selectedData.prevValue ? "text-green-600 ml-2" : "text-red-600 ml-2"}>
                        ({selectedData.value >= selectedData.prevValue ? "+" : ""}{selectedData.value - selectedData.prevValue} so với kỳ trước)
                      </span>
                    )}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => navigateDetail('next')}
                  disabled={data.findIndex(d => d.label === selectedData.label) === data.length - 1}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 hover:bg-red-100 hover:text-red-600"
                onClick={() => setSelectedData(null)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Content - Scrollable */}
            <ScrollArea className="h-[calc(100%-80px)] p-4">
              {selectedData.details && selectedData.details.length > 0 ? (
                <div className="space-y-3">
                  <div className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                    <span className="inline-block w-2 h-2 bg-emerald-500 rounded-full"></span>
                    Chi tiết {selectedData.details.length} giao dịch:
                  </div>
                  <div className="grid gap-3">
                    {selectedData.details.map((detail, idx) => (
                      <div 
                        key={idx} 
                        className="bg-gradient-to-r from-slate-50 to-blue-50 p-4 rounded-xl border border-slate-200 hover:border-blue-300 transition-all hover:shadow-md"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold text-slate-800 flex items-center gap-2">
                              <span className="text-blue-500">👤</span>
                              {detail.studentName}
                            </div>
                            <div className="text-slate-500 text-sm truncate pl-6">
                              {detail.studentEmail}
                            </div>
                            <div className="text-blue-700 font-medium mt-2 flex items-center gap-2 pl-6">
                              <span>📚</span>
                              {detail.courseName}
                            </div>
                          </div>
                          <div className="text-emerald-600 font-bold text-lg whitespace-nowrap bg-emerald-50 px-3 py-2 rounded-lg border border-emerald-200">
                            {formatVND(detail.netPrice)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {/* Summary */}
                  <div className="mt-4 p-4 bg-blue-50 rounded-xl border border-blue-200">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-slate-700">Tổng doanh thu ngày này:</span>
                      <span className="font-bold text-xl text-emerald-600">
                        {formatVND(selectedData.details.reduce((sum, d) => sum + d.netPrice, 0))}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground py-12">
                  <div className="text-4xl mb-3">📭</div>
                  <p className="text-sm">Không có giao dịch nào trong ngày này</p>
                </div>
              )}
            </ScrollArea>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
