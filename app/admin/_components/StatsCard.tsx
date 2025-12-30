"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  growth?: number;
  suffix?: string;
  className?: string;
  loading?: boolean;
  footer?: React.ReactNode;
}

export function StatsCard({ 
  title, 
  value, 
  icon, 
  growth, 
  suffix,
  className,
  loading = false,
  footer
}: StatsCardProps) {
  const GrowthIcon = growth && growth > 0 ? TrendingUp : growth && growth < 0 ? TrendingDown : Minus;
  const growthColor = growth && growth > 0 
    ? "text-emerald-600" 
    : growth && growth < 0 
      ? "text-red-600" 
      : "text-muted-foreground";

  if (loading) {
    return (
      <Card className={cn("relative overflow-hidden flex flex-col justify-between h-full", className)}>
        <CardContent className="p-6 pb-2">
          <div className="flex items-center justify-between space-x-4">
            <div className="space-y-2 flex-1">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-20" />
            </div>
            <Skeleton className="h-11 w-11 rounded-full" />
          </div>
          <div className="mt-4">
            <Skeleton className="h-6 w-36" />
          </div>
        </CardContent>
        {footer && (
          <div className="px-6 pb-4 pt-0 mt-auto">
            <Skeleton className="h-4 w-full" />
          </div>
        )}
      </Card>
    );
  }
  
  return (
    <Card className={cn("relative overflow-hidden flex flex-col justify-between h-full transition-all hover:shadow-md", className)}>
      <CardContent className="p-6 pb-2">
        <div className="flex items-center justify-between space-x-4">
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground truncate">{title}</p>
            <div className="flex items-baseline gap-1.5">
              <p className="text-2xl font-bold tracking-tight tabular-nums">
                {typeof value === 'number' ? value.toLocaleString('vi-VN') : value}
              </p>
              {suffix && (
                <span className="text-xs font-medium text-muted-foreground">{suffix}</span>
              )}
            </div>
          </div>
          <div className="rounded-full bg-primary/10 p-2.5 shrink-0">
            {icon}
          </div>
        </div>
        
        <div className="mt-4 flex items-center gap-2">
           {growth !== undefined && (
              <div className={cn("flex items-center gap-1 text-xs font-medium bg-muted/50 px-2 py-1 rounded w-fit", growthColor)}>
                <GrowthIcon className="h-3.5 w-3.5" />
                <span>{growth > 0 ? '+' : ''}{growth}%</span>
                <span className="text-muted-foreground font-normal">so với kỳ trước</span>
              </div>
           )}
        </div>
      </CardContent>
      
      {footer && (
        <div className="px-6 pb-4 pt-0 mt-auto">
           {footer}
        </div>
      )}
    </Card>
  );
}
