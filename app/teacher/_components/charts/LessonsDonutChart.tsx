"use client";

import * as React from "react";
import { Pie, PieChart, Cell, ResponsiveContainer, Label } from "recharts";
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

interface LessonChartData {
  label: string;
  value: number;
  color?: string;
  videoRatio?: number;
}

interface LessonsDonutChartProps {
  data: LessonChartData[];
}

const chartConfig = {
  video: {
    label: "Video",
    color: "#22c55e",
  },
  noVideo: {
    label: "Chưa có video",
    color: "#94a3b8",
  },
} satisfies ChartConfig;

export function LessonsDonutChart({ data }: LessonsDonutChartProps) {
  const chartId = React.useId();
  
  // Calculate total and video ratio
  const total = React.useMemo(
    () => data.reduce((acc, curr) => acc + curr.value, 0),
    [data]
  );
  
  const videoCount = data.find(d => d.label === "Video")?.value || 0;
  const videoRatio = total > 0 ? Math.round((videoCount / total) * 100) : 0;

  // Empty state
  if (total === 0) {
    return (
      <Card className="shadow-md border-border/60">
        <CardHeader>
          <CardTitle>Phân bổ loại bài học</CardTitle>
          <CardDescription>Chưa có bài học nào</CardDescription>
        </CardHeader>
        <CardContent className="h-[300px] flex items-center justify-center">
          <div className="text-center text-muted-foreground">
            <p className="text-sm">Tạo bài học để thấy dữ liệu tại đây</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-md border-border/60">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Phân bổ loại bài học
        </CardTitle>
        <CardDescription>
          Tổng: {total} bài học | Video: {videoCount} bài ({videoRatio}%)
        </CardDescription>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        <ChartContainer id={chartId} config={chartConfig} className="mx-auto aspect-square h-[280px]">
          <PieChart>
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  formatter={(value, name, item) => {
                    const lesson = item.payload;
                    const percentage = total > 0 ? Math.round((lesson.value / total) * 100) : 0;
                    return (
                      <div className="flex flex-col gap-1">
                        <span className="font-medium">{lesson.label}</span>
                        <span className="text-xs">
                          {lesson.value} bài ({percentage}%)
                        </span>
                      </div>
                    );
                  }}
                />
              }
            />
            <Pie
              data={data}
              dataKey="value"
              nameKey="label"
              innerRadius={70}
              outerRadius={110}
              strokeWidth={2}
              stroke="hsl(var(--background))"
            >
              {data.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={entry.color || (entry.label === "Video" ? "#22c55e" : "#94a3b8")}
                />
              ))}
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
                          {videoRatio}%
                        </tspan>
                        <tspan
                          x={viewBox.cx}
                          y={(viewBox.cy || 0) + 24}
                          className="fill-muted-foreground text-sm"
                        >
                          Video
                        </tspan>
                      </text>
                    );
                  }
                }}
              />
            </Pie>
          </PieChart>
        </ChartContainer>
        
        {/* Legend */}
        <div className="flex justify-center gap-6 mt-4">
          {data.map((item, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: item.color || (item.label === "Video" ? "#22c55e" : "#94a3b8") }}
              />
              <span className="text-sm text-muted-foreground">
                {item.label}: {item.value}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
