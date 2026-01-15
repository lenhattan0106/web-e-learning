"use client";

import * as React from "react";
import { useState, useEffect, useTransition, useRef, useMemo, useCallback } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { DateRange } from "react-day-picker";
import { 
  IconBook, 
  IconMoneybagPlus, 
  IconPlaylistX, 
  IconUser,
  IconSearch,
  IconVideo,
  IconVideoOff
} from "@tabler/icons-react";
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import {
    Pagination,
    PaginationContent,
    PaginationEllipsis,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
} from "@/components/ui/pagination";
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from "@/components/ui/tooltip";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { 
  RevenueAreaChart, 
  StudentsComposedChart, 
  CoursesHorizontalBarChart, 
  LessonsDonutChart 
} from "@/app/teacher/_components/charts";
import { fetchRevenueDetails, fetchStudentDetails, fetchCourseDetails, fetchLessonDetails } from "@/app/teacher/actions/teacher-dashboard";
import { fetchDashboardChartData } from "@/app/teacher/actions/chart-actions";

interface RevenueDetail {
  id: string;
  ngayTao: Date;
  soTien: number;
  phiSan: number | null;
  thanhToanThuc: number | null;
  nguoiDung: {
    name: string | null;
    email: string;
    image: string | null;
  };
  khoaHoc: {
    tenKhoaHoc: string;
  };
  maGiamGia: {
    maGiamGia: string;
    loai: string;
    giaTri: number;
  } | null;
}

interface StudentEnrollment {
  id: string;
  student: {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
  };
  course: {
    id: string;
    name: string;
  };
  purchaseDate: Date;
  netPrice: number;
}

interface CourseDetail {
  id: string;
  tenKhoaHoc: string;
  gia: number;
  chuongs: Array<{
    id: string;
    baiHocs: Array<{ id: string }>;
  }>;
  dangKyHocs: Array<{ id: string }>;
}

interface LessonDetail {
  id: string;
  tenBaiHoc: string;
  maVideo: string | null;
  chuong: {
    id: string;
    tenChuong: string;
    idKhoaHoc: string;
    khoaHoc: {
      tenKhoaHoc: string;
    };
  };
  _count: {
    tienTrinhHocs: number;
  };
}

interface ChartData {
  chartData: Array<{
    label: string;
    value: number;
    prevValue?: number;
    fullDate?: string;
    prevDateLabel?: string;
  }>;
  avgValue: number;
  granularity: "day" | "month";
}

type DashboardData = RevenueDetail | StudentEnrollment | CourseDetail | LessonDetail;

interface TeacherDashboardClientProps {
  stats: {
    totalRevenue: number;
    totalUsers: number;
    totalCourses: number;
    totalLessons: number;
    revenueGrowth?: number;
    usersGrowth?: number;
  };
}

type TabType = "revenue" | "students" | "courses" | "lessons";
const ITEMS_PER_PAGE = 10;
const QUICK_DURATIONS = [7, 30, 90, 365];

export function TeacherDashboardClient({ stats }: TeacherDashboardClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  
  // Get state from URL
  const activeTab = (searchParams.get("view") as TabType) || "revenue";
  const currentPageInfo = Number(searchParams.get("page")) || 1;
  const currentDuration = Number(searchParams.get("days")) || 30;
  
  // Table data state
  const [data, setData] = useState<DashboardData[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(currentPageInfo);
  const [isPending, startTransition] = useTransition();

  // Chart data state
  const [chartData, setChartData] = useState<ChartData | null>(null);
  const [chartLoading, setChartLoading] = useState(false);
  
  // Date range state (unified filter)
  const [dateRange, setDateRange] = useState<DateRange | undefined>(() => {
    const to = new Date();
    const from = new Date();
    from.setDate(to.getDate() - currentDuration);
    return { from, to };
  });
  
  // Custom range mode
  const [isCustomRange, setIsCustomRange] = useState(false);
  
  // Chart cache: key -> result (FIFO limit 20)
  const chartCache = useRef<Map<string, ChartData>>(new Map());
  const cacheOrder = useRef<string[]>([]);
  
  // Calculate diff days for granularity
  const diffDays = useMemo(() => {
    if (!dateRange?.from || !dateRange?.to) return 30;
    return Math.ceil((dateRange.to.getTime() - dateRange.from.getTime()) / (1000 * 60 * 60 * 24));
  }, [dateRange]);
  
  const granularity = diffDays > 90 ? "month" : "day";

  // Reset pagination when tab changes
  useEffect(() => {
      setCurrentPage(1);
      setSearchTerm("");
  }, [activeTab]);

  // ✅ Đổi updateUrl thành useCallback
  const updateUrl = useCallback((key: string, value: string | null) => {
       const params = new URLSearchParams(searchParams);
       if (value) params.set(key, value);
       else params.delete(key);
       
       // If changing duration, keeping view is fine.
       // If changing view, reset page.
       if(key === "view") params.delete("page");
       
       router.push(`${pathname}?${params.toString()}`, { scroll: false });
  }, [searchParams, pathname, router]);

  const handleTabChange = (tab: TabType) => {
    startTransition(() => updateUrl("view", tab));
  };

  const handleDurationChange = (days: number) => {
     setIsCustomRange(false);
     const to = new Date();
     const from = new Date();
     from.setDate(to.getDate() - days);
     setDateRange({ from, to });
     
     startTransition(() => {
         updateUrl("days", days.toString());
         router.refresh(); 
     });
  };
  
  const handleCustomRangeChange = (range: DateRange | undefined) => {
    if (range?.from && range?.to) {
      setIsCustomRange(true);
      setDateRange(range);
    }
  };

  // ✅ FIX: useCallback để tránh warning dependencies
  const handlePageChange = useCallback((page: number) => {
      setCurrentPage(page);
      startTransition(() => updateUrl("page", page.toString()));
      const tableElement = document.getElementById("dashboard-table");
      if (tableElement) tableElement.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [updateUrl]);

  // Table data fetch
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        let result: DashboardData[] = [];
        if (activeTab === "revenue") result = await fetchRevenueDetails() as RevenueDetail[];
        else if (activeTab === "students") result = await fetchStudentDetails() as StudentEnrollment[];
        else if (activeTab === "courses") result = await fetchCourseDetails() as CourseDetail[];
        else if (activeTab === "lessons") result = await fetchLessonDetails() as LessonDetail[];
        setData(result);
      } catch (error) {
        console.error("Failed to fetch dashboard details", error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [activeTab]);
  
  // Chart data fetch with caching
  useEffect(() => {
    if (!dateRange?.from || !dateRange?.to) return;
    
    const getCacheKey = () => {
      return `${activeTab}|${dateRange.from!.toISOString()}|${dateRange.to!.toISOString()}`;
    };
    
    const fetchChartDataAsync = async () => {
      const key = getCacheKey();
      
      // Check cache first
      if (chartCache.current.has(key)) {
        setChartData(chartCache.current.get(key)!);
        return;
      }
      
      setChartLoading(true);
      try {
        const result = await fetchDashboardChartData(
          dateRange.from!.toISOString(),
          dateRange.to!.toISOString(),
          activeTab
        );
        
        // Store in cache
        chartCache.current.set(key, result);
        cacheOrder.current.push(key);
        
        // FIFO limit: max 20 keys
        if (cacheOrder.current.length > 20) {
          const oldest = cacheOrder.current.shift();
          if (oldest) chartCache.current.delete(oldest);
        }
        
        setChartData(result);
      } catch (error) {
        console.error("Failed to fetch chart data", error);
      } finally {
        setChartLoading(false);
      }
    };
    
    fetchChartDataAsync();
  }, [activeTab, dateRange]);

  // Client-side filtering
  const filteredData = React.useMemo(() => {
      let result = data;
      if (searchTerm) {
          const lowerTerm = searchTerm.toLowerCase();
          result = data.filter(item => {
              if (activeTab === "revenue") {
                  const revenueItem = item as RevenueDetail;
                  return revenueItem.nguoiDung?.name?.toLowerCase().includes(lowerTerm) || 
                         revenueItem.nguoiDung?.email?.toLowerCase().includes(lowerTerm) ||
                         revenueItem.khoaHoc?.tenKhoaHoc?.toLowerCase().includes(lowerTerm);
              }
              if (activeTab === "students") {
                  const studentItem = item as StudentEnrollment;
                  return studentItem.student?.name?.toLowerCase().includes(lowerTerm) || 
                         studentItem.student?.email?.toLowerCase().includes(lowerTerm) ||
                         studentItem.course?.name?.toLowerCase().includes(lowerTerm);
              }
              if (activeTab === "courses") {
                  const courseItem = item as CourseDetail;
                  return courseItem.tenKhoaHoc?.toLowerCase().includes(lowerTerm);
              }
              if (activeTab === "lessons") {
                  const lessonItem = item as LessonDetail;
                  return lessonItem.tenBaiHoc?.toLowerCase().includes(lowerTerm) ||
                         lessonItem.chuong?.khoaHoc?.tenKhoaHoc?.toLowerCase().includes(lowerTerm);
              }
              return true;
          });
      }
      return result;
  }, [data, searchTerm, activeTab]);

  // Pagination Logic
  const totalPages = Math.ceil(filteredData.length / ITEMS_PER_PAGE);
  const paginatedData = React.useMemo(() => {
      const start = (currentPage - 1) * ITEMS_PER_PAGE;
      const end = start + ITEMS_PER_PAGE;
      return filteredData.slice(start, end);
  }, [filteredData, currentPage]);

  // ✅ FIX: Thêm handlePageChange vào dependencies
  useEffect(() => {
      if (currentPage > totalPages && totalPages > 0) {
          handlePageChange(1);
      }
  }, [filteredData.length, totalPages, currentPage, handlePageChange]);


  const tabs = [
    {
      id: "revenue",
      title: "Tổng doanh thu",
      value: stats.totalRevenue,
      icon: IconMoneybagPlus,
      desc: "Doanh thu trọn đời",
      growth: stats.revenueGrowth,
      format: (val: number) => new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(val),
    },
    {
      id: "students",
      title: "Số lượng học sinh",
      value: stats.totalUsers,
      icon: IconUser,
      desc: "Tổng số học sinh tham gia",
      growth: stats.usersGrowth,
      format: (val: number) => val.toString(),
    },
    {
      id: "courses",
      title: "Số lượng khóa học",
      value: stats.totalCourses,
      icon: IconBook,
      desc: "Khóa học đã hiển thị",
      format: (val: number) => val.toString(),
    },
    {
      id: "lessons",
      title: "Số lượng bài học",
      value: stats.totalLessons,
      icon: IconPlaylistX,
      desc: "Bài học đã hiển thị",
      format: (val: number) => val.toString(),
    },
  ];

  return (
    <div className="space-y-8">
      
      {/* Header with Date Filter */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
           <h2 className="text-2xl font-bold tracking-tight">Tổng quan</h2>
           <div className="flex items-center gap-2">
             <div className="flex items-center gap-1 bg-background p-1 rounded-lg border">
               {QUICK_DURATIONS.map(days => (
                   <button
                      key={days}
                      onClick={() => handleDurationChange(days)}
                      className={`text-sm font-medium px-3 py-1.5 rounded-md transition-all ${
                          !isCustomRange && currentDuration === days 
                          ? "bg-primary text-primary-foreground shadow-sm" 
                          : "text-muted-foreground hover:bg-muted"
                      }`}
                   >
                      {days === 365 ? "365 ngày" : `${days} ngày`}
                   </button>
               ))}
             </div>
             <DateRangePicker
               value={dateRange}
               onChange={handleCustomRangeChange}
               className={isCustomRange ? "ring-2 ring-primary" : ""}
             />
           </div>
      </div>

      {/* Cards Section */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;
          
          // Logic for growth display
          const GrowthDisplay = () => {
              if(tab.growth === undefined) return null;
              const isPositive = tab.growth >= 0;
              return (
                  <span className={`text-xs font-bold flex items-center gap-1 ${isPositive ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {isPositive ? '▲' : '▼'} {Math.abs(tab.growth)}% 
                      <span className="text-muted-foreground font-normal ml-1 text-[11px]">so với kỳ trước</span>
                  </span>
              )
          }

          return (
            <Card
              key={tab.id}
              onClick={() => handleTabChange(tab.id as TabType)}
              className={`cursor-pointer transition-all duration-300 hover:shadow-md ${
                isActive
                  ? "border-primary ring-2 ring-primary/20 bg-primary/5 shadow-md scale-[1.02]"
                  : "hover:bg-muted/50"
              }`}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="space-y-1">
                  <CardDescription className={isActive ? "text-primary/80" : ""}>
                    {tab.title}
                  </CardDescription>
                  <CardTitle className="text-2xl font-semibold tabular-nums">
                    {tab.format(tab.value)}
                  </CardTitle>
                </div>
                <div className={`p-2 rounded-full ${isActive ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'}`}>
                    <Icon className="size-5" />
                </div>
              </CardHeader>
              <CardFooter className="flex-col items-start gap-1.5 text-xs text-muted-foreground pt-2">
                 {tab.growth !== undefined ? <GrowthDisplay /> : tab.desc}
              </CardFooter>
            </Card>
          );
        })}
      </div>


      {/* Detailed Table Section */}
      <div className="space-y-4" id="dashboard-table">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <h3 className="text-lg font-semibold flex items-center gap-2 whitespace-nowrap">
                Chi tiết: 
                <Badge variant="outline" className="text-base font-normal">
                    {tabs.find(t => t.id === activeTab)?.title}
                </Badge>
                <span className="text-sm text-muted-foreground font-normal ml-2">
                  ({filteredData.length} kết quả)
                </span>
            </h3>
            
            {/* Search Filter */}
            <div className="relative w-full sm:w-[300px]">
                <IconSearch className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Tìm kiếm..."
                  className="pl-9 bg-background"
                  value={searchTerm}
                  onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setCurrentPage(1);
                  }}
                />
            </div>
        </div>
        
        <div className="space-y-4">
            <div className="rounded-md border bg-card">
                <AnimatePresence mode="wait">
                    {loading || isPending ? (
                        <div className="p-8 space-y-4">
                            <Skeleton className="h-12 w-full" />
                            <Skeleton className="h-12 w-full" />
                            <Skeleton className="h-12 w-full" />
                            <Skeleton className="h-12 w-full" />
                        </div>
                    ) : (
                        <motion.div
                            key={activeTab}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.2 }}
                        >
                            {activeTab === "revenue" && <RevenueTable data={paginatedData as RevenueDetail[]} />}
                            {activeTab === "students" && <StudentsTable data={paginatedData as StudentEnrollment[]} />}
                            {activeTab === "courses" && <CoursesTable data={paginatedData as CourseDetail[]} />}
                            {activeTab === "lessons" && <LessonsTable data={paginatedData as LessonDetail[]} />}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Pagination Controls */}
            {!loading && !isPending && totalPages > 1 && (
                <Pagination>
                  <PaginationContent>
                      <PaginationItem>
                          <PaginationPrevious 
                              href="#" 
                              onClick={(e) => {
                                  e.preventDefault();
                                  if (currentPage > 1) handlePageChange(currentPage - 1);
                              }} 
                              className={currentPage <= 1 ? "pointer-events-none opacity-50" : "cursor-pointer select-none"}
                          />
                      </PaginationItem>
                      
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                          if (
                              page === 1 || 
                              page === totalPages || 
                              (page >= currentPage - 1 && page <= currentPage + 1)
                          ) {
                              return (
                                  <PaginationItem key={page}>
                                      <PaginationLink 
                                          href="#" 
                                          isActive={page === currentPage}
                                          onClick={(e) => {
                                              e.preventDefault();
                                              handlePageChange(page);
                                          }}
                                          className="cursor-pointer select-none"
                                      >
                                          {page}
                                      </PaginationLink>
                                  </PaginationItem>
                              )
                          } else if (
                              page === currentPage - 2 || 
                              page === currentPage + 2
                          ) {
                              return <PaginationEllipsis key={page} />
                          }
                          return null;
                      })}

                      <PaginationItem>
                          <PaginationNext 
                              href="#" 
                              onClick={(e) => {
                                  e.preventDefault();
                                  if (currentPage < totalPages) handlePageChange(currentPage + 1);
                              }}
                              className={currentPage >= totalPages ? "pointer-events-none opacity-50" : "cursor-pointer select-none"}
                          />
                      </PaginationItem>
                  </PaginationContent>
                </Pagination>
            )}
        </div>
      
        {/* Chart Section - Dynamic per tab */}
        <AnimatePresence mode="wait">
          <motion.div
            key={`chart-${activeTab}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {chartLoading ? (
              <div className="h-[350px] flex items-center justify-center">
                <div className="flex flex-col items-center gap-2">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                  <span className="text-sm text-muted-foreground">Đang tải biểu đồ...</span>
                </div>
              </div>
            ) : (
              <>
                {activeTab === "revenue" && chartData && (
                  <RevenueAreaChart 
                    data={chartData.chartData || []} 
                    avgValue={chartData.avgValue || 0} 
                    granularity={chartData.granularity || granularity}
                    totalCourses={stats.totalCourses}
                  />
                )}
                {activeTab === "students" && chartData && (
                  <StudentsComposedChart 
                    data={chartData.chartData || []} 
                    avgValue={chartData.avgValue || 0}
                    granularity={chartData.granularity || granularity}
                    totalCourses={stats.totalCourses}
                  />
                )}
                {activeTab === "courses" && chartData && (
                  <CoursesHorizontalBarChart data={chartData.chartData || []} />
                )}
                {activeTab === "lessons" && chartData && (
                  <LessonsDonutChart data={chartData.chartData || []} />
                )}
                {!chartData && (
                  <div className="h-[350px] flex items-center justify-center text-muted-foreground">
                    Chọn khoảng thời gian để xem biểu đồ
                  </div>
                )}
              </>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

function RevenueTable({ data }: { data: RevenueDetail[] }) {
    if (!data.length) return <EmptyData />;
    return (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>Học viên</TableHead>
                    <TableHead>Khóa học</TableHead>
                    <TableHead>Ngày mua</TableHead>
                    <TableHead>Mã giảm giá</TableHead>
                    <TableHead className="text-right">Tổng tiền (Gross)</TableHead>
                    <TableHead className="text-right">
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger className="underline decoration-dotted cursor-help">
                                    Phí sàn (5%)
                                </TooltipTrigger>
                                <TooltipContent>
                                    Phí vận hành hệ thống
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    </TableHead>
                    <TableHead className="text-right font-bold text-emerald-600">Thực nhận (Net)</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {data.map((item, idx) => {
                    const phiSan = item.phiSan ?? Math.round(item.soTien * 0.05);
                    const thanhToanThuc = item.thanhToanThuc ?? (item.soTien - phiSan);

                    return (
                    <TableRow key={item.id || idx}>
                        <TableCell>
                            <div className="flex items-center gap-3">
                                <Avatar className="h-8 w-8">
                                    <AvatarImage src={item.nguoiDung?.image || ""} />
                                    <AvatarFallback>{item.nguoiDung?.name?.[0] || "?"}</AvatarFallback>
                                </Avatar>
                                <div className="flex flex-col">
                                    <span className="font-medium text-sm">{item.nguoiDung?.name}</span>
                                    <span className="text-xs text-muted-foreground">{item.nguoiDung?.email}</span>
                                </div>
                            </div>
                        </TableCell>
                        <TableCell className="font-medium">{item.khoaHoc?.tenKhoaHoc}</TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                            {new Date(item.ngayTao).toLocaleDateString('vi-VN')}
                        </TableCell>
                        <TableCell>
                            {item.maGiamGia ? (
                                <Badge variant="default" className="bg-green-600 hover:bg-green-700 font-mono text-xs shadow-none">
                                    {item.maGiamGia.maGiamGia}
                                </Badge>
                            ) : (
                                <Badge variant="secondary" className="text-muted-foreground font-normal text-xs bg-muted/50">
                                    Không có
                                </Badge>
                            )}
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">
                            {new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(item.soTien)}
                        </TableCell>
                        <TableCell className="text-right text-rose-500 text-sm">
                            -{new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(phiSan)}
                        </TableCell>
                        <TableCell className="text-right font-mono font-bold text-emerald-600">
                            {new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(thanhToanThuc)}
                        </TableCell>
                    </TableRow>
                )})}
            </TableBody>
        </Table>
    )
}

function StudentsTable({ data }: { data: StudentEnrollment[] }) {
    const groupedByStudent = React.useMemo(() => {
        // Xử lý empty case BÊN TRONG useMemo
        if (!data || !data.length) return [];
        
        const grouped = new Map<string, {
            student: { id: string; name: string | null; email: string; image: string | null };
            enrollments: Array<{ id: string; courseName: string; purchaseDate: Date; netPrice: number }>;
        }>();
        
        data.forEach(enrollment => {
            if (!enrollment?.student?.id) return;
            
            const key = enrollment.student.id;
            
            if (!grouped.has(key)) {
                grouped.set(key, {
                    student: enrollment.student,
                    enrollments: []
                });
            }
            
            grouped.get(key)!.enrollments.push({
                id: enrollment.id,
                courseName: enrollment.course?.name || "N/A",
                purchaseDate: enrollment.purchaseDate,
                netPrice: enrollment.netPrice || 0
            });
        });
        
        return Array.from(grouped.values());
    }, [data]);

    const formatVND = (value: number) => new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(value);

    // ✅ Early return SAU khi tất cả Hooks đã được gọi
    if (!groupedByStudent.length) return <EmptyData />;

    return (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead className="w-[250px]">Học viên</TableHead>
                    <TableHead>Khóa học đã mua</TableHead>
                    <TableHead>Ngày mua</TableHead>
                    <TableHead className="text-right">Số tiền (Net)</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {groupedByStudent.map((group) => (
                    <React.Fragment key={group.student.id}>
                        {group.enrollments.map((enrollment, idx) => (
                            <TableRow key={enrollment.id}>
                                {idx === 0 && (
                                    <TableCell 
                                        rowSpan={group.enrollments.length} 
                                        className="align-top border-r bg-slate-50/50"
                                    >
                                        <div className="flex items-center gap-3">
                                            <Avatar className="h-10 w-10">
                                                <AvatarImage src={group.student.image || ""} />
                                                <AvatarFallback className="bg-blue-100 text-blue-700 font-semibold">
                                                    {group.student.name?.[0] || "U"}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div className="flex flex-col">
                                                <span className="font-semibold text-sm text-slate-800">
                                                    {group.student.name}
                                                </span>
                                                <span className="text-xs text-slate-500">
                                                    {group.student.email}
                                                </span>
                                                <span className="text-[10px] text-blue-600 font-medium mt-0.5">
                                                    {group.enrollments.length} khóa học
                                                </span>
                                            </div>
                                        </div>
                                    </TableCell>
                                )}
                                
                                <TableCell className="font-medium">
                                    {enrollment.courseName}
                                </TableCell>
                                
                                <TableCell className="text-sm text-muted-foreground">
                                    {new Date(enrollment.purchaseDate).toLocaleDateString('vi-VN')}
                                </TableCell>
                                
                                <TableCell className="text-right font-mono font-medium text-emerald-600">
                                    {formatVND(enrollment.netPrice)}
                                </TableCell>
                            </TableRow>
                        ))}
                    </React.Fragment>
                ))}
            </TableBody>
        </Table>
    );
}

function CoursesTable({ data }: { data: CourseDetail[] }) {
    if (!data.length) return <EmptyData />;
    return (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>Khóa học</TableHead>
                    <TableHead>Số chương</TableHead>
                    <TableHead>Số học viên</TableHead>
                    <TableHead className="text-right">Giá gốc</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {data.map((course) => (
                    <TableRow key={course.id}>
                        <TableCell className="font-medium">{course.tenKhoaHoc}</TableCell>
                        <TableCell>{course.chuongs?.length || 0} chương</TableCell>
                        <TableCell>
                            <Badge variant="secondary">{course.dangKyHocs?.length || 0} học viên</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                            {new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(course.gia)}
                        </TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    )
}

function LessonsTable({ data }: { data: LessonDetail[] }) {
  if (!data.length) return <EmptyData />;

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-[300px]">Bài học</TableHead>
          <TableHead>Khóa học / Chương</TableHead>
          <TableHead className="text-center">Người học xong</TableHead>
          <TableHead className="text-center">Nội dung</TableHead>
          <TableHead className="text-right">Thao tác</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((lesson) => {
          const hasVideo = lesson.maVideo && lesson.maVideo.trim() !== "";
          return (
          <TableRow key={lesson.id}>
            <TableCell>
              <div className="flex flex-col">
                <span className="font-medium text-sm line-clamp-1 group-hover:text-primary transition-colors">
                    {lesson.tenBaiHoc}
                </span>
                <span className="text-[10px] text-muted-foreground font-mono">
                    ID: {lesson.id.split('-')[0]}...
                </span>
              </div>
            </TableCell>
            <TableCell>
              <div className="text-xs space-y-0.5">
                <p className="font-medium text-sm">{lesson.chuong?.khoaHoc?.tenKhoaHoc}</p>
                <p className="text-muted-foreground/80 flex items-center gap-1">
                    <span className="w-1 h-1 rounded-full bg-primary" />
                    {lesson.chuong?.tenChuong}
                </p>
              </div>
            </TableCell>
            <TableCell className="text-center">
              <Badge variant="secondary" className="font-normal text-xs">
                {lesson._count?.tienTrinhHocs || 0} lượt
              </Badge>
            </TableCell>
            <TableCell className="text-center">
              {hasVideo ? (
                <Badge className="bg-emerald-100 text-emerald-700 border-transparent hover:bg-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 dark:hover:bg-emerald-500/20 justify-center gap-1 min-w-[90px] shadow-none">
                   <IconVideo size={14} /> Video
                </Badge>
              ) : (
                <Badge variant="outline" className="text-rose-600 border-rose-200 bg-rose-50 dark:bg-rose-900/10 dark:border-rose-800 dark:text-rose-400 justify-center gap-1 min-w-[90px]">
                   <IconVideoOff size={14} /> Trống
                </Badge>
              )}
            </TableCell>
            <TableCell className="text-right">
              <Link 
                href={`/teacher/courses/${lesson.chuong?.idKhoaHoc}/${lesson.chuong?.id}/${lesson.id}`}
                className="inline-flex items-center justify-center rounded-md text-xs font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-8 px-3 py-2"
              >
                Chỉnh sửa
              </Link>
            </TableCell>
          </TableRow>
        )})}
      </TableBody>
    </Table>
  );
}

function EmptyData() {
    return (
        <div className="flex flex-col items-center justify-center p-8 text-center text-muted-foreground">
            <p>Không có dữ liệu nào</p>
        </div>
    )
}
