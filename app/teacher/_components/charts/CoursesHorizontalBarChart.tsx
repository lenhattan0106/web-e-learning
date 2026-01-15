"use client";

import * as React from "react";
import { Bar, BarChart, XAxis, YAxis, ResponsiveContainer } from "recharts";
import { useRouter } from "next/navigation";
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

interface CourseChartData {
  label: string;
  value: number;
  courseId?: string;
  enrollments?: number;
}

interface CoursesHorizontalBarChartProps {
  data: CourseChartData[];
}

const chartConfig = {
  value: {
    label: "Doanh thu",
    color: "hsl(217 91% 60%)",
  },
} satisfies ChartConfig;

// Truncate label helper
function truncateLabel(text: string, maxLength: number = 25): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + "...";
}

export function CoursesHorizontalBarChart({ data }: CoursesHorizontalBarChartProps) {
  const chartId = React.useId();
  const router = useRouter();

  // Format currency
  const formatCurrency = (val: number) =>
    new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(val);

  // Calculate total revenue
  const totalRevenue = React.useMemo(
    () => data.reduce((acc, curr) => acc + curr.value, 0),
    [data]
  );

  // Handle bar click to navigate
  const handleBarClick = (entry: CourseChartData) => {
    if (entry.courseId) {
      router.push(`/teacher/courses/${entry.courseId}/edit`);
    }
  };

  // Empty state
  if (data.length === 0) {
    return (
      <Card className="shadow-md border-border/60">
        <CardHeader>
          <CardTitle>Top khóa học theo doanh thu</CardTitle>
          <CardDescription>Chưa có dữ liệu khóa học</CardDescription>
        </CardHeader>
        <CardContent className="h-[300px] flex items-center justify-center">
          <div className="text-center text-muted-foreground">
            <p className="text-sm">Tạo và bán khóa học để thấy dữ liệu tại đây</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-md border-border/60">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Top 5 khóa học theo doanh thu
        </CardTitle>
        <CardDescription>
          Tổng doanh thu: {formatCurrency(totalRevenue)} | Click vào cột để xem chi tiết
        </CardDescription>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        <ChartContainer id={chartId} config={chartConfig} className="aspect-auto h-[300px] w-full">
          <BarChart
            data={data}
            layout="vertical"
            margin={{ left: 20, right: 20, top: 10, bottom: 10 }}
          >
            <XAxis
              type="number"
              tickLine={false}
              axisLine={false}
              tickFormatter={(val) => {
                if (val === 0) return "0";
                if (val >= 1000000) return `${(val / 1000000).toFixed(1)}tr`;
                if (val >= 1000) return `${(val / 1000).toFixed(0)}k`;
                return `${val}`;
              }}
              tick={{ fontSize: 11 }}
            />
            <YAxis
              type="category"
              dataKey="label"
              tickLine={false}
              axisLine={false}
              tickFormatter={(val) => truncateLabel(val, 20)}
              tick={{ fontSize: 11 }}
              width={120}
            />
            <ChartTooltip
              cursor={{ fill: "hsl(var(--muted))", opacity: 0.3 }}
              content={
                <ChartTooltipContent
                  className="w-[220px]"
                  formatter={(value, name, item) => {
                    const course = item.payload;
                    return (
                      <div className="flex flex-col gap-1">
                        <span className="font-medium text-sm">{course.label}</span>
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">Doanh thu:</span>
                          <span className="font-medium">{formatCurrency(course.value)}</span>
                        </div>
                        {course.enrollments !== undefined && (
                          <div className="flex justify-between text-xs">
                            <span className="text-muted-foreground">Học viên:</span>
                            <span>{course.enrollments}</span>
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
              radius={[0, 4, 4, 0]}
              cursor="pointer"
              onClick={(data) => handleBarClick(data)}
              className="hover:opacity-80 transition-opacity"
            />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
