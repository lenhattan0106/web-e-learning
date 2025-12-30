"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { 
  Users, 
  GraduationCap, 
  BookOpen, 
  Sparkles, 
  Wallet,
  TrendingUp,
  Clock
} from "lucide-react";
import { StatsCard } from "./StatsCard";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer } from "recharts";

interface AdminDashboardStats {
  totalUsers: number;
  totalTeachers: number;
  totalCourses: number;
  premiumActiveCount: number;
  premiumExpiringCount: number;
  monthlyRevenue: number;
  conversionRate: string;
  revenueGrowth: number;
  premiumGrowth: number;
  monthlyUserGrowth: Array<{
    month: string;
    label: string;
    total: number;
    premium: number;
  }>;
}

interface AdminDashboardClientProps {
  stats: AdminDashboardStats;
}

const chartConfig = {
  total: {
    label: "Người dùng mới",
    color: "hsl(var(--chart-1))",
  },
  premium: {
    label: "Premium",
    color: "hsl(var(--chart-2))",
  },
} satisfies ChartConfig;

export function AdminDashboardClient({ stats }: AdminDashboardClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  
  const currentDays = searchParams.get("days") || "30";
  
  const handleDurationChange = (days: string) => {
    startTransition(() => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("days", days);
      router.push(`${pathname}?${params.toString()}`);
    });
  };

  const formatCurrency = (value: number) => {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M`;
    }
    if (value >= 1000) {
      return `${(value / 1000).toFixed(0)}K`;
    }
    return value.toLocaleString('vi-VN');
  };

  return (
    <div className="space-y-6">
      {/* Duration Selector */}
      <div className="flex justify-end">
        <Select value={currentDays} onValueChange={handleDurationChange}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Chọn khoảng thời gian" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">7 ngày qua</SelectItem>
            <SelectItem value="30">30 ngày qua</SelectItem>
            <SelectItem value="90">90 ngày qua</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Primary Stats Row */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Tổng người dùng"
          value={stats.totalUsers}
          icon={<Users className="h-6 w-6 text-primary" />}
        />
        <StatsCard
          title="Giáo viên"
          value={stats.totalTeachers}
          icon={<GraduationCap className="h-6 w-6 text-primary" />}
        />
        <StatsCard
          title="Premium Active"
          value={stats.premiumActiveCount}
          icon={<Sparkles className="h-6 w-6 text-amber-500" />}
          growth={stats.premiumGrowth}
        />
        <StatsCard
          title="Doanh thu AI"
          value={formatCurrency(stats.monthlyRevenue)}
          suffix="đ"
          icon={<Wallet className="h-6 w-6 text-emerald-500" />}
          growth={stats.revenueGrowth}
        />
      </div>

      {/* Secondary Stats Row */}
      <div className="grid gap-4 md:grid-cols-3">
        <StatsCard
          title="Tổng khóa học"
          value={stats.totalCourses}
          icon={<BookOpen className="h-6 w-6 text-primary" />}
        />
        <StatsCard
          title="Tỷ lệ chuyển đổi"
          value={stats.conversionRate}
          suffix="%"
          icon={<TrendingUp className="h-6 w-6 text-blue-500" />}
        />
        <StatsCard
          title="Sắp hết hạn (7 ngày)"
          value={stats.premiumExpiringCount}
          icon={<Clock className="h-6 w-6 text-orange-500" />}
          className={stats.premiumExpiringCount > 0 ? "border-orange-200 bg-orange-50/50 dark:bg-orange-950/20" : ""}
        />
      </div>

      {/* User Growth Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Tăng trưởng người dùng</CardTitle>
          <CardDescription>
            Số lượng người dùng đăng ký mới và nâng cấp Premium theo tháng
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.monthlyUserGrowth} margin={{ left: 12, right: 12 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis 
                  dataKey="label" 
                  tickLine={false} 
                  axisLine={false} 
                  tickMargin={8}
                />
                <YAxis 
                  tickLine={false} 
                  axisLine={false} 
                  tickMargin={8}
                  allowDecimals={false}
                />
                <ChartTooltip 
                  cursor={{ fill: 'rgba(0, 0, 0, 0.05)' }}
                  content={<ChartTooltipContent />} 
                />
                <Bar 
                  dataKey="total" 
                  fill="var(--color-total)" 
                  radius={[4, 4, 0, 0]} 
                  name="Người dùng mới"
                />
                <Bar 
                  dataKey="premium" 
                  fill="var(--color-premium)" 
                  radius={[4, 4, 0, 0]} 
                  name="Premium"
                />
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Quick Info Cards */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Doanh thu dự kiến tháng tới</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-emerald-600">
              {(stats.premiumActiveCount * 99000).toLocaleString('vi-VN')} đ
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Dựa trên {stats.premiumActiveCount} Premium users × 99,000đ
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Giá trị trung bình mỗi user</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-blue-600">
              {stats.totalUsers > 0 
                ? Math.round((stats.premiumActiveCount / stats.totalUsers) * 99000).toLocaleString('vi-VN')
                : 0
              } đ
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              ARPU (Average Revenue Per User)
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
