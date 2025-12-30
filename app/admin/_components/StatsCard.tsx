"use client";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  growth?: number;
  suffix?: string;
  className?: string;
}

export function StatsCard({ 
  title, 
  value, 
  icon, 
  growth, 
  suffix,
  className 
}: StatsCardProps) {
  const GrowthIcon = growth && growth > 0 ? TrendingUp : growth && growth < 0 ? TrendingDown : Minus;
  const growthColor = growth && growth > 0 
    ? "text-emerald-500" 
    : growth && growth < 0 
      ? "text-red-500" 
      : "text-muted-foreground";
  
  return (
    <Card className={cn("relative overflow-hidden", className)}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <div className="flex items-baseline gap-2">
              <p className="text-2xl font-bold tracking-tight">
                {typeof value === 'number' ? value.toLocaleString('vi-VN') : value}
              </p>
              {suffix && (
                <span className="text-sm text-muted-foreground">{suffix}</span>
              )}
            </div>
            {growth !== undefined && (
              <div className={cn("flex items-center gap-1 text-sm", growthColor)}>
                <GrowthIcon className="h-4 w-4" />
                <span>{growth > 0 ? '+' : ''}{growth}%</span>
                <span className="text-muted-foreground">so với kỳ trước</span>
              </div>
            )}
          </div>
          <div className="rounded-full bg-primary/10 p-3">
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
