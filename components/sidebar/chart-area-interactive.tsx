/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import * as React from "react";
import { Bar, BarChart, CartesianGrid, XAxis } from "recharts";

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

export const description = "An interactive area chart";

const dummyEnrollmentData = [
  {
    date: "2025-06-01", // ✅ Đổi từ "data" → "date" và format YYYY-MM-DD
    enrollments: 12,
  },
  {
    date: "2025-06-02",
    enrollments: 8,
  },
  {
    date: "2025-06-03",
    enrollments: 15,
  },
  {
    date: "2025-06-04",
    enrollments: 13,
  },
  {
    date: "2025-06-05",
    enrollments: 3,
  },
  {
    date: "2025-06-06",
    enrollments: 10,
  },
];

const chartConfig = {
  enrollments: {
    label: "Khóa học đã bán",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig;
interface ChartAreaInteractiveProps{
  data:{date:string;enrollments :number}[];
}

export function ChartAreaInteractive({data}: ChartAreaInteractiveProps) {
  const totalEnrollmentsNumber = React.useMemo(()=> data.reduce((acc,curr)=>acc+curr.enrollments,0),[data])
  return (
    <Card className="@container/card">
      <CardHeader>
        <CardTitle>Tổng số lượng khóa học đã bán</CardTitle>
        <CardDescription>
          <span className="hidden @[540px]/card:block">
            Tổng số lượng khóa học đã bán trong 30 ngày: {totalEnrollmentsNumber}
          </span>
          <span className="@[540px]/card:hidden">30 ngày:{totalEnrollmentsNumber}</span>
        </CardDescription>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        <ChartContainer
          config={chartConfig}
          className="aspect-auto h-[250px] w-full"
        >
          <BarChart
            data={data}
            margin={{
              left: 12,
              right: 12,
            }}
          >
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="date" // ✅ Khớp với field "date" trong data
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              interval={"preserveStartEnd"}
              tickFormatter={(value) => {
                const date = new Date(value);
                return date.toLocaleDateString("vi-VN", {
                  month: "short",
                  day: "numeric",
                });
              }}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  className="w-[150px]"
                  labelFormatter={(value) => {
                    const date = new Date(value);
                    return date.toLocaleDateString("vi-VN", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    });
                  }}
                />
              }
            />
            <Bar dataKey={"enrollments"} fill="var(--color-enrollments)" />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
