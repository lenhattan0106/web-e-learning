"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { formatDistanceToNow, format } from "date-fns";
import { vi } from "date-fns/locale";
import {
  IconHistory,
  IconTrash,
  IconBan,
  IconEye,
  IconMessageReport,
  IconBook,
  IconUserX,
  IconChevronLeft,
  IconChevronRight,
  IconRefresh,
} from "@tabler/icons-react";
import type { AdminLogsResult, AdminLog } from "@/app/data/admin/get-admin-logs";

interface ActivityLogsClientProps {
  logsResult: AdminLogsResult;
  admins: { id: string; name: string; image: string | null }[];
  summary: {
    totalLogs: number;
    todayLogs: number;
    actionCounts: Record<string, number>;
  };
  currentFilters: {
    page: number;
    loaiBaoCao?: string;
    hanhDong?: string;
    adminId?: string;
  };
}

const ACTION_LABELS: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  XOA_NOI_DUNG: { label: "Xóa nội dung", color: "bg-orange-100 text-orange-800", icon: <IconTrash className="h-3 w-3" /> },
  CAM_USER: { label: "Cấm người dùng", color: "bg-red-100 text-red-800", icon: <IconUserX className="h-3 w-3" /> },
  BO_QUA: { label: "Bỏ qua", color: "bg-gray-100 text-gray-800", icon: <IconEye className="h-3 w-3" /> },
  CHAN_KHOA_HOC: { label: "Chặn khóa học", color: "bg-purple-100 text-purple-800", icon: <IconBan className="h-3 w-3" /> },
};

const REPORT_TYPE_LABELS: Record<string, { label: string; icon: React.ReactNode }> = {
  BINH_LUAN: { label: "Bình luận", icon: <IconMessageReport className="h-3 w-3" /> },
  KHOA_HOC: { label: "Khóa học", icon: <IconBook className="h-3 w-3" /> },
};

export function ActivityLogsClient({
  logsResult,
  admins,
  summary,
  currentFilters,
}: ActivityLogsClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const updateFilter = (key: string, value: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value && value !== "all") {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    params.set("page", "1"); // Reset to page 1 when filtering
    router.push(`/admin/activity-logs?${params.toString()}`);
  };

  const goToPage = (page: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", page.toString());
    router.push(`/admin/activity-logs?${params.toString()}`);
  };

  const clearFilters = () => {
    router.push("/admin/activity-logs");
  };

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-white">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tổng xử lý</CardTitle>
            <IconHistory className="h-5 w-5 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-700">{summary.totalLogs}</div>
            <p className="text-xs text-muted-foreground mt-1">Tất cả thời gian</p>
          </CardContent>
        </Card>

        <Card className="border-green-200 bg-gradient-to-br from-green-50 to-white">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Hôm nay</CardTitle>
            <IconHistory className="h-5 w-5 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-700">{summary.todayLogs}</div>
            <p className="text-xs text-muted-foreground mt-1">Hành động mới</p>
          </CardContent>
        </Card>

        <Card className="border-orange-200 bg-gradient-to-br from-orange-50 to-white">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Xóa nội dung</CardTitle>
            <IconTrash className="h-5 w-5 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-700">
              {summary.actionCounts["XOA_NOI_DUNG"] || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Bình luận đã xóa</p>
          </CardContent>
        </Card>

        <Card className="border-red-200 bg-gradient-to-br from-red-50 to-white">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cấm người dùng</CardTitle>
            <IconUserX className="h-5 w-5 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-700">
              {summary.actionCounts["CAM_USER"] || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">User bị cấm</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Bộ lọc</CardTitle>
            <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-2">
              <IconRefresh className="h-4 w-4" />
              Xóa bộ lọc
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <label className="text-sm font-medium">Loại báo cáo</label>
              <Select
                value={currentFilters.loaiBaoCao || "all"}
                onValueChange={(value) => updateFilter("loaiBaoCao", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Tất cả" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả</SelectItem>
                  <SelectItem value="BINH_LUAN">Bình luận</SelectItem>
                  <SelectItem value="KHOA_HOC">Khóa học</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Hành động</label>
              <Select
                value={currentFilters.hanhDong || "all"}
                onValueChange={(value) => updateFilter("hanhDong", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Tất cả" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả</SelectItem>
                  <SelectItem value="XOA_NOI_DUNG">Xóa nội dung</SelectItem>
                  <SelectItem value="CAM_USER">Cấm người dùng</SelectItem>
                  <SelectItem value="BO_QUA">Bỏ qua</SelectItem>
                  <SelectItem value="CHAN_KHOA_HOC">Chặn khóa học</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Admin</label>
              <Select
                value={currentFilters.adminId || "all"}
                onValueChange={(value) => updateFilter("adminId", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Tất cả" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả admin</SelectItem>
                  {admins.map((admin) => (
                    <SelectItem key={admin.id} value={admin.id}>
                      {admin.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Logs Table */}
      <Card>
        <CardContent className="p-0">
          <TooltipProvider>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Thời gian</TableHead>
                  <TableHead>Admin</TableHead>
                  <TableHead>Loại</TableHead>
                  <TableHead>Hành động</TableHead>
                  <TableHead>Chi tiết</TableHead>
                  <TableHead>Thời hạn cấm</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logsResult.logs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      Không có nhật ký nào
                    </TableCell>
                  </TableRow>
                ) : (
                  logsResult.logs.map((log) => (
                    <TableRow key={log.id}>
                      {/* Thời gian */}
                      <TableCell>
                        <Tooltip>
                          <TooltipTrigger>
                            <span className="text-sm">
                              {formatDistanceToNow(new Date(log.ngayTao), {
                                addSuffix: true,
                                locale: vi,
                              })}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>
                            {format(new Date(log.ngayTao), "dd/MM/yyyy HH:mm:ss", { locale: vi })}
                          </TooltipContent>
                        </Tooltip>
                      </TableCell>

                      {/* Admin */}
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-6 w-6">
                            <AvatarImage src={log.admin?.image || ""} />
                            <AvatarFallback>{log.admin?.name?.[0]?.toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <span className="text-sm font-medium">{log.admin?.name || "N/A"}</span>
                        </div>
                      </TableCell>

                      {/* Loại */}
                      <TableCell>
                        <Badge variant="outline" className="gap-1">
                          {REPORT_TYPE_LABELS[log.loaiBaoCao]?.icon}
                          {REPORT_TYPE_LABELS[log.loaiBaoCao]?.label || log.loaiBaoCao}
                        </Badge>
                      </TableCell>

                      {/* Hành động */}
                      <TableCell>
                        <Badge className={`gap-1 ${ACTION_LABELS[log.hanhDong]?.color}`}>
                          {ACTION_LABELS[log.hanhDong]?.icon}
                          {ACTION_LABELS[log.hanhDong]?.label || log.hanhDong}
                        </Badge>
                      </TableCell>

                      {/* Chi tiết */}
                      <TableCell className="max-w-[300px]">
                        <Tooltip>
                          <TooltipTrigger>
                            <p className="text-sm truncate">{log.lyDoXuLy || "-"}</p>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-[400px]">
                            <p className="whitespace-pre-wrap">{log.lyDoXuLy}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TableCell>

                      {/* Thời hạn cấm */}
                      <TableCell>
                        {log.thoiHanCam ? (
                          <Badge variant="destructive">{log.thoiHanCam} ngày</Badge>
                        ) : log.hanhDong === "CAM_USER" ? (
                          <Badge variant="destructive">Vĩnh viễn</Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TooltipProvider>
        </CardContent>
      </Card>

      {/* Pagination */}
      {logsResult.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Trang {logsResult.currentPage} / {logsResult.totalPages} ({logsResult.totalCount} kết quả)
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => goToPage(logsResult.currentPage - 1)}
              disabled={logsResult.currentPage === 1}
            >
              <IconChevronLeft className="h-4 w-4" />
              Trước
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => goToPage(logsResult.currentPage + 1)}
              disabled={logsResult.currentPage === logsResult.totalPages}
            >
              Sau
              <IconChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
