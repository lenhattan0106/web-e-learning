"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  IconUserX
} from "@tabler/icons-react";

import { 
  banCourse, 
  resolveCourseReport, 
  resolveCommentReport, 
  resolveCommentReportWithBan 
} from "@/app/admin/actions/quality";

interface QualityControlClientProps {
  lowRatedCourses: any[];
  reportedCourses: any[];
  reportedComments: any[];
}

export const QualityControlClient = ({
  lowRatedCourses,
  reportedCourses,
  reportedComments,
}: QualityControlClientProps) => {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  
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

  const totalIssues = lowRatedCourses.length + reportedCourses.length + reportedComments.length;

  return (
    <div className="p-6 space-y-6">
      {/* Header Section */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Quản lý Chất lượng</h1>
        <p className="text-muted-foreground">
          Hậu kiểm nội dung: Rating thấp, Báo cáo vi phạm, Spam
        </p>
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
            <div className="text-2xl font-bold text-red-700">{lowRatedCourses.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Khóa học dưới 3.0 sao
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

      {/* Tabs Section */}
      <Tabs defaultValue="low-rating" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="low-rating" className="gap-2">
            <IconStar className="h-4 w-4" />
            Rating thấp ({lowRatedCourses.length})
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
                <h3 className="text-lg font-semibold">Tuyệt vời!</h3>
                <p className="text-muted-foreground text-center">
                  Không có khóa học nào có rating dưới 3.0 sao.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {lowRatedCourses.map((course) => (
                <Card key={course.id} className="border-red-200 hover:shadow-lg transition-shadow">
                  <CardHeader className="bg-gradient-to-br from-red-50 to-white">
                    <CardTitle className="line-clamp-2 text-lg">{course.tenKhoaHoc}</CardTitle>
                    <CardDescription className="flex items-center gap-1">
                      <span className="font-medium">GV:</span> {course.nguoiDung.name}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <div className="flex justify-between items-center mb-4 bg-red-100 p-3 rounded-lg">
                      <div className="flex items-center gap-2">
                        <IconStar className="h-5 w-5 text-red-600" />
                        <span className="text-2xl font-bold text-red-700">
                          {course.avgRating.toFixed(1)}
                        </span>
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {course.reviewCount} đánh giá
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        variant="destructive" 
                        className="flex-1 gap-2"
                        onClick={() => handleBanCourse(course.id)}
                        disabled={loading}
                        size="sm"
                      >
                        <IconBan className="h-4 w-4" />
                        Chặn
                      </Button>
                      <Button 
                        variant="outline" 
                        className="flex-1 gap-2"
                        size="sm"
                      >
                        <IconEye className="h-4 w-4" />
                        Xem
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
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
            <div className="space-y-4">
              {reportedCourses.map((report) => (
                <Card key={report.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="bg-gradient-to-r from-yellow-50 to-white">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <CardTitle className="text-lg mb-1">{report.khoaHoc.tenKhoaHoc}</CardTitle>
                        <CardDescription className="flex items-center gap-2">
                          <Badge variant="outline" className="gap-1">
                            <IconMessageReport className="h-3 w-3" />
                            {report.nguoiDung.name}
                          </Badge>
                          <span className="text-xs">
                            {formatDistanceToNow(new Date(report.ngayTao), { addSuffix: true, locale: vi })}
                          </span>
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-4 space-y-4">
                    <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 rounded-r">
                      <p className="text-sm font-semibold text-yellow-900 mb-1">Lý do báo cáo:</p>
                      <p className="text-sm text-yellow-800">{report.lyDo}</p>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Giảng viên: <span className="font-medium">{report.khoaHoc.nguoiDung.name}</span>
                    </p>
                    <div className="flex gap-2">
                      <Button 
                        variant="destructive" 
                        onClick={() => handleResolveCourseReport(report.id, "BAN")}
                        disabled={loading}
                        className="gap-2"
                      >
                        <IconBan className="h-4 w-4" />
                        Chặn khóa học
                      </Button>
                      <Button 
                        variant="secondary"
                        onClick={() => handleResolveCourseReport(report.id, "IGNORE")}
                        disabled={loading}
                        className="gap-2"
                      >
                        <IconEye className="h-4 w-4" />
                        Bỏ qua
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
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
            <div className="space-y-4">
              {reportedComments.map((report) => {
                const lessonUrl = report.binhLuan.baiHoc?.chuong?.khoaHoc?.duongDan 
                  ? `/dashboard/${report.binhLuan.baiHoc.chuong.khoaHoc.duongDan}/${report.binhLuan.baiHoc.id}`
                  : null;
                const courseName = report.binhLuan.baiHoc?.chuong?.khoaHoc?.tenKhoaHoc;
                const lessonName = report.binhLuan.baiHoc?.tenBaiHoc;
                
                return (
                <Card key={report.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="bg-gradient-to-r from-orange-50 to-white">
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-lg">Báo cáo Bình luận</CardTitle>
                      <Badge variant="outline" className="gap-1">
                        {formatDistanceToNow(new Date(report.ngayTao), { addSuffix: true, locale: vi })}
                      </Badge>
                    </div>
                    <CardDescription>
                      Người báo cáo: {report.nguoiDung.name}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-4 space-y-4">
                    {/* Thông tin bài học/khóa học */}
                    {courseName && lessonName && (
                      <div className="text-sm text-muted-foreground bg-gray-50 p-3 rounded-lg">
                        <p><span className="font-medium">Khóa học:</span> {courseName}</p>
                        <p><span className="font-medium">Bài học:</span> {lessonName}</p>
                      </div>
                    )}
                    
                    <div className="bg-orange-50 border-l-4 border-orange-500 p-4 rounded-r">
                      <p className="text-xs text-orange-700 mb-2">
                        Tác giả: {report.binhLuan.nguoiDung.name}
                      </p>
                      <p className="font-medium text-sm italic text-orange-900">
                        &quot;{report.binhLuan.noiDung}&quot;
                      </p>
                    </div>
                    
                    {/* Action Buttons - UPDATED với "Xóa & Cấm" */}
                    <div className="flex gap-2 flex-wrap">
                      <Button 
                        variant="outline" 
                        onClick={() => handleResolveCommentReport(report.id, "DELETE")}
                        disabled={loading}
                        className="gap-2"
                      >
                        <IconTrash className="h-4 w-4" />
                        Xóa bình luận
                      </Button>
                      
                      {/* ✅ NÚT MỚI: Xóa & Cấm người dùng */}
                      <Button 
                        variant="destructive"
                        onClick={() => openBanDialog(report)}
                        disabled={loading}
                        className="gap-2"
                      >
                        <IconUserX className="h-4 w-4" />
                        Xóa và Cấm người dùng
                      </Button>
                      
                      <Button 
                        variant="secondary"
                        onClick={() => handleResolveCommentReport(report.id, "IGNORE")}
                        disabled={loading}
                        className="gap-2"
                      >
                        <IconEye className="h-4 w-4" />
                        Bỏ qua
                      </Button>
                      
                      {lessonUrl && (
                        <Button 
                          variant="ghost"
                          onClick={() => window.open(lessonUrl, "_blank")}
                          className="gap-2"
                        >
                          <IconEye className="h-4 w-4" />
                          Xem chi tiết
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )})}
            </div>
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
