  "use client";

  import * as React from "react";
  import { useState, useEffect, useTransition } from "react";
  import { useRouter, useSearchParams, usePathname } from "next/navigation";
  import { motion, AnimatePresence } from "framer-motion";
  import Link from "next/link";
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
  import { Progress } from "@/components/ui/progress";
  import { buttonVariants } from "@/components/ui/button";
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
  import { ChartAreaInteractive } from "@/components/sidebar/chart-area-interactive";
  import { fetchRevenueDetails, fetchStudentDetails, fetchCourseDetails, fetchLessonDetails } from "@/app/teacher/actions/teacher-dashboard";

  interface TeacherDashboardClientProps {
    stats: {
      totalRevenue: number;
      totalUsers: number;
      totalCourses: number;
      totalLessons: number;
    };
    chartData: any[]; // Data for chart
  }

  type TabType = "revenue" | "students" | "courses" | "lessons";
  const ITEMS_PER_PAGE = 10;

export function TeacherDashboardClient({ stats, chartData }: TeacherDashboardClientProps) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const pathname = usePathname();
    
    // Get state from URL
    const activeTab = (searchParams.get("view") as TabType) || "revenue";
    const currentPageInfo = Number(searchParams.get("page")) || 1;
    const currentDuration = Number(searchParams.get("days")) || 30;
    
    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    
    const [currentPage, setCurrentPage] = useState(currentPageInfo);
    const [isPending, startTransition] = useTransition();

    // Reset pagination when tab changes
    useEffect(() => {
        setCurrentPage(1);
        setSearchTerm("");
    }, [activeTab]);

    // Update URL helper
    const updateUrl = (key: string, value: string | null) => {
         const params = new URLSearchParams(searchParams);
         if (value) params.set(key, value);
         else params.delete(key);
         
         // If changing duration, keeping view is fine.
         // If changing view, reset page.
         if(key === "view") params.delete("page");
         
         router.push(`${pathname}?${params.toString()}`, { scroll: false });
    };

    const handleTabChange = (tab: TabType) => {
      startTransition(() => updateUrl("view", tab));
    };

    const handleDurationChange = (days: string) => {
       startTransition(() => {
           updateUrl("days", days);
           // Force refresh to reload server data
           router.refresh(); 
       });
    };

    const handlePageChange = (page: number) => {
        setCurrentPage(page);
        startTransition(() => updateUrl("page", page.toString()));
        const tableElement = document.getElementById("dashboard-table");
        if (tableElement) tableElement.scrollIntoView({ behavior: "smooth", block: "start" });
    }

    // ... (fetch logic remains similar, useEffect for loadData)
    useEffect(() => {
      // Initial fetch or fetch on tab change
      const loadData = async () => {
        setLoading(true);
        try {
          let result: any[] = [];
          if (activeTab === "revenue") result = await fetchRevenueDetails();
          else if (activeTab === "students") result = await fetchStudentDetails();
          else if (activeTab === "courses") result = await fetchCourseDetails();
          else if (activeTab === "lessons") result = await fetchLessonDetails();
          setData(result);
        } catch (error) {
          console.error("Failed to fetch dashboard details", error);
        } finally {
          setLoading(false);
        }
      };

      loadData();
    }, [activeTab]);

    // ... (filtering and pagination logic remains)
    // Client-side filtering
    const filteredData = React.useMemo(() => {
        let result = data;
        if (searchTerm) {
            const lowerTerm = searchTerm.toLowerCase();
            result = data.filter(item => {
                if (activeTab === "revenue") {
                    return item.nguoiDung?.name?.toLowerCase().includes(lowerTerm) || 
                           item.nguoiDung?.email?.toLowerCase().includes(lowerTerm) ||
                           item.khoaHoc?.tenKhoaHoc?.toLowerCase().includes(lowerTerm);
                }
                if (activeTab === "students") {
                    return item.name?.toLowerCase().includes(lowerTerm) || 
                           item.email?.toLowerCase().includes(lowerTerm);
                }
                if (activeTab === "courses") {
                    return item.tenKhoaHoc?.toLowerCase().includes(lowerTerm);
                }
                if (activeTab === "lessons") {
                    return item.tenBaiHoc?.toLowerCase().includes(lowerTerm) ||
                           item.chuong?.khoaHoc?.tenKhoaHoc?.toLowerCase().includes(lowerTerm);
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

    // Reset page if filtered results are fewer than current page view
    useEffect(() => {
        if (currentPage > totalPages && totalPages > 0) {
            handlePageChange(1);
        }
    }, [filteredData.length, totalPages]);


    const tabs = [
      {
        id: "revenue",
        title: "Tổng doanh thu",
        value: stats.totalRevenue,
        icon: IconMoneybagPlus,
        desc: "Doanh thu trọn đời",
        growth: stats.revenueGrowth, // Added from server logic
        format: (val: number) => new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(val),
      },
      {
        id: "students",
        title: "Số lượng học sinh",
        value: stats.totalUsers,
        icon: IconUser,
        desc: "Tổng số học sinh tham gia",
        growth: stats.usersGrowth, // Added from server logic
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
             <div className="flex items-center gap-2 bg-background p-1 rounded-lg border">
                 {[7, 30, 90].map(days => (
                     <button
                        key={days}
                        onClick={() => handleDurationChange(days.toString())}
                        className={`text-sm font-medium px-3 py-1.5 rounded-md transition-all ${
                            currentDuration === days 
                            ? "bg-primary text-primary-foreground shadow-sm" 
                            : "text-muted-foreground hover:bg-muted"
                        }`}
                     >
                        {days} ngày
                     </button>
                 ))}
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
                    <span className={`text-xs font-medium flex items-center gap-0.5 ${isPositive ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {isPositive ? '+' : ''}{tab.growth}% 
                        <span className="text-muted-foreground font-normal ml-1">so với kỳ trước</span>
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
                        setCurrentPage(1); // Reset page on search
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
                              {activeTab === "revenue" && <RevenueTable data={paginatedData} />}
                              {activeTab === "students" && <StudentsTable data={paginatedData} />}
                              {activeTab === "courses" && <CoursesTable data={paginatedData} />}
                              {activeTab === "lessons" && <LessonsTable data={paginatedData} />}
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
                            // Logic to show limited pages if too many
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
        
          {/* Chart Section */}
          <ChartAreaInteractive data={chartData} />
        </div>
      </div>
    );
  }

  function RevenueTable({ data }: { data: any[] }) {
      if (!data.length) return <EmptyData />;
      return (
          <Table>
              <TableHeader>
                  <TableRow>
                      <TableHead>Học viên</TableHead>
                      <TableHead>Khóa học</TableHead>
                      <TableHead>Ngày mua</TableHead>
                      <TableHead>Mã giảm giá</TableHead>
                      <TableHead>Trạng thái</TableHead>
                      <TableHead className="text-right">Giá tiền</TableHead>
                  </TableRow>
              </TableHeader>
              <TableBody>
                  {data.map((item: any, idx: number) => (
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
                              {/* Logic hiển thị mã giảm giá */}
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
                          <TableCell>
                               {/* Hiển thị trạng thái */}
                               <Badge variant="outline" className="border-green-600/30 text-green-700 bg-green-50 dark:bg-green-500/10 dark:text-green-400 dark:border-green-500/50">
                                  Thành công
                               </Badge>
                          </TableCell>
                          <TableCell className="text-right font-mono font-medium">
                              {new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(item.soTien)}
                          </TableCell>
                      </TableRow>
                  ))}
              </TableBody>
          </Table>
      )
  }

  function StudentsTable({ data }: { data: any[] }) {
      if (!data.length) return <EmptyData />;
      return (
        <TooltipProvider>
          <Table>
              <TableHeader>
                  <TableRow>
                      <TableHead>Học viên</TableHead>
                      <TableHead>Khóa học sở hữu</TableHead>
                      <TableHead>Tiến độ</TableHead>
                  </TableRow>
              </TableHeader>
              <TableBody>
                  {data.map((student: any) => {
                      const courses = student.dangKyHocs || [];
                      const visibleCourses = courses.slice(0, 2);
                      const remainingCount = courses.length - 2;
                      const completed = student._count?.tienTrinhHocs || 0;

                      return (
                      <TableRow key={student.id}>
                          <TableCell>
                              <div className="flex items-center gap-3">
                                  <Avatar className="h-8 w-8">
                                      <AvatarImage src={student.image || ""} />
                                      <AvatarFallback>{student.name?.[0] || "U"}</AvatarFallback>
                                  </Avatar>
                                  <div className="flex flex-col">
                                      <span className="font-medium text-sm">{student.name}</span>
                                      <span className="text-xs text-muted-foreground">{student.email}</span>
                                  </div>
                              </div>
                          </TableCell>
                          <TableCell>
                              <div className="flex flex-wrap gap-1 items-center">
                                  {visibleCourses.map((reg: any, i: number) => (
                                      <Badge key={i} variant="secondary" className="text-xs font-normal">
                                          {reg.khoaHoc?.tenKhoaHoc || "Khóa học không xác định"}
                                      </Badge>
                                  ))}
                                  {remainingCount > 0 && (
                                     <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Badge variant="outline" className="text-xs font-normal cursor-help">
                                                +{remainingCount} khóa khác
                                            </Badge>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                            <div className="flex flex-col gap-1">
                                                {courses.slice(2).map((reg: any, idx: number) => (
                                                    <span key={idx} className="text-xs">
                                                        {reg.khoaHoc?.tenKhoaHoc || "Khóa học không xác định"}
                                                    </span>
                                                ))}
                                            </div>
                                        </TooltipContent>
                                     </Tooltip>
                                  )}
                              </div>
                          </TableCell>
                          <TableCell>
                              <div className="flex flex-col gap-1 w-[140px]">
                                  <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
                                      <span>{completed} bài</span>
                                      <span>Đã học</span>
                                  </div>
                                  <Progress value={Math.min((completed / 50) * 100, 100)} className="h-2" />
                              </div>
                          </TableCell>
                          <TableCell className="text-right">
                              <Link href="#" className={buttonVariants({ variant: "ghost", size: "icon" })}>
                                  <IconSearch className="size-4" />
                              </Link>
                          </TableCell>
                      </TableRow>
                  )})}
              </TableBody>
          </Table>
        </TooltipProvider>
      )
  }

  function CoursesTable({ data }: { data: any[] }) {
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
                  {data.map((course: any) => (
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

  function LessonsTable({ data }: { data: any[] }) {
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
