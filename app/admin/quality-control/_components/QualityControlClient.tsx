"use client";

import { useState, useEffect, useTransition } from "react";
import { DateRange } from "react-day-picker";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";
import { 
  IconAlertTriangle, 
  IconStar, 
  IconMessageReport,
  IconShieldCheck,
  IconBan,
  IconEye,
  IconTrash,
  IconAlertCircle,
  IconUserX,
  IconInfoCircle
} from "@tabler/icons-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { 
  banCourse, 
  resolveCourseReport, 
  resolveCommentReport, 
  resolveCommentReportWithBan 
} from "@/app/admin/actions/quality";
import { fetchQualityChartData } from "@/app/admin/actions/quality-chart";
import { QualityAnalysisChart } from "../../_components/charts/QualityAnalysisChart";
import { DateFilter } from "../../_components/DateFilter";


interface QualityTrendData {
  label: string;
  month: string;
  reports: number;
  resolved: number;
  avgRating: number;
}

interface ReportTypeData {
  label: string;
  value: number;
  color: string;
}

interface QualityChartStats {
  trendData: QualityTrendData[];
  reportTypeData: ReportTypeData[];
  distributionByType: ReportTypeData[];
  distributionByStatus: ReportTypeData[];
  currentAvgRating: number;
  pendingReports: number;
}

interface QualityControlClientProps {
  lowRatedCourses: any[];
  reportedCourses: any[];
  reportedComments: any[];
  chartStats: QualityChartStats;
}

export const QualityControlClient = ({
  lowRatedCourses,
  reportedCourses,
  reportedComments,
  chartStats,
}: QualityControlClientProps) => {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [isPending, startTransition] = useTransition();
  
  // Date filter state
  const [dateRange, setDateRange] = useState<DateRange | undefined>(() => {
    const to = new Date();
    const from = new Date();
    from.setDate(to.getDate() - 30); // Default 30 days
    return { from, to };
  });
  const [currentDuration, setCurrentDuration] = useState(30);
  const [isCustomRange, setIsCustomRange] = useState(false);
  
  // Chart data state
  const [chartData, setChartData] = useState<QualityChartStats>(chartStats);
  const [chartLoading, setChartLoading] = useState(false);
  
  // Ban User Dialog state
  const [banDialogOpen, setBanDialogOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState<any>(null);
  const [banDuration, setBanDuration] = useState<string>("permanent");
  const [banReason, setBanReason] = useState("Vi phạm quy định bình luận");

  const handleBanCourse = async (courseId: string) => {
    if (!confirm("Bạn có chắc chắn muốn CHẶN khóa học này?")) return;
    setLoading(true);
    try {
      await banCourse(courseId, "Chất lượng quá thấp hoặc vi phạm nghiêm trọng");
      toast.success("Thành công", { description: "Đã chặn khóa học" });
      router.refresh();
    } catch {
      toast.error("Lỗi", { description: "Không thể chặn khóa học" });
    } finally {
      setLoading(false);
    }
  };

  const handleResolveCourseReport = async (reportId: string, action: "BAN" | "IGNORE") => {
    setLoading(true);
    try {
      await resolveCourseReport(reportId, action);
      toast.success("Thành công", { description: "Đã xử lý báo cáo" });
      router.refresh();
    } catch {
      toast.error("Lỗi");
    } finally {
      setLoading(false);
    }
  };
  
  const handleResolveCommentReport = async (reportId: string, action: "DELETE" | "IGNORE") => {
    setLoading(true);
    try {
      await resolveCommentReport(reportId, action);
      toast.success("Thành công", { description: "Đã xử lý bình luận" });
      router.refresh();
    } catch {
      toast.error("Lỗi");
    } finally {
      setLoading(false);
    }
  };

  // Mở dialog ban user
  const openBanDialog = (report: any) => {
    setSelectedReport(report);
    setBanDuration("permanent");
    setBanReason("Vi phạm quy định bình luận");
    setBanDialogOpen(true);
  };

  // Xử lý ban user
  const handleBanUser = async () => {
    if (!selectedReport || !banReason.trim()) return;
    
    setLoading(true);
    try {
      const banDays = banDuration === "permanent" ? null : parseInt(banDuration);
      const result = await resolveCommentReportWithBan(
        selectedReport.id,
        banReason,
        banDays
      );
      
      toast.success("Thành công", { description: result.message });
      setBanDialogOpen(false);
      setSelectedReport(null);
      router.refresh();
    } catch {
      toast.error("Lỗi", { description: "Không thể cấm người dùng" });
    } finally {
      setLoading(false);
    }
  };

  // Date filter handlers
  const handleDurationChange = (days: number) => {
    setIsCustomRange(false);
    setCurrentDuration(days);
    const to = new Date();
    const from = new Date();
    from.setDate(to.getDate() - days);
    setDateRange({ from, to });
  };
  
  const handleCustomRangeChange = (range: DateRange | undefined) => {
    if (range?.from && range?.to) {
      setIsCustomRange(true);
      setDateRange(range);
    }
  };

  // Fetch chart data when date range changes
  useEffect(() => {
    if (!dateRange?.from || !dateRange?.to) return;
    
    const fetchChartData = async () => {
      setChartLoading(true);
      try {
        const result = await fetchQualityChartData(
          dateRange.from!.toISOString(),
          dateRange.to!.toISOString()
        );
        setChartData(result);
      } catch (error) {
        console.error("Failed to fetch chart data", error);
      } finally {
        setChartLoading(false);
      }
    };
    
    fetchChartData();
  }, [dateRange]);

  const criticalLowRated = lowRatedCourses.filter(c => c.avgRating < 3.5);
  const totalIssues = criticalLowRated.length + reportedCourses.length + reportedComments.length;

  return (
    <div className="p-6 space-y-6">
      {/* Header Section with Date Filter */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Quản lý Chất lượng</h1>
          <p className="text-muted-foreground">
            Hậu kiểm nội dung: Rating thấp, Báo cáo vi phạm, Spam
          </p>
        </div>
        
        <DateFilter
          dateRange={dateRange}
          onDateRangeChange={handleCustomRangeChange}
          quickDurations={[7, 30, 90]}
          currentDuration={currentDuration}
          onQuickDurationChange={handleDurationChange}
          isCustomRange={isCustomRange}
        />
      </div>

      {/* Stats Overview Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-white">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tổng vấn đề</CardTitle>
            <IconAlertCircle className="h-5 w-5 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-700">{totalIssues}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Cần xử lý ngay
            </p>
          </CardContent>
        </Card>

        <Card className="border-red-200 bg-gradient-to-br from-red-50 to-white">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rating thấp</CardTitle>
            <IconStar className="h-5 w-5 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-700">{criticalLowRated.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Khóa học dưới 3.5 sao
            </p>
          </CardContent>
        </Card>

        <Card className="border-yellow-200 bg-gradient-to-br from-yellow-50 to-white">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Báo cáo khóa học</CardTitle>
            <IconMessageReport className="h-5 w-5 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-700">{reportedCourses.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Vi phạm nội dung
            </p>
          </CardContent>
        </Card>

        <Card className="border-orange-200 bg-gradient-to-br from-orange-50 to-white">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Bình luận vi phạm</CardTitle>
            <IconAlertTriangle className="h-5 w-5 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-700">{reportedComments.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Cần kiểm duyệt
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quality Analysis Chart */}
      {chartLoading ? (
        <div className="h-[450px] flex items-center justify-center border rounded-lg">
          <div className="flex flex-col items-center gap-2">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            <span className="text-sm text-muted-foreground">Đang tải biểu đồ...</span>
          </div>
        </div>
      ) : (
        <QualityAnalysisChart 
          trendData={chartData.trendData}
          distributionByType={chartData.distributionByType}
          distributionByStatus={chartData.distributionByStatus}
          currentAvgRating={chartData.currentAvgRating}
          pendingReports={chartData.pendingReports}
        />
      )}

      {/* Tabs Section */}
      <Tabs defaultValue="low-rating" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="low-rating" className="gap-2">
            <IconStar className="h-4 w-4" />
            Xếp hạng đánh giá ({lowRatedCourses.length})
          </TabsTrigger>
          <TabsTrigger value="reported-courses" className="gap-2">
            <IconMessageReport className="h-4 w-4" />
            Khóa học ({reportedCourses.length})
          </TabsTrigger>
          <TabsTrigger value="reported-comments" className="gap-2">
            <IconAlertTriangle className="h-4 w-4" />
            Bình luận vi phạm ({reportedComments.length})
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: LOW RATING */}
        <TabsContent value="low-rating" className="space-y-4 mt-6">
          {lowRatedCourses.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-16">
                <IconShieldCheck className="h-16 w-16 text-green-500 mb-4" />
                <h3 className="text-lg font-semibold">Chưa có dữ liệu</h3>
                <p className="text-muted-foreground text-center">
                  Chưa có khóa học nào được đánh giá.
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[300px]">Khóa học</TableHead>
                      <TableHead>Giảng viên</TableHead>
                      <TableHead className="text-center">Số lượng Đánh giá</TableHead>
                      <TableHead className="text-center">Rating</TableHead>
                      <TableHead className="text-center">Trạng thái</TableHead>
                      <TableHead className="text-right">Hành động</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lowRatedCourses.map((course) => {
                      const rating = course.avgRating;
                      let badgeConfig = { label: "Xuất Sắc", color: "bg-green-100 text-green-700 border-green-200", icon: IconShieldCheck };
                      
                      if (rating < 3.0) {
                        badgeConfig = { label: "Rating Rất Thấp", color: "bg-rose-100 text-rose-700 border-rose-200", icon: IconAlertTriangle };
                      } else if (rating <= 3.8) {
                        badgeConfig = { label: "Cần Cải Thiện", color: "bg-amber-100 text-amber-700 border-amber-200", icon: IconAlertCircle };
                      } else if (rating <= 4.4) {
                        badgeConfig = { label: "Ổn Định", color: "bg-blue-100 text-blue-700 border-blue-200", icon: IconInfoCircle };
                      }

                      return (
                      <TableRow key={course.id}>
                        <TableCell className="font-medium">
                           <div className="truncate max-w-[280px]" title={course.tenKhoaHoc}>{course.tenKhoaHoc}</div>
                        </TableCell>
                        <TableCell>
                            <div className="flex items-center gap-2">
                                <Avatar className="h-6 w-6">
                                    <AvatarImage src={course.nguoiDung.image || ""} />
                                    <AvatarFallback>{course.nguoiDung.name?.[0]}</AvatarFallback>
                                </Avatar>
                                <span className="text-sm">{course.nguoiDung.name}</span>
                            </div>
                        </TableCell>
                         <TableCell className="text-center">
                           {course.reviewCount}
                        </TableCell>
                        <TableCell className="text-center">
                           <div className="flex items-center justify-center gap-1 font-bold">
                             <span>{course.avgRating.toFixed(1)}</span>
                             <IconStar className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                           </div>
                        </TableCell>
                        <TableCell className="text-center">
                            <Badge variant="outline" className={`${badgeConfig.color} shadow-none`}>
                                <badgeConfig.icon className="h-3 w-3 mr-1" /> {badgeConfig.label}
                            </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button 
                              variant="destructive" 
                              size="sm"
                              className="h-8 w-8 p-0"
                              onClick={() => handleBanCourse(course.id)}
                              disabled={loading}
                              title="Chặn khóa học"
                            >
                              <IconBan className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              className="h-8 w-8 p-0"
                              onClick={() => window.open(`/courses/${course.duongDan}`, "_blank")}
                              title="Xem khóa học"
                            >
                              <IconEye className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )})}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* TAB 2: REPORTED COURSES */}
        <TabsContent value="reported-courses" className="space-y-4 mt-6">
          {reportedCourses.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-16">
                <IconShieldCheck className="h-16 w-16 text-green-500 mb-4" />
                <h3 className="text-lg font-semibold">Không có báo cáo nào</h3>
                <p className="text-muted-foreground text-center">
                  Tất cả khóa học đều tuân thủ tiêu chuẩn.
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Loại</TableHead>
                      <TableHead>Khóa học</TableHead>
                      <TableHead>Người báo cáo</TableHead>
                      <TableHead>Lý do / Chi tiết</TableHead>
                      <TableHead className="text-right">Hành động</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reportedCourses.map((report) => {
                      let parsedData: any = null;
                      let isSystemRequest = false;
                      const lyDoTrimmed = report.lyDo?.trim() || "";
                      if (lyDoTrimmed.startsWith("{")) {
                        try {
                          parsedData = JSON.parse(lyDoTrimmed);
                          isSystemRequest = parsedData.__reportType === "SYSTEM_REQUEST" 
                            || parsedData.objectType === "CATEGORY" 
                            || parsedData.objectType === "LEVEL"
                            || lyDoTrimmed.includes('"__reportType":"SYSTEM_REQUEST"');
                        } catch (e) { console.log(e); }
                      }

                      return (
                        <TableRow key={report.id}>
                          <TableCell>
                            {isSystemRequest ? (
                              <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 whitespace-nowrap">Yêu cầu sửa</Badge>
                            ) : (
                              <Badge className="bg-red-100 text-red-700 hover:bg-red-100 whitespace-nowrap">Vi phạm</Badge>
                            )}
                          </TableCell>
                          <TableCell className="max-w-[200px]">
                            <div className="font-medium truncate" title={report.khoaHoc.tenKhoaHoc}>{report.khoaHoc.tenKhoaHoc}</div>
                            <div className="text-xs text-muted-foreground">GV: {report.khoaHoc.nguoiDung.name}</div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="text-sm font-medium">{report.nguoiDung.name}</span>
                              <span className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(report.ngayTao), { addSuffix: true, locale: vi })}</span>
                            </div>
                          </TableCell>
                          <TableCell className="max-w-[300px]">
                             {isSystemRequest && parsedData ? (
                               <div className="text-sm">
                                  <div className="font-semibold text-blue-700">
                                    {parsedData.type?.includes('EDIT') ? 'Sửa' : 'Xóa'} {parsedData.objectType === 'CATEGORY' ? 'Danh mục' : 'Cấp độ'}
                                  </div>
                                  <div className="text-xs truncate" title={parsedData.reason}>Lý do: {parsedData.reason}</div>
                               </div>
                             ) : (
                               <div className="text-sm text-red-700 truncate" title={report.lyDo}>{report.lyDo}</div>
                             )}
                          </TableCell>
                          <TableCell className="text-right">
                             <div className="flex justify-end gap-2">
                               {isSystemRequest ? (
                                  <>
                                    <Button size="sm" variant="default" className="bg-blue-600 h-8 px-2" onClick={() => handleResolveCourseReport(report.id, "IGNORE")}>Duyệt</Button>
                                    <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => handleResolveCourseReport(report.id, "IGNORE")}><IconTrash className="h-4 w-4" /></Button>
                                  </>
                               ) : (
                                  <>
                                    <Button size="sm" variant="destructive" className="h-8 w-8 p-0" onClick={() => handleResolveCourseReport(report.id, "BAN")} title="Chặn khóa học"><IconBan className="h-4 w-4" /></Button>
                                    <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => handleResolveCourseReport(report.id, "IGNORE")} title="Bỏ qua"><IconEye className="h-4 w-4" /></Button>
                                  </>
                               )}
                             </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* TAB 3: REPORTED COMMENTS */}
        <TabsContent value="reported-comments" className="space-y-4 mt-6">
          {reportedComments.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-16">
                <IconShieldCheck className="h-16 w-16 text-green-500 mb-4" />
                <h3 className="text-lg font-semibold">Không có vi phạm</h3>
                <p className="text-muted-foreground text-center">
                  Cộng đồng đang hoạt động văn minh.
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Người báo cáo</TableHead>
                      <TableHead>Nội dung vi phạm</TableHead>
                      <TableHead>Lý do</TableHead>
                      <TableHead className="text-right">Hành động</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reportedComments.map((report) => (
                      <TableRow key={report.id}>
                         <TableCell>
                            <div className="flex flex-col">
                              <span className="font-medium">{report.nguoiDung.name}</span>
                              <span className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(report.ngayTao), { addSuffix: true, locale: vi })}</span>
                            </div>
                         </TableCell>
                         <TableCell className="max-w-[300px]">
                            <div className="bg-orange-50 border-l-2 border-orange-400 p-2 rounded text-sm italic text-orange-900 truncate" title={report.binhLuan.noiDung}>
                               &quot;{report.binhLuan.noiDung}&quot;
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">Tác giả: {report.binhLuan.nguoiDung.name}</div>
                         </TableCell>
                         <TableCell className="text-red-600 font-medium max-w-[200px] truncate" title={report.lyDo}>
                            {report.lyDo}
                         </TableCell>
                         <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                               <Button 
                                  size="sm" 
                                  variant="destructive" 
                                  className="h-8 px-2 text-xs"
                                  onClick={() => openBanDialog(report)}
                               >
                                  <IconUserX className="h-3 w-3 mr-1" /> Cấm
                               </Button>
                               <Button 
                                  size="sm" 
                                  variant="outline" 
                                  className="h-8 w-8 p-0"
                                  onClick={() => handleResolveCommentReport(report.id, "DELETE")}
                                  title="Xóa bình luận"
                               >
                                  <IconTrash className="h-4 w-4 text-red-500" />
                               </Button>
                               <Button 
                                  size="sm" 
                                  variant="ghost" 
                                  className="h-8 w-8 p-0"
                                  onClick={() => handleResolveCommentReport(report.id, "IGNORE")}
                                  title="Bỏ qua"
                               >
                                  <IconEye className="h-4 w-4" />
                               </Button>
                            </div>
                         </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* ✅ DIALOG MỚI: Cấm người dùng */}
      <Dialog open={banDialogOpen} onOpenChange={setBanDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <IconUserX className="h-5 w-5 text-destructive" />
              Cấm người dùng
            </DialogTitle>
            <DialogDescription>
              Bình luận sẽ bị xóa và người dùng{" "}
              <strong>{selectedReport?.binhLuan?.nguoiDung?.name}</strong> sẽ bị cấm.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* Ban Duration */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Thời hạn cấm</label>
              <Select value={banDuration} onValueChange={setBanDuration}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">7 ngày</SelectItem>
                  <SelectItem value="30">30 ngày</SelectItem>
                  <SelectItem value="90">90 ngày</SelectItem>
                  <SelectItem value="permanent">Vĩnh viễn</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {/* Ban Reason */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Lý do cấm</label>
              <Textarea 
                value={banReason}
                onChange={(e) => setBanReason(e.target.value)}
                placeholder="Nhập lý do cấm..."
                rows={3}
                className="resize-none"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              variant="ghost" 
              onClick={() => {
                setBanDialogOpen(false);
                setSelectedReport(null);
              }}
            >
              Hủy
            </Button>
            <Button
              variant="destructive"
              onClick={handleBanUser}
              disabled={loading || !banReason.trim()}
            >
              {loading ? "Đang xử lý..." : "Xác nhận cấm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
