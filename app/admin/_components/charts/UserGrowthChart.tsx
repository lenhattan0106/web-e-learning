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
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Users, Crown, X, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface UserGrowthDetail {
  userId: string;
  name: string;
  email: string;
  image?: string | null;
  createdAt: string;
  isPremium: boolean;
}

export interface UserGrowthChartData {
  label: string;
  month: string;
  newUsers: number;
  newPremium: number;
  details?: UserGrowthDetail[];
}

interface UserGrowthChartProps {
  data: UserGrowthChartData[];
  className?: string;
}

const chartConfig = {
  newUsers: {
    label: "Người dùng mới",
    color: "#3b82f6",
  },
  newPremium: {
    label: "Premium mới",
    color: "#f59e0b",
  },
} satisfies ChartConfig;

export function UserGrowthChart({ data, className }: UserGrowthChartProps) {
  const chartId = React.useId();
  
  // State for selected bar detail panel (inline overlay like Teacher dashboard)
  const [selectedData, setSelectedData] = React.useState<UserGrowthChartData | null>(null);

  // Calculate totals
  const totals = React.useMemo(() => ({
    users: data.reduce((acc, curr) => acc + curr.newUsers, 0),
    premium: data.reduce((acc, curr) => acc + curr.newPremium, 0),
  }), [data]);

  const premiumRate = totals.users > 0 
    ? Math.round((totals.premium / totals.users) * 100) 
    : 0;

  // Dynamic interval for responsive X-axis
  const xAxisInterval = React.useMemo(() => {
    if (data.length > 30) return Math.ceil(data.length / 10);
    if (data.length > 15) return Math.ceil(data.length / 8);
    return 0;
  }, [data.length]);

  // Handle bar click - show inline detail panel
  const handleBarClick = (barData: any) => {
    if (barData?.activePayload?.[0]?.payload) {
      setSelectedData(barData.activePayload[0].payload as UserGrowthChartData);
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

  return (
    <Card className={cn("shadow-md border-border/60 relative", className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5 text-blue-500" />
          Tăng trưởng người dùng
        </CardTitle>
        <CardDescription className="flex items-center gap-4">
          <span>Tổng: <strong className="text-blue-600">{totals.users}</strong> người dùng mới</span>
          <span className="text-amber-600">
            <Crown className="h-3.5 w-3.5 inline mr-1" />
            {totals.premium} Premium {totals.users > 0 ? `(${premiumRate}%)` : ""}
          </span>
          <span className="text-blue-600 font-medium">• Click vào cột để xem chi tiết</span>
        </CardDescription>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6 relative">
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
              tick={{ fontSize: 11 }}
              interval={xAxisInterval}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 11 }}
              width={40}
              allowDecimals={false}
              domain={[0, 'auto']}
            />
            <ChartTooltip
              cursor={{ fill: "rgba(59, 130, 246, 0.1)" }}
              content={({ active, payload, label }) => {
                if (!active || !payload || payload.length === 0) return null;
                const data = payload[0].payload as UserGrowthChartData;
                
                return (
                  <div className="bg-white p-2 border rounded-lg shadow-lg text-xs w-[200px]">
                    <div className="font-semibold text-sm border-b pb-1 mb-1">
                      📅 {data.label}
                    </div>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-blue-600">Người dùng mới:</span>
                      <span className="font-bold">{data.newUsers}</span>
                    </div>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-amber-600">Premium mới:</span>
                      <span className="font-bold">{data.newPremium}</span>
                    </div>
                    {data.details && data.details.length > 0 && (
                       <div className="text-xs text-blue-600 font-medium mt-1 border-t pt-1">
                         👆 Click để xem {data.details.length} người dùng
                       </div>
                    )}
                  </div>
                );
              }}
            />
            <Bar
              dataKey="newUsers"
              fill="#3b82f6"
              radius={[4, 4, 0, 0]}
              maxBarSize={40}
              className="cursor-pointer hover:opacity-80 transition-opacity"
            />
            <Bar
              dataKey="newPremium"
              fill="#f59e0b"
              radius={[4, 4, 0, 0]}
              maxBarSize={40}
            />
          </BarChart>
        </ChartContainer>

        {/* Detail Panel - Inline Overlay (like Teacher Dashboard) */}
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
                    👤 Người dùng mới - {selectedData.label}
                  </h3>
                  <p className="text-sm text-slate-600">
                    {selectedData.newUsers} người dùng mới
                    <span className="text-amber-600 ml-2">
                      • {selectedData.newPremium} Premium
                    </span>
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

            {/* Content - Scrollable User List */}
            <ScrollArea className="h-[calc(100%-80px)] p-4">
              {selectedData.details && selectedData.details.length > 0 ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <div className="text-sm text-blue-600 font-medium">Người dùng thường</div>
                      <div className="text-2xl font-bold text-blue-700">
                        {selectedData.details.filter(d => !d.isPremium).length}
                      </div>
                    </div>
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                      <div className="text-sm text-amber-600 font-medium">Premium</div>
                      <div className="text-2xl font-bold text-amber-700">
                        {selectedData.details.filter(d => d.isPremium).length}
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid gap-3">
                    {selectedData.details.map((user, idx) => (
                      <div 
                        key={user.userId || idx}
                        className="bg-gradient-to-r from-slate-50 to-blue-50 p-4 rounded-xl border border-slate-200 hover:border-blue-300 transition-all hover:shadow-md"
                      >
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={user.image || undefined} />
                            <AvatarFallback>{user.name?.[0]?.toUpperCase() || "U"}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-slate-800 truncate">{user.name}</span>
                              {user.isPremium && (
                                <Badge className="bg-amber-100 text-amber-700 border-0 text-xs">
                                  <Crown className="h-3 w-3 mr-1" />
                                  Premium
                                </Badge>
                              )}
                            </div>
                            <div className="text-slate-500 text-sm truncate">{user.email}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground py-12">
                  <div className="text-4xl mb-3">📭</div>
                  <p className="text-sm">Không có người dùng mới trong ngày này</p>
                </div>
              )}
            </ScrollArea>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
