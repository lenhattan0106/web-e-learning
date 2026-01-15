"use client";

import * as React from "react";
import { BarChart3, TrendingUp, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface EmptyChartStateProps {
  title?: string;
  message?: string;
  icon?: "chart" | "trending" | "alert";
  className?: string;
}

const iconMap = {
  chart: BarChart3,
  trending: TrendingUp,
  alert: AlertCircle,
};

export function EmptyChartState({ 
  title = "Chưa có dữ liệu",
  message = "Không có dữ liệu trong khoảng thời gian này",
  icon = "chart",
  className 
}: EmptyChartStateProps) {
  const Icon = iconMap[icon];
  
  return (
    <div className={cn(
      "flex flex-col items-center justify-center py-12 text-center",
      className
    )}>
      <div className="rounded-full bg-muted p-4 mb-4">
        <Icon className="h-8 w-8 text-muted-foreground/60" />
      </div>
      <h4 className="font-medium text-muted-foreground mb-1">{title}</h4>
      <p className="text-sm text-muted-foreground/80">{message}</p>
    </div>
  );
}
